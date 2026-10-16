#!/bin/bash
# 本机 macOS 沙箱专用构建。服务器和普通 Linux/macOS 机器请直接用 ./build.sh。
#
# 这台机器的沙箱有两个限制会直接阻断构建，都不是代码问题，但每次构建前都得处理：
#
#  1. 原生 SWC 二进制被沙箱的库校验拒绝加载（Team ID 不匹配），
#     必须用 WebAssembly 版，并放到 Next 期望的路径下。
#  2. Next 在构建期会把缓存写到 ~/Library/Caches，该目录不可写，
#     需要把 HOME 指到工作区内。
#
# 详见 README「本机环境限制与绕行」。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NODE_BIN="/Users/h.a.hu/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin"
export PATH="$NODE_BIN:$PATH"

# 缓存与 HOME 指到工作区（~/Library/Caches 不可写）
BUILD_CACHE="$(cd .. && pwd)/.build-cache"
mkdir -p "$BUILD_CACHE"
export HOME="$BUILD_CACHE"
export XDG_CACHE_HOME="$BUILD_CACHE"

# 把 WASM SWC 放到 Next 的 loadWasm(wasmDirectory) 期望位置。
# Next 的 loadWasm('') 分支用 pathToFileURL(裸包名)，在 v15 里是坏的，
# 所以只能走 wasmDirectory 分支，必须先把文件放好。
setup_wasm_swc() {
  local dest="node_modules/next/wasm/@next/swc-wasm-nodejs"
  local src="node_modules/@next/swc-wasm-nodejs"
  if [ -f "$dest/wasm.js" ]; then
    return 0
  fi
  if [ ! -f "$src/wasm.js" ]; then
    echo "✗ 缺少 @next/swc-wasm-nodejs，请先运行：pnpm add -D @next/swc-wasm-nodejs"
    exit 1
  fi
  echo "→ 放置 WASM SWC 到 Next 期望路径"
  mkdir -p "$dest"
  cp "$src"/wasm.js "$src"/wasm_bg.wasm "$src"/package.json "$dest"/
}

setup_wasm_swc

# 环境准备好后交给通用构建脚本，构建逻辑只有一份。
# 用 `bash 路径` 而不是直接执行，省掉对可执行位的依赖，也绕开 shebang 被 CRLF/BOM 破坏的问题。
exec bash "$ROOT/build.sh"
