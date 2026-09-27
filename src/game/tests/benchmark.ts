import { Player } from '../entities/Player';
import { Dog } from '../entities/Dog';
import { Rival } from '../entities/Rival';
import { Thug } from '../entities/Thug';
import { BossDog } from '../entities/BossDog';
import { Projectile } from '../entities/Projectile';
import { STAGE_1_CONFIG } from '../config/stage1';
import { CollisionSystem } from '../systems/CollisionSystem';

export interface BenchmarkMetrics {
  benchmarkDurationMs: number;
  simulatedGameTimeSec: number;
  configuredSimulationRateHz: number;
  p95FrameTimeMs: number;
  browserFpsStatus: string;
  droppedFrames: number;
  activeEnemiesCount: number;
  activeProjectilesCount: number;
}

export function runHeadlessBenchmark(frameCount: number = 1000): BenchmarkMetrics {
  const player = new Player(100, 500);
  const dogs = [
    new Dog('bench_dog_1', 300, 500),
    new Dog('bench_dog_2', 450, 500),
    new Dog('bench_dog_3', 800, 500),
  ];
  const rivals = [new Rival('bench_rival_1', 600, 500), new Rival('bench_rival_2', 1200, 500)];
  const thugs = [new Thug('bench_thug_1', 900, 500), new Thug('bench_thug_2', 1400, 500)];
  const boss = new BossDog('bench_boss_1', 2000, 500);
  const projectiles: Projectile[] = [
    new Projectile(150, 520, 'right', 'player'),
    new Projectile(400, 520, 'left', 'bench_rival_1'),
    new Projectile(700, 520, 'right', 'player'),
  ];

  const groundSegments = STAGE_1_CONFIG.GROUND_SEGMENTS;
  const platforms = STAGE_1_CONFIG.PLATFORMS;
  const hazards = STAGE_1_CONFIG.HAZARDS;

  const frameTimesMs: number[] = [];
  const dt = 1 / 60; // 16.667ms fixed step

  const startTime = performance.now();

  for (let f = 0; f < frameCount; f++) {
    const fStart = performance.now();

    // 1. Update Player Physics & Collisions
    player.applyMovementInput(1, dt);
    const prevY = player.y;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    CollisionSystem.resolveHorizontal(player, STAGE_1_CONFIG.WORLD_WIDTH);
    CollisionSystem.resolveVertical(player, platforms, groundSegments, prevY);
    player.update(dt);

    // 2. Update Dogs
    for (const d of dogs) {
      d.updateAI(dt, player.x, player.y, platforms, groundSegments, hazards);
      const prevDogY = d.y;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      CollisionSystem.resolveHorizontal(d, STAGE_1_CONFIG.WORLD_WIDTH);
      CollisionSystem.resolveVertical(d, platforms, groundSegments, prevDogY);
      d.update(dt);
    }

    // 3. Update Rivals
    for (const r of rivals) {
      r.updateAI(dt, player.x, player.y, platforms, groundSegments, hazards);
      const prevRivalY = r.y;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      CollisionSystem.resolveHorizontal(r, STAGE_1_CONFIG.WORLD_WIDTH);
      CollisionSystem.resolveVertical(r, platforms, groundSegments, prevRivalY);
      r.update(dt);
    }

    // 4. Update Thugs
    for (const t of thugs) {
      t.updateAI(player, dt, platforms, groundSegments, hazards);
      const prevThugY = t.y;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      CollisionSystem.resolveHorizontal(t, STAGE_1_CONFIG.WORLD_WIDTH);
      CollisionSystem.resolveVertical(t, platforms, groundSegments, prevThugY);
      t.update(dt);
    }

    // 5. Update Boss
    boss.updateAI(player, dt, platforms, groundSegments, hazards);
    const prevBossY = boss.y;
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
    CollisionSystem.resolveHorizontal(boss, STAGE_1_CONFIG.WORLD_WIDTH);
    CollisionSystem.resolveVertical(boss, platforms, groundSegments, prevBossY);
    boss.update(dt);

    // 6. Update Projectiles
    for (const p of projectiles) {
      p.update(dt);
    }

    const fEnd = performance.now();
    frameTimesMs.push(fEnd - fStart);
  }

  const totalWallTimeMs = performance.now() - startTime;

  frameTimesMs.sort((a, b) => a - b);
  const p95Index = Math.floor(frameTimesMs.length * 0.95);
  const p95FrameTimeMs = frameTimesMs[p95Index];

  // Dropped frame threshold (> 16.67ms)
  const droppedFrames = frameTimesMs.filter((t) => t > 16.67).length;

  return {
    benchmarkDurationMs: totalWallTimeMs,
    simulatedGameTimeSec: frameCount * dt,
    configuredSimulationRateHz: 60,
    p95FrameTimeMs,
    browserFpsStatus: 'NOT VERIFIED',
    droppedFrames,
    activeEnemiesCount: dogs.length + rivals.length + thugs.length + 1,
    activeProjectilesCount: projectiles.length,
  };
}

if (process.argv[1]?.includes('benchmark.ts')) {
  const result = runHeadlessBenchmark(1000);
  console.log('=== GAMEPLAY SIMULATION BENCHMARK REPORT (1000 FRAMES) ===');
  console.log(`- Benchmark Execution Time:       ${result.benchmarkDurationMs.toFixed(2)} ms`);
  console.log(`- Simulated Game Duration:        ${result.simulatedGameTimeSec.toFixed(2)} s`);
  console.log(`- Active Enemies in Load:         ${result.activeEnemiesCount} (3 Dogs, 2 Rivals, 2 Thugs, 1 Boss)`);
  console.log(`- Active Projectiles:             ${result.activeProjectilesCount}`);
  console.log(`- P95 Frame Step Time:            ${result.p95FrameTimeMs.toFixed(4)} ms`);
  console.log(`- Configured simulation rate:     ${result.configuredSimulationRateHz} Hz`);
  console.log(`- Browser rendering FPS:          ${result.browserFpsStatus}`);
  console.log(`- Dropped/Long Simulation Steps:  ${result.droppedFrames} / 1000`);
}
