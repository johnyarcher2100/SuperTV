# 🔧 SuperTV 高優先級修復指南

本文檔說明已完成的高優先級修復和需要執行的步驟。

## ✅ 已完成的修復

### 1. 依賴管理優化
- ✅ 將 Puppeteer 移至 `devDependencies`（減少生產環境體積 ~170MB）
- ✅ 更新 HLS.js 到最新版本

### 2. 數據庫 Schema 修復
- ✅ 創建 `supabase-schema-fix.sql` 修復腳本
- ✅ 修復 `channel-screenshot.js` 的 upsert 邏輯

### 3. 環境變數管理
- ✅ `.env.example` 已存在並配置正確

---

## 🚀 需要執行的步驟

### 步驟 1: 升級 Node.js（重要！）

**當前問題：**
```
⚠️ Node.js 18 and below are deprecated
```

**解決方案：**

#### 選項 A: 使用 nvm（推薦）
```bash
# 安裝 Node.js 20 LTS
nvm install 20

# 切換到 Node.js 20
nvm use 20

# 設為默認版本
nvm alias default 20

# 驗證版本
node -v  # 應該顯示 v20.x.x
```

#### 選項 B: 直接下載安裝
訪問 https://nodejs.org/ 下載 Node.js 20 LTS 版本

### 步驟 2: 重新安裝依賴

```bash
# 刪除舊的依賴
rm -rf node_modules package-lock.json

# 重新安裝
npm install

# 驗證安裝
npm list hls.js  # 應該顯示 1.6.14
```

### 步驟 3: 修復 Supabase 數據庫 Schema

**重要：** 這一步需要在 Supabase 控制台執行

1. 登入 Supabase Dashboard: https://app.supabase.com
2. 選擇你的專案
3. 點擊左側菜單的 "SQL Editor"
4. 創建新查詢
5. 複製 `supabase-schema-fix.sql` 的內容並執行

**執行前注意事項：**
- ⚠️ 如果 `channel_screenshots` 表已存在且有數據，請先備份！
- 腳本會創建唯一約束，可能會刪除重複數據
- 建議在測試環境先執行

**驗證 Schema：**
```sql
-- 檢查表結構
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'channel_screenshots';

-- 檢查約束
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'channel_screenshots';
```

### 步驟 4: 測試修復

```bash
# 啟動開發服務器
npm run dev

# 在瀏覽器中打開
# http://localhost:3000

# 測試截圖功能
# 1. 選擇一個直播源
# 2. 等待 10 秒
# 3. 檢查控制台是否有錯誤
# 4. 檢查 Supabase Storage 是否有新截圖
```

### 步驟 5: 驗證修復成功

**檢查清單：**

- [ ] Node.js 版本 >= 20
  ```bash
  node -v
  ```

- [ ] HLS.js 已更新到 1.6.14
  ```bash
  npm list hls.js
  ```

- [ ] Puppeteer 在 devDependencies
  ```bash
  cat package.json | grep -A 10 devDependencies
  ```

- [ ] 開發服務器啟動無警告
  ```bash
  npm run dev
  # 不應該看到 "Node.js 18 and below are deprecated" 警告
  ```

- [ ] 截圖功能正常
  - 截圖上傳成功
  - 數據庫更新成功（無 "constraint" 錯誤）
  - Supabase Storage 中可以看到截圖

---

## 📊 修復前後對比

### 修復前
```
❌ Node.js 18 (已棄用)
❌ HLS.js 1.4.12 (過時)
❌ Puppeteer 在 dependencies (~170MB)
❌ 數據庫更新失敗 (constraint 錯誤)
```

### 修復後
```
✅ Node.js 20+ (最新 LTS)
✅ HLS.js 1.6.14 (最新版)
✅ Puppeteer 在 devDependencies (生產環境體積減少)
✅ 數據庫更新成功 (正確的 upsert 邏輯)
```

---

## 🔍 故障排除

### 問題 1: npm install 失敗

**解決方案：**
```bash
# 清除 npm 緩存
npm cache clean --force

# 刪除 node_modules
rm -rf node_modules package-lock.json

# 重新安裝
npm install
```

### 問題 2: Supabase Schema 執行失敗

**可能原因：**
- 表已存在且有數據
- 權限不足

**解決方案：**
```sql
-- 檢查現有數據
SELECT COUNT(*) FROM channel_screenshots;

-- 如果需要，先刪除表（會丟失數據！）
DROP TABLE IF EXISTS channel_screenshots CASCADE;

-- 然後重新執行 supabase-schema-fix.sql
```

### 問題 3: 截圖仍然失敗

**檢查步驟：**
1. 檢查 Supabase Storage bucket 是否存在
2. 檢查 RLS 政策是否正確
3. 檢查 .env 文件配置
4. 查看瀏覽器控制台錯誤

---

## 📞 需要幫助？

如果遇到問題：
1. 檢查瀏覽器控制台錯誤訊息
2. 檢查 Supabase Dashboard 的日誌
3. 查看 `npm run dev` 的終端輸出

---

## 🎯 下一步

完成這些高優先級修復後，建議繼續進行：
1. 代碼重構（合併重複的播放器代碼）
2. 添加單元測試
3. 性能監控優化
4. 文檔更新

詳見主報告中的「中優先級」和「低優先級」建議。

