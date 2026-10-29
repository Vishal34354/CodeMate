#!/usr/bin/env node

/**
 * Cross-platform packaging script for CodeMate Chrome Extension.
 * Creates a clean release ZIP ready for Chrome Web Store upload
 * and Developer Mode "Load Unpacked" usage.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(EXT_DIR, 'dist');

// 1. Run validation
console.log('📦 Starting extension packaging workflow...');
try {
  execSync(`node "${path.join(__dirname, 'validate-build.cjs')}"`, {
    stdio: 'inherit',
    cwd: EXT_DIR,
  });
} catch (err) {
  console.error('\n❌ Packaging aborted due to validation failure.\n');
  process.exit(1);
}

// 2. Read manifest version
const manifest = JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'manifest.json'), 'utf8'));
const version = manifest.version || '1.0.0';
const zipFileName = `codemate-v${version}.zip`;
const zipFilePath = path.join(EXT_DIR, zipFileName);

// Remove older zip if present
if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
}

console.log(`\nCreating Chrome extension archive: ${zipFileName}...`);

// 3. Compress using system utility (cross-platform)
const isWindows = process.platform === 'win32';

try {
  if (isWindows) {
    // Windows PowerShell Compress-Archive
    const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${DIST_DIR}\\*' -DestinationPath '${zipFilePath}' -Force"`;
    execSync(psCmd, { stdio: 'inherit' });
  } else {
    // Linux / macOS zip utility
    const zipCmd = `cd "${DIST_DIR}" && zip -q -r "${zipFilePath}" .`;
    execSync(zipCmd, { stdio: 'inherit' });
  }

  const stat = fs.statSync(zipFilePath);
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Successfully packaged extension archive:`);
  console.log(`   Path: ${zipFilePath}`);
  console.log(`   Size: ${sizeMB} MB (${stat.size} bytes)\n`);
} catch (err) {
  console.error(`❌ Packaging failed: ${err.message}`);
  process.exit(1);
}
