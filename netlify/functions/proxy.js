export async function handler(event) {
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
    if (!url) {
      return { statusCode: 400, body: 'Missing url parameter' };
    }

    if (!/^https?:\/\//i.test(url)) {
      return { statusCode: 400, body: 'Invalid URL scheme' };
    }

    const upstream = await fetch(url, {
      method: event.httpMethod === 'HEAD' ? 'HEAD' : 'GET',
      redirect: 'follow'
    });

    const headers = Object.fromEntries(upstream.headers.entries());
    headers['access-control-allow-origin'] = '*';
    headers['access-control-allow-headers'] = '*';
    headers['access-control-allow-methods'] = 'GET,HEAD,OPTIONS';

    if (event.httpMethod === 'HEAD') {
      return { statusCode: upstream.status, headers, body: '' };
    }

    const arrayBuffer = await upstream.arrayBuffer();
    return {
      statusCode: upstream.status,
      headers,
      body: Buffer.from(arrayBuffer).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 502, body: `Proxy error: ${err.message}` };
  }
}
