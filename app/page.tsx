"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const COLS = 20;
const ROWS = 20;
const CELL = 24;
const TICK = 120;

type Point = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

type LeaderboardEntry = { id: number; name: string; moves: number };

const OPPOSITE: Record<Dir, Dir> = {
  UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT",
};

function randomFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

const BG_URL =
  "https://images.unsplash.com/photo-1557841066-eefe351308b3?fm=jpg&q=80&w=1920&auto=format&fit=crop";

export default function SnakePage() {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "dead">("idle");

  const [showName, setShowName] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const dirRef = useRef<Dir>("RIGHT");
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const statusRef = useRef<"idle" | "running" | "dead">("idle");
  const scoreRef = useRef(0);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from("leaderboard")
      .select("*")
      .order("moves", { ascending: false })
      .limit(10);
    if (data) setLeaderboard(data);
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  const startGame = useCallback(() => {
    const initSnake = [{ x: 10, y: 10 }];
    const initFood = randomFood(initSnake);
    snakeRef.current = initSnake;
    foodRef.current = initFood;
    dirRef.current = "RIGHT";
    scoreRef.current = 0;
    setSnake(initSnake);
    setFood(initFood);
    setDir("RIGHT");
    setScore(0);
    setStatus("running");
    statusRef.current = "running";
    setShowName(false);
    setSaved(false);
  }, []);

  // Game loop
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      const s = snakeRef.current;
      const d = dirRef.current;
      const head = s[0];
      const next: Point = {
        x: d === "LEFT" ? head.x - 1 : d === "RIGHT" ? head.x + 1 : head.x,
        y: d === "UP" ? head.y - 1 : d === "DOWN" ? head.y + 1 : head.y,
      };

      if (
        next.x < 0 || next.x >= COLS ||
        next.y < 0 || next.y >= ROWS ||
        s.some((p) => p.x === next.x && p.y === next.y)
      ) {
        setStatus("dead");
        statusRef.current = "dead";
        setShowName(true);
        return;
      }

      const ate = next.x === foodRef.current.x && next.y === foodRef.current.y;
      const newSnake = ate ? [next, ...s] : [next, ...s.slice(0, -1)];
      snakeRef.current = newSnake;

      if (ate) {
        const newFood = randomFood(newSnake);
        foodRef.current = newFood;
        scoreRef.current += 1;
        setFood(newFood);
        setScore((sc) => {
          const next = sc + 1;
          setBest((b) => Math.max(b, next));
          return next;
        });
      }

      setSnake([...newSnake]);
    }, TICK);
    return () => clearInterval(id);
  }, [status]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "UP", ArrowDown: "DOWN",
        ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
      };
      const newDir = map[e.key];
      if (!newDir) return;
      e.preventDefault();
      if (statusRef.current === "idle") {
        startGame();
        return;
      }
      if (statusRef.current === "dead") return;
      if (newDir !== OPPOSITE[dirRef.current]) {
        dirRef.current = newDir;
        setDir(newDir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startGame]);

  const saveScore = async () => {
    if (!playerName.trim()) return;
    setSaving(true);
    await supabase.from("leaderboard").insert({
      name: playerName.trim(),
      moves: scoreRef.current,
      time_seconds: 0,
    });
    setSaving(false);
    setSaved(true);
    setShowName(false);
    fetchLeaderboard();
    setShowLeaderboard(true);
  };

  // Mobile controls
  const swipe = (d: Dir) => {
    if (statusRef.current === "idle") { startGame(); return; }
    if (statusRef.current === "dead") return;
    if (d !== OPPOSITE[dirRef.current]) {
      dirRef.current = d;
      setDir(d);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4 relative select-none"
      style={{ backgroundImage: `url('${BG_URL}')`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <h1 className="text-4xl font-bold text-white mb-1 tracking-tight drop-shadow-lg">Змейка</h1>
        <p className="text-blue-200 mb-4 text-xs">Астана · ЛРТ</p>

        {/* Stats */}
        <div className="flex gap-10 mb-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{score}</div>
            <div className="text-blue-300 text-xs uppercase tracking-widest">Счёт</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-300">{best}</div>
            <div className="text-blue-300 text-xs uppercase tracking-widest">Рекорд</div>
          </div>
        </div>

        {/* Board */}
        <div
          className="relative bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ width: COLS * CELL, height: ROWS * CELL }}
        >
          {/* Grid lines */}
          <svg className="absolute inset-0 opacity-10" width={COLS * CELL} height={ROWS * CELL}>
            {Array.from({ length: COLS + 1 }).map((_, i) => (
              <line key={`v${i}`} x1={i * CELL} y1={0} x2={i * CELL} y2={ROWS * CELL} stroke="white" strokeWidth="0.5" />
            ))}
            {Array.from({ length: ROWS + 1 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * CELL} x2={COLS * CELL} y2={i * CELL} stroke="white" strokeWidth="0.5" />
            ))}
          </svg>

          {/* Snake */}
          {snake.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-sm transition-none"
              style={{
                left: p.x * CELL + 1,
                top: p.y * CELL + 1,
                width: CELL - 2,
                height: CELL - 2,
                background: i === 0
                  ? "linear-gradient(135deg, #34d399, #10b981)"
                  : `hsl(${160 - i * 2}, 70%, ${55 - i * 0.5}%)`,
              }}
            />
          ))}

          {/* Food */}
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              left: food.x * CELL + 3,
              top: food.y * CELL + 3,
              width: CELL - 6,
              height: CELL - 6,
              background: "radial-gradient(circle, #f87171, #ef4444)",
            }}
          />

          {/* Overlay: idle / dead */}
          {status !== "running" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-sm px-6">
              {status === "dead" ? (
                <>
                  <p className="text-red-400 font-bold text-2xl mb-1">Игра окончена</p>
                  <p className="text-white/60 text-sm mb-4">Счёт: {score}</p>
                  {!saved ? (
                    <div className="w-full flex flex-col gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="Введите имя для рекорда"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveScore()}
                        maxLength={20}
                        autoFocus
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-green-400 text-center"
                      />
                      <button
                        onClick={saveScore}
                        disabled={saving || !playerName.trim()}
                        className="w-full py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-semibold rounded-lg transition-all"
                      >
                        {saving ? "Сохраняем..." : "Сохранить результат"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-green-300 text-sm mb-4">Результат сохранён!</p>
                  )}
                  <button
                    onClick={startGame}
                    className="px-6 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-all active:scale-95 border border-white/20"
                  >
                    Играть снова
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={startGame}
                    className="px-6 py-2 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-all active:scale-95"
                  >
                    Начать игру
                  </button>
                  <p className="text-white/30 text-xs mt-3">или нажмите любую стрелку</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="mt-4 grid grid-cols-3 gap-1 w-32">
          <div />
          <button onClick={() => swipe("UP")} className="py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-lg active:scale-95 transition-all">↑</button>
          <div />
          <button onClick={() => swipe("LEFT")} className="py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-lg active:scale-95 transition-all">←</button>
          <button onClick={() => swipe("DOWN")} className="py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-lg active:scale-95 transition-all">↓</button>
          <button onClick={() => swipe("RIGHT")} className="py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-lg active:scale-95 transition-all">→</button>
        </div>


        {/* Leaderboard button */}
        <button
          onClick={() => { setShowLeaderboard((v) => !v); fetchLeaderboard(); }}
          className="mt-4 px-6 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 font-semibold rounded-xl border border-yellow-400/20 transition-all active:scale-95 text-sm"
        >
          Рекорды
        </button>

        {/* Leaderboard */}
        {showLeaderboard && (
          <div className="mt-4 w-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h2 className="text-white font-bold">Таблица рекордов</h2>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-6">Рекордов пока нет!</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs uppercase">
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Имя</th>
                    <th className="px-4 py-2 text-right">Счёт</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((e, i) => (
                    <tr key={e.id} className="border-t border-white/5 text-white">
                      <td className="px-4 py-2 text-white/40">{i + 1}</td>
                      <td className="px-4 py-2 font-medium">{e.name}</td>
                      <td className="px-4 py-2 text-right">{e.moves}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <p className="mt-6 text-white/20 text-xs">Фото: Unsplash — Астана ночью</p>
      </div>
    </main>
  );
}
