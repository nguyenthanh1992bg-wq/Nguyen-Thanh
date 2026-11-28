import { useEffect, useState } from 'react';
import type { LessonExample } from '../types';
import { speak } from './ui';

/**
 * "Clip" ví dụ tự chạy: từng câu hiện lớn, tự chuyển sau vài giây, có thể đọc to bằng giọng của thiết bị.
 * Không cần tệp video; hoạt động ngoại tuyến.
 */
export function ExampleClip({ examples }: { examples: LessonExample[] }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(true);
  const ex = examples[idx];

  useEffect(() => {
    if (!playing) return;
    if (sound) speak(ex.en);
    const t = setTimeout(() => {
      if (idx + 1 >= examples.length) setPlaying(false);
      else setIdx(idx + 1);
    }, 4200);
    return () => clearTimeout(t);
  }, [playing, idx, sound, ex.en, examples.length]);

  return (
    <div className="clip" aria-live="polite">
      <div className={`clip-screen ${ex.ok ? 'clip-ok' : 'clip-bad'}`} key={idx}>
        <span className="clip-mark" aria-label={ex.ok ? 'Đúng' : 'Sai'}>{ex.ok ? '✅' : '❌'}</span>
        <p className="clip-en" lang="en">{ex.en}</p>
        <p className="clip-vi">{ex.vi}</p>
        {ex.note && <p className="clip-note">{ex.note}</p>}
      </div>
      <div className="clip-bar">
        <button type="button" className="btn btn-soft" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} aria-label="Câu trước">⏮</button>
        <button type="button" className="btn btn-primary" onClick={() => { if (!playing && idx + 1 >= examples.length) setIdx(0); setPlaying(!playing); }}>{playing ? '⏸ Dừng' : '▶ Xem clip'}</button>
        <button type="button" className="btn btn-soft" onClick={() => setIdx(Math.min(examples.length - 1, idx + 1))} disabled={idx + 1 >= examples.length} aria-label="Câu sau">⏭</button>
        <button type="button" className="btn btn-link" onClick={() => setSound(!sound)}>{sound ? '🔊 Có tiếng' : '🔇 Tắt tiếng'}</button>
        <span className="muted small">{idx + 1}/{examples.length}</span>
      </div>
    </div>
  );
}
