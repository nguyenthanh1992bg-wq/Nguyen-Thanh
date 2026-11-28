import type { AppData } from '../types';
import { emptyData, emptyGame } from '../state/reducer';

/**
 * Lớp lưu trữ có thể thay bằng cơ sở dữ liệu thật (API + DB) mà không phải sửa giao diện.
 * - LocalStorageStore: lưu trên thiết bị này.
 * - Xem thêm cloudStore.ts: đồng bộ nhiều thiết bị qua tài khoản.
 */
export interface DataStore {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

const KEY = 'english-recovery-6:v1';

export function isAppData(x: unknown): x is AppData {
  if (!x || typeof x !== 'object') return false;
  const d = x as Partial<AppData>;
  return d.version === 1 && Array.isArray(d.attempts) && typeof d.srs === 'object' && d.srs !== null
    && typeof d.lessons === 'object' && d.lessons !== null && typeof d.placement === 'object' && d.placement !== null
    && typeof d.weeklyTests === 'object' && d.weeklyTests !== null;
}

/** Điền các trường mới cho dữ liệu cũ (ví dụ chưa có `game`). */
export function normalizeData(d: AppData): AppData {
  return { ...emptyData(), ...d, game: { ...emptyGame(), ...(d.game ?? {}) } };
}

export class LocalStorageStore implements DataStore {
  async load(): Promise<AppData> {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyData();
      const parsed: unknown = JSON.parse(raw);
      return isAppData(parsed) ? normalizeData(parsed) : emptyData();
    } catch {
      return emptyData();
    }
  }
  async save(data: AppData): Promise<void> {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* bộ nhớ đầy hoặc bị chặn: bỏ qua, giao diện vẫn chạy với dữ liệu trong phiên */
    }
  }
  async clear(): Promise<void> {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* bỏ qua */
    }
  }
}

export class MemoryStore implements DataStore {
  private data: AppData | null = null;
  async load(): Promise<AppData> { return this.data ?? emptyData(); }
  async save(d: AppData): Promise<void> { this.data = d; }
  async clear(): Promise<void> { this.data = null; }
}
