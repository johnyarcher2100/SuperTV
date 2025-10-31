export async function handler(event) {
  // 處理 CORS 預檢請求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,HEAD,OPTIONS',
        'access-control-allow-headers': '*'
      },
      body: ''
    };
  }

  try {
    const url = event.queryStringParameters?.url;

    // 驗證 URL 參數
    if (!url) {
      console.error('Proxy: Missing url parameter');
      return {
        statusCode: 400,
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ error: 'Missing url parameter' })
      };
    }

    if (!/^https?:\/\//i.test(url)) {
      console.error('Proxy: Invalid URL scheme:', url);
      return {
        statusCode: 400,
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ error: 'Invalid URL scheme' })
      };
    }

    console.log('Proxy: Fetching URL:', url);
    console.log('Proxy: Method:', event.httpMethod);
    console.log('Proxy: Range header:', event.headers?.range);

    // 設置超時控制（8秒，留2秒給 Netlify）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const upstream = await fetch(url, {
        method: event.httpMethod === 'HEAD' ? 'HEAD' : 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...(event.headers?.range ? { Range: event.headers.range } : {})
        }
      });

      clearTimeout(timeoutId);

      console.log('Proxy: Upstream status:', upstream.status);
      console.log('Proxy: Upstream headers:', Object.fromEntries(upstream.headers.entries()));

      // 複製響應頭並添加 CORS
      const headers = Object.fromEntries(upstream.headers.entries());
      headers['access-control-allow-origin'] = '*';
      headers['access-control-allow-headers'] = '*';
      headers['access-control-allow-methods'] = 'GET,HEAD,OPTIONS';
      headers['access-control-expose-headers'] = '*';

      // HEAD 請求只返回頭部
      if (event.httpMethod === 'HEAD') {
        return { statusCode: upstream.status, headers, body: '' };
      }

      // 獲取響應體
      const arrayBuffer = await upstream.arrayBuffer();
      console.log('Proxy: Response size:', arrayBuffer.byteLength, 'bytes');

      // 檢查是否為 m3u8 文件（需要重寫 URL）
      const contentType = headers['content-type'] || '';
      const isM3U8 = url.includes('.m3u8') ||
                     contentType.includes('mpegurl') ||
                     contentType.includes('m3u8');

      if (isM3U8) {
        console.log('Proxy: Detected m3u8 file, rewriting URLs...');

        // 將響應轉為文本
        const text = Buffer.from(arrayBuffer).toString('utf-8');

        // 提取基礎 URL（用於相對路徑）
        const urlObj = new URL(url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1)}`;

        // 重寫 m3u8 中的所有 URL
        const rewrittenText = text.split('\n').map(line => {
          // 跳過註釋和空行
          if (line.startsWith('#') || line.trim() === '') {
            return line;
          }

          // 檢查是否為 URL 行
          if (line.trim().length > 0) {
            let targetUrl = line.trim();

            // 處理相對路徑
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
              targetUrl = baseUrl + targetUrl;
            }

            // 重寫為代理 URL
            const proxiedUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
            console.log('Proxy: Rewriting', targetUrl, '->', proxiedUrl);
            return proxiedUrl;
          }

          return line;
        }).join('\n');

        // 更新 Content-Length
        const rewrittenBuffer = Buffer.from(rewrittenText, 'utf-8');
        headers['content-length'] = rewrittenBuffer.byteLength.toString();

        return {
          statusCode: upstream.status,
          headers,
          body: rewrittenBuffer.toString('base64'),
          isBase64Encoded: true
        };
      }

      // 非 m3u8 文件，直接返回
      return {
        statusCode: upstream.status,
        headers,
        body: Buffer.from(arrayBuffer).toString('base64'),
        isBase64Encoded: true
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('Proxy: Request timeout for URL:', url);
        return {
          statusCode: 504,
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ error: 'Gateway timeout' })
        };
      }

      throw fetchError;
    }
  } catch (err) {
    console.error('Proxy: Error:', err.message, err.stack);
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
