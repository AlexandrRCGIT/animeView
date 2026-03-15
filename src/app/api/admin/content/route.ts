import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminUserId } from '@/lib/admin';
import { deleteContentPost, getAdminPosts, parseContentType, saveContentPost } from '@/lib/content';
import { isTrustedWriteRequest } from '@/lib/security';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) return unauthorized();

  const type = parseContentType(req.nextUrl.searchParams.get('type'));
  if (!type) {
    return NextResponse.json({ error: 'type must be info or news' }, { status: 400 });
  }

  try {
    const posts = await getAdminPosts(type);
    return NextResponse.json({ posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load admin posts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isTrustedWriteRequest(req)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) return unauthorized();

  let body: {
    id?: number;
    type?: string;
    title?: string;
    body?: string;
    is_published?: boolean;
  };

  try {
    body = (await req.json()) as {
      id?: number;
      type?: string;
      title?: string;
      body?: string;
      is_published?: boolean;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = parseContentType(body.type ?? null);
  if (!type) {
    return NextResponse.json({ error: 'type must be info or news' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title : '';
  const text = typeof body.body === 'string' ? body.body : '';
  const isPublished = Boolean(body.is_published);

  if (title.trim().length < 2) {
    return NextResponse.json({ error: 'Слишком короткий заголовок' }, { status: 400 });
  }
  if (text.trim().length < 2) {
    return NextResponse.json({ error: 'Слишком короткий текст' }, { status: 400 });
  }

  try {
    const post = await saveContentPost({
      id: typeof body.id === 'number' ? body.id : undefined,
      type,
      title,
      body: text,
      is_published: isPublished,
      author_user_id: session!.user!.id,
    });
    return NextResponse.json({ ok: true, post });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save post';
    const isValidation =
      message.includes('too long') ||
      message.includes('empty') ||
      message.includes('unsafe') ||
      message.includes('not found');
    return NextResponse.json({ error: message }, { status: isValidation ? 400 : 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isTrustedWriteRequest(req)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) return unauthorized();

  const idValue = Number(req.nextUrl.searchParams.get('id') ?? '');
  if (!idValue || Number.isNaN(idValue)) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    await deleteContentPost(idValue);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
