import purgecssPlugin from '@fullhuman/postcss-purgecss';
import cssnano from 'cssnano';

const purgecss = purgecssPlugin.default || purgecssPlugin;

export default {
  plugins: [
    purgecss({
      // 掃描這些文件以找出使用的 CSS
      content: [
        './index.html',
        './app.js',
        './player.js',
        './channels.js',
        './iptv-player.js',
        './virtual-scroller.js',
        './pwa-install.js',
        './logger.js',
        './main.js'
      ],
      
      // 默認提取器
      defaultExtractor: content => {
        // 提取所有可能的類名和 ID
        const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
        const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
        return broadMatches.concat(innerMatches);
      },
      
      // 安全列表 - 這些類永遠不會被移除
      safelist: {
        standard: [
          // 動態添加的類
          'active',
          'hidden',
          'playing',
          'paused',
          'loading',
          'error',
          'buffering',
          'player-mode',
          
          // 虛擬滾動器動態類
          'virtual-scroller-viewport',
          'virtual-scroller-content',
          'virtual-scroller-grid',
          
          // PWA 相關
          'pwa-install-prompt',
          'pwa-installed',
          
          // 狀態類
          'show',
          'hide',
          'visible',
          'invisible',
          
          // 動畫類
          'fade-in',
          'fade-out',
          'slide-in',
          'slide-out'
        ],
        
        // 使用正則表達式匹配的類
        deep: [
          /^channel-/,  // 所有 channel- 開頭的類
          /^video-/,    // 所有 video- 開頭的類
          /^player-/,   // 所有 player- 開頭的類
          /^modal-/,    // 所有 modal- 開頭的類
          /^btn-/,      // 所有 btn- 開頭的類
          /^icon-/,     // 所有 icon- 開頭的類
        ],
        
        // 貪婪模式 - 保留這些選擇器的所有變體
        greedy: [
          /^\.category-btn/,
          /^\.source-btn/,
          /^\.control-btn/,
        ]
      },
      
      // 只在生產環境啟用
      // 開發環境保留所有 CSS 以便調試
      rejected: process.env.NODE_ENV === 'production',
      
      // 移除未使用的 keyframes
      keyframes: true,
      
      // 移除未使用的 CSS 變量
      variables: true,
      
      // 移除未使用的 font-face
      fontFace: true
    }),

    // 🗜️ cssnano - 進一步壓縮 CSS
    // 只在生產環境啟用
    ...(process.env.NODE_ENV === 'production' ? [
      cssnano({
        preset: ['default', {
          // 優化選項
          discardComments: {
            removeAll: true // 移除所有註釋
          },
          normalizeWhitespace: true, // 標準化空白
          colormin: true, // 壓縮顏色值
          minifyFontValues: true, // 壓縮字體值
          minifyGradients: true, // 壓縮漸變
          normalizeUrl: true, // 標準化 URL
          reduceIdents: false, // 不縮短 keyframes 名稱（避免破壞）
          zindex: false // 不優化 z-index（避免破壞）
        }]
      })
    ] : [])
  ]
};

