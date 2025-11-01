# 📱 SuperTV PWA 使用指南

## 什麼是 PWA？

PWA (Progressive Web App) 讓 SuperTV 可以像原生 App 一樣使用，提供更好的用戶體驗。

## 🎯 PWA 功能

### ✅ 已實現的功能

1. **安裝到主屏幕** 📲
   - 可以將 SuperTV 安裝到手機/電腦桌面
   - 像 App 一樣點擊圖標直接打開
   - 全屏體驗，沒有瀏覽器工具列

2. **離線支持** 🔌
   - 緩存靜態資源（HTML、CSS、JS）
   - 緩存頻道列表
   - 即使網路斷線也能打開應用

3. **自動更新** 🔄
   - Service Worker 自動檢測更新
   - 有新版本時顯示通知
   - 一鍵重新載入更新

4. **智能緩存** 💾
   - 播放清單緩存（24 小時）
   - 圖片緩存（30 天）
   - CSS/JS 緩存（7 天）

5. **安裝提示** 💡
   - 自動檢測是否已安裝
   - 友好的安裝提示橫幅
   - 可以手動關閉提示

## 📱 如何安裝

### Android (Chrome/Edge)

1. 打開 SuperTV 網站
2. 等待 3 秒，會出現安裝提示
3. 點擊「安裝」按鈕
4. 或點擊瀏覽器菜單 → 「安裝應用」

**截圖示意：**
```
┌─────────────────────────────┐
│ 📱 安裝 SuperTV              │
│ 安裝到主屏幕，享受更好的體驗  │
│ [安裝]  [×]                  │
└─────────────────────────────┘
```

### iOS (Safari)

1. 打開 SuperTV 網站
2. 點擊分享按鈕 (⬆️)
3. 選擇「加入主畫面」
4. 點擊「新增」

**步驟示意：**
```
Safari → 分享 → 加入主畫面 → 新增
```

### 桌面 (Chrome/Edge)

1. 打開 SuperTV 網站
2. 點擊網址列右側的安裝圖標 (⊕)
3. 點擊「安裝」
4. 或使用快捷鍵：Ctrl+Shift+A (Windows) / Cmd+Shift+A (Mac)

## 🎨 安裝後的體驗

### 手機

```
桌面圖標：
┌────┬────┬────┬────┐
│ 📺 │ 📱 │ 📧 │ 🎵 │
│TV  │LINE│Mail│音樂│
└────┴────┴────┴────┘

點擊 📺 → 全屏打開 SuperTV
```

### 電腦

```
工作列/Dock：
[📺 SuperTV] [Chrome] [VS Code] [Spotify]

點擊 → 獨立視窗打開
```

## 🔄 更新流程

### 自動更新

1. 有新版本時，頂部會顯示通知：
   ```
   ┌─────────────────────────┐
   │ 🎉 新版本可用！[重新載入] │
   └─────────────────────────┘
   ```

2. 點擊「重新載入」即可更新

### 手動檢查更新

- 重新整理頁面 (F5 或下拉刷新)
- Service Worker 會自動檢查更新

## 💾 緩存策略

### 1. 播放清單 (NetworkFirst)
- 優先從網路獲取最新數據
- 網路失敗時使用緩存
- 緩存時間：24 小時

### 2. 圖片 (CacheFirst)
- 優先使用緩存
- 減少網路請求
- 緩存時間：30 天

### 3. CSS/JS (StaleWhileRevalidate)
- 立即使用緩存
- 背景更新最新版本
- 緩存時間：7 天

## 🛠️ 開發者資訊

### 配置文件

PWA 配置在 `vite.config.js` 中：

```javascript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'SuperTV 直播播放器',
    short_name: 'SuperTV',
    theme_color: '#1e3c72',
    // ...
  },
  workbox: {
    runtimeCaching: [
      // 緩存策略配置
    ]
  }
})
```

### 相關文件

- `vite.config.js` - PWA 插件配置
- `pwa-install.js` - 安裝提示管理器
- `public/icon.svg` - 應用圖標
- `public/favicon.svg` - 網站圖標

### 構建

```bash
# 開發環境（PWA 已啟用）
npm run dev

# 生產構建
npm run build

# 預覽構建結果
npm run preview
```

### Service Worker

- 自動生成在 `dist/sw.js`
- 使用 Workbox 管理緩存
- 支持離線訪問

## 📊 性能優化

### 初始載入

```
未安裝 PWA：
- 每次都要下載所有資源
- 載入時間：~2-3 秒

已安裝 PWA：
- 大部分資源已緩存
- 載入時間：~0.5 秒
- 提升：60-75%
```

### 離線體驗

```
網路正常：
✅ 完整功能

網路斷線：
✅ 可以打開應用
✅ 顯示頻道列表
✅ 顯示 UI 界面
❌ 無法播放直播（需要網路）
```

## 🐛 故障排除

### 問題：安裝提示沒有出現

**解決方案：**
1. 確保使用 HTTPS（localhost 除外）
2. 確保使用支持 PWA 的瀏覽器
3. 檢查是否已經安裝過
4. 清除瀏覽器緩存後重試

### 問題：更新沒有生效

**解決方案：**
1. 強制刷新：Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. 清除 Service Worker：
   - Chrome DevTools → Application → Service Workers → Unregister
3. 清除緩存：
   - Chrome DevTools → Application → Storage → Clear site data

### 問題：iOS 安裝後沒有圖標

**解決方案：**
1. 確保使用 Safari 瀏覽器
2. 檢查 `apple-touch-icon.png` 是否存在
3. 重新添加到主畫面

## 📈 使用統計

### 支持的瀏覽器

| 瀏覽器 | 版本 | 支持度 |
|--------|------|--------|
| Chrome | 67+ | ✅ 完整支持 |
| Edge | 79+ | ✅ 完整支持 |
| Safari | 11.3+ | ✅ 完整支持 |
| Firefox | 44+ | ⚠️ 部分支持 |
| Opera | 54+ | ✅ 完整支持 |

### 功能支持

| 功能 | Android | iOS | Desktop |
|------|---------|-----|---------|
| 安裝到主屏幕 | ✅ | ✅ | ✅ |
| 離線緩存 | ✅ | ✅ | ✅ |
| 推送通知 | ✅ | ❌ | ✅ |
| 背景同步 | ✅ | ❌ | ✅ |

## 🎯 最佳實踐

### 用戶

1. **定期更新**：看到更新通知時及時更新
2. **清理緩存**：如果遇到問題，嘗試清除緩存
3. **使用 WiFi**：首次安裝時建議使用 WiFi

### 開發者

1. **測試離線**：使用 Chrome DevTools 測試離線功能
2. **監控緩存**：定期檢查緩存大小
3. **版本控制**：每次更新修改版本號

## 📚 相關資源

- [PWA 官方文檔](https://web.dev/progressive-web-apps/)
- [Workbox 文檔](https://developers.google.com/web/tools/workbox)
- [Vite PWA 插件](https://vite-pwa-org.netlify.app/)

## 🆘 需要幫助？

如果遇到問題，請：
1. 查看本指南的故障排除部分
2. 檢查瀏覽器控制台錯誤
3. 提交 Issue 到 GitHub

---

**最後更新：** 2025-11-01
**版本：** 1.0.0

