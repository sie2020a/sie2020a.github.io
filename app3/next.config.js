/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,

  // GitHub Pagesでサブフォルダ配信するため（超重要）
  basePath: "/app3_site",
  assetPrefix: "/app3_site/",

  // 静的書き出し
  output: "export",

  // exportだと画像最適化が面倒なのでOFF
  images: { unoptimized: true },
};

module.exports = nextConfig;
