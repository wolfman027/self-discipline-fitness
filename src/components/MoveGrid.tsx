'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Move } from '@/types/move';
import { imgPath, gifPath, titleOf, subtitleOf } from '@/lib/moves';
import { zhEquip, zhMuscle, zhPart, zhTarget } from '@/lib/dict';
import MoveMedia from './MoveMedia';

/**
 * 动作卡片列表。
 *
 * 这是全站唯一的客户端边界：1324 张卡片里只有「当前悬停的那一张」
 * 需要状态，所以把 hover 提升到列表层统一管理，而不是每张卡各自持一份。
 * 好处是任意时刻最多只有一个动图在加载，快速划过时连请求都不会发出。
 */
export default function MoveGrid({ moves }: { moves: Move[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const onMouseOver = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('[data-slug]');
      const slug = card?.dataset.slug ?? null;
      if (!slug || slug === playing || timer.current) return;
      // 触屏设备没有 hover，跳过预载，动图留给详情页
      if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        setPlaying(slug);
      }, 700);
    },
    [playing]
  );

  const onMouseOut = useCallback(() => {
    clear();
    setPlaying(null);
  }, [clear]);

  return (
    <div className="grid" onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
      {moves.map((m) => {
        const title = titleOf(m);
        const sub = subtitleOf(m);
        const muscles = [zhTarget(m.target), ...m.second.slice(0, 2).map(zhMuscle)].join(' · ');
        return (
          <Link
            key={m.slug}
            href={`/moves/${m.slug}`}
            className="card"
            data-slug={m.slug}
            aria-label={`${title}，${zhPart(m.part)}，查看动作详情`}
          >
            <MoveMedia
              img={imgPath(m)}
              gif={gifPath(m)}
              alt={`${title} 动作示意图`}
              play={playing === m.slug}
            />
            <div className="card-body">
              <h3 className="card-title">{title}</h3>
              {sub && <p className="card-sub">{sub}</p>}
              <p className="card-muscles">{muscles}</p>
              <div className="card-meta">
                <span className="badge">{zhEquip(m.equip)}</span>
                <span className="badge">{zhTarget(m.target)}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
