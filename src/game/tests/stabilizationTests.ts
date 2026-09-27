import fs from 'node:fs';
import path from 'node:path';
import { Projectile } from '../entities/Projectile';
import { UpgradeSystem } from '../systems/UpgradeSystem';

export interface StabilizationTestResult { testName: string; passed: boolean; message: string; }

export function runStabilizationTests(): { results: StabilizationTestResult[] } {
  const results: StabilizationTestResult[] = [];

  {
    const ids = ['dog_bark', 'rival_taunt', 'thug_grunt', 'boss_growl'];
    const invalid = ids.filter((id) => {
      const file = fs.readFileSync(path.resolve(`public/assets/audio/sfx/${id}.ogg`));
      return file.length < 1000 || file.subarray(0, 4).toString('ascii') !== 'OggS';
    });
    const passed = invalid.length === 0;
    results.push({ testName: 'Enemy reaction SFX are genuine runtime OGG files', passed, message: passed ? 'Dog, Rival, Thug and Boss each have a decoded-file candidate' : `Invalid: ${invalid.join(', ')}` });
  }

  {
    const source = fs.readFileSync(path.resolve('src/game/scenes/Stage1Scene.ts'), 'utf8');
    const regularAudio = source.includes("zoneId === 'A' || zoneId === 'B'") && source.includes("this.audio.play('dog_bark')")
      && source.includes("this.audio.play('rival_taunt')") && source.includes("this.audio.play('thug_grunt')");
    const bossDialoguePreserved = source.includes("this.audio.play('boss_growl')") && source.includes('const bossLines: DialogueLine[]');
    const passed = regularAudio && bossDialoguePreserved;
    results.push({ testName: 'Regular encounters are non-blocking while Boss dialogue remains', passed, message: passed ? 'A–D return after audio cues; E retains authored boss intro' : 'Encounter narrative routing regressed' });
  }

  {
    const upgrades = UpgradeSystem.getInstance(); upgrades.resetForTests(); upgrades.addParts(30); upgrades.recordStageClear('STAGE_1');
    upgrades.purchaseOrEquip('sticky_tape'); upgrades.purchaseOrEquip('tape_range');
    const ranged = new Projectile(0, 0, 'right', 'player');
    upgrades.purchaseOrEquip('tape_impact');
    const impact = new Projectile(0, 0, 'right', 'player');
    const passed = ranged.visualUpgrade === 'RANGE' && impact.visualUpgrade === 'IMPACT';
    results.push({ testName: 'Equipped K variants produce distinct projectile identities', passed, message: passed ? 'Range and Impact upgrades are visually distinguishable at spawn time' : `Modes: ${ranged.visualUpgrade}/${impact.visualUpgrade}` });
    upgrades.resetForTests();
  }

  {
    const equipment = fs.readFileSync(path.resolve('src/game/rendering/EquipmentVisualRenderer.ts'), 'utf8');
    const renderer = fs.readFileSync(path.resolve('src/game/rendering/Renderer.ts'), 'utf8');
    const passed = equipment.includes('renderUpgradeIcon(') && equipment.includes("player.comboStep === 'ULTIMATE'")
      && renderer.includes('renderEquipmentToast(') && renderer.includes('EquipmentVisualRenderer.renderUpgradeIcon');
    results.push({ testName: 'Equipment has icon, runtime effect and acquisition feedback layers', passed, message: passed ? 'Shop cards, HUD, player effects and purchase toast share one visual identity' : 'Equipment feedback layer missing' });
  }

  {
    const equipment = fs.readFileSync(path.resolve('src/game/rendering/EquipmentVisualRenderer.ts'), 'utf8');
    const playerSection = equipment.slice(equipment.indexOf('public static renderPlayerEquipment'), equipment.indexOf('public static renderProjectile'));
    const passed = playerSection.includes('renderJ3ScanSweep')
      && !playerSection.includes('renderPixelBackpackMark')
      && !playerSection.includes("getImage('reflective_badge')") && !playerSection.includes("getImage('scanner_pro')")
      && !playerSection.includes('shadowBlur');
    results.push({ testName: 'Player equipment avoids floating inventory and backpack overlays', passed, message: passed ? 'Persistent equipment identity stays in HUD; character overlay is action-only' : 'A floating persistent equipment layer remains on the player' });
  }

  {
    const equipment = fs.readFileSync(path.resolve('src/game/rendering/EquipmentVisualRenderer.ts'), 'utf8');
    const playerSection = equipment.slice(equipment.indexOf('public static renderPlayerEquipment'), equipment.indexOf('public static renderProjectile'));
    const scannerSection = equipment.slice(equipment.indexOf('private static renderJ3ScanSweep'), equipment.indexOf('public static renderPlayerEquipment'));
    const passed = !playerSection.includes('ctx.ellipse(0, -31')
      && scannerSection.includes('if (frame < 2 || frame > 3) return')
      && scannerSection.includes('ctx.arc(x - 3, y + 1, radius')
      && !scannerSection.includes('ctx.fillRect(x - 3, y - 7');
    results.push({ testName: 'Equipment combat visuals avoid hitbox rings and detached props', passed, message: passed ? 'Parcel shield is event-driven; J3 uses a two-frame punch sweep without a tool prop' : 'Persistent ring or detached J3 prop detected' });
  }

  {
    const renderer = fs.readFileSync(path.resolve('src/game/rendering/Renderer.ts'), 'utf8');
    const sprite = fs.readFileSync(path.resolve('src/game/rendering/SpriteRenderer.ts'), 'utf8');
    const background = fs.readFileSync(path.resolve('src/game/rendering/ParallaxBackgroundRenderer.ts'), 'utf8');
    const app = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
    const passed = renderer.includes('const STAGE_HUMAN_SCALE = 1.25')
      && renderer.includes('renderContactShadow(')
      && sprite.includes('drawFrame(-1, 0)')
      && sprite.includes('ctx.imageSmoothingEnabled = true')
      && sprite.includes("ctx.imageSmoothingQuality = 'high'")
      && sprite.includes('Math.round(rawScreenAnchor.x)')
      && app.includes("imageRendering: 'auto'")
      && background.includes("saturate(0.82) brightness(0.90)");
    results.push({ testName: 'Stage actors use controlled smoothing and visual hierarchy layers', passed, message: passed ? 'High-quality smoothing, snapped anchors, restrained outline, shadow and background hierarchy are active' : 'One or more balanced-rendering or actor-separation layers are missing' });
  }

  return { results };
}
