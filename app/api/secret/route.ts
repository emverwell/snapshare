import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import {
  MAX_BODY_BYTES,
  getClientIp,
  readBodyWithLimit,
  secretRatelimit,
  validateSecretPayload,
} from '@/lib/secret-guard';

const redis = Redis.fromEnv();

function errorResponse(status: number, error: string, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers });
}

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return errorResponse(415, 'unsupported content type');
  }

  const contentLength = req.headers.get('content-length');
  if (!contentLength || Number(contentLength) > MAX_BODY_BYTES) {
    return errorResponse(413, 'payload too large');
  }

  const bodyText = await readBodyWithLimit(req, MAX_BODY_BYTES);
  if (bodyText === null) {
    return errorResponse(413, 'payload too large');
  }

  const ip = getClientIp(req);
  try {
    const { success, reset } = await secretRatelimit.limit(ip);
    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return errorResponse(429, 'rate limit exceeded', {
        'Retry-After': String(retryAfter),
      });
    }
  } catch {
    return errorResponse(503, 'temporarily unavailable', {
      'Retry-After': '5',
    });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(bodyText);
  } catch {
    return errorResponse(400, 'invalid request');
  }

  const payload = validateSecretPayload(parsedBody);
  if (!payload) {
    return errorResponse(400, 'invalid request');
  }

  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) {
    return errorResponse(403, 'forbidden');
  }

  const id = crypto.randomUUID();

  await redis.setex(`secret:${id}`, 86400, {
    ciphertext: payload.ciphertext,
    urlIv: payload.urlIv,
    pwdSalt: payload.pwdSalt, // Will be undefined if no password was used
    pwdIv: payload.pwdIv,
  });

  return NextResponse.json({ id });
}
