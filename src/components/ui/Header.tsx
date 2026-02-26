import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold text-white tracking-tight">
          Anime<span className="text-violet-500">View</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/" className="hover:text-white transition-colors">
            Главная
          </Link>
          <Link href="/catalog" className="hover:text-white transition-colors">
            Каталог
          </Link>
        </nav>

        {/* Поиск — будет реализован в следующем этапе */}
        <div className="flex-1 max-w-sm">
          <input
            type="search"
            placeholder="Поиск аниме..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>
    </header>
  );
}
