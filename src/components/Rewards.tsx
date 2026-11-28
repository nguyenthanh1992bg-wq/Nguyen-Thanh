import { useApp } from '../state/AppContext';
import { avatarOf, chestKey, chestState, levelOf, CHEST_COINS, coinsOf } from '../logic/game';
import { dailyStats } from '../logic/daily';
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

/** Mục tiêu hôm nay và rương thưởng. */
export function DailyGoal() {
  const { data, dispatch, now, go } = useApp();
  const t = now();
  const d = dailyStats(data.attempts, t);
  const c = chestState(data, t);
  return (
    <div>
      <p><b>{d.today.answered}/{d.goal}</b> câu hôm nay · <b>{d.today.points}</b> điểm{d.today.accuracy !== null && <> · đúng {d.today.accuracy}%</>}</p>
      <ProgressBar value={d.today.answered} max={d.goal} label="Mục tiêu hôm nay" />
      <div className="week" role="img" aria-label="Số câu 7 ngày gần nhất">
        {d.last7.map((x, i) => (
          <div key={i} className="week-col">
            <div className={`week-bar ${x.answered >= d.goal ? 'week-bar-ok' : ''}`} style={{ height: `${Math.min(100, Math.round((x.answered / d.goal) * 100))}%` }} title={`${x.answered} câu`} />
            <span className="small muted">{x.label}</span>
          </div>
        ))}
      </div>
      {c.claimed ? <p className="chest">🎁 Hôm nay em đã mở rương rồi. Hẹn em ngày mai!</p>
        : c.reached ? <button className="btn btn-primary btn-lg" onClick={() => dispatch({ type: 'claim', key: chestKey(t), coins: CHEST_COINS })}>🎁 Mở rương thưởng +{CHEST_COINS} xu</button>
          : <p className="chest muted">🎁 Làm đủ {d.goal} câu để mở rương +{CHEST_COINS} xu. Còn {d.goal - d.today.answered} câu nữa!</p>}
      <p className="small"><button className="btn btn-link" onClick={() => go({ name: 'play' })}>Vào mục Chơi & phần thưởng →</button></p>
    </div>
  );
}
