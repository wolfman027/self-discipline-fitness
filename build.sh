#!/bin/bash
# 生产构建（通用版）。Linux 服务器与本机之外的任何机器都直接用这个。
#
# 本机 macOS 沙箱另有两点限制需要绕行（原生 SWC 被拒、~/Library/Caches 不可写），
# 那些绕行放在 scripts/build-local.sh，本机开发请改用：pnpm build:local
# 详见 README「本机环境限制与绕行」。
set -euo pipefail

cd "$(dirname "$0")"

export NEXT_TELEMETRY_DISABLED=1

# 站点数据由 ../exercises-dataset-main 转换而来。该数据集在仓库外，
# 服务器上不会有 —— 那种情况下直接用已提交的 src/data/moves.json 构建。
DATASET_JSON="../exercises-dataset-main/data/exercises.json"
if [ -f "$DATASET_JSON" ]; then
  echo "→ 生成站点数据"
  node scripts/build-data.mjs
else
  if [ ! -f src/data/moves.json ]; then
    echo "✗ 既没有 $DATASET_JSON，也没有 src/data/moves.json，无法构建" >&2
    echo "  请把数据集放到仓库同级目录，或从版本库取回 src/data/moves.json" >&2
    exit 1
  fi
  echo "→ 未找到 $DATASET_JSON，跳过数据生成，使用已提交的 src/data/moves.json"
fi

echo "→ 构建 Next.js"
node node_modules/next/dist/bin/next build

echo
echo "✓ 构建完成。启动：pnpm start"
