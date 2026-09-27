import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AudioSink, getMusicSceneGain } from '../audio/AudioManager';
import { APP_VERSION, BUILD_ID } from '../config/version';
import { STAGE_1_CONFIG } from '../config/stage1';
import { GameFeelSystem } from '../systems/GameFeelSystem';
import { RunTelemetry } from '../systems/RunTelemetry';

interface Result { testName: string; passed: boolean; message: string }

export function runV19_3Tests(): { results: Result[] } {
  const results: Result[] = [];
  const test = (testName: string, fn: () => void) => {
    try { fn(); results.push({ testName, passed: true, message: 'V19.3 polish contract passed' }); }
    catch (error) { results.push({ testName, passed: false, message: String(error) }); }
  };

  test('V19.3 version/build/package contract is synchronized', () => {
    assert.equal(APP_VERSION, '0.19.3');
    assert.match(BUILD_ID, /^V19\.3/);
    assert.equal(JSON.parse(fs.readFileSync('package.json', 'utf8')).version, APP_VERSION);
  });

  test('Scene music mix lifts opening and reserves combat headroom', () => {
    assert.ok(getMusicSceneGain('menu_music') > getMusicSceneGain('hub_music'));
    assert.ok(getMusicSceneGain('stage_music') < getMusicSceneGain('hub_music'));
    assert.equal(getMusicSceneGain('result_music'), getMusicSceneGain('stage_music'));
  });

  test('Confirmed J3 and Ultimate duck music while light hits do not', () => {
    const ducks: Array<[number | undefined, number | undefined]> = [];
    const sink: AudioSink = { play: () => undefined, duckMusic: (db, ms) => ducks.push([db, ms]) };
    const feel = new GameFeelSystem(sink);
    feel.triggerMeleeHit('J1', ['enemy'], 0, 0);
    feel.triggerMeleeHit('J3', ['enemy'], 0, 0);
    feel.triggerMeleeHit('ULTIMATE', ['enemy'], 0, 0);
    assert.deepEqual(ducks, [[-3, 175], [-4, 230]]);
  });

  test('Stage encounters use authored multi-enemy pressure in Zones B-D', () => {
    const counts = Object.fromEntries(['A', 'B', 'C', 'D', 'E'].map((zone) => [zone, STAGE_1_CONFIG.ENEMY_SPAWNS.filter((spawn) => spawn.zone === zone).length]));
    assert.deepEqual(counts, { A: 1, B: 2, C: 2, D: 2, E: 1 });
  });

  test('Pincer spawns bracket the encounter trigger instead of stacking', () => {
    for (const zone of ['B', 'C', 'D'] as const) {
      const spawns = STAGE_1_CONFIG.ENEMY_SPAWNS.filter((spawn) => spawn.zone === zone);
      const trigger = Math.min(...spawns.map((spawn) => spawn.triggerX));
      assert.ok(spawns.some((spawn) => spawn.spawnX < trigger), `${zone} missing rear threat`);
      assert.ok(spawns.some((spawn) => spawn.spawnX > trigger), `${zone} missing forward threat`);
    }
  });

  test('Rival drive-by remains part of the combined Zone C encounter', () => {
    const stage = fs.readFileSync('src/game/scenes/Stage1Scene.ts', 'utf8');
    assert.match(stage, /rival\.startDriveBy\(\)/);
    assert.ok(STAGE_1_CONFIG.ENEMY_SPAWNS.some((spawn) => spawn.id === 'dog_c_flank' && spawn.zone === 'C'));
  });

  test('Encounter cue is compact, short and suppresses cleared-state banners', () => {
    const renderer = fs.readFileSync('src/game/rendering/Renderer.ts', 'utf8');
    assert.match(renderer, /encounterAge < 0\.9/);
    assert.match(renderer, /isCombatCue = !\/\^\(ĐÃ\|GIAO\)\//);
    assert.doesNotMatch(renderer, /fillRect\(-204, -24, 408, 46\)/);
  });

  test('Player-facing objective removes debug-style zone brackets', () => {
    const stage = fs.readFileSync('src/game/scenes/Stage1Scene.ts', 'utf8');
    assert.match(stage, /let objectiveBanner = this\.currentEncounterName/);
    assert.doesNotMatch(stage, /`\[ \$\{this\.currentZoneId\} \]/);
  });

  test('Run telemetry tracks action mix, deaths, damage and Boss TTK', () => {
    const telemetry = RunTelemetry.getInstance();
    telemetry.resetForTests(); telemetry.startStage(100);
    telemetry.update(12); telemetry.recordAction('J'); telemetry.recordAction('L');
    telemetry.recordMeleeHits(2); telemetry.recordDamageTaken(); telemetry.recordDeath();
    telemetry.beginBossAttempt(); telemetry.update(18); telemetry.recordBossDefeated(); telemetry.complete(82);
    const snapshot = telemetry.getSnapshot();
    assert.equal(snapshot.elapsedSeconds, 30);
    assert.deepEqual(snapshot.actionInputs, { J: 1, K: 0, L: 1, Q: 0 });
    assert.equal(snapshot.confirmedMeleeHits, 2); assert.equal(snapshot.deaths, 1);
    assert.equal(snapshot.damageTakenEvents, 1); assert.equal(snapshot.bossTtkSeconds, 18);
    assert.equal(snapshot.parcelEnd, 82); assert.equal(snapshot.completed, true);
  });

  test('Hub closes the post-delivery progression wall with recap and Job Board', () => {
    const hub = fs.readFileSync('src/game/scenes/HubScene.ts', 'utf8');
    assert.match(hub, /isDayRecapOpen/);
    assert.match(hub, /isJobBoardOpen/);
    assert.match(hub, /Bảng Đơn Hàng/);
    assert.match(hub, /deliveriesCompleted > 0/);
  });

  test('Job Board exposes replay but truthfully marks Stage 2 as not implemented', () => {
    const renderer = fs.readFileSync('src/game/rendering/Renderer.ts', 'utf8');
    assert.match(renderer, /HẺM KHÔNG LỐI THOÁT/);
    assert.match(renderer, /CHUNG CƯ CŨ MƯA ĐÊM/);
    assert.match(renderer, /STAGE 2 • SẮP MỞ/);
  });

  test('Audio source generator contains separate crack and low body layers', () => {
    const generator = fs.readFileSync('scripts/generate-audio-v19-2.mjs', 'utf8');
    assert.match(generator, /2500 \+ variant \* 180/);
    assert.match(generator, /addTone\(out, 0\.006, duration - 0\.006, 92, 34/);
  });

  return { results };
}
