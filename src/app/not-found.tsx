import Link from 'next/link';

/** 404：给出明确出口，而不是让用户卡在死路上 */
export default function NotFound() {
  return (
    <main className="shell" style={{ padding: 'var(--space-3xl) 0' }}>
      <div className="empty">
        <h3>没有找到这个动作</h3>
        <p>链接可能已失效，或者动作编号被改动过。回到动作列表继续浏览 1324 个动作。</p>
        <Link className="btn btn-primary" href="/">
          返回动作列表
        </Link>
      </div>
    </main>
  );
}
