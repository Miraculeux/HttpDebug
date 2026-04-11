import { Router } from 'express';
import https from 'https';
import http from 'http';
import axios, { type AxiosRequestConfig, type Method } from 'axios';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const {
      method,
      url,
      headers = {},
      body,
      auth,
      timeout = 30000,
      followRedirects = true,
      validateSSL = true,
    } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    // Block requests to private/internal networks
    const hostname = parsedUrl.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('169.254.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      // Allow internal requests only in development
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({ error: 'Requests to internal networks are not allowed in production' });
        return;
      }
    }

    const requestHeaders: Record<string, string> = {};
    if (headers && typeof headers === 'object') {
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === 'string') {
          requestHeaders[key] = value;
        }
      }
    }

    // Apply auth
    if (auth) {
      switch (auth.type) {
        case 'basic': {
          const encoded = Buffer.from(`${auth.basic?.username || ''}:${auth.basic?.password || ''}`).toString('base64');
          requestHeaders['Authorization'] = `Basic ${encoded}`;
          break;
        }
        case 'bearer':
          requestHeaders['Authorization'] = `${auth.bearer?.prefix || 'Bearer'} ${auth.bearer?.token || ''}`;
          break;
        case 'api-key':
          if (auth.apiKey?.addTo === 'header') {
            requestHeaders[auth.apiKey.key] = auth.apiKey.value;
          }
          break;
        case 'digest':
          requestHeaders['Authorization'] = `Digest username="${auth.digest?.username || ''}"`;
          break;
      }
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: validateSSL,
      timeout: timeout,
    });
    const httpAgent = new http.Agent({
      timeout: timeout,
    });

    const config: AxiosRequestConfig = {
      method: (method || 'GET').toLowerCase() as Method,
      url,
      headers: requestHeaders,
      data: body,
      timeout,
      maxRedirects: followRedirects ? 5 : 0,
      validateStatus: () => true,
      transformResponse: [(data: unknown) => data],
      httpAgent,
      httpsAgent,
    };

    const startTime = Date.now();
    const response = await axios(config);
    const elapsed = Date.now() - startTime;

    const responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const responseHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(response.headers)) {
      responseHeaders[key] = String(value);
    }

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      time: elapsed,
      size: Buffer.byteLength(responseBody || '', 'utf-8'),
    });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const startTime = Date.now();
    const elapsed = Date.now() - startTime;

    if (error.code === 'ECONNREFUSED') {
      res.status(502).json({ error: 'Connection refused' });
    } else if (error.code === 'ENOTFOUND') {
      res.status(502).json({ error: 'Host not found' });
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      res.status(504).json({ error: 'Request timed out' });
    } else if (error.code === 'ECONNRESET') {
      res.status(502).json({ error: 'Connection reset by server' });
    } else if (error.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
      res.status(502).json({ error: 'SSL certificate hostname mismatch' });
    } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_HAS_EXPIRED') {
      res.status(502).json({ error: `SSL certificate error: ${error.code}` });
    } else if (error.message?.includes('TLS') || error.message?.includes('ssl') || error.message?.includes('socket disconnected')) {
      res.status(502).json({ error: `TLS/SSL connection failed: ${error.message}. Try increasing timeout or disabling SSL validation in Settings.` });
    } else {
      res.status(500).json({ error: error.message || 'Request failed' });
    }
  }
});

export default router;
