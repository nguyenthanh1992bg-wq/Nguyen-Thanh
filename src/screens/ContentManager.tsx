import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { QUESTION_BANK } from '../data/questionBank';
import { LESSONS } from '../data/lessons';
import { UNITS, SKILL_LABEL, getUnit } from '../data/curriculum';
import { validateBank, validateQuestion } from '../data/validate';
import { QuestionCard } from '../components/QuestionCard';
import { Card, Note } from '../components/ui';
import type { Question, UnitId } from '../types';

export function ContentManager() {
  const { go } = useApp();
  const [unit, setUnit] = useState<UnitId | ''>('');
  const [level, setLevel] = useState<'' | '1' | '2' | '3'>('');
  const [source, setSource] = useState<'' | 'placement' | 'lesson'>('');
  const [text, setText] = useState('');
  const [sel, setSel] = useState<Question | null>(null);
  const [tryKey, setTryKey] = useState(0);

  const issues = useMemo(() => validateBank(), []);
  const rows = QUESTION_BANK.filter((q) =>
    (!unit || q.unit === unit) && (!level || q.level === Number(level)) && (!source || q.source === source)
    && (!text || (q.id + q.prompt + q.explanation).toLowerCase().includes(text.toLowerCase())));

  return (
    <div className="stack">
      <h1>Quản lý nội dung & ngân hàng câu hỏi</h1>
      <Note kind="info">Bản thử nghiệm cho phép <b>xem, lọc, thử làm và kiểm tra tính nhất quán</b>. Chỉnh sửa/duyệt nội dung hiện làm trực tiếp trong thư mục <code>src/data</code>; chức năng soạn thảo trên giao diện cần backend và phân quyền giáo viên (xem docs/ROADMAP.md).</Note>

      <Card>
        <h2>Kiểm tra nhất quán</h2>
        {issues.length === 0
          ? <p>✅ {QUESTION_BANK.length} câu hỏi và {LESSONS.length} bài học đều qua kiểm tra cấu trúc (ID không trùng, đáp án nằm trong lựa chọn, mọi lựa chọn sai có giải thích, có ≥ 2 gợi ý, bài học tham chiếu đúng câu hỏi).</p>
          : <><p>⚠️ Có {issues.length} vấn đề:</p><ul>{issues.map((i) => <li key={i}>{i}</li>)}</ul></>}
        <p className="small muted">Kiểm tra này chỉ bắt lỗi cấu trúc; nội dung ngôn ngữ vẫn cần giáo viên tiếng Anh duyệt trước khi dùng chính thức.</p>
      </Card>

      <Card>
        <h2>Độ phủ theo nhóm kiến thức</h2>
        <div className="tablewrap"><table className="table">
          <thead><tr><th>Nhóm</th><th>Kỹ năng</th><th>Câu đầu vào</th><th>Câu bài học</th><th>Bài học</th></tr></thead>
          <tbody>{UNITS.map((u) => {
            const l = LESSONS.find((x) => x.unit === u.id);
            return (
              <tr key={u.id}>
                <td>{u.id} · {u.name}</td><td>{SKILL_LABEL[u.skill]}</td>
                <td>{QUESTION_BANK.filter((q) => q.unit === u.id && q.source === 'placement').length}</td>
                <td>{QUESTION_BANK.filter((q) => q.unit === u.id && q.source === 'lesson').length}</td>
                <td>{l ? <button className="btn btn-link" onClick={() => go({ name: 'lesson', id: l.id, preview: true })}>Xem trước</button> : <span className="muted">chưa có</span>}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </Card>

      <Card>
        <h2>Ngân hàng câu hỏi ({rows.length}/{QUESTION_BANK.length})</h2>
        <div className="filters">
          <select className="input" aria-label="Nhóm kiến thức" value={unit} onChange={(e) => setUnit(e.target.value as UnitId | '')}><option value="">Tất cả nhóm</option>{UNITS.map((u) => <option key={u.id} value={u.id}>{u.id} {u.name}</option>)}</select>
          <select className="input" aria-label="Độ khó" value={level} onChange={(e) => setLevel(e.target.value as typeof level)}><option value="">Mọi mức</option><option value="1">Mức 1 (cơ bản)</option><option value="2">Mức 2 (trung bình)</option><option value="3">Mức 3</option></select>
          <select className="input" aria-label="Nguồn" value={source} onChange={(e) => setSource(e.target.value as typeof source)}><option value="">Mọi nguồn</option><option value="placement">Đầu vào</option><option value="lesson">Bài học</option></select>
          <input className="input" aria-label="Tìm kiếm" placeholder="Tìm theo ID hoặc nội dung" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <ul className="qlist">
          {rows.map((q) => (
            <li key={q.id}>
              <button type="button" className={`qrow ${sel?.id === q.id ? 'qrow-on' : ''}`} onClick={() => { setSel(q); setTryKey((k) => k + 1); }}>
                <span className="small muted">{q.id} · {q.unit} · mức {q.level} · {q.type}</span>
                <span lang="en">{q.prompt}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {sel && (
        <Card className="detail">
          <h2>Chi tiết: {sel.id}</h2>
          <dl className="dl">
            <dt>Nhóm kiến thức</dt><dd>{getUnit(sel.unit).name}</dd>
            <dt>Kỹ năng</dt><dd>{SKILL_LABEL[sel.skill]} – {sel.assesses}</dd>
            <dt>Độ khó / loại</dt><dd>Mức {sel.level} · {sel.type}</dd>
            <dt>Kiến thức tiên quyết</dt><dd>{sel.prerequisites.length ? sel.prerequisites.map((p) => getUnit(p).name).join('; ') : 'Không'}</dd>
            <dt>Đáp án</dt><dd lang="en">{sel.answers.join('  |  ')}</dd>
            <dt>Giải thích</dt><dd>{sel.explanation}</dd>
            <dt>Lỗi sai phổ biến</dt><dd><ul>{sel.commonMistakes.map((m) => <li key={m.answer}><span lang="en">{m.answer}</span>: {m.reason}</li>)}</ul></dd>
            <dt>Gợi ý</dt><dd><ol>{sel.hints.map((h) => <li key={h}>{h}</li>)}</ol></dd>
          </dl>
          {validateQuestion(sel).length > 0 && <p>⚠️ {validateQuestion(sel).join('; ')}</p>}
          <h3>Thử làm (không lưu kết quả)</h3>
          <QuestionCard key={`${sel.id}-${tryKey}`} q={sel} mode="practice" onAttempt={() => undefined} onNext={() => setTryKey((k) => k + 1)} nextLabel="Làm lại" />
        </Card>
      )}
    </div>
  );
}
