import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { anonymousPayload, buildQualityReport, monthKey, qualityToText, type Finding } from '../logic/quality';
import { publishQualityReport } from '../storage/cloudStore';
import { getUnit } from '../data/curriculum';
import { Card, Note } from '../components/ui';

const SEV: Record<string, string> = { high: 'Ưu tiên cao', medium: 'Trung bình', low: 'Thấp' };

function monthsFrom(first: number, now: number): string[] {
  const out: string[] = [];
  const d = new Date(now); d.setDate(1);
  const start = new Date(first); start.setDate(1);
  while (d >= start && out.length < 12) { out.push(monthKey(d.getTime())); d.setMonth(d.getMonth() - 1); }
  return out.length ? out : [monthKey(now)];
}

export function Quality() {
  const { data, go, now } = useApp();
  const t = now();
  const months = useMemo(() => monthsFrom(data.attempts[0]?.ts ?? t, t), [data.attempts, t]);
  const [month, setMonth] = useState(months[0]);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const [sent, setSent] = useState<'ok' | 'unavailable' | 'error' | null>(null);
  const r = useMemo(() => buildQualityReport(data, t, month), [data, t, month]);

  async function copy() {
    try { await navigator.clipboard.writeText(qualityToText(r)); setCopied('ok'); } catch { setCopied('fail'); }
  }
  async function send() { setSent(await publishQualityReport(month, anonymousPayload(r))); }

  const row = (f: Finding, i: number, good: boolean) => (
    <li key={i} className={good ? 'q-good' : 'q-bad'}>
      <div><b>{f.area}</b> {f.severity && <span className={`chip ${f.severity === 'high' ? 'chip-needs-work' : 'chip-learning'}`}>{SEV[f.severity]}</span>}</div>
      <div>{f.text}</div>
      <div className="small muted">Số liệu: {f.metric}</div>
      {f.action && <div className="small">➜ <b>Nâng cấp:</b> {f.action}</div>}
    </li>
  );

  const plan = r.improvements.filter((f) => f.action);

  return (
    <div className="stack">
      <h1>Đánh giá chất lượng ứng dụng</h1>
      <Note kind="info">
        Mỗi cuối tháng, ứng dụng được đánh giá theo chuỗi <b>kiểm tra đầu vào → lộ trình → bài học → ôn tập → thói quen</b>: điểm tốt thì giữ và phát huy, điểm chưa tốt thì lên kế hoạch cải thiện và nâng cấp. Đánh giá chỉ dùng số liệu tổng hợp, không có tên học sinh.
      </Note>

      <label className="field" htmlFor="q-month">Tháng đánh giá
        <select id="q-month" className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => <option key={m} value={m}>Tháng {m.slice(5)}/{m.slice(0, 4)}</option>)}
        </select>
      </label>

      <Card>
        <h2>Tổng quan</h2>
        <p>{r.sample.studyAttempts} câu làm · {r.sample.activeDays} ngày học · {r.engagement.goalDays} ngày đủ mục tiêu · {r.engagement.gamePlays} lượt chơi</p>
        {!r.sample.enoughData && <p className="small">Chưa đủ dữ liệu (cần ít nhất 30 câu trong 5 ngày) nên các nhận định bên dưới chỉ mang tính tạm thời.</p>}
        <div className="tablewrap"><table className="table"><tbody>
          <tr><td>Đầu vào</td><td>{r.funnel.placementDone ? (r.funnel.placementSufficient ? 'Đủ dữ liệu' : 'Chưa đủ dữ liệu') : 'Chưa làm'}{r.funnel.uncertainShare !== null && ` · ${r.funnel.uncertainShare}% nhóm cần xác nhận thêm`}</td></tr>
          <tr><td>Lộ trình</td><td>{r.funnel.pathUnits} nhóm cần học · {r.funnel.pathUnitsWithLesson} có bài · {r.funnel.pathLessonsPassed} đã học xong</td></tr>
          <tr><td>Tăng độ chính xác sau khi học</td><td>{r.pathEffect.length ? r.pathEffect.map((e) => `${getUnit(e.unit).name}: ${e.pre}% → ${e.post}%`).join('; ') : 'chưa có nhóm nào đủ dữ liệu'}</td></tr>
          <tr><td>Ôn tập</td><td>{r.retention.reviewAccuracy === null ? 'chưa đủ dữ liệu' : `${r.retention.reviewAccuracy}% đúng`}{r.retention.overdueShare !== null && ` · ${r.retention.overdueShare}% quá hạn`}</td></tr>
          <tr><td>Tự sửa sau gợi ý</td><td>{r.habitsAndUx.retryFixRate === null ? 'chưa đủ dữ liệu' : `${r.habitsAndUx.retryFixRate}%`}</td></tr>
        </tbody></table></div>
      </Card>

      <Card>
        <h2>✅ Điểm tốt – giữ và phát huy</h2>
        {r.strengths.length === 0 ? <p className="muted">Chưa có điểm nổi bật nào đủ dữ liệu để khẳng định.</p> : <ul className="qlistx">{r.strengths.map((f, i) => row(f, i, true))}</ul>}
      </Card>

      <Card>
        <h2>🔧 Cần cải thiện</h2>
        {r.improvements.length === 0 ? <p className="muted">Chưa phát hiện vấn đề nào.</p> : <ul className="qlistx">{r.improvements.map((f, i) => row(f, i, false))}</ul>}
      </Card>

      <Card>
        <h2>🚀 Kế hoạch nâng cấp tháng sau</h2>
        {plan.length === 0 ? <p className="muted">Chưa có hạng mục nâng cấp.</p> : <ol>{plan.map((f, i) => <li key={i}><b>{f.area}:</b> {f.action}</li>)}</ol>}
        <p className="small muted">Thứ tự theo mức ưu tiên. Các hạng mục do nhóm phát triển thực hiện trong tháng kế tiếp, sau khi xem số liệu.</p>
      </Card>

      <Card>
        <h2>Gửi số liệu để nâng cấp</h2>
        <p className="small">Gửi số liệu tổng hợp (con số và mã câu hỏi, <b>không có tên hay hồ sơ học sinh</b>) để người phát triển đọc và nâng cấp ứng dụng vào cuối tháng. Chỉ gửi khi em/phụ huynh bấm nút.</p>
        <div className="row">
          <button className="btn btn-primary" onClick={() => void send()}>Gửi số liệu tháng {month.slice(5)}</button>
          <button className="btn btn-soft" onClick={() => void copy()}>Sao chép báo cáo</button>
          <button className="btn btn-link" onClick={() => go({ name: 'report' })}>Về báo cáo phụ huynh</button>
        </div>
        {sent === 'ok' && <p role="status" className="small">✅ Đã gửi số liệu tháng {month}. Cảm ơn!</p>}
        {sent === 'unavailable' && <p role="status" className="small">Cần mở ứng dụng bằng tài khoản để gửi. Hãy dùng nút “Sao chép báo cáo” rồi gửi cho người phát triển.</p>}
        {sent === 'error' && <p role="status" className="small">Chưa gửi được. Thử lại khi có mạng.</p>}
        {copied === 'ok' && <p role="status" className="small">✅ Đã sao chép báo cáo.</p>}
        {copied === 'fail' && <p role="status" className="small">Không sao chép tự động được. Hãy chọn và chép nội dung bằng tay.</p>}
      </Card>
    </div>
  );
}
