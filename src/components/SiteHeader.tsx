import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-blue-900/10 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/page-house-crest.jpg"
            alt="Page House horse crest"
            width={36}
            height={36}
            priority
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-blue-950">
              Page House Ski Trip
            </div>
            <div className="text-xs text-blue-900/70">Caltech</div>
          </div>
        </Link>

        <nav className="flex items-center gap-2 text-sm font-medium">
          <Link
            href="/leaderboard"
            className="rounded-md px-3 py-2 text-blue-900 hover:bg-blue-50 hover:text-blue-950"
          >
            Leaderboard
          </Link>
          <Link
            href="/admin"
            className="rounded-md px-3 py-2 text-blue-900 hover:bg-blue-50 hover:text-blue-950"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}


