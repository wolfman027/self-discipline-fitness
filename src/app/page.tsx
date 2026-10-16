import Link from 'next/link';
import FilterBar from '@/components/FilterBar';
import MoveGrid from '@/components/MoveGrid';
import Pagination from '@/components/Pagination';
import { zhEquip, zhPart } from '@/lib/dict';
import { EQUIP_OPTIONS, MOVES, PART_OPTIONS, TARGET_OPTIONS, queryMoves } from '@/lib/moves';

export const metadata = {
  title: '动作库 MOVES · 1324 个健身动作',
  description: '按部位、器械、目标肌筛选 1324 个健身动作，每个都有中文分步要点与动作演示。'
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''));

/**
 * 首页（服务端组件）。
 *
 * 筛选、搜索、分页全部在服务端完成，客户端只拿到当前页的 24 条。
 * 若改成客户端筛选，就得把 1324 条数据（1.2MB）发到浏览器，不划算。
 * 条件全部来自 URL，所以结果可分享、可收藏、刷新不丢。
 */
export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const part = one(sp.part);
  const equip = one(sp.equip);
  const target = one(sp.target);
  const q = one(sp.q);
  const page = Number(one(sp.page)) || 1;

  const { items, total, totalPages, page: safePage } = queryMoves({ q, part, equip, target, page });
  const activeNames = [
    q && `「${q}」`,
    ...part.split(',').filter(Boolean).map(zhPart),
    ...equip.split(',').filter(Boolean).map(zhEquip),
    ...target.split(',').filter(Boolean)
  ].filter(Boolean) as string[];

  return (
    <>
      <header className="nav">
        <div className="shell nav-inner">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              M
            </span>
            <span className="brand-name">动作库 MOVES</span>
          </Link>
          <nav className="nav-links" aria-label="主导航">
            <Link className="nav-link" href="/" aria-current="page">
              动作库
            </Link>
            <Link className="nav-link" href="/?part=chest">
              胸部
            </Link>
            <Link className="nav-link" href="/?part=waist">
              腰腹
            </Link>
            <Link className="nav-link" href="/?equip=body+weight">
              徒手
            </Link>
          </nav>
          <span className="spacer" />
        </div>
      </header>

      <main>
        <section className="shell hero">
          <span className="hero-eyebrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M4 12h16M4 7v10M20 7v10" />
            </svg>
            共 {MOVES.length} 个动作 · 全部免费查阅
          </span>
          <h1 className="hero-title">
            把每一个健身动作
            <br />
            拆开讲清楚
          </h1>
          <p className="hero-sub">
            {MOVES.length} 个动作，每个都有中文分步要点、目标肌群与协同肌、器械信息，以及动作演示动画。不用翻视频，30 秒看懂一个动作怎么做。
          </p>
        </section>

        <FilterBar
          partOptions={PART_OPTIONS}
          equipOptions={EQUIP_OPTIONS}
          targetOptions={TARGET_OPTIONS}
          total={total}
        />

        <section className="shell" aria-labelledby="list-title">
          <div className="result-line">
            <h2 id="list-title" className="result-title">
              动作列表
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-muted)' }}>
              找到 <b style={{ color: 'var(--fg)' }}>{total}</b> 个动作
              {totalPages > 1 && ` · 第 ${safePage} / ${totalPages} 页`}
            </p>
          </div>

          {items.length > 0 ? (
            <MoveGrid moves={items} />
          ) : (
            <div className="empty">
              <h3>没有匹配的动作</h3>
              <p>
                {activeNames.length
                  ? `当前条件：${activeNames.join(' / ')}，没有匹配的动作。`
                  : '没有匹配的动作。'}
                试试减少筛选条件。
              </p>
              <Link className="btn btn-primary" href="/">
                清除全部筛选
              </Link>
            </div>
          )}

          <Pagination page={safePage} totalPages={totalPages} />
        </section>
      </main>

      <footer className="shell footer">
        <span>动作库 MOVES · 共 {MOVES.length} 个动作，只做动作展示</span>
        <span>动作演示素材 © Gym visual — https://gymvisual.com/ · 仅以 180×180 使用</span>
      </footer>
    </>
  );
}
