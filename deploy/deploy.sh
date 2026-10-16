#!/bin/bash
# 服务器端部署：拉代码 → 装依赖 → 停服 → 构建 → 起服 → 健康检查。
#
# 用法（在服务器上，需要 root 或 sudo）：
#   sudo /srv/moves/app/deploy/deploy.sh
#
# 为什么构建前要停服：next build 一开始就会删掉整个 .next/（cleanDistDir 默认为 true），
# 而运行中的服务正是从那里读文件。不停服的话，构建全程所有路由都会 404/500 ——
# 而不是只在重启那一瞬间出错。所以停服的窗口 = 整个构建时长。
# 要做到零停机，需要构建到独立目录再原子切换，本工程规模下没引入。
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

# 以 root 跑时，git 对象、node_modules、.next 都会变成 root 所有 ——
# 服务本身还能读，但下一次以 moves 身份构建就写不进去了。
# 所以代码和构建步骤一律切到 moves 用户，systemctl 仍由 root 执行。
as_moves() {
  if [ "$(id -u)" -eq 0 ]; then
    sudo -u moves -H "$@"
  else
    "$@"
  fi
}

echo "→ 拉取最新代码"
as_moves git pull --ff-only

# NEXT_PUBLIC_SITE_URL 会被构建期内联进产物，缺了就产出 http://localhost:3000
# 的 OG/分享图地址，而且产物里已经写死、事后改无效 —— 所以在这里就拦住。
ENV_FILE="$APP_DIR/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  echo "✗ 缺少 $ENV_FILE" >&2
  echo "  请从 .env.example 复制一份并填入真实域名。" >&2
  exit 1
fi
if ! grep -qE '^NEXT_PUBLIC_SITE_URL=https?://[^[:space:]]+' "$ENV_FILE"; then
  echo "✗ $ENV_FILE 里的 NEXT_PUBLIC_SITE_URL 不是有效的 http(s) 地址" >&2
  exit 1
fi

echo "→ 安装依赖"
# 不能加 --prod：构建期要跑 TypeScript 类型检查和 next-env.d.ts 生成，devDependencies 是必需的
as_moves pnpm install --frozen-lockfile

echo "→ 停服（构建会清空 .next/，不停服则构建全程站点都不可用）"
systemctl stop moves

echo "→ 构建"
as_moves ./build.sh

echo "→ 起服"
systemctl start moves

echo "→ 健康检查"
# 直连 Node 端口，绕开 Nginx 和 basic auth，确认服务本身活着
for _ in $(seq 1 20); do
  if curl -fsS -o /dev/null "http://127.0.0.1:3000/"; then
    echo "✓ 部署完成，服务已就绪"
    exit 0
  fi
  sleep 1
done

echo "✗ 服务在 20 秒内没有就绪。排查：journalctl -u moves -n 50 --no-pager" >&2
echo "  注意：此时构建已清空 .next/，站点处于不可用状态，需要修复后重跑本脚本。" >&2
exit 1
