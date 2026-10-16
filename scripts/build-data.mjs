/**
 * 构建期数据转换：exercises-dataset-main → src/data/moves.json
 *
 * 上游数据集是只读的，且它的 schema 设了 additionalProperties:false，
 * 不能往里加字段，所以所有适配都放在这一层。
 *
 * 这里同时充当数据校验器：上游数据一有异常就抛错中断构建，
 * 不静默产出坏数据（这一点比转换本身更重要）。
 *
 * 用法：node scripts/build-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATASET = path.resolve(ROOT, '..', 'exercises-dataset-main');
const SRC_JSON = path.join(DATASET, 'data', 'exercises.json');
const DICT = path.join(__dirname, 'i18n-zh.json');
const OUT = path.join(ROOT, 'src', 'data', 'moves.json');

export const GYM_VISUAL_CREDIT = '© Gym visual — https://gymvisual.com/';

/**
 * 器械归一化。上游把同一种器械写成多个值（band 54 条 / resistance band 7 条），
 * 不合并的话筛选器点「弹力带」会漏掉 7 条。
 */
const EQUIP_ALIAS = {
  'resistance band': 'band',
  'olympic barbell': 'barbell',
  'bodyweight': 'body weight'
};

/** 动作名里出现的器械词 → 中文，避免被当成未译词产出「[dumbbell]弯举」 */
const EQUIP_WORDS = {
  bodyweight: '自重', lever: '固定器械', smith: '史密斯机', ez: '曲杆',
  olympic: '奥杆', trap: '六角杠', resistance: '弹力带', medicine: '药球',
  sled: '雪橇机', stability: '瑞士球', bosu: '波速球', rope: '绳索',
  wheel: '滚轮', roller: '滚轮', banded: '弹力带', cable: '绳索',
  kettlebell: '壶铃', weighted: '负重', hammer: '锤式', assisted: '辅助',
  barbell: '杠铃', dumbbell: '哑铃', band: '弹力带'
};

/** 姿态类词，合成名字时排在动作词之前，让「杠铃坐姿提踵」而不是「杠铃提踵坐姿」 */
const POSTURE = new Set([
  '坐姿', '站姿', '仰卧', '俯卧', '跪姿', '悬垂', '上斜', '下斜', '平板',
  '俯身', '卧姿', '地面', '垫上', '靠墙', '侧卧', '坐立', '仰躺', '直立'
]);

const d = (dic, k, v) => dic[k] || v;

function normalizeEquipment(v) {
  return EQUIP_ALIAS[v] ?? v;
}

/**
 * 合成中文动作名：器械 + 姿态 + 动作。
 * 未收录的词保留英文并加方括号标记 —— 不猜测、不丢词，
 * 由 zhOk 标记告诉 UI 这个名字能不能当主标题用。
 */
function makeZhName(rec, dic, unknown) {
  let name = rec.name.replace(/\s*\((male|female)\)\s*/gi, ' ').trim().toLowerCase();

  const equipByWord = { ...dic.equipment, ...EQUIP_WORDS };
  const multi = Object.entries(dic.term).filter(([k]) => k.includes(' '));
  // 必须用 ^ 锚定：JS 的 String.match 会从任意位置搜索，
  // 不加锚定会在词中间匹配（"alternate heel touchers" 里匹配出 "heel touchers"，
  // 剩余变成 "l touchers"），产出碎片 token。
  const multiRe = new RegExp(
    '^(' + multi.map(([k]) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length).join('|') + ')'
  );
  const multiMap = new Map(multi);

  const parts = [];
  let rest = name;
  while (rest.length) {
    rest = rest.trim();
    if (!rest) break;
    const m = rest.match(multiRe);
    if (m) {
      parts.push(['term', multiMap.get(m[1])]);
      rest = rest.slice(m[0].length);
      continue;
    }
    const tok = rest.match(/^[a-z0-9'-]+/);
    if (!tok) { rest = rest.slice(1); continue; }
    const w = tok[0];
    const hit = equipByWord[w] ?? dic.term[w];
    // '\u0000DROP' 是词典里标记「无意义词」的哨兵值：译出来反而干扰名字可读性
    if (hit === '\u0000DROP' || (!hit && dic.term[w] === '\u0000DROP')) {
      rest = rest.slice(w.length);
      continue;
    }
    if (equipByWord[w]) parts.push(['equip', equipByWord[w]]);
    else if (hit) parts.push(['term', hit]);
    else if (/^\d+$/.test(w)) parts.push(['num', w]);
    else {
      parts.push(['unknown', w]);
      unknown.set(w, (unknown.get(w) ?? 0) + 1);
    }
    rest = rest.slice(w.length);
  }

  const equipKeys = new Set(Object.values(equipByWord));
  const equip = [], posture = [], action = [];
  for (const [kind, val] of parts) {
    if (kind === 'unknown') action.push(`[${val}]`);
    else if (kind === 'equip' || equipKeys.has(val)) equip.push(val);
    else if (POSTURE.has(val)) posture.push(val);
    else action.push(val);
  }
  const dedup = (arr) => arr.filter((x, i) => arr.indexOf(x) === i);
  const zh = dedup(equip).concat(dedup(posture), dedup(action)).join('');
  return zh || rec.name;
}

function main() {
  const dict = JSON.parse(fs.readFileSync(DICT, 'utf8'));
  const data = JSON.parse(fs.readFileSync(SRC_JSON, 'utf8'));
  const errors = [];

  // ---- 数据校验：任何一项不满足就中断构建 ----
  const ids = new Set(data.map((r) => r.id));
  if (ids.size !== data.length) errors.push('id 存在重复');

  const mediaIds = new Set(data.map((r) => r.media_id));
  if (mediaIds.size !== data.length) errors.push('media_id 存在重复');

  // 上游 category 与 body_part 实测恒等；若哪天不等了，说明上游结构变了
  const neq = data.filter((r) => r.category !== r.body_part).map((r) => r.id);
  if (neq.length) errors.push(`category 与 body_part 不再恒等（${neq.length} 条，例：${neq.slice(0, 3)}）`);

  const noZh = data.filter((r) => !r.instruction_steps?.zh?.length).map((r) => r.id);
  if (noZh.length) errors.push(`缺中文分步要点（${noZh.length} 条，例：${noZh.slice(0, 3)}）`);

  if (errors.length) {
    console.error('数据校验失败：');
    errors.forEach((e) => console.error('  ✗ ' + e));
    process.exit(1);
  }
  console.log(`数据校验通过：${data.length} 条，id/media_id 唯一，中文要点齐全`);

  // ---- 转换 ----
  const unknown = new Map();
  const moves = data.map((r) => {
    const zh = makeZhName(r, dict, unknown);
    // 上游每条步骤末尾都有一句模板化的「重复所需的重复次数」，对用户没有信息量
    const steps = r.instruction_steps.zh.filter(
      (s) => !/^重复(所需)?的?重复次数。?$/.test(s.trim())
    );
    return {
      id: r.id,
      slug: `${r.id}-${r.media_id}`,
      name: zh,
      zhOk: !zh.includes('['),
      nameEn: r.name,
      part: r.body_part,
      equip: normalizeEquipment(r.equipment),
      target: r.target,
      muscle: r.muscle_group,
      second: r.secondary_muscles.filter((m) => m !== r.muscle_group),
      steps: steps.length ? steps : r.instruction_steps.zh,
      overview: r.instructions.zh,
      mediaId: r.media_id
    };
  });

  const dupSlug = moves.length - new Set(moves.map((m) => m.slug)).size;
  if (dupSlug) {
    console.error(`路由键不唯一（${dupSlug} 个重复），会导致页面互相覆盖`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(moves), 'utf8');

  // ---- 覆盖率报告 ----
  const zhOk = moves.filter((m) => m.zhOk).length;
  const equipCount = new Set(moves.map((m) => m.equip)).size;
  console.log(`已生成 ${path.relative(ROOT, OUT)}`);
  console.log(`  体积      ${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB（上游 ${(fs.statSync(SRC_JSON).size / 1024 / 1024).toFixed(1)} MB）`);
  console.log(`  中文名完整 ${zhOk}/${moves.length} = ${(zhOk / moves.length * 100).toFixed(1)}%`);
  console.log(`  器械归一化后 ${equipCount} 种`);
  console.log(`  未收录词  ${unknown.size} 个不同词、共 ${[...unknown.values()].reduce((a, b) => a + b, 0)} 次`);
  if (unknown.size) {
    const top = [...unknown.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log(`  补进 scripts/i18n-zh.json 的 term 即可提升覆盖率：`);
    top.forEach(([w, c]) => console.log(`    ${w.padEnd(18)} ${c}`));
  }
}

main();
