import { useRef, useState } from 'react';
import type { Question } from '../types';
import { QuestionCard, type AttemptResult, type CardMode, type FinishInfo } from './QuestionCard';
import { ProgressBar } from './ui';

export interface SeqItem {
  q: Question;
  /** Nhãn tùy chọn để hiển thị (ví dụ "Từ vựng"). */
  tag?: string;
  /** Dùng cho câu không nằm trong ngân hàng (từ vựng sinh tự động). */
  kind?: 'q' | 'v';
  refId?: string;
}

export interface SeqResult {
  item: SeqItem;
  skipped: boolean;
  firstCorrect: boolean;
  firstAnswer: string;
  finalCorrect: boolean;
}

interface Props {
  items: SeqItem[];
  mode: CardMode;
  onAttempt: (item: SeqItem, r: AttemptResult) => void;
  onFinish: (results: SeqResult[]) => void;
  lastLabel?: string;
}

export function Sequence({ items, mode, onAttempt, onFinish, lastLabel = 'Xem kết quả' }: Props) {
  const [idx, setIdx] = useState(0);
  const results = useRef<SeqResult[]>([]);
  const first = useRef<AttemptResult | null>(null);

  if (items.length === 0) return <p className="muted">Không có câu hỏi.</p>;
  const item = items[idx];

  function handleAttempt(r: AttemptResult) {
    if (first.current === null) first.current = r;
    onAttempt(item, r);
  }
  function handleNext(f: FinishInfo) {
    results.current.push({
      item, skipped: f.skipped, firstCorrect: first.current?.correct === true,
      firstAnswer: first.current?.answer ?? '', finalCorrect: f.finalCorrect,
    });
    first.current = null;
    if (idx + 1 >= items.length) onFinish(results.current);
    else setIdx(idx + 1);
  }

  return (
    <div>
      <p className="muted small">{item.tag ? `${item.tag} · ` : ''}Câu {idx + 1}/{items.length}</p>
      <ProgressBar value={idx} max={items.length} label="Tiến độ" />
      <QuestionCard
        key={`${item.q.id}-${idx}`} q={item.q} mode={mode}
        onAttempt={handleAttempt} onNext={handleNext}
        nextLabel={idx + 1 >= items.length ? lastLabel : 'Câu tiếp theo'}
      />
    </div>
  );
}
