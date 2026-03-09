'use client';

import { useState, useTransition } from 'react';
import { addComment, deleteComment } from '@/app/actions/comments';
import type { Comment } from '@/app/actions/comments';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fallbackName(userId: string | null): string {
  if (!userId) return 'Пользователь';
  const [provider] = userId.split(':');
  if (provider === 'discord') return 'Discord пользователь';
  if (provider === 'telegram') return 'Telegram пользователь';
  return 'Пользователь';
}

function Avatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'var(--accent, #6C3CE1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  replies: Comment[];
  userId: string | null;
  shikimoriId: number;
  onReply: (parentId: string) => void;
  replyingTo: string | null;
}

function CommentItem({ comment, replies, userId, shikimoriId, onReply, replyingTo }: CommentItemProps) {
  const [isPending, startTransition] = useTransition();
  const displayName = comment.display_name ?? fallbackName(comment.user_id);
  const isMine = userId === comment.user_id;

  function handleDelete() {
    startTransition(async () => {
      await deleteComment(comment.id, shikimoriId);
    });
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={displayName} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{displayName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{formatDate(comment.created_at)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {userId && (
              <button
                type="button"
                onClick={() => onReply(comment.id)}
                style={{
                  background: 'none', color: 'rgba(255,255,255,0.4)',
                  border: 'none', fontSize: 12, cursor: 'pointer', padding: '2px 6px',
                }}
              >
                Ответить
              </button>
            )}
            {isMine && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                style={{
                  background: 'none', color: '#ff6b6b',
                  border: 'none', fontSize: 12, cursor: 'pointer', padding: '2px 6px',
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                Удалить
              </button>
            )}
          </div>
        </div>
        <p style={{
          fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.75)',
          margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {comment.text}
        </p>
      </div>

      {/* Ответы с отступом */}
      {replies.length > 0 && (
        <div style={{ marginTop: 6, paddingLeft: 24, borderLeft: '2px solid rgba(140,82,255,0.25)' }}>
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              comment={reply}
              userId={userId}
              shikimoriId={shikimoriId}
            />
          ))}
        </div>
      )}

      {/* Inline форма ответа */}
      {replyingTo === comment.id && (
        <div style={{ marginTop: 8, paddingLeft: 24 }}>
          {/* форма управляется родителем */}
        </div>
      )}
    </div>
  );
}

function ReplyItem({
  comment,
  userId,
  shikimoriId,
}: {
  comment: Comment;
  userId: string | null;
  shikimoriId: number;
}) {
  const [isPending, startTransition] = useTransition();
  const displayName = comment.display_name ?? fallbackName(comment.user_id);
  const isMine = userId === comment.user_id;

  function handleDelete() {
    startTransition(async () => {
      await deleteComment(comment.id, shikimoriId);
    });
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Avatar name={displayName} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{displayName}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{formatDate(comment.created_at)}</div>
          </div>
        </div>
        {isMine && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            style={{
              background: 'none', color: '#ff6b6b',
              border: 'none', fontSize: 12, cursor: 'pointer', padding: '2px 6px',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Удалить
          </button>
        )}
      </div>
      <p style={{
        fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)',
        margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {comment.text}
      </p>
    </div>
  );
}

interface Props {
  shikimoriId: number;
  isLoggedIn:  boolean;
  userId:      string | null;
  comments:    Comment[];
}

export function CommentsSection({ shikimoriId, isLoggedIn, userId, comments }: Props) {
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isReplyPending, startReplyTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const roots = comments.filter((c) => c.parent_id === null);
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parent_id) {
      if (!repliesByParent.has(c.parent_id)) repliesByParent.set(c.parent_id, []);
      repliesByParent.get(c.parent_id)!.push(c);
    }
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        await addComment(shikimoriId, trimmed);
        setText('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      }
    });
  }

  function handleReply(parentId: string) {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    startReplyTransition(async () => {
      await addComment(shikimoriId, trimmed, parentId);
      setReplyText('');
      setReplyingTo(null);
    });
  }

  function handleReplyClick(id: string) {
    setReplyingTo((prev) => (prev === id ? null : id));
    setReplyText('');
  }

  return (
    <section style={{ marginTop: 42 }}>
      <h2 style={{
        fontFamily: 'var(--font-unbounded), sans-serif',
        fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
        margin: '0 0 16px',
      }}>
        Комментарии {comments.length > 0 && `(${comments.length})`}
      </h2>

      {/* Форма добавления */}
      {isLoggedIn ? (
        <div style={{ marginBottom: 24 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напишите комментарий..."
            rows={3}
            maxLength={2000}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '10px 14px',
              fontSize: 14, color: '#fff', resize: 'vertical',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: '4px 0 0' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !text.trim()}
              style={{
                background: 'var(--accent, #6C3CE1)', color: '#fff',
                border: 'none', borderRadius: 9, padding: '8px 20px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                opacity: isPending || !text.trim() ? 0.5 : 1,
              }}
            >
              {isPending ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
          Войдите, чтобы оставить комментарий.
        </p>
      )}

      {/* Список */}
      {roots.length === 0 && (
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>
          Комментариев пока нет.
        </p>
      )}

      {roots.map((comment) => (
        <div key={comment.id}>
          <CommentItem
            comment={comment}
            replies={repliesByParent.get(comment.id) ?? []}
            userId={userId}
            shikimoriId={shikimoriId}
            onReply={handleReplyClick}
            replyingTo={replyingTo}
          />

          {/* Inline форма ответа */}
          {replyingTo === comment.id && (
            <div style={{ paddingLeft: 24, marginTop: -6, marginBottom: 12 }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Ответить..."
                rows={2}
                maxLength={2000}
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(140,82,255,0.3)',
                  borderRadius: 9, padding: '8px 12px',
                  fontSize: 13, color: '#fff', resize: 'none',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => handleReply(comment.id)}
                  disabled={isReplyPending || !replyText.trim()}
                  style={{
                    background: 'var(--accent, #6C3CE1)', color: '#fff',
                    border: 'none', borderRadius: 8, padding: '6px 14px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    opacity: isReplyPending || !replyText.trim() ? 0.5 : 1,
                  }}
                >
                  {isReplyPending ? 'Отправка...' : 'Ответить'}
                </button>
                <button
                  type="button"
                  onClick={() => { setReplyingTo(null); setReplyText(''); }}
                  style={{
                    background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)',
                    border: 'none', borderRadius: 8, padding: '6px 12px',
                    fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
