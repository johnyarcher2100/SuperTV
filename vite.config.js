import { defineConfig } from 'vite'
import { resolve } from 'path'
import { customProxyPlugin } from './vite-proxy-plugin.js'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // 開發服務器配置
  server: {
    port: 3000,
    host: '0.0.0.0', // 允許外部訪問
    open: process.env.CI ? false : true, // 自動打開瀏覽器（CI 環境關閉）
    cors: true, // 啟用 CORS

    // 自定義中間件處理代理
    middlewareMode: false,

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
      '/api/judy': {
        target: 'https://files.catbox.moe',
        changeOrigin: true,
        rewrite: (path) => '/25aoli.txt'
      },
      '/api/laji': {
        target: 'https://files.catbox.moe',
        changeOrigin: true,
        rewrite: (path) => '/1mj29e.m3u'
      },
      '/api/mimi': {
        target: 'https://raw.githubusercontent.com',
        changeOrigin: true,
        rewrite: (path) => '/Guovin/iptv-api/gd/output/result.m3u'
      },
      '/api/gather': {
        target: 'https://tv.iill.top',
        changeOrigin: true,
        rewrite: (path) => '/m3u/Gather'
      },
      '/api/jipin': {
        target: 'https://files.catbox.moe',
        changeOrigin: true,
        rewrite: (path) => '/id0n84.txt'
      },
      '/api/yuanbao': {
        target: 'https://chuxinya.top',
        changeOrigin: true,
        rewrite: (path) => '/f/DRGJH3/绿影流年.txt'
      },
      '/api/stream': {
        target: 'http://breezy-audrie-zspace-7524863c.koyeb.app',
        changeOrigin: true,
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/api\/stream/, '/sub')
      }
      // /api/proxy 由自定義中間件處理（見 vite-proxy-plugin.js）
    }
  },
  
  // 構建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild',
    // 提高 chunk 大小警告閾值
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html')
      },
      output: {
        // 代碼分割配置 - 減少初始載入大小
        manualChunks: {
          // HLS.js 單獨打包（最大的依賴）
          'vendor-hls': ['hls.js'],
          // 播放器相關代碼
          'player': [
            './iptv-player.js',
            './player.js'
          ],
          // 工具類
          'utils': [
            './logger.js',
            './dom-utils.js'
          ]
        },
        // 優化文件命名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  
  // 優化配置
  optimizeDeps: {
    include: ['hls.js']
  },
  
  // 插件配置
  plugins: [
    customProxyPlugin(), // 自定義代理插件
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png'],

      manifest: {
        name: 'SuperTV 直播播放器',
        short_name: 'SuperTV',
        description: '多格式直播播放器 - 支援 HLS 和多種視頻格式',
        theme_color: '#1e3c72',
        background_color: '#1e3c72',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ],
        categories: ['entertainment', 'video', 'multimedia'],
        screenshots: [
          {
            src: '/screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide'
          }
        ]
      },

      workbox: {
        // 緩存策略
        runtimeCaching: [
          {
            // 緩存 API 請求（播放清單）
            urlPattern: /^https:\/\/.*\.(m3u|m3u8|txt)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'playlist-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 小時
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // 緩存圖片
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 天
              }
            }
          },
          {
            // 緩存 CSS 和 JS
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
              }
            }
          }
        ],

        // 清理過期緩存
        cleanupOutdatedCaches: true,

        // 跳過等待，立即激活新的 Service Worker
        skipWaiting: true,
        clientsClaim: true,

        // 導航預載
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/]
      },

      devOptions: {
        enabled: true, // 開發環境也啟用 PWA
        type: 'module'
      }
    })
  ],
  
  // 解析配置
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  
  // CSS 配置
  css: {
    devSourcemap: true,
    postcss: './postcss.config.js'
  }
})
