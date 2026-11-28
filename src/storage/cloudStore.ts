import type { AppData } from '../types';
import { emptyData } from '../state/reducer';
import { LocalStorageStore, isAppData, normalizeData, type DataStore } from './storage';

/**
 * Đồng bộ tiến độ qua tài khoản (chạy khi app được mở dưới dạng Artifact có tài khoản).
 * Mỗi người có kho riêng `data/users/<id>/` mà người khác không đọc được. Mở trên điện thoại,
 * máy tính bảng hay máy tính, miễn là đăng nhập cùng tài khoản, đều thấy cùng tiến độ.
 * Không có tài khoản/kho (mở tệp HTML trực tiếp) thì dùng bộ nhớ của thiết bị như bình thường.
 */

interface DocSnap { exists: boolean; data(): Record<string, unknown> | undefined; id: string }
interface DocRef { get(): Promise<DocSnap>; set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> }
interface ColRef { doc(id: string): DocRef; get(): Promise<{ docs: DocSnap[] }> }
interface Db { collection(path: string): ColRef }
interface UserNs { id(): Promise<string | null> }
interface ClaudeRuntime { use(name: string): Promise<unknown> }

const CHUNK = 300;
const AT_KEY = 'english-recovery-6:savedAt';
const pad = (n: number) => String(n).padStart(3, '0');

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(null); });
  });
}

export function createCloudStore(): DataStore | undefined {
  const rt = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!rt || typeof rt.use !== 'function') return undefined;
  return new CloudStore(rt);
}

class CloudStore implements DataStore {
  private local = new LocalStorageStore();
  private ctx: Promise<{ col: ColRef } | null> | null = null;
  private lastJson = new Map<string, string>();
  private queue: Promise<void> = Promise.resolve();

  constructor(private rt: ClaudeRuntime) {}

  private getCtx() {
    this.ctx ??= withTimeout((async () => {
      const db = (await this.rt.use('db')) as Db | null;
      const user = (await this.rt.use('user')) as UserNs | null;
      if (!db || !user) return null;
      const uid = await user.id();
      return uid ? { col: db.collection(`data/users/${uid}`) } : null;
    })(), 10_000);
    return this.ctx;
  }

  async load(): Promise<AppData> {
    const local = await this.local.load();
    const c = await this.getCtx();
    if (!c) return local;
    try {
      const snap = await withTimeout(c.col.get(), 10_000);
      if (!snap) return local;
      const progress = snap.docs.find((d) => d.id === 'progress')?.data();
      if (!progress || typeof progress.json !== 'string') return local; // chưa có gì trên đám mây: tải bản trên máy lên
      const cloudAt = Number(progress.savedAt ?? 0);
      const localAt = Number(localStorage.getItem(AT_KEY) ?? 0);
      // Bản minh họa không bao giờ ghi đè tiến độ thật; ngoài ra bản mới hơn thắng.
      if (!local.demo && localAt > cloudAt) return local;
      const base: unknown = JSON.parse(progress.json);
      const n = Number(progress.chunks ?? 0);
      const attempts: AppData['attempts'] = [];
      for (let i = 0; i < n; i++) {
        const j = snap.docs.find((d) => d.id === `att-${pad(i)}`)?.data()?.json;
        if (typeof j === 'string') attempts.push(...(JSON.parse(j) as AppData['attempts']));
      }
      const merged = { ...(base as object), attempts };
      return isAppData(merged) ? normalizeData(merged) : local;
    } catch {
      return local;
    }
  }

  save(data: AppData): Promise<void> {
    const at = Date.now();
    void this.local.save(data);
    if (!data.demo) { try { localStorage.setItem(AT_KEY, String(at)); } catch { /* bỏ qua */ } }
    if (data.demo) return Promise.resolve(); // không đẩy dữ liệu minh họa lên tài khoản
    // Xếp hàng để mỗi tài liệu chỉ có một lần ghi tại một thời điểm.
    const run = this.queue.then(() => this.push(data, at));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async push(data: AppData, at: number): Promise<void> {
    const c = await this.getCtx();
    if (!c) return;
    const chunks: AppData['attempts'][] = [];
    for (let i = 0; i < data.attempts.length; i += CHUNK) chunks.push(data.attempts.slice(i, i + CHUNK));
    const write = async (id: string, doc: Record<string, unknown>, key: string) => {
      if (this.lastJson.get(id) === key) return;
      await c.col.doc(id).set(doc);
      this.lastJson.set(id, key);
    };
    // Chỉ khối cuối thay đổi khi học tiếp nên mỗi lần chỉ ghi vài tài liệu nhỏ.
    for (let i = 0; i < chunks.length; i++) {
      const json = JSON.stringify(chunks[i]);
      await write(`att-${pad(i)}`, { json }, json);
    }
    const rest = JSON.stringify({ ...data, attempts: [] });
    await write('progress', { json: rest, chunks: chunks.length, savedAt: at }, `${rest}|${chunks.length}`);
  }

  async clear(): Promise<void> {
    await this.local.clear();
    try { localStorage.removeItem(AT_KEY); } catch { /* bỏ qua */ }
    const c = await this.getCtx();
    if (!c) return;
    this.lastJson.clear();
    // Ghi đè bằng dữ liệu trống để thiết bị khác cũng thấy đã xóa.
    await c.col.doc('progress').set({ json: JSON.stringify({ ...emptyData(), attempts: [] }), chunks: 0, savedAt: Date.now() });
  }
}

/**
 * Gửi số liệu đánh giá chất lượng (tổng hợp, ẩn danh) lên kho dùng chung `reports/<tháng>`
 * để người phát triển đọc và nâng cấp ứng dụng. Chỉ chạy khi có tài khoản; không gửi tên hay hồ sơ học sinh.
 */
export async function publishQualityReport(month: string, payload: unknown): Promise<'ok' | 'unavailable' | 'error'> {
  const rt = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!rt || typeof rt.use !== 'function') return 'unavailable';
  try {
    const db = await withTimeout(rt.use('db') as Promise<Db | null>, 10_000);
    if (!db) return 'unavailable';
    await db.collection('reports').doc(month).set({ json: JSON.stringify(payload), month, sentAt: Date.now() });
    return 'ok';
  } catch {
    return 'error';
  }
}
