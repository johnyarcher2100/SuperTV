/**
 * Vite 自定義代理插件
 * 用於處理動態代理請求和截圖 API
 */
export function customProxyPlugin() {
  return {
    name: 'custom-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // 處理截圖 API
        if (req.url?.startsWith('/api/screenshot')) {
          return handleScreenshotRequest(req, res);
        }

        // 處理代理請求
        if (!req.url?.startsWith('/api/proxy')) {
          return next();
        }

        try {
          // 解析 URL 參數
          const urlMatch = req.url.match(/\?url=([^&]+)/);
          if (!urlMatch) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
          }

          let targetUrl = decodeURIComponent(urlMatch[1]);

          // 檢測並修復循環代理（localhost URL）
          if (targetUrl.includes('localhost:3000') || targetUrl.includes('127.0.0.1:3000')) {
            console.log('⚠️ Custom Proxy: Detected localhost URL, skipping proxy');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Cannot proxy localhost URLs' }));
            return;
          }

          console.log('🔄 Custom Proxy: Fetching', targetUrl);

          // 使用 fetch 獲取目標 URL
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            redirect: 'follow'
          });

          console.log('✅ Custom Proxy: Response', response.status, response.statusText);

          // 設置 CORS 頭
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('Access-Control-Expose-Headers', '*');

          // 複製響應頭（除了一些不需要的）
          const skipHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
          response.headers.forEach((value, key) => {
            if (!skipHeaders.includes(key.toLowerCase())) {
              res.setHeader(key, value);
            }
          });

          // 獲取響應體
          const buffer = await response.arrayBuffer();
          let body = Buffer.from(buffer);

          // 如果是 m3u8 清單，修改其中的相對 URL
          const contentType = response.headers.get('content-type') || '';
          console.log('📋 Content-Type:', contentType, 'URL:', targetUrl);

          if (contentType.includes('application/vnd.apple.mpegurl') ||
              contentType.includes('application/x-mpegURL') ||
              contentType.includes('mpegurl') ||
              targetUrl.includes('.m3u8') ||
              body.toString('utf-8').includes('#EXTM3U')) {

            console.log('🎬 Detected m3u8 content, rewriting URLs...');

            try {
              let content = body.toString('utf-8');
              const targetUrlObj = new URL(targetUrl);
              const targetOrigin = targetUrlObj.origin;
              const targetPath = targetUrlObj.pathname.substring(0, targetUrlObj.pathname.lastIndexOf('/') + 1);

              // 替換相對 URL 為代理 URL
              content = content.split('\n').map(line => {
                line = line.trim();

                // 跳過註釋和空行
                if (line.startsWith('#') || !line) return line;

                // 處理 URL 行
                if (!line.startsWith('http://') && !line.startsWith('https://')) {
                  // 相對 URL，轉換為絕對 URL
                  let absoluteUrl;
                  if (line.startsWith('/')) {
                    // 絕對路徑
                    absoluteUrl = targetOrigin + line;
                  } else {
                    // 相對路徑
                    absoluteUrl = targetOrigin + targetPath + line;
                  }

                  // 轉換為代理 URL
                  const proxiedUrl = `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
                  console.log('📝 Rewriting URL in m3u8:', line, '->', proxiedUrl);
                  return proxiedUrl;
                }

                return line;
              }).join('\n');

              body = Buffer.from(content, 'utf-8');
              res.setHeader('Content-Length', body.length);
            } catch (e) {
              console.error('❌ Failed to rewrite m3u8:', e.message);
            }
          }

          // 設置狀態碼
          res.writeHead(response.status);

          // 轉發響應體
          res.end(body);

        } catch (error) {
          console.error('🔴 Custom Proxy Error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    }
  };
}

/**
 * 處理截圖請求
 * 使用 FFmpeg 從視頻流截取畫面
 */
async function handleScreenshotRequest(req, res) {
  try {
    // 只接受 POST 請求
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    // 讀取請求體
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { url, channelName } = JSON.parse(body);

        if (!url) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        console.log(`📸 Screenshot request for: ${channelName || 'Unknown'}`);
        console.log(`📸 URL: ${url}`);

        // 使用 Puppeteer 截圖
        try {
          const { captureChannelScreenshot } = await import('./screenshot-server.js');

          // 執行截圖
          const screenshotUrl = await captureChannelScreenshot(channelName, url);

          if (screenshotUrl) {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
              success: true,
              url: screenshotUrl
            }));
          } else {
            res.writeHead(500, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
              error: 'Screenshot failed',
              message: 'Failed to capture screenshot'
            }));
          }

        } catch (puppeteerError) {
          console.error('❌ Puppeteer screenshot failed:', puppeteerError);

          // 如果 Puppeteer 失敗，返回錯誤
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Screenshot service failed',
            message: puppeteerError.message
          }));
        }

      } catch (parseError) {
        console.error('❌ Parse error:', parseError);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });

  } catch (error) {
    console.error('❌ Screenshot error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}
