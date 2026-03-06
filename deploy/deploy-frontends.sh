#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_ROOT="/var/www/bouncyballs"
SKIP_INSTALL=0
RELOAD_NGINX=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --deploy-root)
      DEPLOY_ROOT="${2:-}"
      shift 2
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --reload-nginx)
      RELOAD_NGINX=1
      shift
      ;;
    -h|--help)
      echo "用法: deploy/deploy-frontends.sh [--deploy-root 路径] [--skip-install] [--reload-nginx]"
      exit 0
      ;;
    *)
      echo "未知参数: $1"
      exit 1
      ;;
  esac
done

if ! command -v pnpm >/dev/null 2>&1; then
  echo "未检测到 pnpm，请先安装 pnpm。"
  exit 1
fi

mkdir -p "$DEPLOY_ROOT"

echo "项目目录: $PROJECT_ROOT"
echo "部署目录: $DEPLOY_ROOT"

cd "$PROJECT_ROOT"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  pnpm install
fi

pnpm --filter portal build
pnpm --filter admin build
pnpm --filter client build

PROJECT_ROOT_CANON="$(cd "$PROJECT_ROOT" && pwd)"
DEPLOY_ROOT_CANON="$(cd "$DEPLOY_ROOT" && pwd)"

if [[ "$PROJECT_ROOT_CANON" != "$DEPLOY_ROOT_CANON" ]]; then
  mkdir -p "$DEPLOY_ROOT/apps/portal" "$DEPLOY_ROOT/apps/admin" "$DEPLOY_ROOT/apps/client"
  rm -rf "$DEPLOY_ROOT/apps/portal/dist" "$DEPLOY_ROOT/apps/admin/dist" "$DEPLOY_ROOT/apps/client/dist"
  cp -R "$PROJECT_ROOT/apps/portal/dist" "$DEPLOY_ROOT/apps/portal/dist"
  cp -R "$PROJECT_ROOT/apps/admin/dist" "$DEPLOY_ROOT/apps/admin/dist"
  cp -R "$PROJECT_ROOT/apps/client/dist" "$DEPLOY_ROOT/apps/client/dist"
fi

if [[ "$RELOAD_NGINX" -eq 1 ]]; then
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "前端部署完成。"
