# ✅ Supabase 截圖系統部署檢查清單

## 📋 部署前檢查

### 1. Supabase 設置

- [ ] Supabase 專案已創建
- [ ] 資料庫架構已執行 (`supabase-schema.sql`)
- [ ] Storage bucket `channel-screenshots` 已創建
- [ ] Storage bucket 設為 public
- [ ] Storage 政策已配置
- [ ] 測試連接成功 (`test-supabase.html`)

### 2. 環境變數

- [ ] `.env` 文件已創建
- [ ] `VITE_SUPABASE_URL` 已設置
- [ ] `VITE_SUPABASE_ANON_KEY` 已設置
- [ ] `.env` 已加入 `.gitignore`
- [ ] `.env.example` 已提供給團隊

### 3. 依賴安裝

- [ ] `@supabase/supabase-js` 已安裝
- [ ] `npm install` 無錯誤
- [ ] `npm run build` 成功

### 4. 代碼檢查

- [ ] `app.js` 已導入 `screenshotManager`
- [ ] `main.js` 已導入相關模組
- [ ] `styles.css` 已添加截圖樣式
- [ ] 無 TypeScript/ESLint 錯誤

### 5. 功能測試

- [ ] 頻道列表正常載入
- [ ] 截圖任務自動啟動（10 秒後）
- [ ] 第一個截圖成功（5 分鐘後）
- [ ] 頻道卡片顯示截圖
- [ ] Console 無錯誤日誌

---

## 🚀 部署步驟

### 開發環境

```bash
# 1. 安裝依賴
npm install

# 2. 啟動開發伺服器
npm run dev

# 3. 測試連接
# 訪問 http://localhost:3000/test-supabase.html
```

### 生產環境

```bash
# 1. 構建專案
npm run build

# 2. 預覽構建結果
npm run preview

# 3. 部署到伺服器
# 上傳 dist/ 目錄到你的伺服器
```

---

## 🔍 驗證清單

### Supabase Dashboard 檢查

#### 資料庫表格

訪問 **Table Editor**，確認以下表格存在：

- [ ] `favorites` - 用戶收藏
- [ ] `watch_history` - 觀看歷史
- [ ] `user_settings` - 用戶設定
- [ ] `custom_playlists` - 自訂播放清單
- [ ] `channel_screenshots` - 頻道截圖

#### Storage Bucket

訪問 **Storage**，確認：

- [ ] `channel-screenshots` bucket 存在
- [ ] Bucket 為 public
- [ ] 可以上傳測試文件

#### RLS 政策

訪問 **Authentication** > **Policies**，確認：

- [ ] 每個表格都有 RLS 政策
- [ ] `channel_screenshots` 允許公開讀取
- [ ] 認證用戶可以上傳截圖

### 瀏覽器檢查

#### Console 日誌

應該看到：

```
✅ [SupabaseClient] Supabase client initialized successfully
✅ [ChannelScreenshot] Channel Screenshot Manager initialized
✅ [SuperTVApp] Screenshot task started in background
✅ [ChannelScreenshot] 📸 Capturing screenshot for: 台視HD
✅ [ChannelScreenshot] ✅ Screenshot saved for: 台視HD
```

#### Network 請求

檢查 Network 標籤：

- [ ] Supabase API 請求成功 (200)
- [ ] Storage 上傳成功 (200)
- [ ] 截圖圖片載入成功 (200)

#### UI 顯示

- [ ] 頻道卡片顯示截圖
- [ ] 截圖有淡入動畫
- [ ] 頻道圖標正確顯示
- [ ] 響應式佈局正常

---

## 📊 性能檢查

### Bundle 大小

執行 `npm run build`，確認：

- [ ] 主 bundle < 20 KB (gzip)
- [ ] Supabase chunk < 50 KB (gzip)
- [ ] 總大小合理

### 載入時間

使用 Chrome DevTools Performance：

- [ ] 首次載入 < 2 秒
- [ ] 截圖不影響主要功能
- [ ] 無記憶體洩漏

### 網路使用

- [ ] 截圖上傳不阻塞其他請求
- [ ] 每 5 分鐘只有一次上傳
- [ ] 失敗自動重試

---

## 🔒 安全檢查

### 環境變數

- [ ] `.env` 不在 Git 版本控制中
- [ ] 只使用 `anon` key（不是 `service_role` key）
- [ ] 生產環境使用獨立的 Supabase 專案

### RLS 政策

- [ ] 用戶只能訪問自己的數據
- [ ] 截圖對所有人公開（符合需求）
- [ ] 無 SQL 注入風險

### CORS 設置

- [ ] Supabase 允許你的域名
- [ ] Storage 允許跨域訪問
- [ ] API 請求正常

---

## 🐛 故障排除

### 問題 1: 截圖無法上傳

**檢查：**
- [ ] Storage bucket 是否存在
- [ ] Bucket 是否為 public
- [ ] Storage 政策是否正確

**解決：**
```sql
-- 重新創建 Storage 政策
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'channel-screenshots' );
```

### 問題 2: 資料庫連接失敗

**檢查：**
- [ ] `.env` 配置是否正確
- [ ] Supabase URL 是否有效
- [ ] 網路連接是否正常

**解決：**
- 重新檢查 Supabase Dashboard > Settings > API
- 確保 URL 格式正確（無尾隨斜線）

### 問題 3: 截圖不顯示

**檢查：**
- [ ] 截圖是否成功上傳
- [ ] 圖片 URL 是否正確
- [ ] CSS 樣式是否正確

**解決：**
- 檢查 Supabase Storage 中的文件
- 檢查瀏覽器 Network 標籤
- 檢查 Console 錯誤

---

## 📈 監控設置

### Supabase Dashboard

定期檢查：

- [ ] **Database** > **Table Editor** - 查看數據增長
- [ ] **Storage** > **Usage** - 查看存儲使用量
- [ ] **Logs** > **Postgres Logs** - 查看錯誤日誌
- [ ] **Auth** > **Users** - 查看用戶數量

### 瀏覽器監控

設置監控：

- [ ] 錯誤追蹤（Sentry 等）
- [ ] 性能監控（Google Analytics 等）
- [ ] 用戶行為分析

---

## 🎯 優化建議

### 短期優化

- [ ] 添加截圖進度指示器
- [ ] 優化截圖品質設置
- [ ] 添加手動重新截圖功能

### 中期優化

- [ ] 實作截圖緩存策略
- [ ] 添加截圖失敗統計
- [ ] 優化 Storage 使用量

### 長期優化

- [ ] AI 智能選擇最佳畫面
- [ ] 多張截圖輪播
- [ ] 用戶上傳截圖功能

---

## 📚 文檔檢查

確保以下文檔完整：

- [ ] `README.md` - 專案說明
- [ ] `QUICK_START.md` - 快速開始
- [ ] `SUPABASE_INTEGRATION.md` - 整合說明
- [ ] `IMPLEMENTATION_SUMMARY.md` - 實作總結
- [ ] `docs/guides/SUPABASE_SETUP.md` - 設置指南
- [ ] `.env.example` - 環境變數範本

---

## ✅ 最終確認

### 部署前

- [ ] 所有測試通過
- [ ] 無 Console 錯誤
- [ ] 性能符合預期
- [ ] 安全檢查完成
- [ ] 文檔完整

### 部署後

- [ ] 生產環境測試
- [ ] 監控設置完成
- [ ] 備份策略確認
- [ ] 團隊培訓完成

---

## 🎉 部署完成

恭喜！Supabase 截圖系統已成功部署！

### 下一步

1. 監控系統運行狀況
2. 收集用戶反饋
3. 持續優化性能
4. 添加新功能

---

**部署日期**: ___________  
**部署人員**: ___________  
**版本**: v2.0.0  
**狀態**: ✅ 生產就緒

