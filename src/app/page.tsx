export default function Home() {
  return (
    <div className="rounded-2xl border border-blue-900/10 bg-gradient-to-b from-blue-50 to-white p-10">
      <h1 className="text-3xl font-semibold tracking-tight text-blue-950">
        Page House Ski Trip
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-blue-900/70">
        Bottoms up bitches.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href="/leaderboard"
          className="inline-flex h-10 items-center justify-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
        >
          View leaderboard
        </a>
        <a
          href="/admin"
          className="inline-flex h-10 items-center justify-center rounded-md border border-blue-900/15 bg-white px-4 text-sm font-semibold text-blue-900 shadow-sm transition-colors hover:bg-blue-50"
        >
          Admin
        </a>
      </div>
    </div>
  );
}
