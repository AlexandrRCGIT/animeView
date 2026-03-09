'use client';

import { useState, useTransition } from 'react';
import { submitReview, deleteReview } from '@/app/actions/reviews';
import type { Review, ReviewData } from '@/app/actions/reviews';

const CRITERIA: { key: keyof ReviewData; label: string }[] = [
  { key: 'score_plot',       label: 'Сюжет' },
  { key: 'score_art',        label: 'Рисовка' },
  { key: 'score_engagement', label: 'Вовлечённость' },
  { key: 'score_characters', label: 'Персонажи' },
  { key: 'score_music',      label: 'Музыка' },
];

function ScoreRow({
  label,
  value,
  onChange,
  readonly,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ width: 120, fontSize: 13, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => !readonly && onChange?.(n)}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: 'none',
              cursor: readonly ? 'default' : 'pointer',
              background: n <= value
                ? 'var(--accent, #6C3CE1)'
                : 'rgba(255,255,255,0.1)',
              color: n <= value ? '#fff' : 'rgba(255,255,255,0.4)',
              fontSize: 11,
              fontWeight: 700,
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', minWidth: 20 }}>{value}</span>
    </div>
  );
}

function reviewDisplayName(review: Review): string {
  if (review.display_name) return review.display_name;
  const [provider] = review.user_id.split(':');
  if (provider === 'discord') return 'Discord пользователь';
  if (provider === 'telegram') return 'Telegram пользователь';
  return 'Пользователь';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function ReviewCard({
  review,
  isMine,
  onDelete,
}: {
  review: Review;
  isMine: boolean;
  onDelete?: () => void;
}) {
  const overall = Number(review.score_overall);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '18px 20px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent, #6C3CE1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {reviewDisplayName(review)?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
              {reviewDisplayName(review)}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              {formatDate(review.created_at)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: 'rgba(245,200,66,0.15)', color: '#F5C842',
            padding: '4px 10px', borderRadius: 8, fontSize: 14, fontWeight: 700,
          }}>★ {overall.toFixed(1)}</span>
          {isMine && (
            <button
              type="button"
              onClick={onDelete}
              style={{
                background: 'rgba(255,60,60,0.12)', color: '#ff6b6b',
                border: 'none', borderRadius: 7, padding: '4px 10px',
                fontSize: 12, cursor: 'pointer',
              }}
            >
              Удалить
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        {CRITERIA.map(({ key, label }) => (
          <ScoreRow
            key={key}
            label={label}
            value={review[key] as number}
            readonly
          />
        ))}
      </div>

      {review.text && (
        <p style={{
          fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)',
          margin: 0, whiteSpace: 'pre-wrap',
        }}>
          {review.text}
        </p>
      )}
    </div>
  );
}

const DEFAULT_SCORES: ReviewData = {
  score_plot:       5,
  score_art:        5,
  score_engagement: 5,
  score_characters: 5,
  score_music:      5,
  text:             '',
};

interface Props {
  shikimoriId: number;
  isLoggedIn:  boolean;
  myReview:    Review | null;
  reviews:     Review[];
  userId:      string | null;
}

export function ReviewSection({ shikimoriId, isLoggedIn, myReview, reviews, userId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [scores, setScores] = useState<ReviewData>(
    myReview
      ? {
          score_plot:       myReview.score_plot,
          score_art:        myReview.score_art,
          score_engagement: myReview.score_engagement,
          score_characters: myReview.score_characters,
          score_music:      myReview.score_music,
          text:             myReview.text,
        }
      : DEFAULT_SCORES
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const otherReviews = reviews.filter((r) => r.user_id !== userId);

  function handleScoreChange(key: keyof ReviewData, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await submitReview(shikimoriId, scores);
        setShowForm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка');
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteReview(shikimoriId);
    });
  }

  const overall = (
    (scores.score_plot + scores.score_art + scores.score_engagement + scores.score_characters + scores.score_music) / 5
  ).toFixed(1);

  return (
    <section style={{ marginTop: 42 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0,
        }}>
          Рецензии {reviews.length > 0 && `(${reviews.length})`}
        </h2>

        {isLoggedIn && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            style={{
              background: 'var(--accent, #6C3CE1)', color: '#fff',
              border: 'none', borderRadius: 9, padding: '7px 16px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {myReview ? 'Редактировать рецензию' : 'Написать рецензию'}
          </button>
        )}
      </div>

      {!isLoggedIn && reviews.length === 0 && (
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>
          Рецензий пока нет. Войдите, чтобы оставить первую.
        </p>
      )}

      {/* Форма */}
      {showForm && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(140,82,255,0.3)',
          borderRadius: 14,
          padding: '20px 22px',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Моя рецензия</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Итог: <strong style={{ color: '#F5C842' }}>★ {overall}</strong>
            </span>
          </div>

          {CRITERIA.map(({ key, label }) => (
            <ScoreRow
              key={key}
              label={label}
              value={scores[key] as number}
              onChange={(v) => handleScoreChange(key, v)}
            />
          ))}

          <textarea
            value={scores.text}
            onChange={(e) => setScores((prev) => ({ ...prev, text: e.target.value }))}
            placeholder="Напишите рецензию (необязательно)..."
            rows={4}
            style={{
              width: '100%', marginTop: 14,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '10px 14px',
              fontSize: 14, color: '#fff', resize: 'vertical',
              outline: 'none', boxSizing: 'border-box',
            }}
          />

          {error && (
            <p style={{ color: '#ff6b6b', fontSize: 13, margin: '8px 0 0' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                background: 'var(--accent, #6C3CE1)', color: '#fff',
                border: 'none', borderRadius: 9, padding: '8px 20px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              style={{
                background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)',
                border: 'none', borderRadius: 9, padding: '8px 16px',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Моя рецензия (когда форма не открыта) */}
      {myReview && !showForm && (
        <ReviewCard
          review={myReview}
          isMine
          onDelete={handleDelete}
        />
      )}

      {/* Рецензии других */}
      {otherReviews.map((r) => (
        <ReviewCard key={r.id} review={r} isMine={false} />
      ))}

      {isLoggedIn && !myReview && !showForm && reviews.length === 0 && (
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>
          Рецензий пока нет. Будьте первым!
        </p>
      )}
    </section>
  );
}
