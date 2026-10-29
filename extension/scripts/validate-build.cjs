#!/usr/bin/env node

/**
 * Manifest V3 Build Validator for CodeMate Chrome Extension.
 * 
 * Verifies:
 * - Manifest V3 compliance and required fields.
 * - All icons, HTML pages, content scripts, and background worker exist in dist/.
 * - Bundled assets referenced in HTML files exist.
 * - No forbidden files (source maps, .env, credentials, node_modules) leaked into dist/.
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '../dist');

function fail(message) {
  console.error(`\n❌ [Validation Error]: ${message}\n`);
  process.exit(1);
}

function pass(message) {
  console.log(`  ✓ ${message}`);
}

console.log('🔍 Validating CodeMate Manifest V3 production build...\n');

// 1. Check dist/ exists
if (!fs.existsSync(DIST_DIR)) {
  fail(`Production build directory not found: ${DIST_DIR}. Run "npm run build" first.`);
}
pass(`Build directory exists: ${DIST_DIR}`);

// 2. Check manifest.json exists and is valid
const manifestPath = path.join(DIST_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  fail('manifest.json is missing in dist directory.');
}

let manifest;
try {
  const content = fs.readFileSync(manifestPath, 'utf8');
  manifest = JSON.parse(content);
  pass('manifest.json is valid JSON');
} catch (err) {
  fail(`Failed to parse manifest.json: ${err.message}`);
}

// 3. Validate Manifest V3 properties
if (manifest.manifest_version !== 3) {
  fail(`Expected manifest_version: 3, but found: ${manifest.manifest_version}`);
}
pass(`Manifest version is V3 (${manifest.name} v${manifest.version})`);

if (!manifest.name || typeof manifest.name !== 'string') {
  fail('manifest.json must have a valid "name" field.');
}
if (!manifest.version || !/^\d+\.\d+(\.\d+)?(\.\d+)?$/.test(manifest.version)) {
  fail(`Invalid version format in manifest.json: "${manifest.version}". Expected semver (e.g. 1.0.0).`);
}

// 4. Validate background service worker
if (!manifest.background || !manifest.background.service_worker) {
  fail('manifest.json is missing "background.service_worker".');
}
const workerPath = path.join(DIST_DIR, manifest.background.service_worker);
if (!fs.existsSync(workerPath)) {
  fail(`Background service worker file does not exist: ${manifest.background.service_worker}`);
}
const workerSize = fs.statSync(workerPath).size;
if (workerSize === 0) {
  fail(`Background service worker is an empty file (0 bytes): ${manifest.background.service_worker}`);
}
pass(`Background service worker verified: ${manifest.background.service_worker} (${(workerSize / 1024).toFixed(1)} kB)`);

// 5. Validate side panel HTML & bundled assets
if (!manifest.side_panel || !manifest.side_panel.default_path) {
  fail('manifest.json is missing "side_panel.default_path".');
}
const sidepanelPath = path.join(DIST_DIR, manifest.side_panel.default_path);
if (!fs.existsSync(sidepanelPath)) {
  fail(`Side panel HTML does not exist: ${manifest.side_panel.default_path}`);
}

const htmlContent = fs.readFileSync(sidepanelPath, 'utf8');
if (!htmlContent.includes('id="root"')) {
  fail('Side panel HTML is missing root mount element <div id="root">.');
}

// Extract script and link tags in sidepanel.html and verify files exist
const scriptMatches = htmlContent.matchAll(/src=["']([^"']+)["']/g);
for (const match of scriptMatches) {
  const src = match[1];
  if (!src.startsWith('http://') && !src.startsWith('https://')) {
    const assetPath = path.resolve(DIST_DIR, src.replace(/^\.\//, ''));
    if (!fs.existsSync(assetPath)) {
      fail(`Side panel references non-existent script: "${src}" -> ${assetPath}`);
    }
  }
}

const linkMatches = htmlContent.matchAll(/href=["']([^"']+\.(?:css|js))["']/g);
for (const match of linkMatches) {
  const href = match[1];
  if (!href.startsWith('http://') && !href.startsWith('https://')) {
    const assetPath = path.resolve(DIST_DIR, href.replace(/^\.\//, ''));
    if (!fs.existsSync(assetPath)) {
      fail(`Side panel references non-existent stylesheet: "${href}" -> ${assetPath}`);
    }
  }
}
pass(`Side panel HTML & referenced bundle assets verified: ${manifest.side_panel.default_path}`);

// 6. Validate Content Scripts
if (!Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) {
  fail('manifest.json has no "content_scripts" configured.');
}

for (const cs of manifest.content_scripts) {
  if (!Array.isArray(cs.matches) || cs.matches.length === 0) {
    fail('Content script is missing URL pattern matches.');
  }
  if (!Array.isArray(cs.js) || cs.js.length === 0) {
    fail('Content script is missing "js" array.');
  }
  for (const jsFile of cs.js) {
    const scriptPath = path.join(DIST_DIR, jsFile);
    if (!fs.existsSync(scriptPath)) {
      fail(`Content script file does not exist: ${jsFile}`);
    }
    const size = fs.statSync(scriptPath).size;
    if (size === 0) {
      fail(`Content script file is empty (0 bytes): ${jsFile}`);
    }
    pass(`Content script verified: ${jsFile} (${(size / 1024).toFixed(1)} kB)`);
  }
}

// 7. Validate Icons
const iconSizes = ['16', '48', '128'];
if (manifest.icons) {
  for (const size of iconSizes) {
    if (manifest.icons[size]) {
      const iconPath = path.join(DIST_DIR, manifest.icons[size]);
      if (!fs.existsSync(iconPath)) {
        fail(`Icon for size ${size}px missing: ${manifest.icons[size]}`);
      }
    }
  }
}
if (manifest.action && manifest.action.default_icon) {
  for (const size of iconSizes) {
    const iconRel = typeof manifest.action.default_icon === 'string'
      ? manifest.action.default_icon
      : manifest.action.default_icon[size];
    if (iconRel) {
      const iconPath = path.join(DIST_DIR, iconRel);
      if (!fs.existsSync(iconPath)) {
        fail(`Action icon for size ${size}px missing: ${iconRel}`);
      }
    }
  }
}
pass('All declared icons (16px, 48px, 128px) verified');

// 8. Security & Hygiene Scan: Disallow leaking secrets, dev files, or maps
function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const rel = path.relative(DIST_DIR, full);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git') {
        fail(`Forbidden directory found in production build: ${rel}`);
      }
      scanDir(full);
    } else {
      if (file.startsWith('.env')) {
        fail(`Environment file leaked into production build: ${rel}`);
      }
      if (file.endsWith('.map')) {
        fail(`Source map file found in production build: ${rel}`);
      }
    }
  }
}
scanDir(DIST_DIR);
pass('Security scan passed (no .env files, no node_modules, no sourcemap leaks)');

console.log(`\n🎉 [Validation Passed]: All Manifest V3 assets are valid and ready for packaging!\n`);
