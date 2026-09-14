import { NextResponse, NextRequest } from 'next/server';
import {
  NO_STORE_HEADERS,
  errorResponse,
  getClientIp,
  getRedis,
  isCrossSiteFetch,
  isValidSecretId,
  logSecurityEvent,
  secretReadRatelimit,
} from '@/lib/secret-guard';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // Type params as a Promise
) {
  // Await params before reading properties
  const { id } = await context.params;

  if (!isValidSecretId(id)) {
    return errorResponse(400, 'invalid request');
  }

  // A GET here can delete the secret (burn-after-reading), so a third-party
  // page that merely embeds this URL (e.g. <img src>) shouldn't be able to
  // trigger it — see isCrossSiteFetch for why this checks Sec-Fetch-Site
  // rather than Origin.
  if (isCrossSiteFetch(req)) {
    logSecurityEvent('cross_site_rejected', {
      ip: getClientIp(req),
      id,
      secFetchSite: req.headers.get('sec-fetch-site'),
    });
    return errorResponse(403, 'forbidden');
  }

  const ip = getClientIp(req);
  try {
    const { success, reset } = await secretReadRatelimit.limit(ip);
    if (!success) {
      logSecurityEvent('rate_limited', { ip, route: 'read' });
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

  // Whether to delete now depends on a flag stored *inside* the value, so
  // it can't be known without reading first — this can no longer be one
  // atomic getdel. Deliberate accepted trade-off: two truly simultaneous
  // reads of a burn-after-reading secret could both land before the delete
  // below completes (today's getdel had zero such window). Not fixing this
  // with a Lua script: anyone racing this already has the link and full
  // read access — the one-time guarantee is about limiting exposure, not
  // defending against a reader racing themselves.
  const data = await getRedis().get<{ burnAfterReading: boolean }>(
    `secret:${id}`
  );

  if (!data) {
    return errorResponse(404, 'Secret not found or already burned');
  }

  if (data.burnAfterReading) {
    await getRedis().del(`secret:${id}`);
  }

  return NextResponse.json(data, { headers: NO_STORE_HEADERS });
}
