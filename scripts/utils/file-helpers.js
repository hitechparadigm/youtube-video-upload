#!/usr/bin/env node

/**
 * File Helpers - Common file operations
 */

import fs from 'fs';
import path from 'path';

class FileHelpers {
    static saveResults(filename, data) {
        const timestamp = Date.now();
        const fullPath = `results-${filename}-${timestamp}.json`;
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
        return fullPath;
    }

    static readConfig(configPath) {
        try {
            const fullPath = path.resolve(configPath);
            const content = fs.readFileSync(fullPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.log(`⚠️  Could not read config from ${configPath}: ${error.message}`);
            return null;
        }
    }

    static ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    static generateProjectId(prefix = 'project') {
        const date = new Date().toISOString().split('T')[0];
        const timestamp = Date.now();
        return `${date}-${prefix}-${timestamp}`;
    }

    static cleanupTempFiles(pattern) {
        const files = fs.readdirSync('.');
        const matchingFiles = files.filter(file => file.includes(pattern));
        
        matchingFiles.forEach(file => {
            try {
                fs.unlinkSync(file);
                console.log(`🗑️  Removed: ${file}`);
            } catch (error) {
                console.log(`⚠️  Could not remove ${file}: ${error.message}`);
            }
        });
        
        return matchingFiles.length;
    }
}

export default FileHelpers;