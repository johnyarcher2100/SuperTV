# 🚀 Supabase 快速設置指南

## 📋 設置步驟

### 步驟 1: 執行 SQL 腳本

1. **打開 Supabase Dashboard**
   ```
   https://app.supabase.com/project/pecxpugndpvmdysyhxha/sql/new
   ```

2. **複製整個 `supabase-schema.sql` 文件的內容**

3. **貼到 SQL Editor 中**

4. **點擊 "Run" 按鈕**（或按 Ctrl+Enter / Cmd+Enter）

5. **等待執行完成**（應該會看到成功訊息）

---

### 步驟 2: 驗證設置

執行完成後，你應該看到以下結果：

#### ✅ 資料庫表格（5 個）
- `favorites` - 用戶收藏
- `watch_history` - 觀看歷史
- `user_settings` - 用戶設定
- `custom_playlists` - 自訂播放清單
- `channel_screenshots` - 頻道截圖

#### ✅ Storage Bucket（1 個）
- `channel-screenshots` (Public: ✅)

#### ✅ Storage 政策（4 個）
- Public Access (SELECT)
- Anyone can upload (INSERT)
- Anyone can update (UPDATE)
- Anyone can delete (DELETE)

---

### 步驟 3: 測試上傳功能

1. **打開測試頁面**
   ```
   http://localhost:3000/test-supabase-upload.html
   ```

2. **依次點擊測試按鈕**
   - ✅ 測試 1: Supabase 連接
   - ✅ 測試 2: Storage Bucket 檢查
   - ✅ 測試 3: 上傳測試文件
   - ✅ 測試 4: 資料庫寫入
   - ✅ 測試 5: 完整流程

3. **所有測試都應該顯示綠色的成功訊息**

---

### 步驟 4: 測試主應用

1. **訪問主應用**
   ```
   http://localhost:3000/
   ```

2. **選擇直播源**（例如：秒開直播源）

3. **點擊「📸 截圖更新」按鈕**

4. **打開 Console（F12）查看日誌**
   ```
   📸 Capturing screenshot for: 台視HD
   ✅ Screenshot saved and uploaded for: 台視HD
   ```

5. **檢查 Supabase Dashboard**
   - **Storage** > `channel-screenshots` > 應該看到新上傳的圖片
   - **Table Editor** > `channel_screenshots` > 應該看到新記錄

---

## 🔍 常見問題

### 問題 1: SQL 執行失敗

**錯誤**: `permission denied for schema storage`

**解決方法**: 
- 這是正常的，因為某些 Supabase 項目限制了 Storage schema 的訪問
- 改用 Dashboard 手動創建 Bucket：
  1. 進入 **Storage** > **New bucket**
  2. Name: `channel-screenshots`
  3. Public: ✅ 勾選
  4. 點擊 **Create**

---

### 問題 2: Bucket 創建成功但無法上傳

**錯誤**: `new row violates row-level security policy`

**解決方法**: 
- 進入 **Storage** > `channel-screenshots` > **Policies**
- 確認有以下政策：
  - ✅ Public Access (SELECT)
  - ✅ Anyone can upload (INSERT)
  - ✅ Anyone can update (UPDATE)
- 如果沒有，手動添加（參考 `supabase-schema.sql` 第 267-290 行）

---

### 問題 3: 測試頁面顯示 "Bucket 不存在"

**解決方法**: 
1. 檢查 Bucket 名稱是否正確：`channel-screenshots`
2. 檢查 Bucket 是否設為 Public
3. 重新執行 SQL 腳本的第 8 部分（創建 Storage Bucket）

---

## 📊 環境變數確認

確認 `.env` 文件包含以下內容：

```env
VITE_SUPABASE_URL=https://pecxpugndpvmdysyhxha.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlY3hwdWduZHB2bWR5c3loeGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5ODA4MjMsImV4cCI6MjA3NzU1NjgyM30.HBjqKh1UWz8nPRDW61zizjnYTgSedZCnSe3SQsIcIHU
VITE_DEBUG=true
```

**注意**: 使用 `VITE_` 前綴，不是 `NEXT_PUBLIC_`！

---

## 🎉 完成！

如果所有測試都通過，你的 Supabase 設置就完成了！

現在你可以：
- ✅ 自動截取頻道畫面
- ✅ 上傳到 Supabase Storage
- ✅ 存儲元數據到資料庫
- ✅ 在頻道卡片上顯示截圖
- ✅ 重新載入後自動載入截圖

---

## 📞 需要幫助？

如果遇到問題，請提供：
1. Console 錯誤訊息
2. Supabase Dashboard 截圖
3. 測試頁面的測試結果

我會立即幫你解決！

