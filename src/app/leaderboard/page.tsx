"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Player = {
  id: string | number;
  display_name: string;
  name?: string | null;
  score_total?: number | null;
  updated_at?: string | null;
};

async function fetchPlayers(signal?: AbortSignal): Promise<Player[]> {
  const res = await fetch("/api/public/players", { signal });
  const json = (await res.json().catch(() => null)) as { players?: Player[] } | null;
  return json?.players ?? [];
}

export default function LeaderboardPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(true);
  const refreshTimer = useRef<number | null>(null);
  const poller = useRef<number | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetchPlayers(ac.signal)
      .then((p) => setPlayers(p))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    return () => ac.abort();
  }, []);
  

  useEffect(() => {
    let subscribed = false;

    const channel = sb
      .channel("realtime:public:players")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => {
          // Debounce refetches to keep ordering correct and avoid UI thrash.
          if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
          refreshTimer.current = window.setTimeout(() => {
            fetchPlayers()
              .then((p) => setPlayers(p))
              .catch(() => null);
          }, 150);
        },
      )
      .subscribe((status) => {
        subscribed = status === "SUBSCRIBED";
        setLiveConnected(subscribed);
      });

    // If we don't reach SUBSCRIBED, fall back to polling every 5s until reconnected.
    poller.current = window.setInterval(() => {
      if (subscribed) return;
      fetchPlayers()
        .then((p) => setPlayers(p))
        .catch(() => null);
    }, 5000);

    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      if (poller.current) window.clearInterval(poller.current);
      sb.removeChannel(channel);
    };
  }, [sb]);

  return (
    <div className="rounded-2xl border border-blue-900/10 bg-white p-8 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-blue-950">
          Leaderboard
        </h1>
        {liveConnected ? (
          <span className="text-xs font-medium text-blue-900/60">
            Live updates enabled
          </span>
        ) : (
          <span className="text-xs font-semibold text-amber-800">
            Live updates disconnected
          </span>
        )}
      </div>

      {error ? <p className="mt-6 text-sm text-red-700">{error}</p> : null}

      {players === null ? (
        <p className="mt-6 text-sm text-blue-900/70">Loading…</p>
      ) : (
        <ol className="mt-6 divide-y divide-blue-900/10 rounded-lg border border-blue-900/10">
          {players.map((p, idx) => (
            <li
              key={String(p.id)}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-8 shrink-0 text-sm font-semibold tabular-nums text-blue-900/50">
                  {idx + 1}
                </span>
                <span className="truncate text-sm font-medium text-blue-950">
                  {p.display_name}
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-blue-950">
                {p.score_total ?? 0}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}


