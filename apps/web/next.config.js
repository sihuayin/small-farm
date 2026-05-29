/** @type {import('next').NextConfig} */
const nextConfig = {
  // 外部化 canvas 和 jsdom（Konva 依赖的原生模块）
  // 这些只在浏览器端需要，服务端渲染时会被替换为空
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 服务端不需要 canvas 相关模块
      config.externals = config.externals || [];
      config.externals.push({
        canvas: 'canvas',
      });
    }
    return config;
  },
};

module.exports = nextConfig;