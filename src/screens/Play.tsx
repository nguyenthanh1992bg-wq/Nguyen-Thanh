import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { AVATARS } from '../data/game';
import { badgeStates, BADGE_COINS, coinsOf, avatarOf } from '../logic/game';
import { dayKey } from '../logic/daily';
import { gameCoinsLeft, GAME_DAILY_CAP } from '../logic/games';
import { Card, Note, fmtDate } from '../components/ui';
import { DailyGoal, PlayerBar, WeeklyGoal } from '../components/Rewards';

type Tab = 'games' | 'badges' | 'shop' | 'rewards';
const TABS: { id: Tab; label: string }[] = [
  { id: 'games', label: '🎮 Trò chơi' }, { id: 'badges', label: '🏅 Huy hiệu' },
  { id: 'shop', label: '🛍️ Cửa hàng' }, { id: 'rewards', label: '🎁 Phần thưởng' },
];

export const GAMES = [
  { id: 'picture', emoji: '🖼️', name: 'Đố hình', desc: 'Nhìn hình, chọn từ tiếng Anh đúng. 6 câu.' },
  { id: 'match', emoji: '🃏', name: 'Lật thẻ', desc: 'Tìm cặp hình – từ giống nhau. Càng ít lượt càng nhiều xu.' },
  { id: 'speed', emoji: '⚡', name: 'Tốc độ', desc: 'Chọn nghĩa tiếng Việt thật nhanh trong 45 giây.' },
];

export function Play({ initial }: { initial?: Tab }) {
  const { data, go, now } = useApp();
  const [tab, setTab] = useState<Tab>(initial ?? 'games');
  const left = gameCoinsLeft(data.game, dayKey(now()));

  return (
    <div className="stack">
      <h1>Chơi & phần thưởng</h1>
      <Card><PlayerBar /></Card>
      <div className="subtabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`subtab ${tab === t.id ? 'subtab-on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'games' && (
        <>
          <Card><h2>Rương hôm nay</h2><DailyGoal /></Card>
          <Card><h2>Rương tuần</h2><WeeklyGoal /></Card>
          <Note kind="info">Chơi game giúp nhớ từ vựng và kiếm xu. Mỗi ngày nhận tối đa <b>{GAME_DAILY_CAP} xu</b> từ trò chơi (hôm nay còn {left} xu), còn lại em kiếm bằng cách học bài.</Note>
          {GAMES.map((g) => (
            <Card key={g.id} className="gamecard">
              <span className="game-emoji" aria-hidden="true">{g.emoji}</span>
              <div>
                <h2>{g.name}</h2>
                <p className="small">{g.desc}</p>
                <p className="small muted">Kỷ lục: {data.game.best[g.id] ?? 0}</p>
                <button className="btn btn-primary" onClick={() => go({ name: 'game', id: g.id })}>Chơi ngay</button>
              </div>
            </Card>
          ))}
        </>
      )}
      {tab === 'badges' && <Badges />}
      {tab === 'shop' && <Shop />}
      {tab === 'rewards' && <ParentRewards />}
    </div>
  );
}

function Badges() {
  const { data, dispatch, now } = useApp();
  const list = badgeStates(data, now());
  return (
    <Card>
      <h2>Huy hiệu ({list.filter((b) => b.unlocked).length}/{list.length})</h2>
      <ul className="badges">
        {list.map((b) => (
          <li key={b.id} className={`badge ${b.unlocked ? '' : 'badge-lock'}`}>
            <span className="badge-emoji" aria-hidden="true">{b.unlocked ? b.emoji : '🔒'}</span>
            <div>
              <b>{b.name}</b>
              <div className="small muted">{b.desc}</div>
              {b.unlocked && !b.claimed && <button className="btn btn-primary" onClick={() => dispatch({ type: 'claim', key: `badge:${b.id}`, coins: BADGE_COINS })}>Nhận +{BADGE_COINS} xu</button>}
              {b.claimed && <span className="small">✅ Đã nhận thưởng</span>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Shop() {
  const { data, dispatch, now } = useApp();
  const coins = coinsOf(data, now());
  const cur = avatarOf(data);
  return (
    <Card>
      <h2>Chọn bạn đồng hành</h2>
      <p>Em có <b>🪙 {coins}</b> xu. Đang chọn: <b>{cur.emoji} {cur.name}</b></p>
      <ul className="shop">
        {AVATARS.map((a) => {
          const owned = data.game.owned.includes(a.id);
          return (
            <li key={a.id} className={`shopitem ${data.game.avatar === a.id ? 'shopitem-on' : ''}`}>
              <span className="shop-emoji" aria-hidden="true">{a.emoji}</span>
              <b>{a.name}</b>
              {owned
                ? <button className="btn btn-soft" disabled={data.game.avatar === a.id} onClick={() => dispatch({ type: 'avatar', id: a.id })}>{data.game.avatar === a.id ? 'Đang chọn' : 'Chọn'}</button>
                : <button className="btn btn-primary" disabled={coins < a.cost} onClick={() => dispatch({ type: 'buy', itemId: a.id, cost: a.cost })}>🪙 {a.cost}</button>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ParentRewards() {
  const { data, dispatch, now } = useApp();
  const coins = coinsOf(data, now());
  const [name, setName] = useState('');
  const [cost, setCost] = useState('200');
  const rewards = data.game.rewards;
  const add = () => {
    const c = Math.round(Number(cost));
    if (!name.trim() || !Number.isFinite(c) || c < 10) return;
    dispatch({ type: 'rewards', rewards: [...rewards, { id: `r-${now()}`, name: name.trim().slice(0, 60), cost: c }] });
    setName('');
  };
  return (
    <>
      <Card>
        <h2>Đổi xu lấy quà</h2>
        <p>Em có <b>🪙 {coins}</b> xu. Phụ huynh sẽ trao quà sau khi em đổi.</p>
        <ul className="plain">
          {rewards.map((r) => (
            <li key={r.id} className="rewardrow">
              <span>🎁 <b>{r.name}</b></span>
              <button className="btn btn-primary" disabled={coins < r.cost} onClick={() => dispatch({ type: 'redeem', reward: r, ts: now() })}>🪙 {r.cost}</button>
            </li>
          ))}
        </ul>
        {data.game.redeemed.length > 0 && (
          <>
            <h3>Đã đổi</h3>
            <ul className="plain">
              {[...data.game.redeemed].reverse().map((r) => (
                <li key={r.ts} className="rewardrow">
                  <span>{r.done ? '✅' : '⏳'} {r.name} <span className="small muted">({fmtDate(r.ts)})</span></span>
                  {!r.done && <button className="btn btn-soft" onClick={() => dispatch({ type: 'redeem-done', ts: r.ts })}>Đã trao quà</button>}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <Card>
        <h2>Dành cho phụ huynh: đặt phần thưởng</h2>
        <p className="small muted">Đặt phần thưởng thật mà em thích (kem, phim, đi chơi…) và số xu cần để đổi. Nên chọn quà nhỏ, đều đặn để giữ hứng thú.</p>
        <label className="field" htmlFor="rw-name">Tên phần thưởng
          <input id="rw-name" className="input" value={name} maxLength={60} placeholder="Ví dụ: Đi ăn bánh cùng mẹ" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field" htmlFor="rw-cost">Số xu cần
          <input id="rw-cost" className="input" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/\D/g, ''))} />
        </label>
        <button className="btn btn-primary" disabled={!name.trim() || Number(cost) < 10} onClick={add}>Thêm phần thưởng</button>
        <ul className="plain">
          {rewards.map((r) => (
            <li key={r.id} className="rewardrow"><span>{r.name} · {r.cost} xu</span>
              <button className="btn btn-link" onClick={() => dispatch({ type: 'rewards', rewards: rewards.filter((x) => x.id !== r.id) })}>Xóa</button></li>
          ))}
        </ul>
        <p className="small muted">Lưu ý: bản này chưa có mã PIN phụ huynh, nên phần này em cũng mở được. Muốn khóa lại cần thêm đăng nhập phụ huynh (xem docs/ROADMAP.md).</p>
      </Card>
    </>
  );
}
