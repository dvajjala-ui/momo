// Renders the share preview (public/og.png) and app icons from the SVG food art.
// Run with Node 23.6+ (TypeScript type stripping): node scripts/make-share-images.mjs
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readdirSync,writeFileSync} from 'node:fs';
import {foodSvg} from '../app/food-art.ts';
const store=new URL('../node_modules/.pnpm/',import.meta.url);
const sharpDir=readdirSync(store).find(d=>d.startsWith('sharp@'));
if(!sharpDir)throw new Error('sharp is not installed (it ships with miniflare via pnpm).');
const sharp=createRequire(new URL(sharpDir+'/node_modules/sharp/',store))('sharp');
const inner=(kind,id)=>foodSvg(kind,id).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
const place=(kind,id,x,y,size)=>`<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 124 124">${inner(kind,id)}</svg>`;
const dots=`<pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#a58a58" opacity=".18"/></pattern>`;

const og=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs>${dots}</defs>
<rect width="1200" height="630" fill="#fffaf0"/><rect width="1200" height="630" fill="url(#dots)"/>
<g transform="rotate(-2 140 92)"><rect x="70" y="70" width="590" height="44" fill="#ffd84d"/><text x="88" y="100" font-family="Arial Black,Arial" font-weight="900" font-size="20" letter-spacing="2" fill="#2a2420">AHMEDABAD · WEEKEND FRIEND CLUB · 18+</text></g>
<text x="70" y="235" font-family="Georgia,serif" font-weight="700" font-size="92" fill="#2a2420">Make a wish.</text>
<text x="70" y="335" font-family="Georgia,serif" font-style="italic" font-size="70" fill="#2448ce">We’ll get your</text>
<text x="70" y="420" font-family="Georgia,serif" font-style="italic" font-size="70" fill="#2448ce">gang ready.</text>
<text x="72" y="492" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="44" fill="#2a2420">momo<tspan font-size="24" fill="#2448ce" dy="-18">✳</tspan></text>
${place('steamed','a',700,60,250)}${place('fried','b',930,120,230)}${place('gravy','c',720,300,220)}${place('tandoori','d',940,330,210)}
<g transform="rotate(-1.5 600 580)"><rect x="-20" y="548" width="1240" height="64" fill="#ffd84d" stroke="#2a2420" stroke-width="3"/><text x="40" y="590" font-family="Segoe Print,Comic Sans MS,cursive" font-weight="700" font-size="28" fill="#2a2420">Come and be found ✳ Phones down. Plates up. ✳ The group chat that actually meets ✳ Kal milte hain? Pakka.</text></g>
</svg>`;
const out=(f)=>fileURLToPath(new URL('../public/'+f,import.meta.url));
await sharp(Buffer.from(og)).png().toFile(out('og.png'));

const icon=(size,pad)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" rx="${pad?0:110}" fill="#ffd84d"/>${place('steamed','i',pad?86:56,pad?96:66,pad?340:400)}</svg>`;
await sharp(Buffer.from(icon(512,false))).resize(512).png().toFile(out('icon-512.png'));
await sharp(Buffer.from(icon(512,false))).resize(192).png().toFile(out('icon-192.png'));
await sharp(Buffer.from(icon(512,true))).resize(512).png().toFile(out('icon-maskable-512.png'));
await sharp(Buffer.from(icon(512,true))).resize(180).png().toFile(out('apple-touch-icon.png'));
writeFileSync(out('favicon.svg'),icon(64,false));
console.log('share images written');
