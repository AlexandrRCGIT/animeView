# AnimeView

AnimeView - веб-приложение для просмотра и поиска аниме на базе Next.js (App Router).

## Стек

- Next.js 16 (App Router), React 19, TypeScript
- NextAuth v5 (Discord OAuth + Telegram Login + credentials)
- Supabase (основная БД, кэш API, пользовательские данные)
- Внешние API/источники: Shikimori, Jikan, Kodik, Anilibria, Aniboom

## Основные сценарии

- Главная страница: тренды и свежие эпизоды
- Каталог с фильтрами: жанры, тип, сезон, год, статус, сортировка
- Карточка аниме: описание, статистика, связанные тайтлы, плееры
- TV-вход по коду: страница `/tv` + подтверждение на телефоне `/tv/link?code=...`
- Device Login для браузера: `/auth/device` + подтверждение в `/auth/device/link`
- В настройках доступен список подключенных устройств с возможностью удалить устройство
- Избранное и статусы просмотра
- Настройки профиля/темы

## Архитектура данных (высокоуровнево)

- Основной источник для UI - локальная таблица `anime` в Supabase.
- Если локальных данных нет, используются fallback-запросы к внешним API.
- Для главной страницы используется кэш в таблице `api_cache` (`home:v1`).
- Детали тайтлов и связанные аниме сохраняются в `anime.detail_data` / `anime.related_data` с TTL-логикой.

## Переменные окружения

Создайте `.env.local` в корне проекта:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
KODIK_TOKEN=
CRON_SECRET=

# NextAuth v5 (рекомендуемый формат)
AUTH_SECRET=
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=
AUTH_TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
```

Примечания:

- `SUPABASE_SERVICE_ROLE_KEY` используется серверной частью для CRUD и синхронизации.
- `CRON_SECRET` защищает служебные API (`/api/sync`, `/api/refresh-cache`).
- `KODIK_TOKEN` нужен для поиска источников Kodik.
- Для Telegram Login:
  - создайте бота через BotFather и получите token (`AUTH_TELEGRAM_BOT_TOKEN`);
  - укажите username бота в `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (без `@`);
  - в BotFather (`/setdomain`) задайте домен вашего сайта (например `anime-view-weld.vercel.app`).

## Локальный запуск

```bash
npm install
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

## Проверка качества

```bash
npm run lint
```

## Cron и синхронизация

Cron настроен через `vercel.json`:

- `GET /api/sync` каждый день в `03:00`
- `GET /api/sync?mode=full` каждое воскресенье в `03:00`

`/api/sync`:

- `mode=season` - синхронизация текущего сезона
- `mode=full` - сезон + расширенная синхронизация топа

После синхронизации обновляется кэш главной (`home:v1`).

## Структура проекта (ключевые папки)

- `src/app` - страницы и route handlers
- `src/app/actions` - server actions
- `src/lib/api` - клиенты внешних API
- `src/lib/db` - запросы к Supabase
- `src/lib/sync` - логика синхронизации каталога
- `src/components` - UI и плееры
- `scripts` - служебные скрипты маппинга/импорта

## Минимальные таблицы Supabase

Проект ожидает таблицы:

- `anime`
- `api_cache`
- `users`
- `favorites`
- `user_profiles`
- `telegram_accounts`
- `tv_login_sessions`
- `user_devices`
- `watch_progress`

Для Device Login (TV + Web по коду) примените SQL:

- `scripts/sql/device-auth-schema.sql`
