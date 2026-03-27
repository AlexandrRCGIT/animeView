# AnimeView

Аниме-агрегатор на Next.js с каталогом, плеером, профилями и системой отзывов.

## Стек

- **Next.js** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS v4**
- **Supabase** — основная БД, кэш, пользовательские данные
- **NextAuth v5** — Discord OAuth, Telegram Login Widget, email/password
- **Kodik** — единственный источник видео и метаданных
- **PWA** — манифест + Service Worker

## Возможности

- Главная страница с трендами и свежими эпизодами
- Каталог с фильтрами: жанры, тип, год, статус, сортировка
- Страница тайтла: описание, рейтинги, связанные тайтлы, скриншоты из эпизодов
- Плеер Kodik с выбором перевода и сохранением прогресса просмотра
- Плеер Rutube (ручная привязка через админку)
- Избранное и статусы просмотра (смотрю / просмотрено / брошено / в планах)
- Отзывы с оценками по категориям (сюжет, арт, персонажи, музыка)
- Комментарии с вложенными ответами
- Достижения пользователя
- Страница истории просмотров
- Профиль: имя, аватар, акцентный цвет темы
- TV-вход по коду (`/tv` + подтверждение на телефоне)
- Обратная связь (плавающая кнопка)
- Административная панель: онлайн-статистика, привязка Rutube, импорт из Kodik

## Локальный запуск

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run lint
```

## Переменные окружения

Скопируйте `.env.local.example` → `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

KODIK_TOKEN=
CRON_SECRET=

AUTH_SECRET=
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=
AUTH_TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=

# Comma-separated session IDs для доступа к /admin
# Формат: discord:123456,telegram:789012
ADMIN_USER_IDS=
```

## Архитектура

```
src/
├── app/                  # Страницы и API route handlers
│   ├── actions/          # Server Actions (избранное, отзывы, комментарии…)
│   └── api/              # REST эндпоинты (синхронизация, прогресс, поиск…)
├── components/
│   ├── anime/            # AnimeCard, KodikPlayer, EpisodeGrid, PlayerTabs…
│   ├── home/             # Hero, NavBar, NewEpisodes, ContinueWatching…
│   └── ui/               # FilterBar, FeedbackButton и прочие UI-компоненты
└── lib/
    ├── api/kodik/        # Kodik API клиент (только серверная сторона)
    ├── db/anime.ts       # Основные запросы к Supabase
    ├── sync/             # syncFromKodik, syncFreshFromKodik, enrichRelated
    └── cache.ts          # getOrFetch / forceRefresh (таблица api_cache)
```

**Поток данных:** Supabase (`anime`) → Kodik API при промахе кэша

## Синхронизация каталога

| Эндпоинт | Когда | Что делает |
|---|---|---|
| `GET /api/cron/daily` | Ежедневно (cron) | Свежие тайтлы из Kodik + обновление связанных + обновление кэша главной |
| `GET /api/sync?mode=season` | По запросу | Синхронизация текущего сезона |
| `GET /api/sync?mode=full` | По запросу | Полная синхронизация каталога |

Все эндпоинты защищены заголовком `x-cron-secret: CRON_SECRET`.

## Таблицы Supabase

`anime` · `anime_translations` · `api_cache` · `users` · `user_profiles` · `favorites` · `watch_progress` · `reviews` · `comments` · `feedback` · `telegram_accounts` · `tv_login_sessions` · `user_devices`
