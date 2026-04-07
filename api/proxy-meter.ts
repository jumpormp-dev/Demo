import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Set CORS headers for the proxy response
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    const targetUrl = 'http://unified-iot.mea.or.th:8507/api/ktt/meters';
    console.log(`Proxying request to: ${targetUrl}`);
    
    const apiResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!apiResponse.ok) {
      console.error(`MEA IoT responded with status: ${apiResponse.status}`);
      return response.status(apiResponse.status).json({ 
        error: 'Failed to fetch from MEA IoT',
        status: apiResponse.status 
      });
    }
    
    const data = await apiResponse.json();
    return response.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return response.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
