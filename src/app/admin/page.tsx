"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Role = "admin" | "dictator";

type Player = {
  id: string | number;
  display_name?: string | null;
  score_total?: number | null;
};

type AppState = {
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
};

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; role: Role }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const role = status.kind === "ok" ? status.role : null;

  const [players, setPlayers] = useState<Player[] | null>(null);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveConnected, setLiveConnected] = useState(true);
  const [pointsGiven, setPointsGiven] = useState(0);

  const sb = useMemo(() => supabaseBrowser(), []);
  const playersPoller = useRef<number | null>(null);

  const canScore = role === "admin" || role === "dictator";
  const isLocked = appState?.is_locked ?? false;

  const refreshIntervalMs = 2500;
  const statePollerKey = useMemo(() => (role ? "on" : "off"), [role]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "loading" });
    setPanelError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    const json = (await res.json().catch(() => null)) as
      | { role?: Role; error?: string }
      | null;

    if (res.ok && json?.role) {
      setStatus({ kind: "ok", role: json.role });
      return;
    }

    setStatus({
      kind: "error",
      message: json?.error ?? `Login failed (${res.status})`,
    });
  }

  async function loadPlayers() {
    const res = await fetch("/api/public/players");
    const json = (await res.json().catch(() => null)) as
      | { players?: Player[]; error?: string }
      | null;
    if (!res.ok) throw new Error(json?.error ?? `Failed to load players (${res.status})`);
    setPlayers(json?.players ?? []);
  }

  async function loadState() {
    const res = await fetch("/api/state");
    const json = (await res.json().catch(() => null)) as
      | (AppState & { error?: never })
      | { error?: string }
      | null;
    if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? `Failed to load state (${res.status})`);
    setAppState(json as AppState);
  }

  useEffect(() => {
    if (!role) return;
    setPanelError(null);
    loadState().catch((e) =>
      setPanelError(e instanceof Error ? e.message : "Failed to load state"),
    );
    loadPlayers().catch((e) =>
      setPanelError(e instanceof Error ? e.message : "Failed to load players"),
    );
  }, [role]);

  useEffect(() => {
    if (!role) return;
    let subscribed = false;

    const channel = sb
      .channel("realtime:public:players:admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => {
          loadPlayers().catch(() => null);
        },
      )
      .subscribe((status) => {
        subscribed = status === "SUBSCRIBED";
        setLiveConnected(subscribed);
      });

    playersPoller.current = window.setInterval(() => {
      if (subscribed) return;
      loadPlayers().catch(() => null);
    }, 5000);

    return () => {
      if (playersPoller.current) window.clearInterval(playersPoller.current);
      sb.removeChannel(channel);
    };
  }, [role, sb]);

  useEffect(() => {
    if (!role) return;
    let cancelled = false;

    const tick = async () => {
      try {
        await loadState();
      } catch {
        // keep UI usable even if polling fails intermittently
      }
      if (cancelled) return;
      window.setTimeout(tick, refreshIntervalMs);
    };
    const t = window.setTimeout(tick, refreshIntervalMs);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [statePollerKey, role]);

  async function setLock(nextLocked: boolean) {
    setBusy(true);
    setPanelError(null);
    try {
      const res = await fetch(nextLocked ? "/api/lock" : "/api/unlock", {
        method: "POST",
      });
      const json = (await res.json().catch(() => null)) as
        | AppState
        | { error?: string }
        | null;
      if (!res.ok) {
        throw new Error(json && "error" in json ? (json.error ?? "Failed") : "Failed");
      }
      setAppState(json as AppState);
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : "Failed to update lock");
    } finally {
      setBusy(false);
    }
  }

  async function applyScore(player_id: Player["id"], delta: -1 | 1 | 10) {
    setBusy(true);
    setPanelError(null);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ player_id, delta }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; player?: { id: Player["id"]; score_total: number } }
        | { error?: string }
        | null;

      if (res.status === 423) {
        await loadState().catch(() => null);
        throw new Error("Locked");
      }

      if (!res.ok) {
        throw new Error(json && "error" in json ? (json.error ?? "Failed") : "Failed");
      }

      setPointsGiven((n) => n + delta);
      await loadPlayers();
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : "Failed to apply score");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-blue-900/10 bg-white p-8 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-blue-950">
          Admin
        </h1>
        {role ? (
          liveConnected ? (
            <span className="text-xs font-medium text-blue-900/60">
              Live updates enabled
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-800">
              Live updates disconnected
            </span>
          )
        ) : null}
      </div>

        {role ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-900/10 bg-blue-50 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-blue-900/70">
                Role:
              </span>
              <span className="rounded-full bg-blue-900 px-2 py-0.5 text-xs font-semibold text-white">
                {role}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  isLocked
                    ? "font-medium text-amber-800"
                    : "font-medium text-emerald-800"
                }
              >
                {isLocked ? "Locked" : "Unlocked"}
              </span>
              {appState?.locked_at ? (
                <span className="text-xs text-blue-900/60">
                  since {new Date(appState.locked_at).toLocaleString()}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-blue-900/60">
                Points you have given (this session):
              </span>
              <span className="text-sm font-semibold tabular-nums text-blue-950">
                {pointsGiven}
              </span>
            </div>
          </div>
        ) : null}

        {panelError ? (
          <p className="mt-4 text-sm text-red-700">{panelError}</p>
        ) : null}

        {!role ? (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="passcode"
                className="text-sm font-medium text-blue-950"
              >
                Passcode
              </label>
              <input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full rounded-md border border-blue-900/15 bg-white px-3 py-2 text-blue-950 shadow-sm outline-none ring-0 placeholder:text-blue-900/40 focus:border-blue-900/30"
                placeholder="Enter admin/dictator passcode"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={status.kind === "loading"}
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status.kind === "loading" ? "Logging in..." : "Log in"}
            </button>

            {status.kind === "error" ? (
              <p className="text-sm text-red-700">{status.message}</p>
            ) : null}
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            {role === "dictator" ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setLock(!isLocked)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-blue-900/15 bg-white px-4 text-sm font-semibold text-blue-900 shadow-sm transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLocked ? "Unlock" : "Lock"}
                </button>
                <span className="text-sm text-blue-900/60">
                  Dictator-only lock toggle
                </span>
              </div>
            ) : null}

            <section>
              <h2 className="text-sm font-semibold text-blue-950">
                Players
              </h2>
              {players === null ? (
                <p className="mt-3 text-sm text-blue-900/70">Loading…</p>
              ) : (
                <ul className="mt-3 divide-y divide-blue-900/10 rounded-lg border border-blue-900/10">
                  {players.map((p) => (
                    <li
                      key={String(p.id)}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-blue-950">
                          {p.display_name ?? "Unknown player"}
                        </div>
                        <div className="mt-0.5 text-xs text-blue-900/60">
                          Score:{" "}
                          <span className="font-semibold tabular-nums text-blue-950">
                            {p.score_total ?? 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={!canScore || isLocked || busy}
                          onClick={() => applyScore(p.id, -1)}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-blue-900/15 bg-white px-3 text-sm font-semibold text-blue-950 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          −1
                        </button>
                        <button
                          type="button"
                          disabled={!canScore || isLocked || busy}
                          onClick={() => applyScore(p.id, 1)}
                          className="inline-flex h-9 items-center justify-center rounded-md bg-blue-900 px-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          disabled={!canScore || isLocked || busy}
                          onClick={() => applyScore(p.id, 10)}
                          className="inline-flex h-9 items-center justify-center rounded-md bg-blue-900 px-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          +10
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {isLocked ? (
                <p className="mt-3 text-sm text-amber-800">Scoring is locked.</p>
              ) : null}
            </section>
          </div>
        )}
    </div>
  );
}


