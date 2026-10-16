import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GYM_VISUAL_CREDIT, zhEquip, zhMuscle, zhPart, zhTarget } from '@/lib/dict';
import { MOVES, getMove, gifPath, imgPath, relatedMoves, titleOf } from '@/lib/moves';

type Params = Promise<{ slug: string }>;

/** 1324 个详情页全部预渲染：站点无后端依赖，构建后即为纯静态 */
export function generateStaticParams() {
  return MOVES.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const move = getMove(slug);
  if (!move) return { title: '动作不存在' };
  const title = titleOf(move);
  return {
    title: `${title}（${move.nameEn}）`,
    description: `${title}怎么做：${move.steps.length} 步中文要点，目标肌 ${zhTarget(move.target)}，器材 ${zhEquip(move.equip)}，附动作演示。`,
    openGraph: {
      title: `${title} · 动作库 MOVES`,
      description: `${zhPart(move.part)} · ${zhEquip(move.equip)} · ${zhTarget(move.target)}`,
      images: [{ url: imgPath(move), width: 180, height: 180 }]
    }
  };
}

export default async function MovePage({ params }: { params: Params }) {
  const { slug } = await params;
  const move = getMove(slug);
  if (!move) notFound();

  const title = titleOf(move);
  const related = relatedMoves(move, 6);

  // 结构化数据，帮助搜索引擎理解这是「怎么做某个动作」的内容页
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    alternateName: move.nameEn,
    description: move.overview,
    image: imgPath(move),
    step: move.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s }))
  };

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
            <Link className="nav-link" href="/">
              动作库
            </Link>
            <Link className="nav-link" href={`/?part=${encodeURIComponent(move.part)}`}>
              {zhPart(move.part)}
            </Link>
            <Link className="nav-link" href={`/?equip=${encodeURIComponent(move.equip)}`}>
              {zhEquip(move.equip)}
            </Link>
          </nav>
          <span className="spacer" />
        </div>
      </header>

      <main className="shell">
        <div className="detail-head">
          <Link className="crumbs" href="/">
            ← 返回动作列表
          </Link>
          <h1 className="detail-title">{title}</h1>
          {move.zhOk && <p className="detail-en">{move.nameEn}</p>}
          <div className="chips">
            <span className="badge badge-primary">{zhPart(move.part)}</span>
            <span className="badge">{zhEquip(move.equip)}</span>
            <span className="badge">{zhTarget(move.target)}</span>
            <span className="badge">{move.steps.length} 步</span>
          </div>
        </div>

        <div className="detail-main">
          <aside className="media-panel">
            {/* 详情页用动图：这是「看懂动作」最有效的手段，卡片列表则不预载以省带宽 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gifPath(move)}
              alt={`${title} 动作演示`}
              width={180}
              height={180}
              decoding="async"
            />
            <p className="media-note">
              动作演示 · 180×180
              <br />
              {GYM_VISUAL_CREDIT}
            </p>
          </aside>

          <div>
            <section className="block">
              <h2 className="block-title">动作速览</h2>
              <div className="facts">
                <div className="fact">
                  <div className="fact-k">目标肌</div>
                  <div className="fact-v">{zhTarget(move.target)}</div>
                </div>
                <div className="fact">
                  <div className="fact-k">主要肌群</div>
                  <div className="fact-v">{zhMuscle(move.muscle)}</div>
                </div>
                <div className="fact">
                  <div className="fact-k">协同肌</div>
                  <div className="fact-v">
                    {move.second.length ? move.second.map(zhMuscle).join('、') : '—'}
                  </div>
                </div>
                <div className="fact">
                  <div className="fact-k">所需器械</div>
                  <div className="fact-v">{zhEquip(move.equip)}</div>
                </div>
              </div>
            </section>

            <section className="block">
              <h2 className="block-title">分步要点（{move.steps.length} 步）</h2>
              <ol className="steps">
                {move.steps.map((s, i) => (
                  <li key={i}>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </section>

            {related.length > 0 && (
              <section className="block">
                <h2 className="block-title">相关动作</h2>
                <div className="related">
                  {related.map((r) => (
                    <Link key={r.slug} className="related-item" href={`/moves/${r.slug}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgPath(r)} alt="" width={48} height={48} loading="lazy" />
                      <span>{titleOf(r)}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <p className="credit">
              动作演示素材 {GYM_VISUAL_CREDIT}，仅以 180×180 分辨率使用。
              数据来自 Exercises Dataset（MIT License，© 2026 Hasan Emir Yıldırım）。
              做任何动作前请充分热身；如有伤病请咨询专业人士。
            </p>
          </div>
        </div>
      </main>

      <footer className="shell footer">
        <span>动作库 MOVES · 共 {MOVES.length} 个动作</span>
        <span>动作演示素材 © Gym visual — https://gymvisual.com/ · 仅以 180×180 使用</span>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
