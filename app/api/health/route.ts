import { NextResponse } from 'next/server';
import { NO_STORE_HEADERS, getRedis } from '@/lib/secret-guard';

export async function GET() {
  try {
    await getRedis().ping();
    return NextResponse.json({ status: 'ok' }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { status: 'unavailable' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
