const fs = require('fs');
const path = require('path');

// Read files
const css = fs.readFileSync(path.join(__dirname, 'css/style.css'), 'utf8');

// Read and process JS files
function processJsFile(filePath) {
    let content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    
    // Remove imports: e.g., import { ... } from '...'; or import ... from '...';
    content = content.replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '');
    
    // Remove export statements:
    // Replace "export class Name" with "class Name"
    content = content.replace(/export\s+class\s+/g, 'class ');
    // Replace "export const Name" with "const Name"
    content = content.replace(/export\s+const\s+/g, 'const ');
    
    return content;
}

const constantsJs = processJsFile('js/constants.js');
const engineJs = processJsFile('js/game-engine.js');
const rendererJs = processJsFile('js/renderer.js');
const inputJs = processJsFile('js/input.js');
const battleManagerJs = processJsFile('js/battle-manager.js');
const appJs = processJsFile('js/app.js');

// Concatenate in order
const bundledJs = [
    '// --- CONSTANTS ---',
    constantsJs,
    '// --- GAME ENGINE ---',
    engineJs,
    '// --- RENDERER ---',
    rendererJs,
    '// --- INPUT HANDLER ---',
    inputJs,
    '// --- BATTLE MANAGER ---',
    battleManagerJs,
    '// --- APP ---',
    appJs
].join('\n\n');

// Read index.html
let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Replace stylesheet link with inline style
html = html.replace(/<link\s+rel=["']stylesheet["']\s+href=["']css\/style\.css["']\s*\/?>|<link\s+href=["']css\/style\.css["']\s+rel=["']stylesheet["']\s*\/?>/i, `<style>\n${css}\n</style>`);

// Replace script tag with inline script
html = html.replace(/<script\s+type=["']module["']\s+src=["']js\/app\.js["']\s*><\/script>/i, `<script>\n${bundledJs}\n</script>`);

// Write standalone HTML files
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
    fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
}

fs.writeFileSync(path.join(__dirname, 'dist/offline.html'), html, 'utf8');
fs.writeFileSync(path.join(__dirname, 'offline_playground.html'), html, 'utf8');

console.log('Successfully bundled into offline_playground.html and dist/offline.html!');
