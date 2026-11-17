export {};

declare const Deno: {
  env: { get: (name: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const ALLOWED_ORIGINS = [
  'https://bzead.uk',
  'https://www.bzead.uk',
  'https://bzead.in',
  'https://www.bzead.in',
  'https://bzead.asia',
  'https://www.bzead.asia',
  'https://bzead.eu',
  'https://www.bzead.eu',
  'https://www.bzead.com',
  'https://bzead.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
];

const GEOAPIFY_REVERSE_URL = 'https://api.geoapify.com/v1/geocode/reverse';
const UPSTREAM_TIMEOUT_MS = 8000;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_MAP_MAX_SIZE = 500;
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  if (rateLimitMap.size > RATE_LIMIT_MAP_MAX_SIZE) {
    for (const [k, ts] of rateLimitMap) {
      if (ts.every((t) => t <= windowStart)) rateLimitMap.delete(k);
    }
  }
  const timestamps = (rateLimitMap.get(key) || []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitMap.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return false;
}

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

let activeReq: Request | undefined;

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { ...getCorsHeaders(activeReq), 'Content-Type': 'application/json' },
    ...init,
  });
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function supabaseUrl(): string {
  return (Deno.env.get('SUPABASE_URL') || '').trim().replace(/\/+$/, '');
}

function isLegacyAnonJwt(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.role !== 'anon') return false;
    const match = supabaseUrl().match(/\/\/([^.]+)\./);
    return !!match && payload.ref === match[1];
  } catch {
    return false;
  }
}

async function isAuthorized(req: Request): Promise<boolean> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim() || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() || '';
  if (token === anonKey || token === serviceKey || isLegacyAnonJwt(token)) return true;

  const res = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

type GeoapifyResult = {
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
};

async function reverseGeocode(
  latitude: number,
  longitude: number,
  apiKey: string,
  type?: string,
): Promise<GeoapifyResult | null> {
  const url = new URL(GEOAPIFY_REVERSE_URL);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('apiKey', apiKey);
  if (type) url.searchParams.set('type', type);

  const response = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Geoapify responded with ${response.status}`);
  }
  const body = await response.json();
  return Array.isArray(body?.results) && body.results[0] ? body.results[0] as GeoapifyResult : null;
}

Deno.serve(async (req) => {
  activeReq = req;

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const rateKey = token.length > 20
    ? `tok:${token.slice(-16)}`
    : `ip:${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}`;
  if (isRateLimited(rateKey)) {
    return json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  if (!(await isAuthorized(req))) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = Deno.env.get('GEOAPIFY_API_KEY')?.trim();
  if (!apiKey) {
    return json({ error: 'Postcode lookup is not configured' }, { status: 503 });
  }

  try {
    const payload = await req.json();
    const latitude = Number(payload?.latitude);
    const longitude = Number(payload?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return json({ error: 'Invalid latitude/longitude' }, { status: 400 });
    }

    let result = await reverseGeocode(latitude, longitude, apiKey);
    if (!text(result?.postcode)) {
      const postcodeResult = await reverseGeocode(latitude, longitude, apiKey, 'postcode');
      if (postcodeResult) result = { ...result, ...postcodeResult };
    }

    if (!result?.country) {
      return json({ error: 'Unable to resolve location details' }, { status: 502 });
    }

    return json({
      data: {
        postalCode: text(result.postcode),
        city: text(result.city || result.town || result.village || result.county),
        state: text(result.state),
        country: text(result.country),
        countryCode: text(result.country_code).toUpperCase(),
        provider: 'geoapify',
      },
    });
  } catch (error) {
    console.error('[detect-postcode] lookup failed:', error instanceof Error ? error.message : error);
    return json({ error: 'Unable to resolve location details' }, { status: 502 });
  }
});
