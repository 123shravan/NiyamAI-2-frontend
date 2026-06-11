import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CRON_SECRET = process.env.CRON_SECRET;

// Called by an external cron service every 10 minutes to keep the backend warm.
// Prevents Render/Railway free-tier instances from sleeping.
// Requires x-cron-secret header matching CRON_SECRET env var.
export async function GET(req: Request) {
  if (CRON_SECRET) {
    const incoming = req.headers.get('x-cron-secret');
    if (incoming !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${BACKEND_URL}/health/live`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    return NextResponse.json({
      ok: res.ok,
      backend_status: res.status,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
