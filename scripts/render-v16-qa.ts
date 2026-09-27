/** Optional native Canvas QA. CANVAS_MODULE can point to @napi-rs/canvas. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { AssetManager } from '../src/game/assets/AssetManager';
import { Renderer } from '../src/game/rendering/Renderer';
import { SpriteRenderer } from '../src/game/rendering/SpriteRenderer';
import { EquipmentVisualRenderer } from '../src/game/rendering/EquipmentVisualRenderer';
import { Player } from '../src/game/entities/Player';
import { NPC } from '../src/game/entities/NPC';
import { Camera } from '../src/game/core/Camera';
import { UpgradeSystem } from '../src/game/systems/UpgradeSystem';
import { ObjectiveSystem } from '../src/game/systems/ObjectiveSystem';
import { HubTutorialSystem } from '../src/game/systems/HubTutorialSystem';
import { TrainingTarget } from '../src/game/systems/TrainingTarget';
import { BossDog } from '../src/game/entities/BossDog';
import { GameFeelSystem } from '../src/game/systems/GameFeelSystem';
import { STAGE_1_CONFIG } from '../src/game/config/stage1';

const require = createRequire(import.meta.url);
const { createCanvas, Image: NativeImage, GlobalFonts } = require(process.env.CANVAS_MODULE ?? '@napi-rs/canvas');
for (const family of ['system-ui', 'sans-serif']) {
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', family);
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', family);
}
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 'monospace');
// Native Canvas misclassifies PNGs whose XMP metadata contains SVG markup.
// Strip ancillary metadata in the QA decoder ONLY; shipped files are untouched.
function decodePng(data: Buffer): Buffer {
  const chunks = [data.subarray(0, 8)];
  for (let p = 8; p + 12 <= data.length;) {
    const size = data.readUInt32BE(p), type = data.toString('ascii', p + 4, p + 8);
    if (['IHDR', 'IDAT', 'IEND', 'PLTE', 'tRNS'].includes(type)) chunks.push(data.subarray(p, p + size + 12));
    p += size + 12;
  }
  return Buffer.concat(chunks);
}
class LocalImage extends NativeImage {
  set src(value: string | Buffer) { super.src = typeof value === 'string' && value.startsWith('/assets/') ? decodePng(fs.readFileSync(path.resolve('public', value.slice(1)))) : value; }
  get src() { return super.src; }
}
Object.assign(globalThis, {
  Image: LocalImage,
  document: { createElement: (name: string) => { if (name !== 'canvas') throw Error(name); return createCanvas(1, 1); } },
  fetch: async (url: string) => {
    try { const data = fs.readFileSync(path.resolve('public', url.split('?')[0].slice(1))); return { ok: true, json: async () => JSON.parse(data.toString()), arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) }; }
    catch { return { ok: false, status: 404, statusText: 'Not found' }; }
  },
});
const output = path.resolve(process.argv[2] ?? 'qa-v16'); fs.mkdirSync(output, { recursive: true });
const canvas = createCanvas(1280, 720), renderer = new Renderer(canvas), manager = AssetManager.getInstance();
await manager.loadPreferredCharacterWithFallback('player', '/assets/staging_hd', '/assets/staging');
await manager.loadAndActivateCharacter('boss_dog');
await renderer.preloadHubAssets(); await renderer.preloadStageNpcAssets();
await renderer.preloadStage1Background(); await renderer.preloadWorldGeometry();
EquipmentVisualRenderer.renderHud(canvas.getContext('2d'), UpgradeSystem.getInstance().getSnapshot());
await new Promise(resolve => setTimeout(resolve, 30));
const player = new Player(350, 556), camera = new Camera(); player.isGrounded = true;
const npc = new NPC('coba', 680, 556, 'coba', 'Cô Ba', '', () => {});
const upgrades = UpgradeSystem.getInstance().getSnapshot(), tutorial = new HubTutorialSystem(false);
const save = (name: string) => fs.writeFileSync(path.join(output, name), canvas.toBuffer('image/png'));
const hub = () => renderer.renderHubScene(camera, player, npc, null, false, false, upgrades, false, 0, null, tutorial.getSnapshot());
hub(); save('hub.png');
renderer.renderDialogueOverlay({ active: true, index: 0, total: 1, line: { speaker: 'CÔ BA', text: 'Giữ kiện nguyên vẹn, Khờ nhé. Né trước khi ham đánh; giao xong mình tính tiền công.', tone: 'warning' } } as any); save('dialogue.png');
tutorial.start(player); const training = new TrainingTarget(); training.clock = 1.3;
const snapshot = tutorial.getSnapshot(); snapshot.stepIndex = 4; snapshot.step = { id: 'DODGE', title: 'GIỮ NGƯỜI, GIỮ KIỆN', instruction: 'Né trong vạch cam khi nó sáng', keyLabel: 'L', action: 'dodge' };
renderer.renderHubScene(camera, player, npc, null, false, false, upgrades, false, 0, null, snapshot, training); save('training.png');
const boss = new BossDog('b', 760, 568); boss.state = 'BITE_TELEGRAPH';
const customer = new NPC('chutu', 1180, 556, 'chutu', 'Chú Tư', '', () => {});
const objective = ObjectiveSystem.getInstance(); objective.reset(); objective.startDelivery(); objective.damageParcel(18); player.momentum = 100;
renderer.renderStage1Scene(camera, player, customer, [], [], [], [boss], [], [], [], [], STAGE_1_CONFIG.GROUND_SEGMENTS, STAGE_1_CONFIG.PLATFORMS, STAGE_1_CONFIG.HAZARDS, STAGE_1_CONFIG.ZONES, 82, 20000, null, 'Giữ kiện nguyên vẹn • Tới nhà Chú Tư', 'E', 'TRÙM: CHÓ ĐẠI CA', new GameFeelSystem().getSnapshot(), upgrades, new Set()); save('stage.png');
renderer.renderResultScene({ success: true, remainingHp: 64, maxHp: 100, parcelCondition: 82, baseReward: 41000, bonusReward: 20000, totalReward: 61000, reward: 61000, isDamaged: false, debtPayment: 61000, remainingDebt: 19939000, lifetimeEarnings: 61000, deliveriesCompleted: 1 }, 0.75); save('result.png');
const set = manager.getCharacterSet('player')!;
const sheet = createCanvas(1200, 12 * 176), ctx = sheet.getContext('2d');
ctx.fillStyle = '#101b2b'; ctx.fillRect(0, 0, sheet.width, sheet.height);
let row = 0;
for (const [state, data] of set.states) {
  for (let frame = 0; frame < data.contract.frameCount; frame++) {
    const x = frame * 200 + 100, y = row * 176 + 156;
    ctx.fillStyle = '#cbd5e1'; ctx.font = '12px sans-serif'; ctx.fillText(`${state} ${frame + 1}`, x - 70, y - 140);
    ctx.strokeStyle = '#334155'; ctx.beginPath(); ctx.moveTo(x - 90, y); ctx.lineTo(x + 90, y); ctx.stroke();
    SpriteRenderer.renderCharacter(ctx, camera, set, state, (frame + 0.01) / data.contract.fps, x, y, 'right', 1.5);
  }
  row++;
}
fs.writeFileSync(path.join(output, 'all-frames.png'), sheet.toBuffer('image/png'));
console.log('Native renderer QA written to', output);
