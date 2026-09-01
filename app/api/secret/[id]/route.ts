import { Redis } from '@upstash/redis';
import { NextResponse, NextRequest } from 'next/server';
import {
  getClientIp,
  isValidSecretId,
  secretReadRatelimit,
} from '@/lib/secret-guard';

const redis = Redis.fromEnv();

function errorResponse(status: number, error: string, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // Type params as a Promise
) {
  // Await params before reading properties
  const { id } = await context.params;

  if (!isValidSecretId(id)) {
    return errorResponse(400, 'invalid request');
  }

  const ip = getClientIp(req);
  try {
    const { success, reset } = await secretReadRatelimit.limit(ip);
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

  // Fetch and immediately delete the secret
  const data = await redis.getdel(`secret:${id}`);

  if (!data) {
    return errorResponse(404, 'Secret not found or already burned');
  }
  return NextResponse.json(data);
}
