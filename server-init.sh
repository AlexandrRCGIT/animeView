#!/bin/bash
# Первичная установка на новом сервере (Ubuntu 20.04+)
# Запускать: bash server-init.sh
set -e

# ── Docker ────────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "→ Устанавливаем Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "$USER"
  newgrp docker
  echo "✓ Docker установлен"
fi

# ── Клонируем репозиторий ─────────────────────────────────────────────────────
REPO_DIR=/var/www/animeView
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "→ Клонируем репозиторий..."
  mkdir -p /var/www
  git clone https://github.com/AlexandrRCGIT/animeView.git "$REPO_DIR"
fi

echo ""
echo "✓ Готово! Теперь запусти деплой вручную:"
echo "  GitHub → Actions → Deploy → Run workflow"
echo ""
echo "GitHub Actions сам напишет .env и соберёт Docker-контейнеры."
