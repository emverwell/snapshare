import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = Redis.fromEnv();

export async function POST(req: Request) {
  const { ciphertext, urlIv, pwdSalt, pwdIv } = await req.json();
  const id = crypto.randomUUID();
  
  await redis.setex(`secret:${id}`, 86400, { 
    ciphertext, 
    urlIv, 
    pwdSalt, // Will be undefined if no password was used
    pwdIv 
  });
  
  return NextResponse.json({ id });
}