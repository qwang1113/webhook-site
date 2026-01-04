import { sha256Hex } from './crypto';
import type { HttpMethod } from '@/types/database';

const DEFAULT_CAPTURE_MAX_BYTES = 8192;

// SECURITY: Exclude sensitive headers from capture to prevent credential leaks
const EXCLUDED_HEADERS = new Set([
  'cookie',
  'authorization',
  'x-vercel-proxy-signature',
  'x-vercel-proxy-signature-ts',
  'x-real-ip',
  'x-vercel-forwarded-for',
  'x-vercel-deployment-url',
  'x-vercel-id',
]);

export interface CapturedRequest {
  method: HttpMethod;
  path: string;
  query: Record<string, string | string[]>;
  clientIp: string | null;
  userAgent: string | null;
  contentType: string | null;
  contentLength: number | null;
  headers: Record<string, string>;
  bodyPreview: Uint8Array | null;
  bodySize: number;
  bodyTruncated: boolean;
  bodySha256: string | null;
  rawBody: Uint8Array | null;
}

function parseClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip');
}

function parseQuery(url: URL): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    const existing = query[key];
    if (existing) {
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        query[key] = [existing, value];
      }
    } else {
      query[key] = value;
    }
  });
  return query;
}

function captureHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (!EXCLUDED_HEADERS.has(lowerKey) && value.length <= 8192) {
      result[lowerKey] = value;
    }
  });
  return result;
}

export async function captureRequest(
  request: Request,
  captureBodyMaxBytes: number = DEFAULT_CAPTURE_MAX_BYTES
): Promise<CapturedRequest> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase() as HttpMethod;
  
  const clientIp = parseClientIp(request.headers);
  const userAgent = request.headers.get('user-agent');
  const contentType = request.headers.get('content-type');
  const contentLengthHeader = request.headers.get('content-length');
  const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
  
  const headers = captureHeaders(request.headers);
  
  let rawBody: Uint8Array | null = null;
  let bodyPreview: Uint8Array | null = null;
  let bodySize = 0;
  let bodyTruncated = false;
  let bodySha256: string | null = null;
  
  if (request.body && method !== 'GET' && method !== 'HEAD') {
    try {
      const arrayBuffer = await request.arrayBuffer();
      rawBody = new Uint8Array(arrayBuffer);
      bodySize = rawBody.length;
      
      if (bodySize > 0) {
        bodySha256 = await sha256Hex(rawBody);
        
        if (bodySize > captureBodyMaxBytes) {
          bodyPreview = rawBody.slice(0, captureBodyMaxBytes);
          bodyTruncated = true;
        } else {
          bodyPreview = rawBody;
          bodyTruncated = false;
        }
      }
    } catch {
    }
  }
  
  return {
    method,
    path: url.pathname,
    query: parseQuery(url),
    clientIp,
    userAgent,
    contentType,
    contentLength,
    headers,
    bodyPreview,
    bodySize,
    bodyTruncated,
    bodySha256,
    rawBody,
  };
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
