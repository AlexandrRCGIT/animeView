import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { markContentRead, parseContentType } from '@/lib/content';
import { isTrustedWriteRequest } from '@/lib/security';

export async function POST(req: NextRequest) {
  if (!isTrustedWriteRequest(req)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { type?: string };
  try {
    body = (await req.json()) as { type?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = parseContentType(body.type ?? null);
  if (!type) {
    return NextResponse.json({ error: 'type must be info or news' }, { status: 400 });
  }

  try {
    await markContentRead(session.user.id, type);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark content as read';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
