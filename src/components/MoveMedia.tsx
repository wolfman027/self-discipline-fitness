'use client';

import { useState } from 'react';

type Props = {
  img: string;
  gif: string;
  alt: string;
  /** 由父级统一节流后传入：悬停满 700ms 才为 true，避免快速划过就拉 95KB */
  play: boolean;
};

/**
 * 卡片媒体区 = 静态略图 + 动图叠放。
 *
 * 为什么必须是客户端组件：动图共 125MB，不能随列表一起发下去，
 * 只能按需加载，这需要浏览器端状态。
 *
 * 尺寸纪律：素材只允许以 180×180 分发，所以这里锁定 width/height=180，
 * 不做任何放大（放大既违约也会让线条发虚）。
 */
export default function MoveMedia({ img, gif, alt, play }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="card-media">
      {imgFailed ? (
        <span className="card-fallback">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4" />
          </svg>
          <span>暂无图示</span>
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          className="card-img"
          src={img}
          alt={alt}
          width={180}
          height={180}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      )}
      {/* 动图仅在悬停时挂载，未悬停时连请求都不会发出 */}
      {play && !imgFailed && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="card-gif" src={gif} alt="" width={180} height={180} decoding="async" />
      )}
      <span className="card-play" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </div>
  );
}
