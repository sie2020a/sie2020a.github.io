/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,

  // GitHub Pages: https://sie2020a.github.io/app3/ で配信する
  basePath: "/app3",
  assetPrefix: "/app3/",

  // 静的書き出し（GitHub Pages用）
  output: "export",

  // export時の画像最適化を無効化
  images: { unoptimized: true },
};

module.exports = nextConfig;
