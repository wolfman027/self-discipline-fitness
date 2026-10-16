'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FilterOption } from '@/types/move';

type Props = {
  partOptions: FilterOption[];
  equipOptions: FilterOption[];
  targetOptions: FilterOption[];
  total: number;
};

/** 器械有 26 种，默认只展示最常见的若干个，其余折叠 */
const EQUIP_VISIBLE = 12;
const TARGET_VISIBLE = 12;

/**
 * 筛选工具栏。
 *
 * 设计要点：
 * 1. 所有条件写进 URL query —— 结果可分享、可收藏、刷新不丢，也让后续做 SEO 落地页零成本。
 * 2. 同一维度内多选是 OR，不同维度之间是 AND。这是筛选器的常见预期，
 *    比「组内也 AND」更符合直觉（原数据集自带的浏览器就是后者，容易筛不出东西）。
 * 3. 每个选项带真实条数，用户点之前就知道会剩多少。
 * 4. 搜索框用非受控 + defaultValue：受控会让每次 URL 更新都重置光标位置。
 */
export default function FilterBar({ partOptions, equipOptions, targetOptions, total }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [showAllEquip, setShowAllEquip] = useState(false);
  const [showAllTarget, setShowAllTarget] = useState(false);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const csv = (key: string) => {
    const v = params.get(key);
    return v ? v.split(',').filter(Boolean) : [];
  };
  const active = {
    part: csv('part'),
    equip: csv('equip'),
    target: csv('target')
  };

  const update = useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      // 条件一变就把页码归零，否则会停在「第 5 页无结果」
      if (resetPage) next.delete('page');
      setPending(true);
      router.replace(`/?${next.toString()}`, { scroll: false });
    },
    [params, router]
  );

  // 路由更新完成后解除「筛选中」提示
  useEffect(() => setPending(false), [params]);

  const toggle = (key: 'part' | 'equip' | 'target', value: string) => {
    const cur = active[key];
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    update({ [key]: next.join(',') || null });
  };

  // 搜索防抖：输入停顿 250ms 才更新 URL，避免每敲一个字就发一次请求
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const onInput = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => update({ q: el.value.trim() || null }), 250);
    };
    el.addEventListener('input', onInput);
    return () => {
      if (t) clearTimeout(t);
      el.removeEventListener('input', onInput);
    };
  }, [update]);

  const group = (
    label: string,
    key: 'part' | 'equip' | 'target',
    options: FilterOption[],
    visible: number,
    expand?: { showAll: boolean; setShowAll: (v: boolean) => void }
  ) => {
    const shown = expand?.showAll ? options : options.slice(0, visible);
    const hidden = options.length - shown.length;
    return (
      <div className="filter-row" role="group" aria-label={label}>
        <span className="filter-label">{label}</span>
        <div className="seg">
          <button
            type="button"
            className="seg-btn"
            aria-pressed={active[key].length === 0}
            onClick={() => update({ [key]: null })}
          >
            全部
          </button>
          {shown.map((o) => (
            <button
              key={o.value}
              type="button"
              className="seg-btn"
              aria-pressed={active[key].includes(o.value)}
              onClick={() => toggle(key, o.value)}
            >
              {o.label}
              <span className="seg-count">{o.count}</span>
            </button>
          ))}
          {hidden > 0 && expand && (
            <button type="button" className="seg-btn seg-more" onClick={() => expand.setShowAll(true)}>
              ＋ {hidden} 项
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="toolbar">
      <div className="shell">
        <div className="search">
          <span className="search-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <label className="sr-only" htmlFor="q">
            搜索动作
          </label>
          <input
            ref={inputRef}
            id="q"
            className="search-input"
            type="search"
            defaultValue={params.get('q') ?? ''}
            placeholder="搜索动作名或肌群，中英文均可，如「深蹲」「dumbbell」「胸」"
            autoComplete="off"
          />
        </div>
        {group('部位', 'part', partOptions, 99)}
        {group('器械', 'equip', equipOptions, EQUIP_VISIBLE, {
          showAll: showAllEquip,
          setShowAll: setShowAllEquip
        })}
        {group('目标肌', 'target', targetOptions, TARGET_VISIBLE, {
          showAll: showAllTarget,
          setShowAll: setShowAllTarget
        })}
        <p className="filter-status" aria-live="polite">
          {pending ? '筛选中…' : `共 ${total} 个动作`}
        </p>
      </div>
    </div>
  );
}
