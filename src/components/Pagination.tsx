'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/**
 * 分页。
 *
 * 为什么不做无限滚动：1324 个动作里用户往往只关心前几页，
 * 无限滚动会让「我到底看到第几个了」变得模糊，也没法分享定位。
 * 分页链接是可被搜索引擎抓取的，这也让详情页更容易被发现。
 */
export default function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const params = useSearchParams();
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete('page');
    else next.set('page', String(p));
    const qs = next.toString();
    return qs ? `/?${qs}` : '/';
  };

  // 当前页附近展示窗口，两端补首尾：1 … 4 5 6 … 67
  const windowSize = 2;
  const pages: (number | 'gap')[] = [];
  const push = (n: number | 'gap') => {
    if (pages[pages.length - 1] !== n) pages.push(n);
  };
  for (let p = 1; p <= totalPages; p++) {
    const near = Math.abs(p - page) <= windowSize;
    if (p === 1 || p === totalPages || near) push(p);
    else push('gap');
  }

  return (
    <nav className="pager" aria-label="分页">
      {page > 1 ? (
        <Link className="pager-btn" href={href(page - 1)} rel="prev">
          上一页
        </Link>
      ) : (
        <span className="pager-btn is-disabled" aria-disabled="true">
          上一页
        </span>
      )}
      <div className="pager-nums">
        {pages.map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="pager-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <Link
              key={p}
              className={`pager-num${p === page ? ' is-current' : ''}`}
              href={href(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Link>
          )
        )}
      </div>
      {page < totalPages ? (
        <Link className="pager-btn" href={href(page + 1)} rel="next">
          下一页
        </Link>
      ) : (
        <span className="pager-btn is-disabled" aria-disabled="true">
          下一页
        </span>
      )}
    </nav>
  );
}
