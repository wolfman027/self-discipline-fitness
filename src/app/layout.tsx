import type { Metadata } from 'next';
// 字体自托管：@fontsource 把 woff2 打包进本站，构建与运行都不访问 Google Fonts。
// 用 next/font/google 会在构建期请求 fonts.googleapis.com，该域名在受限网络下不可达，
// 会直接导致构建失败 —— 这里改用 npm 分发的字体包绕开该依赖。
import '@fontsource/barlow/300.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './globals.css';
import './components.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: '动作库 MOVES · 1324 个健身动作',
    template: '%s · 动作库 MOVES'
  },
  description:
    '1324 个健身动作库，每个动作都有中文分步要点、目标肌群与协同肌、器械信息和动作演示动画。',
  keywords: ['健身动作', '动作库', '训练动作', '肌群', '力量训练'],
  authors: [{ name: '动作库 MOVES' }]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
