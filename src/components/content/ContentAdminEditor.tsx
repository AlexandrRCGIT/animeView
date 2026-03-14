'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ContentPost, ContentType } from '@/lib/content';

interface Props {
  contentType: ContentType;
  initialPosts: ContentPost[];
}

const FIELD: React.CSSProperties = {
  width: '100%',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  outline: 'none',
  padding: '10px 12px',
  fontSize: 14,
};

const BTN: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  padding: '9px 14px',
};

type SaveState = 'idle' | 'saving' | 'error' | 'ok';

export function ContentAdminEditor({ contentType, initialPosts }: Props) {
  const [posts, setPosts] = useState<ContentPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const titleLabel = useMemo(() => (contentType === 'news' ? 'Новости' : 'Информация'), [contentType]);

  async function loadPosts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/content?type=${contentType}`, { cache: 'no-store' });
      const payload = (await res.json()) as { posts?: ContentPost[]; error?: string };
      if (!res.ok || payload.error) {
        setMessage(payload.error ?? 'Ошибка загрузки постов');
        setSaveState('error');
        return;
      }
      setPosts(payload.posts ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType]);

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setBody('');
    setIsPublished(true);
    setSaveState('idle');
    setMessage('');
  }

  function startEdit(post: ContentPost) {
    setEditingId(post.id);
    setTitle(post.title);
    setBody(post.body);
    setIsPublished(post.is_published);
    setSaveState('idle');
    setMessage('');
  }

  async function handleSave() {
    if (title.trim().length < 2 || body.trim().length < 2) {
      setSaveState('error');
      setMessage('Заполни заголовок и текст');
      return;
    }

    setSaveState('saving');
    setMessage('');

    const res = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingId ?? undefined,
        type: contentType,
        title,
        body,
        is_published: isPublished,
      }),
    });
    const payload = (await res.json()) as { ok?: boolean; error?: string; post?: ContentPost };

    if (!res.ok || payload.error || !payload.ok || !payload.post) {
      setSaveState('error');
      setMessage(payload.error ?? 'Не удалось сохранить');
      return;
    }

    setEditingId(null);
    setTitle('');
    setBody('');
    setIsPublished(true);
    setSaveState('ok');
    setMessage('Сохранено');
    await loadPosts();
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить пост?')) return;

    const res = await fetch(`/api/admin/content?id=${id}`, { method: 'DELETE' });
    const payload = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || payload.error || !payload.ok) {
      setSaveState('error');
      setMessage(payload.error ?? 'Не удалось удалить');
      return;
    }

    if (editingId === id) resetForm();
    await loadPosts();
  }

  return (
    <section
      style={{
        marginBottom: 26,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.03)',
        padding: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          {titleLabel}: админ-редактор
        </h2>
        <button type="button" onClick={resetForm} style={BTN}>
          Новый пост
        </button>
      </div>

      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        <input
          style={FIELD}
          placeholder="Заголовок"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          style={{ ...FIELD, minHeight: 140, resize: 'vertical' }}
          placeholder="Текст"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) => setIsPublished(event.target.checked)}
          />
          Опубликовать сразу
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === 'saving'}
          style={{
            ...BTN,
            background: '#6C3CE1',
            border: 'none',
            opacity: saveState === 'saving' ? 0.65 : 1,
          }}
        >
          {saveState === 'saving' ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Опубликовать'}
        </button>
        {message && (
          <span style={{ color: saveState === 'error' ? '#fca5a5' : '#86efac', fontSize: 13 }}>
            {message}
          </span>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginBottom: 8 }}>
          Существующие посты {loading ? '(загрузка...)' : `(${posts.length})`}
        </div>
        {posts.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            Пусто
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {posts.map((post) => (
              <div
                key={post.id}
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.09)',
                  background: 'rgba(255,255,255,0.02)',
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{post.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginTop: 4 }}>
                      {post.is_published ? 'Опубликовано' : 'Черновик'}
                      {' · '}
                      {new Date(post.updated_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" style={BTN} onClick={() => startEdit(post)}>
                      Изменить
                    </button>
                    <button
                      type="button"
                      style={{ ...BTN, borderColor: 'rgba(248,113,113,0.35)', color: '#fca5a5' }}
                      onClick={() => handleDelete(post.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
