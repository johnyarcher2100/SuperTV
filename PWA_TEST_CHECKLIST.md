# ✅ SuperTV PWA 測試檢查清單

## 🎯 測試環境

**預覽服務器已啟動：**
- Local: http://localhost:4173/
- Network: http://192.168.31.156:4173/

---

## 📋 測試項目

### 1️⃣ 基本功能測試

#### ✅ Manifest 檢查
- [ ] 打開 Chrome DevTools → Application → Manifest
- [ ] 確認應用名稱：「SuperTV 直播播放器」
- [ ] 確認短名稱：「SuperTV」
- [ ] 確認主題顏色：#1e3c72
- [ ] 確認圖標顯示正常

#### ✅ Service Worker 檢查
- [ ] 打開 Chrome DevTools → Application → Service Workers
- [ ] 確認 Service Worker 已註冊
- [ ] 狀態顯示為「activated and is running」
- [ ] 查看緩存的文件列表

---

### 2️⃣ 安裝測試

#### 桌面 Chrome/Edge
- [ ] 打開 http://localhost:4173/
- [ ] 等待 3 秒，查看是否出現安裝提示橫幅
- [ ] 點擊網址列右側的安裝圖標 (⊕)
- [ ] 點擊「安裝」
- [ ] 確認應用在獨立視窗中打開
- [ ] 確認沒有瀏覽器工具列

#### 手機測試（可選）
- [ ] 使用手機訪問 http://192.168.31.156:4173/
- [ ] Android: 點擊「安裝應用」
- [ ] iOS: 分享 → 加入主畫面
- [ ] 確認桌面圖標顯示正常

---

### 3️⃣ 離線測試

#### 離線功能
- [ ] 打開應用
- [ ] Chrome DevTools → Network → 勾選「Offline」
- [ ] 重新整理頁面
- [ ] 確認應用仍可正常顯示
- [ ] 確認頻道列表可見
- [ ] 確認 UI 界面完整

#### 緩存策略
- [ ] DevTools → Application → Cache Storage
- [ ] 確認有以下緩存：
  - workbox-precache-v2-...
  - playlist-cache
  - image-cache
  - static-resources

---

### 4️⃣ 更新測試

#### 自動更新
- [ ] 修改任意代碼（例如改變標題）
- [ ] 重新構建：`npm run build`
- [ ] 重新整理頁面
- [ ] 確認顯示更新通知
- [ ] 點擊「重新載入」
- [ ] 確認更新生效

---

### 5️⃣ UI 測試

#### 安裝提示橫幅
- [ ] 橫幅從底部滑入
- [ ] 顯示圖標 📱
- [ ] 顯示文字「安裝 SuperTV」
- [ ] 有「安裝」和「×」按鈕
- [ ] 點擊「×」可關閉
- [ ] 點擊「安裝」觸發安裝流程

#### 更新通知
- [ ] 通知從頂部滑入
- [ ] 顯示「🎉 新版本可用！」
- [ ] 有「重新載入」按鈕
- [ ] 點擊後頁面重新載入

---

### 6️⃣ 性能測試

#### Lighthouse 測試
- [ ] 打開 Chrome DevTools → Lighthouse
- [ ] 選擇「Progressive Web App」
- [ ] 點擊「Generate report」
- [ ] 確認 PWA 分數 ≥ 90

#### 載入速度
- [ ] 首次載入時間
- [ ] 第二次載入時間（應該更快）
- [ ] 離線載入時間

---

### 7️⃣ 跨瀏覽器測試

#### Chrome
- [ ] 安裝功能正常
- [ ] Service Worker 正常
- [ ] 離線功能正常

#### Edge
- [ ] 安裝功能正常
- [ ] Service Worker 正常
- [ ] 離線功能正常

#### Safari (Mac)
- [ ] 基本功能正常
- [ ] 可以添加到 Dock

#### Firefox
- [ ] 基本功能正常
- [ ] Service Worker 正常

---

## 🔍 詳細測試步驟

### 測試 1: Manifest 檢查

```bash
1. 打開 http://localhost:4173/
2. F12 打開 DevTools
3. 切換到 Application 標籤
4. 左側選擇 Manifest
5. 檢查以下內容：
   - Name: SuperTV 直播播放器
   - Short name: SuperTV
   - Start URL: /
   - Theme color: #1e3c72
   - Display: standalone
   - Icons: 應該顯示 4 個圖標
```

### 測試 2: Service Worker 檢查

```bash
1. DevTools → Application → Service Workers
2. 確認看到：
   - Source: /sw.js
   - Status: activated and is running
   - Update on reload: 可選勾選
3. 點擊 "sw.js" 查看源碼
4. 確認有 Workbox 相關代碼
```

### 測試 3: 緩存檢查

```bash
1. DevTools → Application → Cache Storage
2. 展開緩存列表
3. 應該看到：
   - workbox-precache-v2-... (預緩存)
   - playlist-cache (播放清單)
   - image-cache (圖片)
   - static-resources (靜態資源)
4. 點擊每個緩存查看內容
```

### 測試 4: 離線模式

```bash
1. 確保應用已完全載入
2. DevTools → Network
3. 勾選 "Offline"
4. 重新整理頁面 (F5)
5. 確認：
   - 頁面正常顯示
   - CSS 樣式正常
   - JavaScript 功能正常
   - 頻道列表可見
```

### 測試 5: 安裝流程

```bash
1. 打開 http://localhost:4173/
2. 等待 3 秒
3. 應該看到底部彈出安裝橫幅
4. 點擊「安裝」按鈕
5. 瀏覽器顯示安裝確認對話框
6. 點擊「安裝」
7. 應用在新視窗中打開
8. 確認：
   - 沒有網址列
   - 沒有瀏覽器工具列
   - 全屏顯示
   - 標題欄顯示 "SuperTV"
```

### 測試 6: Lighthouse PWA 審計

```bash
1. DevTools → Lighthouse
2. 選擇：
   - Mode: Navigation
   - Categories: Progressive Web App
   - Device: Desktop 或 Mobile
3. 點擊 "Analyze page load"
4. 等待報告生成
5. 檢查分數：
   - PWA 分數應該 ≥ 90
   - 所有 PWA 檢查項應該通過
```

---

## 📊 預期結果

### ✅ 成功標準

| 測試項目 | 預期結果 |
|---------|---------|
| Manifest | 正確顯示所有信息 |
| Service Worker | 已註冊並運行 |
| 離線功能 | 可以離線訪問 |
| 安裝功能 | 可以安裝到桌面 |
| 緩存策略 | 正確緩存資源 |
| 更新機制 | 自動檢測並提示更新 |
| Lighthouse | PWA 分數 ≥ 90 |

### 📈 性能指標

| 指標 | 首次載入 | 第二次載入 | 離線載入 |
|------|---------|-----------|---------|
| 時間 | ~2-3s | ~0.5s | ~0.3s |
| 資源 | 從網路 | 部分緩存 | 全部緩存 |

---

## 🐛 常見問題

### 問題 1: Service Worker 沒有註冊

**檢查：**
```bash
1. 確認使用 HTTPS 或 localhost
2. 檢查控制台錯誤
3. 確認 sw.js 文件存在
4. 清除瀏覽器緩存後重試
```

### 問題 2: 安裝提示沒有出現

**檢查：**
```bash
1. 確認 Manifest 正確
2. 確認 Service Worker 已註冊
3. 確認沒有已經安裝過
4. 等待至少 3 秒
```

### 問題 3: 離線不工作

**檢查：**
```bash
1. 確認 Service Worker 已激活
2. 檢查緩存是否正確
3. 查看 Network 標籤的請求
4. 確認沒有 CORS 錯誤
```

---

## 🎯 快速測試命令

```bash
# 1. 構建
npm run build

# 2. 預覽
npm run preview

# 3. 在瀏覽器中打開
open http://localhost:4173/

# 4. 檢查構建產物
ls -lh dist/ | grep -E "(sw|manifest|workbox)"

# 5. 查看 Service Worker
cat dist/sw.js | head -20

# 6. 查看 Manifest
cat dist/manifest.webmanifest | jq .
```

---

## 📝 測試報告模板

```markdown
# PWA 測試報告

**測試日期：** 2025-11-01
**測試人員：** [你的名字]
**瀏覽器：** Chrome 120.0.0.0

## 測試結果

- [ ] Manifest 檢查 - ✅ 通過
- [ ] Service Worker - ✅ 通過
- [ ] 離線功能 - ✅ 通過
- [ ] 安裝功能 - ✅ 通過
- [ ] 更新機制 - ✅ 通過
- [ ] Lighthouse - ✅ 分數: 95

## 問題記錄

1. [問題描述]
   - 重現步驟：
   - 預期結果：
   - 實際結果：
   - 解決方案：

## 總結

[整體評價]
```

---

**準備好開始測試了嗎？** 🚀

打開瀏覽器訪問：http://localhost:4173/

