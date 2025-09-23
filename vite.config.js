import { defineConfig } from 'vite'

export default defineConfig({
  // 開發服務器配置
  server: {
    port: 3000,
    host: '0.0.0.0', // 允許外部訪問
    open: process.env.CI ? false : true, // 自動打開瀏覽器（CI 環境關閉）
    cors: true, // 啟用 CORS
    proxy: {
      '/api/playlist': {
        target: 'https://files.catbox.moe',
        changeOrigin: true,
        rewrite: (path) => '/id0n84.txt'
      },
      '/api/xiaofeng': {
        target: 'http://晓峰.azip.dpdns.org:5008',
        changeOrigin: true,
        rewrite: (path) => '/?type=m3u'
      },
      '/api/miaokai': {
        target: 'https://files.catbox.moe',
        changeOrigin: true,
        rewrite: (path) => '/zyat7k.m3u'
      },
      '/api/stream': {
        target: 'http://breezy-audrie-zspace-7524863c.koyeb.app',
        changeOrigin: true,
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/api\/stream/, '/sub')
      },
      '/api/proxy': {
        target: 'http://220.134.196.147:8567',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy/, '')
      }
    }
  },
  
  // 構建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'video-libs': ['hls.js']
        }
      }
    }
  },
  
  // 優化配置
  optimizeDeps: {
    include: ['hls.js', 'video.js']
  },
  
  // 插件配置
  plugins: [],
  
  // 解析配置
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  
  // CSS 配置
  css: {
    devSourcemap: true
  }
})
