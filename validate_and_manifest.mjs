#!/usr/bin/env node
// validate_and_manifest.mjs
// Usage:
//   node validate_and_manifest.mjs "/abs/path/to/videos/{timestamp}_{title}" --min-visuals 3
//
// Outputs (inside the project folder):
//   01-context/manifest.json
//   06-metadata/project-summary.json
//   06-metadata/youtube-metadata.json
//   05-video/processing-logs/validation.log
//
// Exit codes: 0 = OK, nonzero = issues found

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- small helpers ----------
const readJSON = (p, { optional = false } = {}) => {
  try {
    if (!fs.existsSync(p)) {
      if (optional) return null;
      throw new Error(`Missing file: ${p}`);
    }
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (optional) return null;
    throw new Error(`Invalid JSON at ${p}: ${err.message}`);
  }
};

const readText = (p) => {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
};

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

const writeJSON = (p, obj) => {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
};

const writeText = (p, s) => {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, s, "utf8");
};

const listDirs = (p) =>
  fs.existsSync(p)
    ? fs
        .readdirSync(p, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => path.join(p, d.name))
    : [];

const listFiles = (p) =>
  fs.existsSync(p)
    ? fs
        .readdirSync(p, { withFileTypes: true })
        .filter((d) => d.isFile())
        .map((d) => path.join(p, d.name))
    : [];

// ---------- argv ----------
const args = process.argv.slice(2);
if (!args.length) {
  console.error(
    "Usage: node validate_and_manifest.mjs /path/to/videos/{timestamp}_{title} --min-visuals 3"
  );
  process.exit(1);
}
const projectRoot = path.resolve(args[0]);
const mvIdx = args.indexOf("--min-visuals");
const MIN_VISUALS = mvIdx >= 0 ? parseInt(args[mvIdx + 1] || "3", 10) : 3;

// ---------- constants ----------
const REQUIRED = {
  "01-context": [
    "topic-context.json",
    "scene-context.json",
    "media-context.json",
    "audio-context.json",
    "video-context.json",
  ],
  "02-script": ["script.json", "script.txt"],
  "04-audio": ["narration.mp3", "audio-metadata.json"],
  "05-video": ["processing-logs"], // dir
  "06-metadata": [], // will be created if missing
};

const VISUAL_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".mp4",
  ".mov",
  ".mkv",
]);

// ---------- validation pass ----------
const issues = [];
const warnings = [];

const kpis = {
  scenes_detected: 0,
  images_total: 0,
  audio_segments: 0,
  has_narration: false,
  min_visuals_required: MIN_VISUALS,
  scenes_passing_visual_min: 0,
};

if (!fs.existsSync(projectRoot)) {
  console.error(`Path not found: ${projectRoot}`);
  process.exit(1);
}

// folders/files presence
for (const [folder, entries] of Object.entries(REQUIRED)) {
  const folderPath = path.join(projectRoot, folder);
  if (!fs.existsSync(folderPath)) {
    issues.push(`Missing folder: ${folder}/`);
    continue;
  }
  for (const entry of entries) {
    const entryPath = path.join(folderPath, entry);
    const expectDir = entry === "processing-logs";
    if (expectDir) {
      if (!fs.existsSync(entryPath) || !fs.statSync(entryPath).isDirectory()) {
        issues.push(`Missing folder: ${folder}/${entry}/`);
      }
    } else {
      if (!fs.existsSync(entryPath)) {
        issues.push(`Missing file: ${folder}/${entry}`);
      }
    }
  }
}

// load contexts
let topicCtx,
  sceneCtx,
  mediaCtx,
  audioCtx,
  videoCtx,
  scriptJson,
  scriptTxt,
  audioMeta;
try {
  const ctxDir = path.join(projectRoot, "01-context");
  topicCtx = readJSON(path.join(ctxDir, "topic-context.json"));
  sceneCtx = readJSON(path.join(ctxDir, "scene-context.json"));
  mediaCtx = readJSON(path.join(ctxDir, "media-context.json"));
  audioCtx = readJSON(path.join(ctxDir, "audio-context.json"));
  videoCtx = readJSON(path.join(ctxDir, "video-context.json"));
} catch (e) {
  issues.push(e.message);
}

try {
  const sDir = path.join(projectRoot, "02-script");
  scriptJson = readJSON(path.join(sDir, "script.json"));
  scriptTxt = readText(path.join(sDir, "script.txt"));
} catch (e) {
  issues.push(e.message);
}

try {
  const aDir = path.join(projectRoot, "04-audio");
  audioMeta = readJSON(path.join(aDir, "audio-metadata.json"));
  const narration = path.join(aDir, "narration.mp3");
  if (fs.existsSync(narration)) kpis.has_narration = true;
} catch (e) {
  issues.push(e.message);
}

// audio segments
const audioSegmentsDir = path.join(projectRoot, "04-audio", "audio-segments");
let audioSegments = [];
if (fs.existsSync(audioSegmentsDir)) {
  audioSegments = listFiles(audioSegmentsDir).filter((f) =>
    [".mp3", ".wav", ".m4a"].includes(path.extname(f).toLowerCase())
  );
  kpis.audio_segments = audioSegments.length;
}

// media per scene
const mediaRoot = path.join(projectRoot, "03-media");
const sceneDirs = listDirs(mediaRoot)
  .filter((p) => path.basename(p).toLowerCase().startsWith("scene-"))
  .map((p) => {
    const name = path.basename(p);
    const maybeNum = parseInt(name.split("-")[1] || "", 10);
    return Number.isFinite(maybeNum) ? { id: maybeNum, dir: p } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.id - b.id);

kpis.scenes_detected = sceneDirs.length;

const sceneVisualStats = new Map();
for (const { id, dir } of sceneDirs) {
  const imagesDir = path.join(dir, "images");
  const files = listFiles(imagesDir).filter((f) =>
    VISUAL_EXTS.has(path.extname(f).toLowerCase())
  );
  const count = files.length;
  kpis.images_total += count;
  if (count >= MIN_VISUALS) kpis.scenes_passing_visual_min += 1;
  else
    issues.push(
      `Scene ${id}: only ${count} visuals found (<${MIN_VISUALS}). Path: ${imagesDir}`
    );
  sceneVisualStats.set(id, {
    imagesDir,
    files: files.map((f) => path.basename(f)).sort(),
    count,
  });
}

// cross-check scene ids from scene-context.json
let ctxSceneIds = [];
if (sceneCtx && typeof sceneCtx === "object" && Array.isArray(sceneCtx.scenes)) {
  ctxSceneIds = sceneCtx.scenes
    .map((s) => (s && (s.id ?? s.sceneId)))
    .filter((x) => x !== undefined);
  const missingInFs = ctxSceneIds.filter((sid) => !sceneVisualStats.has(sid));
  if (missingInFs.length) {
    issues.push(
      `Scenes in scene-context.json missing media folders: ${JSON.stringify(
        missingInFs
      )}`
    );
  }
}

// audio segments vs scenes count
if (kpis.audio_segments && ctxSceneIds.length) {
  if (kpis.audio_segments !== ctxSceneIds.length) {
    issues.push(
      `audio-segments count (${kpis.audio_segments}) != scenes in context (${ctxSceneIds.length}).`
    );
  }
}

// ---------- build unified manifest ----------
const titleFromVideo = videoCtx?.title;
const visibility = videoCtx?.visibility || "unlisted";
const videoId =
  videoCtx?.videoId || topicCtx?.slug || path.basename(projectRoot);
const seoTags = [
  ...(topicCtx?.seoContext?.primaryKeywords ?? []),
  ...(topicCtx?.seoContext?.longTail ?? []),
];

const unified = {
  videoId,
  title: titleFromVideo || topicCtx?.title,
  visibility,
  seo: { tags: seoTags },
  chapters: Array.isArray(videoCtx?.chapters) ? videoCtx.chapters : [],
  scenes: [],
  export:
    videoCtx?.export ?? { resolution: "1920x1080", fps: 30, codec: "h264" },
  upload: {
    category: "Education",
    madeForKids: false,
    ...(videoCtx?.upload ?? {}),
  },
};

// script scenes map
const scriptScenes = {};
if (scriptJson && typeof scriptJson === "object" && Array.isArray(scriptJson.scenes)) {
  for (const s of scriptJson.scenes) {
    const id = s?.id ?? s?.sceneId;
    if (id !== undefined) scriptScenes[id] = s;
  }
}

// audio metadata map
const audioMap = {};
if (audioMeta && Array.isArray(audioMeta.segments)) {
  for (const seg of audioMeta.segments) {
    const sid = seg?.sceneId ?? seg?.id;
    if (sid !== undefined) audioMap[sid] = seg;
  }
}

// collect all scene ids from FS ∪ context
const allSceneIds = Array.from(
  new Set([...sceneVisualStats.keys(), ...ctxSceneIds])
).sort((a, b) => a - b);

for (const sid of allSceneIds) {
  const visuals = (sceneVisualStats.get(sid)?.files ?? []).map((fname) => ({
    type: "image", // backward compatible; you can add "clip" later
    key: `03-media/scene-${sid}/images/${fname}`,
    durationHint: 5,
  }));

  const sceneScript =
    scriptScenes[sid]?.text ?? scriptScenes[sid]?.script ?? "";

  const audioSegFile = path.join(audioSegmentsDir, `scene-${sid}.mp3`);
  const audioPath = fs.existsSync(audioSegFile) ? audioSegFile : "";

  unified.scenes.push({
    id: sid,
    script: sceneScript,
    audio: {
      path: audioPath,
      durationHintSec: audioMap[sid]?.durationSec,
    },
    visuals,
  });
}

// ---------- outputs ----------
const ctxManifestPath = path.join(projectRoot, "01-context", "manifest.json");
const metaDir = path.join(projectRoot, "06-metadata");
const logsDir = path.join(projectRoot, "05-video", "processing-logs");

const ytMeta = {
  title: unified.title || topicCtx?.title || "",
  description: videoCtx?.description || "",
  tags: (unified.seo.tags || []).slice(0, 500),
  categoryId: String(videoCtx?.categoryId ?? "27"), // 27=Education
  privacyStatus:
    videoCtx?.privacyStatus || (visibility === "public" ? "public" : "unlisted"),
  defaultLanguage: videoCtx?.defaultLanguage || "en",
  madeForKids: Boolean(unified.upload?.madeForKids ?? false),
};

const summary = {
  project: path.basename(projectRoot),
  timestamp: new Date().toISOString(),
  kpis,
  issues,
  warnings,
  paths: {
    manifest: ctxManifestPath,
    youtube_metadata: path.join(metaDir, "youtube-metadata.json"),
    validation_log: path.join(logsDir, "validation.log"),
    project_summary: path.join(metaDir, "project-summary.json"),
  },
};

// write files
try {
  writeJSON(ctxManifestPath, unified);
  writeJSON(path.join(metaDir, "project-summary.json"), summary);
  writeJSON(path.join(metaDir, "youtube-metadata.json"), ytMeta);

  let log = "";
  if (issues.length) {
    log += "CRITICAL ISSUES:\n" + issues.map((i) => ` - ${i}`).join("\n") + "\n";
  } else {
    log += "No critical issues found.\n";
  }
  if (warnings.length) {
    log += "\nWARNINGS:\n" + warnings.map((w) => ` - ${w}`).join("\n") + "\n";
  }
  writeText(path.join(logsDir, "validation.log"), log);

  if (issues.length) {
    console.error("Validation failed. See 05-video/processing-logs/validation.log");
    process.exit(2);
  } else {
    console.log("Validation passed. manifest.json and metadata written.");
    process.exit(0);
  }
} catch (err) {
  console.error(`Failed to write outputs: ${err.message}`);
  process.exit(2);
}