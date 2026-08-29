import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = Redis.fromEnv();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // GETDEL fetches and instantly deletes the key, preventing second views
  const data = await redis.getdel(`secret:${params.id}`);
  
  if (!data) {
    return NextResponse.json({ error: "Secret not found or already burned" }, { status: 404 });
  }
  return NextResponse.json(data);
}