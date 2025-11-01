# 🚀 快速開始 - Supabase 截圖系統

## 5 分鐘快速設置

### 步驟 1: 安裝依賴 (1 分鐘)

```bash
npm install @supabase/supabase-js
```

### 步驟 2: 創建 Supabase 專案 (2 分鐘)

1. 訪問 https://app.supabase.com/
2. 點擊 **"New Project"**
3. 填寫資訊並創建

### 步驟 3: 執行資料庫架構 (1 分鐘)

1. 在 Supabase Dashboard，點擊 **"SQL Editor"**
2. 複製 `supabase-schema.sql` 的內容
3. 貼上並點擊 **"Run"**

### 步驟 4: 創建 Storage Bucket (30 秒)

1. 點擊 **"Storage"**
2. 點擊 **"Create a new bucket"**
3. 名稱: `channel-screenshots`
4. ✅ 勾選 **"Public bucket"**
5. 點擊 **"Create bucket"**

### 步驟 5: 配置環境變數 (30 秒)

1. 在 Supabase Dashboard，點擊 **"Settings"** > **"API"**
2. 複製 **Project URL** 和 **anon public key**
3. 更新 `.env` 文件：

```env
VITE_SUPABASE_URL=你的_PROJECT_URL
VITE_SUPABASE_ANON_KEY=你的_ANON_KEY
```

### 步驟 6: 測試連接 (30 秒)

```bash
npm run dev
```

打開瀏覽器訪問：
```
http://localhost:3000/test-supabase.html
```

點擊「開始測試」，確保所有測試通過 ✅

---

## 🎉 完成！

現在你可以：

1. 載入任何直播源
2. 等待 10 秒（截圖任務自動啟動）
3. 每 5 分鐘自動截取一個頻道
4. 頻道卡片自動顯示截圖

---

## 📊 驗證截圖系統

### 瀏覽器 Console

應該看到：

```
[ChannelScreenshot] Initializing Channel Screenshot Manager...
[ChannelScreenshot] Channel Screenshot Manager initialized
[SuperTVApp] Screenshot task started in background
[ChannelScreenshot] 📸 Capturing screenshot for: 台視HD
[ChannelScreenshot] ✅ Screenshot saved for: 台視HD
```

### Supabase Dashboard

1. **Table Editor** > `channel_screenshots`
   - 應該看到新增的截圖記錄

2. **Storage** > `channel-screenshots`
   - 應該看到上傳的截圖文件

---

## ⚙️ 自訂配置

### 調整截圖間隔

編輯 `channel-screenshot.js`:

```javascript
const CONFIG = {
    SCREENSHOT_INTERVAL: 3 * 60 * 1000,  // 改為 3 分鐘
    // ...
};
```

### 調整截圖品質

```javascript
const CONFIG = {
    SCREENSHOT_WIDTH: 1280,   // 提高解析度
    SCREENSHOT_HEIGHT: 720,
    JPEG_QUALITY: 0.9,        // 提高品質
    // ...
};
```

---

## 🐛 常見問題

### Q: 截圖沒有顯示？

**A:** 檢查：
1. Storage bucket 是否為 public
2. 瀏覽器 Console 是否有錯誤
3. Supabase Dashboard 是否有截圖記錄

### Q: 某些頻道無法截圖？

**A:** 正常現象，某些頻道有 CORS 限制。系統會自動跳過並重試。

### Q: 截圖更新太慢？

**A:** 調整 `SCREENSHOT_INTERVAL` 配置（最小建議 1 分鐘）

---

## 📚 詳細文檔

- **完整設置指南**: [docs/guides/SUPABASE_SETUP.md](docs/guides/SUPABASE_SETUP.md)
- **整合說明**: [SUPABASE_INTEGRATION.md](SUPABASE_INTEGRATION.md)
- **實作總結**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

**需要幫助？** 查看詳細文檔或檢查 Console 日誌！

