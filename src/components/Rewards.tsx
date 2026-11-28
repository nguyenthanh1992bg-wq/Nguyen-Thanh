import { useApp } from '../state/AppContext';
import { avatarOf, coinsOf, dayChest, levelOf, weekChestState } from '../logic/game';
import { dailyStats, dayComment, WEEK_GOAL_DAYS, WEEK_GOAL_QUESTIONS } from '../logic/daily';
import { ProgressBar } from './ui';

/** Thanh nhân vật: avatar, cấp độ, xu, chuỗi ngày. Dùng ở Trang chủ và mục Chơi. */
export function PlayerBar() {
  const { data, now } = useApp();
  const t = now();
  const d = dailyStats(data.attempts, t);
  const lv = levelOf(d.totalPoints);
  const av = avatarOf(data);
  return (
    <div className="player">
      <span className="player-avatar" role="img" aria-label={av.name}>{av.emoji}</span>
      <div className="player-main">
        <div className="player-row">
          <b>Cấp {lv.level} · {lv.name}</b>
          <span className="coin" aria-label={`${coinsOf(data, t)} xu`}>🪙 {coinsOf(data, t)}</span>
        </div>
        <ProgressBar value={lv.pct} max={100} label="Tiến độ lên cấp" />
        <span className="small muted">{lv.nextAt === null ? 'Cấp cao nhất' : `${d.totalPoints}/${lv.nextAt} điểm lên cấp`} · 🔥 {d.streak} ngày liên tiếp</span>
      </div>
    </div>
  );
}

/** Mục tiêu hôm nay: đánh giá bằng sao và rương thưởng. */
export function DailyGoal() {
  const { data, dispatch, now, go } = useApp();
  const t = now();
  const d = dailyStats(data.attempts, t);
  const c = dayChest(data, t);
  return (
    <div>
      <p className="stars" aria-label={`${c.stars} trên 3 sao hôm nay`}>{'⭐'.repeat(c.stars)}{'☆'.repeat(3 - c.stars)}</p>
      <p><b>{d.today.answered}/{d.goal}</b> câu · <b>{d.today.points}</b> điểm{d.today.accuracy !== null && <> · đúng {d.today.accuracy}%</>}</p>
      <ProgressBar value={d.today.answered} max={d.goal} label="Mục tiêu hôm nay" />
      <p className="small">{dayComment(d.today)}</p>
      <div className="week" role="img" aria-label="Số câu 7 ngày gần nhất">
        {d.last7.map((x, i) => (
          <div key={i} className="week-col">
            <div className={`week-bar ${x.answered >= d.goal ? 'week-bar-ok' : ''}`} style={{ height: `${Math.min(100, Math.round((x.answered / d.goal) * 100))}%` }} title={`${x.answered} câu`} />
            <span className="small muted">{x.label}</span>
          </div>
        ))}
      </div>
      {c.claimed ? <p className="chest">🎁 Hôm nay em đã mở rương rồi. Hẹn em ngày mai!</p>
        : c.coins > 0 ? <button className="btn btn-primary btn-lg" onClick={() => dispatch({ type: 'claim', key: c.key, coins: c.coins })}>🎁 Mở rương hôm nay +{c.coins} xu</button>
          : <p className="chest muted">🎁 Làm đủ {d.goal} câu để mở rương (+20 xu, đúng ≥ 85% được +30 xu). Còn {Math.max(0, d.goal - d.today.answered)} câu nữa!</p>}
      <p className="small"><button className="btn btn-link" onClick={() => go({ name: 'play' })}>Vào mục Chơi & phần thưởng →</button></p>
    </div>
  );
}

/** Mục tiêu tuần: số ngày học, số câu, đánh giá và rương tuần. */
export function WeeklyGoal() {
  const { data, dispatch, now } = useApp();
  const w = weekChestState(data, now());
  const s = w.week;
  return (
    <div>
      <p><b>Đánh giá tuần này: {s.grade}</b></p>
      <p className="small">📅 <b>{s.daysActive}/{WEEK_GOAL_DAYS}</b> ngày có học · ✏️ <b>{s.answered}/{WEEK_GOAL_QUESTIONS}</b> câu{s.accuracy !== null && <> · đúng {s.accuracy}%</>}</p>
      <ProgressBar value={s.daysActive} max={WEEK_GOAL_DAYS} label="Số ngày học trong tuần" />
      <ProgressBar value={s.answered} max={WEEK_GOAL_QUESTIONS} label="Số câu trong tuần" />
      {w.claimed ? <p className="chest">🏆 Em đã nhận rương tuần này. Tuần mới bắt đầu vào thứ Hai!</p>
        : w.reached ? <button className="btn btn-primary btn-lg" onClick={() => dispatch({ type: 'claim', key: w.key, coins: w.coins })}>🏆 Mở rương tuần +{w.coins} xu</button>
          : <p className="chest muted">🏆 Học {WEEK_GOAL_DAYS} ngày và làm {WEEK_GOAL_QUESTIONS} câu trong tuần để mở rương tuần (+60 xu, đúng ≥ 85% được thêm +20).</p>}
    </div>
  );
}
