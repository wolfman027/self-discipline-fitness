/**
 * 首屏加载态。
 * 用骨架屏而不是转圈：骨架能提前占住卡片布局，避免内容到位后页面跳动。
 */
export default function Loading() {
  return (
    <main className="shell" style={{ padding: 'var(--space-3xl) 0' }}>
      <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--text-sm)' }}>正在加载动作库…</p>
      <div className="grid" style={{ marginTop: 'var(--space-lg)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card" aria-hidden="true">
            <div className="card-media" style={{ background: 'var(--surface-2)' }} />
            <div className="card-body">
              <div style={{ height: 18, width: '70%', background: 'var(--surface-2)', borderRadius: 4 }} />
              <div style={{ height: 12, width: '45%', background: 'var(--surface-2)', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
