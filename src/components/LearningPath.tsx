import { useApp } from '../state/AppContext';
import { LESSONS } from '../data/lessons';
import { getUnit, unitIndex } from '../data/curriculum';
import { lockReason, nextActivity } from '../logic/lessonFlow';
import { dueCards } from '../logic/srs';

const ICON: Record<string, string> = {
  'lesson-alphabet': '🔤', 'lesson-tobe': '🙋', 'lesson-plural': '📦', 'lesson-article': '🍎',
  'lesson-havehas': '🤝', 'lesson-therebe': '📍', 'lesson-presentsimple': '⏰',
};

/** Đường học dạng zigzag: mỗi bài là một nút tròn (đã xong / đang học / bị khóa). */
export function LearningPath() {
  const { data, go, now } = useApp();
  const next = nextActivity(data, now());
  const lessons = [...LESSONS].sort((a, b) => unitIndex(a.unit) - unitIndex(b.unit));
  const due = dueCards(data.srs, now()).length;
  const currentId = next.kind === 'lesson' ? next.lesson.id : null;
  const offsets = [0, 46, 70, 46, 0, -46, -70];

  return (
    <div className="path-wrap">
      <div className="banner">
        <div>
          <span className="banner-kicker">Lộ trình của em</span>
          <b>Từ nền tảng đến lớp 6</b>
        </div>
        <button type="button" className="banner-btn" onClick={() => go({ name: 'roadmap' })} aria-label="Xem lộ trình 12 tuần">🗺️</button>
      </div>

      {next.kind === 'placement' && (
        <div className="node-row">
          <button type="button" className="node node-current" onClick={() => go({ name: 'placement' })} aria-label="Kiểm tra đầu vào">
            <span aria-hidden="true">📝</span>
          </button>
          <span className="node-tag">{next.resume ? 'LÀM TIẾP' : 'BẮT ĐẦU'}</span>
          <p className="node-name">Kiểm tra đầu vào</p>
        </div>
      )}

      {lessons.map((l, i) => {
        const done = data.lessons[l.id]?.passed === true;
        const lock = lockReason(data, l);
        const gated = data.placement.status !== 'done';
        const current = l.id === currentId;
        const state = done ? 'done' : lock || gated ? 'locked' : current ? 'current' : 'open';
        return (
          <div key={l.id} className="node-row" style={{ transform: `translateX(${offsets[i % offsets.length]}px)` }}>
            {current && <span className="node-tag">BẮT ĐẦU</span>}
            <button type="button" className={`node node-${state}`} disabled={state === 'locked'}
              onClick={() => go({ name: 'lesson', id: l.id, preview: false })}
              aria-label={`${l.title}${done ? ' (đã xong)' : state === 'locked' ? ' (đang khóa)' : ''}`}>
              <span aria-hidden="true">{state === 'locked' ? '🔒' : done ? '⭐' : ICON[l.id] ?? '📘'}</span>
            </button>
            <p className="node-name">{l.title}<br /><span className="small muted">{getUnit(l.unit).name}</span></p>
          </div>
        );
      })}

      <div className="node-row" style={{ transform: `translateX(${offsets[lessons.length % offsets.length]}px)` }}>
        <button type="button" className={`node ${due > 0 ? 'node-open' : 'node-locked'}`} disabled={due === 0} onClick={() => go({ name: 'review', mode: 'due' })} aria-label="Ôn tập">
          <span aria-hidden="true">{due > 0 ? '🔁' : '🏆'}</span>
        </button>
        <p className="node-name">{due > 0 ? `Ôn tập (${due})` : 'Cúp ôn tập'}</p>
      </div>
    </div>
  );
}
