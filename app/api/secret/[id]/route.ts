import { Redis } from '@upstash/redis';
import { NextResponse, NextRequest } from 'next/server';

const redis = Redis.fromEnv();

export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> } // Type params as a Promise
) {
  // Await params before reading properties
  const { id } = await context.params;

  // Fetch and immediately delete the secret
  const data = await redis.getdel(`secret:${id}`);
  
  if (!data) {
    return NextResponse.json({ error: "Secret not found or already burned" }, { status: 404 });
  }
  return NextResponse.json(data);
}