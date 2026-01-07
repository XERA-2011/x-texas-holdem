import type { NextConfig } from "next";

// 从环境变量读取 basePath
// 默认为空字符串（用于 Vercel 等根路径部署）
// 阿里云部署时设置为 /texas-holdem
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
