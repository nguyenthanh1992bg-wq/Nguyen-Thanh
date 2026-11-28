import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../state/AppContext';
import { coinsFor, gameCoinsLeft, matchDeck, pictureRound, speedQuestion, type MatchCard, type SpeedQ } from '../logic/games';
import { dayKey } from '../logic/daily';
import { Card, Picture, speak } from '../components/ui';
import { FlowBar } from './Placement';
import { GAMES } from './Play';

type Result = { score: number; label: string; coins: number };

function Shell({ id, children, result, onAgain }: { id: string; children: ReactNode; result: Result | null; onAgain: () => void }) {
  const { data, dispatch, go, now } = useApp();
  const g = GAMES.find((x) => x.id === id);
  const sent = useRef(false);
  const day = dayKey(now());
  const left = gameCoinsLeft(data.game, day);
  // Chụp số xu thực nhận một lần lúc kết thúc.
  const [granted, setGranted] = useState(0);

  useEffect(() => {
    if (!result || sent.current) return;
    sent.current = true;
    setGranted(Math.min(result.coins, left));
    dispatch({ type: 'game-result', game: id, score: result.score, coins: result.coins, day });
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="stack">
      <FlowBar title={`${g?.emoji ?? ''} ${g?.name ?? 'Trò chơi'}`} onExit={() => go({ name: 'play' })} exitLabel="Thoát" />
      {!result && <Card>{children}</Card>}
      {result && (
        <Card>
          <h1>{result.score > 0 ? 'Giỏi lắm! 🎉' : 'Lần sau sẽ tốt hơn nhé!'}</h1>
          <p className="big">{result.label}</p>
          <p>{granted > 0 ? <>Em nhận được <b>🪙 +{granted} xu</b>.</> : 'Hôm nay em đã nhận đủ xu từ trò chơi. Học bài để kiếm thêm xu nhé!'}</p>
          <p className="small muted">Kỷ lục: {Math.max(data.game.best[id] ?? 0, result.score)}</p>
          <div className="row">
            <button className="btn btn-primary btn-lg" onClick={() => { sent.current = false; setGranted(0); onAgain(); }}>Chơi lại</button>
            <button className="btn btn-soft" onClick={() => go({ name: 'play' })}>Về mục Chơi</button>
          </div>
        </Card>
      )}
    </div>
  );
}

export function Game({ id }: { id: string }) {
  const [run, setRun] = useState(0);
  const again = () => setRun((n) => n + 1);
  if (id === 'picture') return <PictureGame key={run} onAgain={again} />;
  if (id === 'match') return <MatchGame key={run} onAgain={again} />;
  if (id === 'speed') return <SpeedGame key={run} onAgain={again} />;
  return <Card><p>Không tìm thấy trò chơi.</p></Card>;
}

function PictureGame({ onAgain }: { onAgain: () => void }) {
  const qs = useMemo(() => pictureRound(6), []);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const q = qs[i];
  const choose = (o: string) => {
    if (pick) return;
    setPick(o);
    if (o === q.answer) setScore((s) => s + 1);
    speak(q.answer);
  };
  const next = () => {
    if (i + 1 >= qs.length) setResult({ score, label: `Em đoán đúng ${score}/${qs.length} hình.`, coins: coinsFor.picture(score) });
    else { setI(i + 1); setPick(null); }
  };
  return (
    <Shell id="picture" result={result} onAgain={onAgain}>
      <p className="muted small">Hình {i + 1}/{qs.length} · Đúng {score}</p>
      <div className="bigpic"><Picture emoji={q.emoji} size="xl" label="Hình cần đoán" /></div>
      <p className="center">Đây là gì bằng tiếng Anh?</p>
      <div className="options" role="group" aria-label="Các lựa chọn">
        {q.options.map((o) => (
          <button key={o} type="button" disabled={!!pick} lang="en"
            className={`opt ${pick && o === q.answer ? 'opt-ok' : ''} ${pick === o && o !== q.answer ? 'opt-bad' : ''}`} onClick={() => choose(o)}>{o}</button>
        ))}
      </div>
      {pick && (
        <div className={`fb ${pick === q.answer ? 'fb-ok' : 'fb-bad'}`} role="status">
          {pick === q.answer ? <b>Chính xác! ⭐</b> : <b>Chưa đúng.</b>} <span lang="en">{q.answer}</span> nghĩa là {q.vi}.
          <div className="actions"><button className="btn btn-primary" autoFocus onClick={next}>{i + 1 >= qs.length ? 'Xem kết quả' : 'Hình tiếp theo'}</button></div>
        </div>
      )}
    </Shell>
  );
}

function MatchGame({ onAgain }: { onAgain: () => void }) {
  const PAIRS = 6;
  const deck = useMemo<MatchCard[]>(() => matchDeck(PAIRS), []);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open.map((id) => deck[id]);
    const ok = a.pair === b.pair && a.kind !== b.kind;
    const t = setTimeout(() => {
      if (ok) {
        const nd = [...done, a.pair];
        setDone(nd);
        speak(a.pair);
        if (nd.length === PAIRS) setResult({ score: Math.max(1, PAIRS * 3 - moves), label: `Em ghép xong ${PAIRS} cặp sau ${moves} lượt lật.`, coins: coinsFor.match(PAIRS, moves) });
      }
      setOpen([]);
    }, ok ? 450 : 900);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const flip = (id: number) => {
    if (open.length >= 2 || open.includes(id) || done.includes(deck[id].pair)) return;
    const next = [...open, id];
    setOpen(next);
    if (next.length === 2) setMoves((m) => m + 1);
  };

  return (
    <Shell id="match" result={result} onAgain={onAgain}>
      <p className="muted small">Đã ghép {done.length}/{PAIRS} cặp · {moves} lượt</p>
      <p className="center">Lật hai thẻ: một hình và từ tiếng Anh tương ứng.</p>
      <div className="deck">
        {deck.map((c) => {
          const shown = open.includes(c.id) || done.includes(c.pair);
          return (
            <button key={c.id} type="button" className={`mcard ${shown ? 'mcard-up' : ''} ${done.includes(c.pair) ? 'mcard-done' : ''}`}
              aria-label={shown ? (c.kind === 'pic' ? `hình ${c.pair}` : c.text) : 'thẻ úp'} onClick={() => flip(c.id)}>
              {shown ? (c.kind === 'pic' ? <span className="mcard-pic">{c.text}</span> : <span lang="en">{c.text}</span>) : '❓'}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

function SpeedGame({ onAgain }: { onAgain: () => void }) {
  const TIME = 45;
  const [left, setLeft] = useState(TIME);
  const [q, setQ] = useState<SpeedQ>(() => speedQuestion());
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (result) return;
    if (left <= 0) {
      setResult({ score: scoreRef.current, label: `Em trả lời đúng ${scoreRef.current} từ trong ${TIME} giây.`, coins: coinsFor.speed(scoreRef.current) });
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, result]);

  const answer = (o: string) => {
    if (result) return;
    const ok = o === q.answer;
    if (ok) { const bonus = combo >= 2 ? 2 : 1; scoreRef.current += bonus; setScore(scoreRef.current); setCombo((c) => c + 1); }
    else setCombo(0);
    setFlash(ok ? 'ok' : 'bad');
    setTimeout(() => setFlash(null), 250);
    setQ(speedQuestion());
  };

  return (
    <Shell id="speed" result={result} onAgain={onAgain}>
      <div className="speedbar"><span>⏱ <b>{left}</b>s</span><span>⭐ <b>{score}</b></span><span>{combo >= 3 ? `🔥 x${combo}` : ''}</span></div>
      <div className={`bigpic ${flash === 'ok' ? 'flash-ok' : flash === 'bad' ? 'flash-bad' : ''}`}>
        <Picture emoji={q.emoji} size="xl" label="Hình minh họa" />
        <p className="speedword" lang="en">{q.en}</p>
      </div>
      <div className="options" role="group" aria-label="Các lựa chọn">
        {q.options.map((o) => <button key={o} type="button" className="opt" onClick={() => answer(o)}>{o}</button>)}
      </div>
      <p className="small muted center">Đúng liên tiếp 3 câu trở lên được gấp đôi điểm.</p>
    </Shell>
  );
}
