/**
 * Next.js 配置
 *
 * 说明两点取舍：
 * 1. images.unoptimized = true —— 动作素材授权条款要求「仅以 180×180 分发」，
 *    不能经 Next 图像优化管线放大或重编码，因此直接原样提供。
 * 2. 1324 个动作详情页全部预渲染（generateStaticParams），站点无后端依赖。
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // 授权要求素材保持 180×180 原样输出，禁用优化管线
    unoptimized: true
  },
  eslint: {
    // 构建不因 lint 中断；lint 单独跑
    ignoreDuringBuilds: true
  },
  env: {
    // 生成 OG/分享图绝对地址时要用的站点根地址。
    // 部署到正式域名时用 NEXT_PUBLIC_SITE_URL 覆盖即可，不用改代码。
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  }
};

export default nextConfig;
