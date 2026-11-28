import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { emptyData, reducer, type Action } from './reducer';
import { LocalStorageStore, type DataStore } from '../storage/storage';
import type { AppData } from '../types';

export type Route =
  | { name: 'home' }
  | { name: 'placement' }
  | { name: 'roadmap' }
  | { name: 'lesson'; id: string; preview: boolean }
  | { name: 'review'; mode?: 'due' | 'mistakes' | 'vocab' }
  | { name: 'report' }
  | { name: 'content' }
  | { name: 'quality' }
  | { name: 'weekly'; week: number }
  | { name: 'play'; tab?: 'games' | 'badges' | 'shop' | 'rewards' }
  | { name: 'game'; id: string };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'placement': return { name: 'placement' };
    case 'roadmap': return { name: 'roadmap' };
    case 'lesson': return parts[1] ? { name: 'lesson', id: parts[1], preview: parts[2] === 'preview' } : { name: 'home' };
    case 'review': return { name: 'review', mode: parts[1] === 'due' || parts[1] === 'mistakes' || parts[1] === 'vocab' ? parts[1] : undefined };
    case 'report': return { name: 'report' };
    case 'content': return { name: 'content' };
    case 'quality': return { name: 'quality' };
    case 'weekly': return Number(parts[1]) >= 2 && Number(parts[1]) <= 12 ? { name: 'weekly', week: Number(parts[1]) } : { name: 'roadmap' };
    case 'play': return { name: 'play', tab: parts[1] === 'badges' || parts[1] === 'shop' || parts[1] === 'rewards' ? parts[1] : undefined };
    case 'game': return parts[1] ? { name: 'game', id: parts[1] } : { name: 'play' };
    default: return { name: 'home' };
  }
}

export const routeHash = (r: Route): string => {
  switch (r.name) {
    case 'home': return '#/home';
    case 'lesson': return `#/lesson/${r.id}${r.preview ? '/preview' : ''}`;
    case 'review': return r.mode ? `#/review/${r.mode}` : '#/review';
    case 'weekly': return `#/weekly/${r.week}`;
    case 'play': return r.tab ? `#/play/${r.tab}` : '#/play';
    case 'game': return `#/game/${r.id}`;
    default: return `#/${r.name}`;
  }
};

interface Ctx {
  data: AppData;
  dispatch: Dispatch<Action>;
  route: Route;
  go: (r: Route) => void;
  now: () => number;
  reset: () => Promise<void>;
  /** Trạng thái đồng bộ khi dùng kho lưu trữ đám mây. */
  syncState: 'local' | 'saving' | 'saved' | 'error';
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children, store }: { children: ReactNode; store?: DataStore }) {
  const st = useRef<DataStore>(store ?? new LocalStorageStore());
  const [data, dispatch] = useReducer(reducer, undefined, emptyData);
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [syncState, setSync] = useState<Ctx['syncState']>('local');
  const isCloud = useRef(store !== undefined);

  useEffect(() => {
    let alive = true;
    void st.current.load().then((d) => {
      if (!alive) return;
      dispatch({ type: 'replace', data: d });
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (isCloud.current) setSync('saving');
    // Gom các thay đổi liên tiếp để không ghi quá dày.
    const t = setTimeout(() => {
      st.current.save(data).then(() => { if (isCloud.current) setSync('saved'); }, () => setSync('error'));
    }, isCloud.current ? 800 : 0);
    return () => clearTimeout(t);
  }, [data, ready]);

  useEffect(() => {
    const on = () => { setRoute(parseHash(window.location.hash)); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = useCallback((r: Route) => {
    // Điều hướng theo state để chạy cả khi trình duyệt/khung nhúng không cho đổi hash.
    setRoute(r);
    window.scrollTo(0, 0);
    try { window.location.hash = routeHash(r); } catch { /* bỏ qua */ }
  }, []);
  const now = useCallback(() => Date.now(), []);
  const reset = useCallback(async () => { await st.current.clear(); dispatch({ type: 'reset' }); }, []);
  const value = useMemo(() => ({ data, dispatch, route, go, now, reset, syncState }), [data, route, go, now, reset, syncState]);

  if (!ready) return <p className="loading">Đang tải…</p>;
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
}
