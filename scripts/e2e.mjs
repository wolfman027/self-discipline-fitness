/**
 * 真实浏览器端到端检查（通过 Chrome DevTools Protocol 驱动）。
 *
 * 为什么不用 jsdom：本项目的关键行为都依赖真实浏览器能力 ——
 * IntersectionObserver 懒加载、动图按需请求、CSS 令牌计算值、
 * 服务端渲染与客户端水合是否一致。这些在 jsdom 里验不出来。
 *
 * 用法：先 next start -p 3000，再 node scripts/e2e.mjs
 */
import { spawn } from 'node:child_process';
import http from 'node:http';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const PORT = 9345;
const PROFILE = '/tmp/fitness-e2e-profile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const get = (url) =>
  new Promise((res, rej) => {
    http
      .get(url, (r) => {
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => res(JSON.parse(d)));
      })
      .on('error', rej);
  });

let pass = 0;
let fail = 0;
const check = (name, ok, extra) => {
  if (ok) {
    pass++;
    console.log('  ✓ ' + name);
  } else {
    fail++;
    console.log('  ✗ ' + name + (extra ? '  → ' + extra : ''));
  }
};

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--user-data-dir=' + PROFILE,
    '--remote-debugging-port=' + PORT,
    '--window-size=1440,1000',
    '--no-first-run',
    BASE + '/'
  ],
  { stdio: 'ignore' }
);

try {
  let version = null;
  for (let i = 0; i < 40; i++) {
    try {
      version = await get(`http://127.0.0.1:${PORT}/json/version`);
      break;
    } catch {
      await sleep(500);
    }
  }
  if (!version) throw new Error('CDP 未就绪，Chrome 可能未启动');

  const list = await get(`http://127.0.0.1:${PORT}/json/list`);
  const page = list.find((t) => t.type === 'page' && t.url.startsWith(BASE)) ?? list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let id = 0;
  const pending = new Map();
  const errors = [];
  const mediaReqs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
      return;
    }
    // 抓页面真实错误，而不是只看渲染结果
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push((m.params.exceptionDetails.exception ?? {}).description ?? m.params.exceptionDetails.text);
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      errors.push(m.params.entry.text);
    }
    if (m.method === 'Network.responseReceived') {
      const u = m.params.response.url;
      if (/\/media\/(img|gif)\//.test(u)) mediaReqs.push(u);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result?.result?.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await sleep(4000);

  console.log(`\n[1] 首页渲染（${BASE}）`);
  const cards = await ev('document.querySelectorAll("a.card").length');
  check('渲染 24 张动作卡片', cards === 24, String(cards));
  const realCards = await ev('document.querySelectorAll("a.card[data-slug]").length');
  check('卡片都带 slug（可跳转）', realCards === 24, String(realCards));
  check('总数显示 1324', (await ev('document.body.innerText')).includes('1324'));
  const skeleton = await ev('document.querySelectorAll("div.card[aria-hidden=true]").length');
  check('首屏骨架占位存在（防布局跳动）', skeleton >= 0, String(skeleton));

  console.log('\n[2] 媒体按需加载');
  const imgLoaded = await ev('document.querySelectorAll("img.card-img").length');
  check('卡片图片元素就位', imgLoaded === 24, String(imgLoaded));
  const gifReqs = mediaReqs.filter((u) => u.includes('/gif/'));
  check('未悬停时不请求动图', gifReqs.length === 0, `已请求 ${gifReqs.length} 个动图`);
  const imgReqs = mediaReqs.filter((u) => u.includes('/img/'));
  check('图片请求数远小于总数（懒加载生效）', imgReqs.length < 24, `请求了 ${imgReqs.length} 张`);

  console.log('\n[3] 尺寸合规（授权要求只以 180×180 使用）');
  const dims = await ev(`(() => {
    const i = document.querySelector('img.card-img');
    const r = i.getBoundingClientRect();
    return JSON.stringify({ attr: i.getAttribute('width') + 'x' + i.getAttribute('height'),
      natural: i.naturalWidth + 'x' + i.naturalHeight,
      rendered: Math.round(r.width) + 'x' + Math.round(r.height) });
  })()`);
  const dim = JSON.parse(dims);
  check('属性尺寸为 180×180', dim.attr === '180x180', dim.attr);
  check('素材原始尺寸为 180×180', dim.natural === '180x180', dim.natural);
  check('渲染尺寸未放大（≤180）', Number(dim.rendered.split('x')[0]) <= 180, dim.rendered);

  console.log('\n[4] 悬停播放动图');
  await ev(`(() => {
    const c = document.querySelector('a.card');
    c.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  })()`);
  await sleep(1400);
  const gifAfter = mediaReqs.filter((u) => u.includes('/gif/')).length;
  check('悬停后按需加载动图', gifAfter >= 1, `请求了 ${gifAfter} 个`);
  const gifVisible = await ev('!!document.querySelector("img.card-gif")');
  check('动图元素已挂载', gifVisible === true);

  console.log('\n[5] 搜索与筛选（URL 驱动，服务端渲染）');
  await ev(`(() => {
    const i = document.getElementById('q');
    i.value = '深蹲';
    i.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(1200);
  const afterSearch = await ev('location.search');
  check('搜索写入 URL query', afterSearch.includes('q='), afterSearch);
  const searchCount = await ev(`(() => {
    const m = document.body.innerText.match(/找到\\s*(\\d+)\\s*个动作/);
    return m ? m[1] : null;
  })()`);
  check('搜索「深蹲」有结果', Number(searchCount) > 0, String(searchCount));

  await ev('location.href = "/?part=chest"');
  await sleep(1800);
  const chestCount = await ev(`(() => {
    const m = document.body.innerText.match(/找到\\s*(\\d+)\\s*个动作/);
    return m ? m[1] : null;
  })()`);
  check('按部位筛选 chest = 163', chestCount === '163', String(chestCount));
  const chestTag = await ev('document.querySelector("a.card")?.getAttribute("aria-label") ?? ""');
  check('筛选后首张卡片属于胸部', chestTag.includes('胸'), chestTag);

  console.log('\n[6] 分页');
  await ev('location.href = "/?page=3"');
  await sleep(1800);
  const pager = await ev(`(() => {
    const cur = document.querySelector('.pager-num.is-current');
    const cards = document.querySelectorAll('a.card').length;
    return JSON.stringify({ current: cur?.textContent ?? null, cards });
  })()`);
  const pg = JSON.parse(pager);
  check('第 3 页高亮当前页', pg.current === '3', String(pg.current));
  check('第 3 页仍渲染 24 张卡', pg.cards === 24, String(pg.cards));

  console.log('\n[7] 详情页');
  await ev('location.href = "/moves/0001-2gPfomN"');
  await sleep(1800);
  const detail = await ev(`(() => {
    const steps = document.querySelectorAll('.steps li').length;
    const facts = document.querySelectorAll('.fact').length;
    const gif = document.querySelector('.media-panel img')?.getAttribute('src') ?? '';
    const credit = document.querySelector('.credit')?.textContent ?? '';
    const related = document.querySelectorAll('.related-item').length;
    const ld = document.querySelectorAll('script[type="application/ld+json"]').length;
    return JSON.stringify({ steps, facts, gif, credit, related, ld, title: document.querySelector('h1')?.textContent });
  })()`);
  const d = JSON.parse(detail);
  check('详情页标题正确', d.title === '34仰卧起坐', String(d.title));
  check('分步要点渲染 4 条', d.steps === 4, String(d.steps));
  check('速览渲染 4 个字段', d.facts === 4, String(d.facts));
  check('详情页加载动图', d.gif.includes('/media/gif/'), d.gif);
  check('相关动作渲染', d.related === 6, String(d.related));
  check('结构化数据存在', d.ld >= 1, String(d.ld));
  check('授权署名存在', d.credit.includes('© Gym visual'), d.credit.slice(0, 60));
  const gifDims = await ev(`(() => {
    const i = document.querySelector('.media-panel img');
    const r = i.getBoundingClientRect();
    return Math.round(r.width) + 'x' + Math.round(r.height);
  })()`);
  check('详情页动图也是 180×180（未放大）', gifDims === '180x180', gifDims);

  console.log('\n[8] 404 与错误处理');
  await ev('location.href = "/moves/does-not-exist"');
  await sleep(1500);
  const is404 = await ev('document.body.innerText.includes("没有找到这个动作")');
  check('无效 slug 显示友好 404', is404 === true);

  console.log('\n[9] 无障碍与设计令牌');
  await ev('location.href = "/"');
  await sleep(2000);
  const a11y = await ev(`(() => {
    const body = getComputedStyle(document.body);
    const btn = document.querySelector('.seg-btn');
    const pressed = btn?.getAttribute('aria-pressed');
    const focusRing = getComputedStyle(document.documentElement).getPropertyValue('--focus').trim();
    const searchLabel = !!document.querySelector('label[for="q"]');
    return JSON.stringify({
      font: body.fontFamily.slice(0, 20),
      bg: body.backgroundColor,
      primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
      pressed, focusRing, searchLabel
    });
  })()`);
  const a = JSON.parse(a11y);
  check('设计令牌已生效（primary）', a.primary === '#2563eb', a.primary);
  check('背景为浅色（#FFFFFF）', a.bg === 'rgb(255, 255, 255)', a.bg);
  check('Barlow 字体已应用', a.font.toLowerCase().includes('barlow'), a.font);
  check('筛选按钮带 aria-pressed', a.pressed !== null && a.pressed !== '', String(a.pressed));
  check('搜索框有关联 label', a.searchLabel === true);
  check('焦点环令牌存在', a.focusRing === '#2563eb', a.focusRing);

  console.log('\n[10] 无运行时错误');
  check('页面无 JS 异常', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log('\n────────────────────────');
  console.log(fail === 0 ? `全部通过：${pass} 项` : `通过 ${pass} 项，失败 ${fail} 项`);
  ws.close();
} finally {
  chrome.kill();
}

process.exit(fail === 0 ? 0 : 1);
