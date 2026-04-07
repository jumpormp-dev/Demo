import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    const targetUrl = 'http://unified-iot.mea.or.th:8507/api/ktt/meters';
    const apiResponse = await fetch(targetUrl);
    
    if (!apiResponse.ok) {
      return response.status(apiResponse.status).json({ error: 'Failed to fetch from MEA IoT' });
    }
    
    const data = await apiResponse.json();
    return response.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
