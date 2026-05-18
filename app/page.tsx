"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const SIZE = 4;
const TOTAL = SIZE * SIZE;

type LeaderboardEntry = {
  id: number;
  name: string;
  moves: number;
  time_seconds: number;
};

function createSolved(): number[] {
  return Array.from({ length: TOTAL }, (_, i) => (i + 1) % TOTAL);
}

function shuffle(tiles: number[]): number[] {
  const arr = [...tiles];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const blank = arr.indexOf(0);
  if (!isSolvable(arr, blank)) {
    if (blank !== 0 && blank !== 1) [arr[0], arr[1]] = [arr[1], arr[0]];
    else [arr[2], arr[3]] = [arr[3], arr[2]];
  }
  return arr;
}

function isSolvable(arr: number[], blankIndex: number): boolean {
  let inversions = 0;
  const flat = arr.filter((x) => x !== 0);
  for (let i = 0; i < flat.length; i++)
    for (let j = i + 1; j < flat.length; j++)
      if (flat[i] > flat[j]) inversions++;
  const blankFromBottom = SIZE - Math.floor(blankIndex / SIZE);
  if (SIZE % 2 === 1) return inversions % 2 === 0;
  if (blankFromBottom % 2 === 0) return inversions % 2 === 1;
  return inversions % 2 === 0;
}

function isSolved(tiles: number[]): boolean {
  return tiles.every((t, i) => t === (i + 1) % TOTAL);
}

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const BG_URL =
  "https://images.unsplash.com/photo-1557841066-eefe351308b3?fm=jpg&q=80&w=1920&auto=format&fit=crop";

export default function PuzzlePage() {
  const [tiles, setTiles] = useState<number[]>(createSolved);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);

  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from("leaderboard")
      .select("*")
      .order("moves", { ascending: true })
      .order("time_seconds", { ascending: true })
      .limit(10);
    if (data) setLeaderboard(data);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const startNew = useCallback(() => {
    setTiles(shuffle(createSolved()));
    setMoves(0);
    setWon(false);
    setTime(0);
    setRunning(true);
    setShowNameInput(false);
    setSaved(false);
  }, []);

  useEffect(() => {
    startNew();
  }, [startNew]);

  const move = useCallback(
    (index: number) => {
      if (won) return;
      const blank = tiles.indexOf(0);
      const row = Math.floor(index / SIZE);
      const col = index % SIZE;
      const bRow = Math.floor(blank / SIZE);
      const bCol = blank % SIZE;
      const adjacent =
        (Math.abs(row - bRow) === 1 && col === bCol) ||
        (Math.abs(col - bCol) === 1 && row === bRow);
      if (!adjacent) return;
      const next = [...tiles];
      [next[blank], next[index]] = [next[index], next[blank]];
      setTiles(next);
      setMoves((m) => m + 1);
      if (isSolved(next)) {
        setWon(true);
        setRunning(false);
        setShowNameInput(true);
      }
    },
    [tiles, won]
  );

  const saveScore = async () => {
    if (!playerName.trim()) return;
    setSaving(true);
    await supabase.from("leaderboard").insert({
      name: playerName.trim(),
      moves,
      time_seconds: time,
    });
    setSaving(false);
    setSaved(true);
    setShowNameInput(false);
    fetchLeaderboard();
    setShowLeaderboard(true);
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url('${BG_URL}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <h1 className="text-4xl font-bold text-white mb-1 tracking-tight drop-shadow-lg">
          Пятнашки
        </h1>
        <p className="text-blue-200 mb-6 text-xs">Астана · ЛРТ</p>

        {/* Stats */}
        <div className="flex gap-8 mb-6 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{moves}</div>
            <div className="text-blue-300 text-xs uppercase tracking-widest">Ходов</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{fmt(time)}</div>
            <div className="text-blue-300 text-xs uppercase tracking-widest">Время</div>
          </div>
        </div>

        {/* Board */}
        <div
          className="grid gap-2 p-3 bg-black/30 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
        >
          {tiles.map((tile, i) => (
            <button
              key={i}
              onClick={() => move(i)}
              disabled={tile === 0}
              className={`
                w-16 h-16 sm:w-20 sm:h-20 rounded-xl font-bold text-xl sm:text-2xl
                transition-all duration-100 select-none
                ${
                  tile === 0
                    ? "bg-transparent cursor-default"
                    : "bg-white/20 backdrop-blur-sm text-white shadow-lg border border-white/30 hover:bg-white/30 hover:scale-105 active:scale-95 cursor-pointer"
                }
              `}
            >
              {tile !== 0 ? tile : ""}
            </button>
          ))}
        </div>

        {/* Win banner */}
        {won && (
          <div className="mt-6 w-full px-6 py-4 bg-green-500/20 backdrop-blur-sm border border-green-400/40 rounded-2xl text-center">
            <div className="text-2xl font-bold text-green-300">Победа!</div>
            <div className="text-green-400 text-sm mt-1">
              {moves} ходов · {fmt(time)}
            </div>

            {/* Save score form */}
            {showNameInput && (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Ваше имя"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveScore()}
                  maxLength={20}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-green-400"
                />
                <button
                  onClick={saveScore}
                  disabled={saving || !playerName.trim()}
                  className="px-4 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
                >
                  {saving ? "..." : "Сохранить"}
                </button>
              </div>
            )}
            {saved && (
              <p className="mt-2 text-green-300 text-sm">Результат сохранён!</p>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={startNew}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm active:scale-95 text-white font-semibold rounded-xl transition-all shadow-lg border border-white/20"
          >
            Новая игра
          </button>
          <button
            onClick={() => { setShowLeaderboard((v) => !v); fetchLeaderboard(); }}
            className="px-6 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 backdrop-blur-sm active:scale-95 text-yellow-200 font-semibold rounded-xl transition-all shadow-lg border border-yellow-400/20"
          >
            Рекорды
          </button>
        </div>

        {/* Leaderboard */}
        {showLeaderboard && (
          <div className="mt-6 w-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h2 className="text-white font-bold text-lg">Таблица рекордов</h2>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-6">
                Рекордов пока нет — будьте первым!
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs uppercase">
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Имя</th>
                    <th className="px-4 py-2 text-right">Ходов</th>
                    <th className="px-4 py-2 text-right">Время</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className="border-t border-white/5 text-white"
                    >
                      <td className="px-4 py-2 text-white/40">{i + 1}</td>
                      <td className="px-4 py-2 font-medium">{entry.name}</td>
                      <td className="px-4 py-2 text-right">{entry.moves}</td>
                      <td className="px-4 py-2 text-right">{fmt(entry.time_seconds)}</td>
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
