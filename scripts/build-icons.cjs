// Render the original SVGs into a multi-resolution Windows ICO (PNG frames, Vista+).
// Copyright (c) 2026 p-darksy-r. BrandGame.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const sizes = [16, 24, 32, 48, 64, 128, 256];
const icons = [
    { name: 'brandgame', source: 'src/branding/brandgame.svg', output: 'icons/BrandGame.ico' },
    { name: 'updater', source: 'src/branding/updater.svg', output: 'icons/update.ico' }
];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

async function main() {
    const browser = await chromium.launch({
        headless: true,
        ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {})
    });
    const manifest = { sizes, generatorSha256: hash(fs.readFileSync(__filename)), sha256: {} };
    try {
        const page = await browser.newPage();
        for (const icon of icons) {
            const source = fs.readFileSync(path.join(root, icon.source));
            const frames = [];
            for (const size of sizes) {
                const base64 = await page.evaluate(async ({ source, size }) => {
                    const img = new Image();
                    img.src = 'data:image/svg+xml;base64,' + source;
                    await img.decode();
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = size;
                    canvas.getContext('2d').drawImage(img, 0, 0, size, size);
                    return canvas.toDataURL('image/png').split(',')[1];
                }, { source: source.toString('base64'), size });
                frames.push(Buffer.from(base64, 'base64'));
            }
            const header = Buffer.alloc(6 + sizes.length * 16);
            header.writeUInt16LE(1, 2);
            header.writeUInt16LE(sizes.length, 4);
            let offset = header.length;
            frames.forEach((frame, index) => {
                const entry = 6 + index * 16;
                header[entry] = header[entry + 1] = sizes[index] === 256 ? 0 : sizes[index];
                header.writeUInt16LE(1, entry + 4);
                header.writeUInt16LE(32, entry + 6);
                header.writeUInt32LE(frame.length, entry + 8);
                header.writeUInt32LE(offset, entry + 12);
                offset += frame.length;
            });
            const ico = Buffer.concat([header, ...frames]);
            fs.mkdirSync(path.dirname(path.join(root, icon.output)), { recursive: true });
            fs.writeFileSync(path.join(root, icon.output), ico);
            manifest.sha256[icon.source] = hash(source);
            manifest.sha256[icon.output] = hash(ico);
            fs.mkdirSync(path.join(root, 'artifacts/qa'), { recursive: true });
            fs.writeFileSync(path.join(root, `artifacts/qa/${icon.name}-icon.png`), frames.at(-1));
        }
        fs.writeFileSync(path.join(root, 'src/branding/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    } finally { await browser.close(); }
    console.log('Generated icons/BrandGame.ico and icons/update.ico at 16–256 px.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
