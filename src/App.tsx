import { useApp, type Route } from './state/AppContext';
import { Home } from './screens/Home';
import { Placement } from './screens/Placement';
import { Roadmap } from './screens/Roadmap';
import { LessonPlayer } from './screens/LessonPlayer';
import { Review } from './screens/Review';
import { ParentReport } from './screens/ParentReport';
import { ContentManager } from './screens/ContentManager';
import { WeeklyTest } from './screens/WeeklyTest';
import { Play } from './screens/Play';
import { Game } from './screens/Game';
import { Quality } from './screens/Quality';
import { avatarOf, coinsOf } from './logic/game';
import { dailyStats } from './logic/daily';
import { reminderState } from './logic/reminders';
import { useReminderNotifier } from './components/Reminders';

const TABS: { name: Route['name']; label: string; icon: string }[] = [
  { name: 'home', label: 'Trang chủ', icon: '🏠' },
  { name: 'roadmap', label: 'Lộ trình', icon: '🗺️' },
  { name: 'play', label: 'Chơi', icon: '🎮' },
  { name: 'review', label: 'Ôn tập', icon: '🔁' },
  { name: 'report', label: 'Phụ huynh', icon: '👪' },
];

const FULLSCREEN: Route['name'][] = ['placement', 'lesson', 'weekly', 'game'];

export function App() {
  const { route, go, data } = useApp();
  useReminderNotifier();
  const rem = reminderState(data, Date.now());
  const full = FULLSCREEN.includes(route.name);
  const activeTab: Route['name'] = route.name === 'content' || route.name === 'quality' ? 'report' : route.name;

  let screen;
  switch (route.name) {
    case 'home': screen = <Home />; break;
    case 'placement': screen = <Placement />; break;
    case 'roadmap': screen = <Roadmap />; break;
    case 'lesson': screen = <LessonPlayer key={route.id + route.preview} lessonId={route.id} preview={route.preview} />; break;
    case 'review': screen = <Review key={route.mode ?? 'hub'} initial={route.mode} />; break;
    case 'report': screen = <ParentReport />; break;
    case 'content': screen = <ContentManager />; break;
    case 'quality': screen = <Quality />; break;
    case 'weekly': screen = <WeeklyTest key={route.week} week={route.week} />; break;
    case 'play': screen = <Play key={route.tab ?? 'games'} initial={route.tab} />; break;
    case 'game': screen = <Game key={route.id} id={route.id} />; break;
  }

  return (
    <div className="app">
      {!full && (
        <header className="top">
          <button type="button" className="stat stat-avatar" onClick={() => go({ name: 'play', tab: 'shop' })} aria-label="Chọn bạn đồng hành">{avatarOf(data).emoji}</button>
          <span className="stat stat-fire" aria-label={`${dailyStats(data.attempts, Date.now()).streak} ngày liên tiếp`}>🔥 {dailyStats(data.attempts, Date.now()).streak}</span>
          <span className="stat stat-coin" aria-label={`${coinsOf(data, Date.now())} xu`}>🪙 {coinsOf(data, Date.now())}</span>
          <span className="stat stat-xp" aria-label="điểm">⚡ {dailyStats(data.attempts, Date.now()).totalPoints}</span>
        </header>
      )}
      <main className={full ? 'main main-full' : 'main'} id="main">{screen}</main>
      {!full && (
        <nav className="tabs" aria-label="Điều hướng chính">
          {TABS.map((t) => (
            <button key={t.name} type="button" className={`tab ${activeTab === t.name ? 'tab-on' : ''}`}
              aria-current={activeTab === t.name ? 'page' : undefined} onClick={() => go({ name: t.name } as Route)}>
              <span aria-hidden="true" className="tab-icon">{t.icon}{((t.name === 'review' && rem.dueCount > 0) || (t.name === 'home' && rem.needStudy)) && <i className="dotbadge" aria-label="có nhắc" />}</span><span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
