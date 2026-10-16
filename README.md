# 动作库 MOVES

1324 个健身动作的展示站点。每个动作带中文分步要点、目标肌群与协同肌、器械信息，以及 180×180 动作演示动画。

数据来自 [exercises-dataset-main](../exercises-dataset-main)（MIT License）。**本工程只读消费该数据集，不做修改。**

---

## 快速开始

```bash
cd app
pnpm install          # 首次安装
pnpm data             # 生成站点数据（从 ../exercises-dataset-main 转换）
pnpm dev              # 开发服务器 → http://localhost:3000
```

生产构建（本机）：

```bash
pnpm build:local      # 本机沙箱专用，处理了两个环境限制，见下文
pnpm start
```

`build.sh` 是不含本机绕行的通用版，服务器上直接用它；本机请一律走 `build:local`。

部署到服务器见下文「[部署](#部署自有-linux-vps)」。

---

## 本机环境限制与绕行（重要）

这台机器（macOS 沙箱）有两个限制会直接阻断构建，**都不是代码问题**，但必须绕行：

### 1. 原生模块被拒绝加载

运行时开启了强化运行时 + 库校验，`dlopen` 任何 Team ID 不同的原生模块都会失败：

```
code signature ... not valid for use in process:
mapping process and mapped file (non-platform) have different Team IDs
```

受影响的是 **Next 的原生 SWC 编译器** 和 **Tailwind v4 的 LightningCSS**。

**绕行方式**：用 WebAssembly 版替代原生二进制。

```bash
# SWC 用 WASM 版（已装为 devDependency）
pnpm add -D @next/swc-wasm-nodejs@<与 next 同版本>
# 然后把它放到 Next 期望的位置 —— Next 用 pathToFileURL(裸包名) 加载，
# 该分支在 v15 里是坏的，必须手动放置
mkdir -p node_modules/next/wasm/@next/swc-wasm-nodejs
cp node_modules/@next/swc-wasm-nodejs/{wasm.js,wasm_bg.wasm,package.json} \
   node_modules/next/wasm/@next/swc-wasm-nodejs/
```

`scripts/build-local.sh` 会自动检测并完成上述放置。这些绕行只在本机需要，**不会**跑到服务器的构建里去 —— `build.sh` 是干净的通用版。

### 2. 构建期无法访问 Google Fonts

`fonts.googleapis.com` 在本网络不可达（curl 返回 000），而 `next/font/google` 会在**构建期**请求它，直接导致构建失败。

**绕行方式**：改用 `@fontsource/*` —— 字体从 npm 取，woff2 打包进站点，构建与运行都不访问外网。

### 已移除的依赖：Tailwind

原计划用 Tailwind v4，但它的 PostCSS 插件强依赖 LightningCSS 原生二进制，在本机无法加载（WASM 回退路径也不被插件采用）。

排查时发现一个更关键的事实：**代码里没有使用任何 Tailwind 工具类** —— 全部样式是 CSS 变量令牌 + 语义类名（`card`、`badge`、`seg-btn`…）。所以 Tailwind 只是纯负担，已整体移除。样式集中在：

- `src/app/globals.css` —— 设计令牌（颜色/间距/字号/圆角），含深色主题
- `src/app/components.css` —— 组件样式，取值一律引用令牌

---

## 部署（自有 Linux VPS）

站点**做不了纯静态导出** —— 首页在服务端读 `searchParams`（筛选/搜索/分页全部走 URL），
`output: 'export'` 不支持运行时查询串。所以必须以 Node 服务常驻，前面挂 Nginx 反代。
1324 个详情页是构建期预渲染的，不受影响。

### 前置

| 需要 | 说明 |
| --- | --- |
| Node.js 22 LTS | `package.json` 写的是 `>=20`，但 `scripts/e2e.mjs` 依赖全局 `WebSocket`，实测要 22+ |
| pnpm 9 或 10 | 锁文件是 `lockfileVersion: 9.0`。**别用 apt 装的那个 pnpm（7.x）**，`--frozen-lockfile` 会直接失败。用 `corepack enable` 最省事 |
| Nginx | 反代 + 直接分发媒体 |
| certbot | 签 HTTPS 证书，用 `certonly --webroot` 模式 |
| 内存 ≥ 2GB | 1324 页预渲染 + TypeScript 类型检查很吃内存。1GB 的机器会被 OOM kill，症状是构建中途打印 `Killed`、退出码 137。内存不够就先加 2GB swap |
| DNS | 域名 A 记录指向服务器 IP |

防火墙只放行 80/443。**3000 端口不要对外开** —— `deploy/moves.service` 里已让 Next 只绑
`127.0.0.1`，这样外部无法绕过 Nginx 和 basic auth 直连服务。

### 首次设置

```bash
# 1. 专用用户与目录
sudo useradd -r -m -d /srv/moves -s /usr/sbin/nologin moves
sudo mkdir -p /srv/moves /srv/media /var/www/certbot
sudo chown -R moves:moves /srv/moves
# /srv/media 要给 Nginx（www-data）读、给后续 rsync 写
sudo chown <你的登录用户>:www-data /srv/media && sudo chmod 755 /srv/media

# 2. 防火墙（ufw 开着的话，不做这步什么都访问不到）
sudo ufw allow 'Nginx Full'

# 3. 取代码
sudo -u moves git clone https://github.com/wolfman027/self-discipline-fitness.git /srv/moves/app

# 4. 站点地址：这个值在 next build 时被内联进产物，构建后改无效
sudo -u moves cp /srv/moves/app/.env.example /srv/moves/app/.env.production
sudo -u moves vi /srv/moves/app/.env.production        # 填真实域名

# 5. 装依赖 + 构建
sudo -u moves bash -c 'cd /srv/moves/app && pnpm install --frozen-lockfile && ./build.sh'

# 6. 常驻服务
sudo cp /srv/moves/app/deploy/moves.service /etc/systemd/system/moves.service
sudo systemctl daemon-reload && sudo systemctl enable --now moves
systemctl status moves                                  # 应为 active (running)

# 7. 先用纯 HTTP 引导配置把 Nginx 拉起来。
#    此时证书还不存在，直接装最终的 nginx.conf 会因为 ssl_certificate 文件缺失而启动失败
sudo cp /srv/moves/app/deploy/nginx.bootstrap.conf /etc/nginx/sites-available/moves
sudo ln -sf /etc/nginx/sites-available/moves /etc/nginx/sites-enabled/moves
sudo rm -f /etc/nginx/sites-enabled/default             # 否则裸 IP 会命中 nginx 默认欢迎页
sudo vi /etc/nginx/sites-available/moves                # 替换 <your-domain.example>
sudo nginx -t && sudo systemctl reload nginx

# 8. 签证书。--deploy-hook 不能省：--webroot 模式不会自动安装「续期后重载 Nginx」的钩子，
#    少了它，证书自动续期后新证书不会被加载
sudo certbot certonly --webroot -w /var/www/certbot -d <你的域名> \
     --deploy-hook "systemctl reload nginx"
sudo certbot renew --dry-run                            # 验证续期链路

# 9. 换成最终配置（HTTPS + 门禁 + 媒体分发）
sudo cp /srv/moves/app/deploy/nginx.conf /etc/nginx/sites-available/moves
sudo vi /etc/nginx/sites-available/moves                # 再次替换 <your-domain.example>
sudo htpasswd -c /etc/nginx/.htpasswd-moves <用户名>     # 门禁密码
sudo nginx -t && sudo systemctl reload nginx
```

`deploy/` 下三个配置文件的顶部都写明了各自的用途与注意事项，尤其 `nginx.conf` 里的
`http2` 写法 —— 新写法在 Nginx < 1.25.1 上是**致命错误**（不是警告），配置里默认用了全版本可用的旧写法。

### 日常部署

```bash
ssh <服务器> 'sudo /srv/moves/app/deploy/deploy.sh'
```

拉代码 → 装依赖 → **停服** → 构建 → 起服 → 健康检查，任一步失败即中断。
脚本需要 root/sudo：以 root 跑构建会让产物变成 root 所有，下次以 `moves` 身份就写不进去了，
所以脚本内部把 git、依赖、构建三步切到 `moves` 用户执行。

**已知取舍（重要）**：`next build` 的第一步就会删掉整个 `.next/`（`cleanDistDir` 默认为 `true`），
而运行中的服务正是从那里读文件。所以**停服窗口 = 整个构建时长，期间站点完全不可用**，
不是「重启瞬间偶发 500」。脚本因此在构建前主动停服、构建后起服，让状态确定。

代价是构建失败时站点会停在停服状态，需要修复后重跑 —— `set -e` 能防止用坏产物起服，
但保不住站点可用性。要做到零停机，得构建到独立目录再原子切换，本工程规模下没引入。

顺带一提：不要试图用 `cleanDistDir: false` 绕开这个 —— 那会让新旧产物混在一起，故障更难查。

### 补充媒体

媒体（137MB，`img/` + `gif/` 各 1324 个文件）不入库，由 Nginx 直接从 `/srv/media/` 分发，
**不需要**进仓库、也不需要放进服务器上的 `public/`。在本地机器上执行：

```bash
rsync -avz --delete prototype/media/ <服务器>:/srv/media/
```

rsync 用的 SSH 账号要对 `/srv/media` 有写权限（首次设置第 1 步已把它 chown 给你的登录用户）。
传完后确认 Nginx 能读到：目录 755、文件 644，属主是 `www-data` 或至少 group 可读。

未部署时图片 404，前端会降级成「暂无图示」占位（`MoveMedia.tsx` 的 `onError`），页面其余部分正常。

### 授权门禁

`deploy/nginx.conf` 默认开启 basic auth。媒体系列版权归 © Gym visual，本文件「媒体授权」
一节要求面向公众上线前先取得授权，所以在拿到之前站点是整体挡住的。取得授权后注释掉
`auth_basic` 那两行并 `sudo systemctl reload nginx` 即可公开。

注意：门禁开启期间，社交平台的抓取器也取不到 OG 图（它们无法过 basic auth），这是预期的。

---

## 目录结构

```
app/
├── scripts/
│   ├── build-data.mjs      构建期数据转换 + 校验（上游数据异常会中断构建）
│   ├── i18n-zh.json        中文词典：术语 + 部位 + 器械 + 肌群
│   └── e2e.mjs             真实浏览器端到端检查（CDP）
├── src/
│   ├── app/
│   │   ├── layout.tsx      根布局（字体自托管）
│   │   ├── page.tsx        首页：筛选 + 搜索 + 分页（服务端）
│   │   ├── loading.tsx     骨架屏
│   │   ├── not-found.tsx   404
│   │   ├── globals.css     设计令牌
│   │   ├── components.css  组件样式
│   │   └── moves/[slug]/   动作详情页（1324 个全部预渲染）
│   ├── components/
│   │   ├── MoveGrid.tsx    卡片列表（唯一客户端边界，统一管理悬停）
│   │   ├── MoveMedia.tsx   媒体区 + 动图按需加载
│   │   ├── FilterBar.tsx   筛选工具栏（写入 URL）
│   │   └── Pagination.tsx  分页
│   ├── lib/
│   │   ├── dict.ts         英文枚举 → 中文标签
│   │   └── moves.ts        查询：筛选/搜索/分页/相关动作
│   ├── data/moves.json     构建产物（勿手改）
│   └── types/move.ts       数据契约
└── public/media/           媒体（符号链接到 prototype/media，避免重复占 137MB）
```

---

## 架构决策

**筛选在服务端做。** 1.2MB 数据留在服务端，客户端只收当前页 24 条。若改成客户端筛选，就得把整份数据发到浏览器。

**所有筛选条件写进 URL。** 结果可分享、可收藏、刷新不丢，也让每个筛选组合天然成为可被抓取的落地页。

**同维度多选是 OR，跨维度是 AND。** 上游数据集自带的浏览器用的是「组内也 AND」，选两个就大概率空结果，用户会以为站点坏了。

**1324 个详情页全部预渲染。** 构建后是纯静态 HTML，无后端依赖，SEO 友好。

**动图只在悬停 700ms 后加载。** 动图中位 93KB、共 125MB。快速划过不该浪费带宽。触屏无 hover，动图留给详情页。

**中文名分级显示。** 数据集只有中文步骤、没有中文动作名。合成名完整的（77.4%）当主标题，不完整的回落英文名，不显示半成品。

---

## 数据转换

`scripts/build-data.mjs` 负责把上游数据适配成站点契约，同时承担校验职责。它解决的每个问题都对应上游数据的真实情况：

| 上游问题 | 处理 |
|---|---|
| `band`(54) 与 `resistance band`(7) 是两个值 | 归一化合并为 61 条，否则筛选漏数据 |
| `category` 与 `body_part` 100% 冗余 | 丢弃 `category` |
| 动作名有 6 组重名 | 路由键改用 `id-media_id` |
| `id` 不连续（缺号 3877 个） | 不当数组下标用 |
| 每条步骤末尾重复「重复所需的重复次数」 | 构建时剔除 |
| 缺中文动作名 | 338 条术语词典合成，覆盖 77.4% |

上游 schema 设了 `additionalProperties: false`，所以适配全部放在这一层，不往原文件加字段。

词典扩充即可提升覆盖率 —— 脚本运行结束会打印未收录词与出现次数：

```bash
pnpm data
#  补进 scripts/i18n-zh.json 的 term 即可提升覆盖率：
#    plyo            3
#    frog            3
```

---

## 媒体授权（必须遵守）

代码与数据是 MIT，但 **`public/media/` 下的图片与动图不是**：

> The MIT license above covers ONLY the code, tooling, dataset structure, and instruction text/translations... **It DOES NOT cover the exercise media**... That media is © Gym visual (https://gymvisual.com/)... **Cloning this repository does not grant you any license to the media; obtain your own from Gym visual.**

落地约束（代码里已强制）：

- **仅以 180×180 使用**：`next.config.mjs` 关闭图像优化（`images.unoptimized`），组件锁定 `width/height=180`，CSS 用 `max-width/max-height` 而非 `width:100%`，避免放大
- **每次使用带署名**：详情页媒体区、详情页底部、全站页脚三处均有 `© Gym visual — https://gymvisual.com/`
- **面向公众上线前需自行向 Gym visual 取授权**

端到端测试里有专门断言守住前两条，防止后续改动把尺寸或署名弄丢。

---

## 测试

```bash
pnpm test        # 端到端（需先 pnpm start）
```

`scripts/e2e.mjs` 用 CDP 驱动真实 Chrome，检查 34 项，覆盖：

- 首页渲染 24 张卡、骨架屏占位
- **图片懒加载**：请求数远小于卡片总数；**未悬停不请求动图**
- **尺寸合规**：素材原始 180×180、渲染不放大
- 悬停后按需加载动图
- 搜索/筛选写入 URL、结果计数正确（chest = 163）
- 分页高亮与内容
- 详情页：4 步要点、4 个速览字段、动图、6 个相关动作、结构化数据、**授权署名**
- 404 友好提示
- 设计令牌生效、Barlow 字体已应用、`aria-pressed`、label 关联、焦点环
- **页面无 JS 异常**

跑真实浏览器而不是 jsdom，是因为关键行为（IntersectionObserver、按需请求、CSS 计算值、SSR 与水合一致性）在 jsdom 里验不出来。

---

## 已知限制

- **分页而非无限滚动**：56 页翻页对「找到第 N 个」更确定，也让分页链接可被抓取
- **筛选为单选 × 3 维**：URL 支持逗号分隔多选（`?part=chest,back`），UI 目前是单选切换
- **中文名 22.6% 回落英文**：剩余多为生僻专名（`zottman`、`planche`），继续加词典收益递减
- **媒体 137MB 未入版本库管理**：`public/media` 是指向 `prototype/media` 的符号链接
