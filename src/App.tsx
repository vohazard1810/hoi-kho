/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Wrench } from 'lucide-react';
import { Game } from './game/core/Game';
import { AudioManager } from './game/audio/AudioManager';
import { SceneType } from './game/core/types';
import { BUILD_ID } from './game/config/version';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [scene, setScene] = useState<SceneType>('MENU');

  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new Game(canvasRef.current, setIsDevMode, setScene);
    gameRef.current = game;
    game.start();

    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const handleToggleDev = () => {
    if (gameRef.current) {
      const active = gameRef.current.toggleDevMode();
      setIsDevMode(active);
    }
  };

  const sceneLabel: Record<SceneType, string> = {
    MENU: 'MÀN HÌNH CHÍNH',
    PROLOGUE: 'MỞ ĐẦU — MỘT CƠ HỘI BAY TỚI',
    HUB: 'HUB — TRẠM GIAO HÀNG SXP',
    STAGE_1: 'STAGE 1 — HẺM KHÔNG LỐI THOÁT',
    RESULT: 'KẾT QUẢ GIAO HÀNG',
  };

  const handleToggleAudio = () => {
    const audio = AudioManager.getInstance();
    const isNowActive = audio.toggleMute();
    setIsMuted(!isNowActive);
    if (isNowActive) {
      audio.play('pickup');
    }
  };

  return (
    <div
      id="game_root_container"
      className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-2 select-none overflow-hidden"
    >
      {/* Top Bar / Header */}
      <header
        id="game_header"
        className="w-full max-w-[1280px] flex items-center justify-between py-2 px-3 bg-slate-900/80 border border-slate-800 rounded-t-lg text-xs md:text-sm"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-wider text-orange-500 uppercase">
            NỢ ƠI, TỚI ĐÂY!
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono">
            {sceneLabel[scene]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn_toggle_audio"
            onClick={handleToggleAudio}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
              !isMuted
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 hover:bg-cyan-900'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
            }`}
            title="Bật/Tắt âm thanh"
          >
            {!isMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>ÂM THANH: {!isMuted ? 'BẬT' : 'TẮT'}</span>
          </button>

          {isDevMode && <button
            id="btn_toggle_dev_mode"
            onClick={handleToggleDev}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
              isDevMode
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>DEV: {isDevMode ? 'ON' : 'OFF'} [~]</span>
          </button>}
        </div>
      </header>

      {/* Main Canvas Stage (16:9 1280x720 Logical Viewport) */}
      <main
        id="canvas_wrapper"
        className="relative w-full max-w-[1280px] aspect-[16/9] bg-black border-x border-b border-slate-800 shadow-2xl overflow-hidden"
      >
        <canvas
          id="game_canvas"
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full block cursor-crosshair"
          style={{ imageRendering: 'auto' }}
          tabIndex={0}
        />
      </main>

      {/* Footer Info */}
      <footer
        id="game_footer"
        className="w-full max-w-[1280px] flex flex-wrap items-center justify-between text-xs text-slate-500 py-2 px-3 gap-2"
      >
        {scene === 'MENU' && <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold">Phím:</span>
          <span>A/D / Mũi tên: Di chuyển</span>
          <span>•</span>
          <span>Space / W: Nhảy</span>
          <span>•</span>
          <span>J: Combo Đánh</span>
          <span>•</span>
          <span>K: Bắn Băng Keo</span>
          <span>•</span>
          <span>L: Lướt Né</span>
          <span>•</span>
          <span>Q: Tuyệt Kỹ</span>
          <span>•</span>
          <span>E: Tương Tác / Bàn Đồ Nghề</span>
        </div>}
        <div className="text-slate-600 font-mono">{BUILD_ID} • Giữ kiện, né đúng, trả nợ thật.</div>
      </footer>
    </div>
  );
}
