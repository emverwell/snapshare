import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/secret-guard';

export async function GET() {
  try {
    await getRedis().ping();
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
