import type { CapturedRequest } from './capture';

// RFC 2616: Hop-by-hop headers must not be forwarded
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
]);

export interface ForwardResult {
  ok: boolean;
  status: number | null;
  durationMs: number;
  error: string | null;
}

export async function forwardRequest(
  captured: CapturedRequest,
  targetUrl: string,
  timeoutMs: number = 7000,
  additionalHeaders: Record<string, string> = {}
): Promise<ForwardResult> {
  const startTime = Date.now();
  
  try {
    const forwardHeaders = new Headers();
    
    for (const [key, value] of Object.entries(captured.headers)) {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        forwardHeaders.set(key, value);
      }
    }
    
    for (const [key, value] of Object.entries(additionalHeaders)) {
      forwardHeaders.set(key, value);
    }
    
    if (captured.clientIp) {
      const existing = forwardHeaders.get('x-forwarded-for');
      forwardHeaders.set(
        'x-forwarded-for',
        existing ? `${existing}, ${captured.clientIp}` : captured.clientIp
      );
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      let body: ArrayBuffer | null = null;
      if (captured.rawBody) {
        body = new ArrayBuffer(captured.rawBody.length);
        new Uint8Array(body).set(captured.rawBody);
      }
      
      const response = await fetch(targetUrl, {
        method: captured.method,
        headers: forwardHeaders,
        body,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      return {
        ok: response.ok,
        status: response.status,
        durationMs: Date.now() - startTime,
        error: null,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          ok: false,
          status: null,
          durationMs,
          error: `Timeout after ${timeoutMs}ms`,
        };
      }
      return {
        ok: false,
        status: null,
        durationMs,
        error: error.message,
      };
    }
    
    return {
      ok: false,
      status: null,
      durationMs,
      error: 'Unknown error',
    };
  }
}
