/**
 * Auto-download script for face-api.js models
 * Run: node download-models.js
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for face-api.js weights
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

// Models to download
const MODELS = [
  // SSD MobileNet v1 (Face Detection)
  {
    name: 'SSD MobileNet v1',
    files: [
      'ssd_mobilenetv1_model-weights_manifest.json',
      'ssd_mobilenetv1_model-shard1',
      'ssd_mobilenetv1_model-shard2'
    ]
  },
  // Face Landmarks 68
  {
    name: 'Face Landmarks 68',
    files: [
      'face_landmark_68_model-weights_manifest.json',
      'face_landmark_68_model-shard1'
    ]
  },
  // Face Recognition
  {
    name: 'Face Recognition',
    files: [
      'face_recognition_model-weights_manifest.json',
      'face_recognition_model-shard1'
    ]
  },
  // Tiny Face Detector
  {
    name: 'Tiny Face Detector',
    files: [
      'tiny_face_detector_model-weights_manifest.json',
      'tiny_face_detector_model-shard1'
    ]
  }
];

const MODELS_DIR = path.join(__dirname, 'public', 'models');

// Create models directory if it doesn't exist
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Download a single file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete partial file
      reject(err);
    });
  });
}

// Download all models
async function downloadModels() {
  console.log('🚀 Starting face-api.js model download...\n');
  
  ensureDirectoryExists(MODELS_DIR);
  
  let downloaded = 0;
  let failed = 0;
  
  for (const model of MODELS) {
    console.log(`📦 Downloading ${model.name}...`);
    
    for (const file of model.files) {
      const url = `${BASE_URL}/${file}`;
      const dest = path.join(MODELS_DIR, file);
      
      // Skip if already exists
      if (fs.existsSync(dest)) {
        console.log(`  ✓ ${file} (already exists)`);
        downloaded++;
        continue;
      }
      
      try {
        await downloadFile(url, dest);
        console.log(`  ✓ ${file}`);
        downloaded++;
      } catch (error) {
        console.error(`  ✗ ${file} - ${error.message}`);
        failed++;
      }
    }
    
    console.log('');
  }
  
  console.log('─────────────────────────────');
  console.log(`✅ Downloaded: ${downloaded} files`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} files`);
    console.log('\nRetry failed downloads by running the script again.');
  }
  console.log(`\n📁 Models saved to: ${MODELS_DIR}`);
  console.log('🎉 Setup complete! You can now run the app.');
}

// Run download
downloadModels().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
