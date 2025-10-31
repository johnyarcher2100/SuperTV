// ==========================================
// 🚀 改進的 Netlify Functions 代理
// ==========================================

export async function handler(event) {
  // 處理 CORS 預檢
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,HEAD,OPTIONS',
        'access-control-allow-headers': '*',
        'access-control-max-age': '86400'
      },
      body: ''
    };
  }

  try {
    const url = event.queryStringParameters?.url;

    if (!url) {
      return {
        statusCode: 400,
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ error: 'Missing url parameter' })
      };
    }

    // 驗證 URL
    if (!/^https?:\/\//i.test(url)) {
      return {
        statusCode: 400,
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ error: 'Invalid URL scheme' })
      };
    }

    console.log('Proxy: Fetching', url);

    // 設置超時（8 秒，留 2 秒給 Netlify）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      // 準備請求標頭
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };

      // 處理 Range 請求（串流分段）
      if (event.headers?.range) {
        headers['Range'] = event.headers.range;
      }

      // 發送請求
      const upstream = await fetch(url, {
        method: event.httpMethod === 'HEAD' ? 'HEAD' : 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers
      });

      clearTimeout(timeoutId);

      console.log('Proxy: Upstream status', upstream.status);

      // 準備響應標頭
      const responseHeaders = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,HEAD,OPTIONS',
        'access-control-expose-headers': '*',
        'cache-control': 'no-cache, no-store, must-revalidate'
      };

      // 複製必要的上游標頭
      const headersToForward = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'etag',
        'last-modified'
      ];

      headersToForward.forEach(header => {
        const value = upstream.headers.get(header);
        if (value) {
          responseHeaders[header] = value;
        }
      });

      // HEAD 請求只返回標頭
      if (event.httpMethod === 'HEAD') {
        return {
          statusCode: upstream.status,
          headers: responseHeaders,
          body: ''
        };
      }

      // 獲取響應體
      const arrayBuffer = await upstream.arrayBuffer();
      console.log('Proxy: Response size', arrayBuffer.byteLength, 'bytes');

      // 檢查是否為 m3u8 文件
      const contentType = responseHeaders['content-type'] || '';
      const isM3U8 = url.includes('.m3u8') ||
                     contentType.includes('mpegurl') ||
                     contentType.includes('m3u8');

      if (isM3U8 && arrayBuffer.byteLength < 1024 * 1024) { // 只處理 < 1MB 的 m3u8
        console.log('Proxy: Processing m3u8 file');

        // 轉為文本
        const text = Buffer.from(arrayBuffer).toString('utf-8');

        // 提取基礎 URL
        const urlObj = new URL(url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1)}`;

        // 獲取當前請求的基礎 URL
        const host = event.headers.host || 'supertv.netlify.app';
        const protocol = event.headers['x-forwarded-proto'] || 'https';
        const proxyBase = `${protocol}://${host}/.netlify/functions/proxy?url=`;

        // 重寫 URL
        const rewrittenText = text.split('\n').map(line => {
          // 跳過註釋和空行
          if (line.startsWith('#') || line.trim() === '') {
            return line;
          }

          // 處理 URL 行
          if (line.trim().length > 0) {
            let targetUrl = line.trim();

            // 處理相對路徑
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
              // 相對路徑：合併基礎 URL
              if (targetUrl.startsWith('/')) {
                // 絕對路徑：使用主機名
                targetUrl = `${urlObj.protocol}//${urlObj.host}${targetUrl}`;
              } else {
                // 相對路徑：使用目錄
                targetUrl = baseUrl + targetUrl;
              }
            }

            // 重寫為代理 URL
            return proxyBase + encodeURIComponent(targetUrl);
          }

          return line;
        }).join('\n');

        // 更新 Content-Length
        const rewrittenBuffer = Buffer.from(rewrittenText, 'utf-8');
        responseHeaders['content-length'] = rewrittenBuffer.byteLength.toString();

        return {
          statusCode: upstream.status,
          headers: responseHeaders,
          body: rewrittenBuffer.toString('base64'),
          isBase64Encoded: true
        };
      }

      // 非 m3u8 文件或大文件，直接返回
      return {
        statusCode: upstream.status,
        headers: responseHeaders,
        body: Buffer.from(arrayBuffer).toString('base64'),
        isBase64Encoded: true
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('Proxy: Request timeout');
        return {
          statusCode: 504,
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ error: 'Gateway timeout' })
        };
      }

      throw fetchError;
    }

  } catch (err) {
    console.error('Proxy: Error', err.message);
    return {
      statusCode: 502,
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        error: 'Proxy error',
        message: err.message,
        url: event.queryStringParameters?.url
      })
    };
  }
}