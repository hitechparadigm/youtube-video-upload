/**
 * Create Sample Project: Travel to Spain
 * Sets up a complete test project with proper S3 structure
 */

const AWS = require('aws-sdk');
const {
    generateS3Paths
} = require('./src/utils/s3-folder-structure.cjs');

// Configure AWS
AWS.config.update({
    region: 'us-east-1',
    profile: 'hitechparadigm'
});

const s3 = new AWS.S3();
const bucketName = 'automated-video-pipeline-v2-786673323159-us-east-1';

async function createSampleProject() {
    console.log('🇪🇸 Creating Sample Project: Travel to Spain');
    console.log('===============================================');

    const projectTitle = 'Travel to Spain';
    const projectId = `spain-travel-${Date.now()}`;

    // Generate proper S3 paths
    const paths = generateS3Paths(projectId, projectTitle);
    console.log(`📁 Project folder: ${paths.folderName}`);
    console.log(`📍 Base path: ${paths.basePath}`);

    try {
        // 1. Create topic-context.json
        const topicContext = {
            projectId: projectId,
            baseTopic: projectTitle,
            targetAudience: "Travel enthusiasts and Spain tourists",
            videoLength: "8-10 minutes",
            tone: "Informative and inspiring",
            keyPoints: [
                "Must-visit cities: Madrid, Barcelona, Seville",
                "Spanish cuisine highlights",
                "Cultural experiences and festivals",
                "Best time to visit",
                "Travel tips and recommendations"
            ],
            seoKeywords: ["Spain travel", "Spanish tourism", "Madrid Barcelona", "Spanish culture"],
            timestamp: new Date().toISOString(),
            status: "completed",
            agent: "topic-management"
        };

        await uploadToS3(paths.context.topic, JSON.stringify(topicContext, null, 2));
        console.log('✅ Created topic-context.json');

        // 2. Create scene-context.json
        const sceneContext = {
            projectId: projectId,
            totalScenes: 5,
            estimatedDuration: 540, // 9 minutes
            scenes: [{
                    sceneNumber: 1,
                    title: "Introduction to Spain",
                    duration: 90,
                    narration: "Welcome to Spain, a country where ancient history meets vibrant modern culture. From the bustling streets of Madrid to the artistic soul of Barcelona, Spain offers an unforgettable journey through diverse landscapes, rich traditions, and world-renowned cuisine.",
                    visualRequirements: ["Spanish flag", "Madrid skyline", "Barcelona architecture", "Spanish countryside"],
                    keyPoints: ["Geographic diversity", "Cultural richness", "Historical significance"]
                },
                {
                    sceneNumber: 2,
                    title: "Must-Visit Cities",
                    duration: 120,
                    narration: "Madrid, the capital, captivates with its royal palaces and world-class museums like the Prado. Barcelona enchants with Gaudí's architectural masterpieces, while Seville charms with its Moorish heritage and flamenco traditions.",
                    visualRequirements: ["Royal Palace Madrid", "Sagrada Familia", "Alcazar Seville", "Flamenco dancers"],
                    keyPoints: ["Madrid attractions", "Barcelona architecture", "Seville culture"]
                },
                {
                    sceneNumber: 3,
                    title: "Spanish Cuisine",
                    duration: 100,
                    narration: "Spanish cuisine is a celebration of flavors. From authentic paella in Valencia to tapas culture in Andalusia, every region offers unique culinary experiences. Don't miss jamón ibérico, gazpacho, and the perfect tortilla española.",
                    visualRequirements: ["Paella cooking", "Tapas spread", "Jamón ibérico", "Spanish wine"],
                    keyPoints: ["Regional specialties", "Tapas culture", "Traditional dishes"]
                },
                {
                    sceneNumber: 4,
                    title: "Cultural Experiences",
                    duration: 110,
                    narration: "Experience Spain's vibrant festivals like La Tomatina and Running of the Bulls. Explore ancient Roman ruins, Moorish palaces, and Gothic cathedrals. The Spanish lifestyle embraces siesta, late dinners, and passionate celebrations.",
                    visualRequirements: ["Spanish festivals", "Historic monuments", "Cathedral interiors", "Street celebrations"],
                    keyPoints: ["Festivals and traditions", "Historical sites", "Spanish lifestyle"]
                },
                {
                    sceneNumber: 5,
                    title: "Travel Tips and Best Time to Visit",
                    duration: 120,
                    narration: "The best time to visit Spain is spring and fall for perfect weather. Learn basic Spanish phrases, respect siesta hours, and embrace the late dining culture. Pack comfortable walking shoes and prepare for an adventure that will leave you planning your return.",
                    visualRequirements: ["Spanish weather", "Travel preparation", "Spanish phrases", "Happy travelers"],
                    keyPoints: ["Seasonal recommendations", "Cultural etiquette", "Practical tips"]
                }
            ],
            timestamp: new Date().toISOString(),
            status: "completed",
            agent: "script-generator"
        };

        await uploadToS3(paths.context.scene, JSON.stringify(sceneContext, null, 2));
        console.log('✅ Created scene-context.json');

        // 3. Create script.json
        const script = {
            projectId: projectId,
            title: projectTitle,
            totalDuration: 540,
            scenes: sceneContext.scenes,
            metadata: {
                wordCount: 450,
                readingTime: "9 minutes",
                difficulty: "intermediate",
                language: "English"
            },
            timestamp: new Date().toISOString()
        };

        await uploadToS3(paths.script.json, JSON.stringify(script, null, 2));
        console.log('✅ Created script.json');

        // 4. Create media-context.json
        const mediaContext = {
            projectId: projectId,
            totalImages: 15,
            totalScenes: 5,
            mediaByScene: {
                "scene-1": {
                    images: [{
                            id: "spain-flag-001",
                            description: "Spanish flag waving",
                            source: "pexels",
                            url: "placeholder"
                        },
                        {
                            id: "madrid-skyline-001",
                            description: "Madrid city skyline",
                            source: "pexels",
                            url: "placeholder"
                        },
                        {
                            id: "barcelona-arch-001",
                            description: "Barcelona architecture",
                            source: "pexels",
                            url: "placeholder"
                        }
                    ]
                },
                "scene-2": {
                    images: [{
                            id: "royal-palace-001",
                            description: "Royal Palace Madrid",
                            source: "pexels",
                            url: "placeholder"
                        },
                        {
                            id: "sagrada-familia-001",
                            description: "Sagrada Familia Barcelona",
                            source: "pexels",
                            url: "placeholder"
                        },
                        {
                            id: "alcazar-seville-001",
                            description: "Alcazar Seville",
                            source: "pexels",
                            url: "placeholder"
                        }
                    ]
                },
                "scene-3": {
                    images: [{
                            id: "paella-cooking-001",
                            description: "Traditional paella cooking",
                            source: "pexels",
                            url: "placeholder"
                        },
                        {
                            id: "tapas-spread-001",
                            description: "Spanish tapas spread",
                            source: "pexels",
                            url: "placeholder"
                        },
                        {
                            id: "jamon-iberico-001",
                            description: "Jamón ibérico slicing",
                            source: "pexels",
                            url: "placeholder"
                        }
                    ]
                },
                "scene-4": {
                    images: [{
                            id: "spanish-festival-001",
                            description: "Spanish festival celebration",
                            source: "pexels",
                            url: "placeholder"
                        },
                        {
                            id: "cathedral-interior-001",
                            description: "Spanish cathedral interior",
                            source: "pexels",
                            url: "placeholder"
                        },
                        {
                            id: "flamenco-dance-001",
                            description: "Flamenco dancers",
                            source: "pexels",
                            url: "placeholder"
                        }
                    ]
                },
                "scene-5": {
                    images: [{
                            id: "spain-weather-001",
                            description: "Beautiful Spanish weather",
                            source: "pexels",
                            url: "placeholder"
                        },
                        {
                            id: "travel-prep-001",
                            description: "Travel preparation",
                            source: "pexels",
                            url: "placeholder"
                        },
                        {
                            id: "happy-travelers-001",
                            description: "Happy travelers in Spain",
                            source: "pexels",
                            url: "placeholder"
                        }
                    ]
                }
            },
            qualityMetrics: {
                imagesPerScene: 3,
                totalVisualMinutes: 9,
                averageImageQuality: "high",
                diversityScore: 0.85
            },
            timestamp: new Date().toISOString(),
            status: "completed",
            agent: "media-curator"
        };

        await uploadToS3(paths.context.media, JSON.stringify(mediaContext, null, 2));
        console.log('✅ Created media-context.json');

        // 5. Create audio-context.json
        const audioContext = {
            projectId: projectId,
            totalDuration: 540,
            audioSegments: [{
                    sceneNumber: 1,
                    duration: 90,
                    filename: "scene-1.mp3",
                    status: "generated"
                },
                {
                    sceneNumber: 2,
                    duration: 120,
                    filename: "scene-2.mp3",
                    status: "generated"
                },
                {
                    sceneNumber: 3,
                    duration: 100,
                    filename: "scene-3.mp3",
                    status: "generated"
                },
                {
                    sceneNumber: 4,
                    duration: 110,
                    filename: "scene-4.mp3",
                    status: "generated"
                },
                {
                    sceneNumber: 5,
                    duration: 120,
                    filename: "scene-5.mp3",
                    status: "generated"
                }
            ],
            masterAudio: {
                filename: "narration.mp3",
                duration: 540,
                format: "mp3",
                bitrate: "128kbps",
                status: "generated"
            },
            voiceSettings: {
                voice: "neural",
                speed: "normal",
                pitch: "medium",
                language: "en-US"
            },
            timestamp: new Date().toISOString(),
            status: "completed",
            agent: "audio-generator"
        };

        await uploadToS3(paths.context.audio, JSON.stringify(audioContext, null, 2));
        console.log('✅ Created audio-context.json');

        // 6. Create placeholder master audio file
        const audioBuffer = Buffer.alloc(1024, 0); // Minimal audio placeholder
        await uploadToS3(paths.audio.narration, audioBuffer, 'audio/mpeg');
        console.log('✅ Created placeholder narration.mp3');

        // 7. Create placeholder images for each scene
        const imageBuffer = Buffer.alloc(1024, 0); // Minimal image placeholder
        for (let scene = 1; scene <= 5; scene++) {
            for (let img = 1; img <= 3; img++) {
                const imagePath = paths.media.getImagePath(scene, `image-${img}`);
                await uploadToS3(imagePath, imageBuffer, 'image/jpeg');
            }
        }
        console.log('✅ Created placeholder images for all scenes');

        console.log('\n🎉 Sample Project Created Successfully!');
        console.log('=====================================');
        console.log(`📁 Project ID: ${projectId}`);
        console.log(`📍 S3 Path: ${paths.basePath}`);
        console.log(`🌐 Ready for Manifest Builder validation`);

        return {
            projectId,
            folderName: paths.folderName,
            basePath: paths.basePath
        };

    } catch (error) {
        console.error('❌ Error creating sample project:', error);
        throw error;
    }
}

async function uploadToS3(key, body, contentType = 'application/json') {
    const params = {
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType
    };

    await s3.upload(params).promise();
}

// Run if called directly
if (require.main === module) {
    createSampleProject()
        .then(result => {
            console.log('\n✅ Sample project creation completed!');
            console.log('Now you can test the Manifest Builder with this project.');
        })
        .catch(error => {
            console.error('❌ Failed to create sample project:', error);
            process.exit(1);
        });
}

module.exports = {
    createSampleProject
};