import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-white tracking-tight flex-none">
          Anime<span className="text-violet-500">View</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400 flex-none">
          <Link href="/" className="hover:text-white transition-colors">
            Главная
          </Link>
        </nav>

        {/* Поиск — нативная HTML-форма, работает без JS */}
        <form action="/search" method="GET" className="flex-1 flex">
          <div className="relative w-full max-w-sm">
            <input
              type="search"
              name="q"
              placeholder="Поиск аниме..."
              autoComplete="off"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-10 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Найти"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </header>
  );
}
