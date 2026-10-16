import movesJson from '@/data/moves.json';
import type { FilterOption, Move, MovePage, MoveQuery } from '@/types/move';
import { zhEquip, zhPart, zhTarget } from './dict';

/**
 * 站点数据。构建期由 scripts/build-data.mjs 生成。
 *
 * 类型直接断言而不做运行时校验：校验在生成脚本里做，
 * 数据不合格会中断构建，所以运行时这里一定是干净的。
 */
export const MOVES = movesJson as unknown as Move[];

export const PAGE_SIZE = 24;

const BY_SLUG = new Map(MOVES.map((m) => [m.slug, m]));

export const getMove = (slug: string): Move | undefined => BY_SLUG.get(slug);

/**
 * 预拼搜索索引。
 * 1324 条在服务端过滤成本可忽略；放到客户端则要传 1.2MB 数据，不划算。
 */
const HAY = new Map(
  MOVES.map((m) => [
    m.slug,
    [
      m.name,
      m.nameEn,
      zhPart(m.part),
      m.part,
      zhEquip(m.equip),
      m.equip,
      m.target,
      m.muscle,
      ...m.second
    ]
      .join(' ')
      .toLowerCase()
  ])
);

/** 归一化筛选条件：支持单值与逗号分隔的多值，并忽略占位值 all */
function toSet(input: string | string[] | undefined): Set<string> | null {
  if (!input) return null;
  const list = (Array.isArray(input) ? input : input.split(','))
    .map((s) => s.trim())
    .filter((s) => s && s !== 'all');
  return list.length ? new Set(list) : null;
}

/**
 * 查询动作。
 *
 * 语义：同一维度内多选是 OR，不同维度之间是 AND。
 * 这比「组内也 AND」更符合筛选器的一般预期 —— 组内 AND 往往一选就空，
 * 用户会以为站点坏了（上游自带的浏览器就是这个问题）。
 *
 * 分页在服务端完成：返回当前页的切片，客户端只拿到 24 条。
 */
export function queryMoves(query: MoveQuery): MovePage {
  const q = (query.q ?? '').trim().toLowerCase();
  const parts = toSet(query.part);
  const equips = toSet(query.equip);
  const targets = toSet(query.target);

  const items = MOVES.filter((m) => {
    if (parts && !parts.has(m.part)) return false;
    if (equips && !equips.has(m.equip)) return false;
    if (targets && !targets.has(m.target)) return false;
    if (q && !HAY.get(m.slug)!.includes(q)) return false;
    return true;
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(query.page ?? 1)), totalPages);
  const start = (page - 1) * PAGE_SIZE;

  return { items: items.slice(start, start + PAGE_SIZE), total, page, pageSize: PAGE_SIZE, totalPages };
}

/** 筛选器选项：带真实条数并按条数降序，让用户点之前就知道会剩多少 */
function optionsOf(pick: (m: Move) => string, label: (k: string) => string): FilterOption[] {
  const counts = new Map<string, number>();
  for (const m of MOVES) {
    const k = pick(m);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: label(value), count }))
    .sort((a, b) => b.count - a.count);
}

export const PART_OPTIONS = optionsOf((m) => m.part, zhPart);
export const EQUIP_OPTIONS = optionsOf((m) => m.equip, zhEquip);
export const TARGET_OPTIONS = optionsOf((m) => m.target, zhTarget);

/** 详情页的相关动作：先同目标肌，不足再补同部位 */
export function relatedMoves(move: Move, limit = 6): Move[] {
  const out: Move[] = [];
  const seen = new Set([move.slug]);
  const take = (m: Move) => {
    out.push(m);
    seen.add(m.slug);
  };
  for (const m of MOVES) {
    if (seen.has(m.slug) || m.target !== move.target) continue;
    take(m);
    if (out.length >= limit) return out;
  }
  for (const m of MOVES) {
    if (seen.has(m.slug) || m.part !== move.part) continue;
    take(m);
    if (out.length >= limit) break;
  }
  return out;
}

/** 媒体路径。构建期已校验 1324 组文件齐全，这里不再兜底。 */
export const imgPath = (m: Move) => `/media/img/${m.id}-${m.mediaId}.jpg`;
export const gifPath = (m: Move) => `/media/gif/${m.id}-${m.mediaId}.gif`;

/** 主标题：中文名不完整时回落英文名，不显示「[air]单车」这类半成品 */
export const titleOf = (m: Move) => (m.zhOk ? m.name : m.nameEn);
export const subtitleOf = (m: Move) => (m.zhOk ? m.nameEn : '');
