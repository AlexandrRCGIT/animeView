'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16, padding: 24,
          background: '#08080E', color: '#fff',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Что-то пошло не так</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', maxWidth: 400 }}>
            Произошла непредвиденная ошибка. Попробуйте обновить страницу.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '10px 24px', borderRadius: 10,
              background: 'var(--accent, #6C3CE1)', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Обновить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
