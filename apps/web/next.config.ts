module.exports = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["@sparticuz/chromium-min", "@napi-rs/canvas", "pdfjs-dist", "pdf-parse"],
  output: "standalone", // 启用 standalone 输出，用于 Docker 部署
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
    resolveExtensions: [".web.js", ".web.jsx", ".web.ts", ".web.tsx", ".js", ".jsx", ".ts", ".tsx"],
  },
}
