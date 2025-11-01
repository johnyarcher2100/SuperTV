# 📝 Logger 遷移指南

## 概述

已創建新的日誌工具類 `logger.js`，用於控制生產環境的日誌輸出。

---

## 🎯 目標

- **開發環境**：顯示所有日誌（debug, info, warn, error）
- **生產環境**：只顯示重要日誌（info, warn, error），隱藏 debug 日誌
- **可配置**：通過環境變量 `VITE_DEBUG=true` 強制啟用 debug 日誌

---

## 📦 使用方法

### 1. 導入 Logger

```javascript
// 方法 1: 使用默認 logger
import { logger } from './logger.js';

logger.debug('這是 debug 日誌');  // 只在開發環境顯示
logger.info('這是 info 日誌');    // 總是顯示
logger.warn('這是 warning 日誌'); // 總是顯示
logger.error('這是 error 日誌');  // 總是顯示
```

```javascript
// 方法 2: 創建帶上下文的 logger（推薦）
import { createLogger } from './logger.js';

const logger = createLogger('IPTVPlayer');

logger.debug('Loading stream');  // 輸出: [IPTVPlayer] Loading stream
logger.error('Failed to load');  // 輸出: [IPTVPlayer] Failed to load
```

---

## 🔄 遷移規則

### console.log → logger.debug

**原因**：大部分 console.log 是調試信息，生產環境不需要

```javascript
// ❌ 舊代碼
console.log('IPTV Player: Loading stream:', url);

// ✅ 新代碼
logger.debug('Loading stream:', url);
```

### console.info → logger.info

**原因**：重要信息，生產環境也需要

```javascript
// ❌ 舊代碼
console.info('Channel loaded successfully');

// ✅ 新代碼
logger.info('Channel loaded successfully');
```

### console.warn → logger.warn

**原因**：警告信息，生產環境需要

```javascript
// ❌ 舊代碼
console.warn('IPTV Player: Loading method failed:', error);

// ✅ 新代碼
logger.warn('Loading method failed:', error);
```

### console.error → logger.error

**原因**：錯誤信息，生產環境必須顯示

```javascript
// ❌ 舊代碼
console.error('IPTV Player: All loading methods failed:', error);

// ✅ 新代碼
logger.error('All loading methods failed:', error);
```

---

## 📊 特殊日誌方法

### 分組日誌

```javascript
logger.group('HLS Configuration');
logger.debug('Buffer size:', bufferSize);
logger.debug('Max retries:', maxRetries);
logger.groupEnd();
```

### 表格日誌

```javascript
logger.table([
    { channel: '台視', status: 'loaded' },
    { channel: '中視', status: 'loading' }
]);
```

### 性能計時

```javascript
logger.time('stream-load');
// ... 執行操作
logger.timeEnd('stream-load');  // 輸出: stream-load: 1234ms
```

---

## 🔧 環境配置

### 開發環境（默認）

```bash
npm run dev
# 所有日誌都會顯示
```

### 生產構建

```bash
npm run build
# 只顯示 info, warn, error
# debug 日誌被隱藏
```

### 強制啟用 Debug

```bash
# .env.production
VITE_DEBUG=true
```

或在構建時：

```bash
VITE_DEBUG=true npm run build
```

---

## 📝 遷移檢查清單

### 已完成
- [x] 創建 `logger.js` 工具類
- [x] 在 `iptv-player.js` 中導入 logger

### 待完成（235 個 console 語句）

#### 高優先級文件
- [ ] `iptv-player.js` (約 80 個 console)
- [ ] `app.js` (約 60 個 console)
- [ ] `player.js` (約 40 個 console)

#### 中優先級文件
- [ ] `channels.js`
- [ ] `main.js`

#### 低優先級文件
- [ ] `server.py` (Python 文件，不需要遷移)
- [ ] 測試文件

---

## 🚀 自動化遷移腳本

可以使用以下命令批量替換：

```bash
# 替換 console.log 為 logger.debug
find . -name "*.js" -not -path "./node_modules/*" -not -path "./dist/*" \
  -exec sed -i '' 's/console\.log(/logger.debug(/g' {} \;

# 替換 console.warn 為 logger.warn
find . -name "*.js" -not -path "./node_modules/*" -not -path "./dist/*" \
  -exec sed -i '' 's/console\.warn(/logger.warn(/g' {} \;

# 替換 console.error 為 logger.error
find . -name "*.js" -not -path "./node_modules/*" -not -path "./dist/*" \
  -exec sed -i '' 's/console\.error(/logger.error(/g' {} \;

# 替換 console.info 為 logger.info
find . -name "*.js" -not -path "./node_modules/*" -not -path "./dist/*" \
  -exec sed -i '' 's/console\.info(/logger.info(/g' {} \;
```

**⚠️ 注意**：運行前請先備份代碼！

---

## 📈 預期效果

### 開發環境
```
[IPTVPlayer] Loading stream: http://...
[IPTVPlayer] HLS media attached
[IPTVPlayer] HLS manifest parsed, levels: 3
📊 Performance: Time to playback: 1234ms
✅ IPTV Player: Automatic playback started successfully
```

### 生產環境
```
✅ IPTV Player: Automatic playback started successfully
⚠️ IPTV Player: Autoplay prevented by browser policy
```

---

## 🎯 最佳實踐

### 1. 使用有意義的上下文

```javascript
// ✅ 好
const logger = createLogger('ChannelManager');
logger.debug('Parsing channel data');

// ❌ 不好
console.log('ChannelManager: Parsing channel data');
```

### 2. 移除冗餘的前綴

```javascript
// ❌ 舊代碼（冗餘）
console.log('IPTV Player: Loading stream');

// ✅ 新代碼（簡潔）
const logger = createLogger('IPTVPlayer');
logger.debug('Loading stream');  // 自動添加 [IPTVPlayer] 前綴
```

### 3. 使用適當的日誌級別

```javascript
// Debug: 詳細的調試信息
logger.debug('Buffer size:', bufferSize);

// Info: 重要的業務信息
logger.info('Channel loaded successfully');

// Warn: 可恢復的錯誤或警告
logger.warn('Slow network detected, retrying...');

// Error: 嚴重錯誤
logger.error('Failed to load stream:', error);
```

### 4. 性能日誌使用 Emoji

```javascript
// ✅ 好 - 易於識別
logger.debug('📊 Performance: Time to playback:', loadTime);
logger.debug('🔊 Audio unmuted');
logger.debug('✅ Playback started');
logger.warn('⚠️ Low buffer');
logger.error('❌ Fatal error');
```

---

## 🔍 驗證

### 檢查日誌是否正確遷移

```bash
# 檢查剩餘的 console 語句
grep -r "console\." --include="*.js" --exclude-dir=node_modules --exclude-dir=dist . | wc -l

# 應該只剩下 logger.js 中的 console 語句
```

### 測試構建

```bash
# 開發環境測試
npm run dev
# 應該看到所有日誌

# 生產構建測試
npm run build && npm run preview
# 應該只看到 info/warn/error 日誌
```

---

## 📚 參考

- `logger.js` - Logger 實現
- `iptv-player.js` - 使用示例
- Vite 環境變量文檔: https://vitejs.dev/guide/env-and-mode.html

---

## ⏭️ 下一步

1. 手動遷移關鍵文件（iptv-player.js, app.js, player.js）
2. 測試功能是否正常
3. 使用自動化腳本遷移剩餘文件
4. 驗證生產構建的日誌輸出
5. 更新文檔

---

**狀態**: 🟡 進行中 - Logger 工具已創建，需要遷移現有代碼

