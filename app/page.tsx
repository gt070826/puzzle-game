"use client";

import { useState, useEffect, useCallback } from "react";

const SIZE = 4;
const TOTAL = SIZE * SIZE;

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
    if (blank !== 0 && blank !== 1) {
      [arr[0], arr[1]] = [arr[1], arr[0]];
    } else {
      [arr[2], arr[3]] = [arr[3], arr[2]];
    }
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

export default function PuzzlePage() {
  const [tiles, setTiles] = useState<number[]>(createSolved);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);

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
      }
    },
    [tiles, won]
  );

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
        Пятнашки
      </h1>
      <p className="text-purple-300 mb-6 text-sm">
        Расставьте плитки по порядку от 1 до 15
      </p>

      <div className="flex gap-8 mb-6 text-center">
        <div>
          <div className="text-2xl font-bold text-white">{moves}</div>
          <div className="text-purple-400 text-xs uppercase tracking-widest">Ходов</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{fmt(time)}</div>
          <div className="text-purple-400 text-xs uppercase tracking-widest">Время</div>
        </div>
      </div>

      <div
        className="grid gap-2 p-3 bg-indigo-950/60 rounded-2xl shadow-2xl border border-indigo-800/40"
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
                  : "bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg hover:from-violet-400 hover:to-purple-600 hover:scale-105 active:scale-95 cursor-pointer"
              }
            `}
          >
            {tile !== 0 ? tile : ""}
          </button>
        ))}
      </div>

      {won && (
        <div className="mt-6 px-6 py-4 bg-green-500/20 border border-green-400/40 rounded-2xl text-center">
          <div className="text-2xl font-bold text-green-300">Победа!</div>
          <div className="text-green-400 text-sm mt-1">
            {moves} ходов · {fmt(time)}
          </div>
        </div>
      )}

      <button
        onClick={startNew}
        className="mt-6 px-8 py-3 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-semibold rounded-xl transition-all shadow-lg"
      >
        Новая игра
      </button>
    </main>
  );
}
