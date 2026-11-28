import type { ReactNode } from 'react';
import { STATUS_LABEL, type UnitStatus } from '../logic/progress';

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatusChip({ status }: { status: UnitStatus }) {
  return <span className={`chip chip-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Note({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'demo'; children: ReactNode }) {
  return <div className={`note note-${kind}`} role={kind === 'info' ? undefined : 'note'}>{children}</div>;
}

export const fmtDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

export const fmtMin = (ms: number): string => `${Math.max(1, Math.round(ms / 60000))} phút`;

export function speak(text: string, rate = 0.85): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rate;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

/** Hình minh họa lớn (emoji) cho từ vựng, dùng chung cho bài học và trò chơi. */
export function Picture({ emoji, size = 'md', label }: { emoji: string; size?: 'sm' | 'md' | 'lg' | 'xl'; label?: string }) {
  return <span className={`pic pic-${size}`} role="img" aria-label={label ?? 'hình minh họa'}>{emoji}</span>;
}
