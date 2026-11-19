const DB_NAME = 'fjv';
const STORE = 'recent';
const MAX_RECENT = 10;
const POLL_MS = 1000;

const FEATURE_FILE = 'feature.json';
const PICKER_ID = 'feature-json';

export const canWatch = typeof window.showOpenFilePicker === 'function';

async function cancellable(open) {
   try {
      return await open();
   } catch (e) {
      if (e.name === 'AbortError') return null;
      throw e;
   }
}

export function pickFile() {
   return cancellable(async () => {
      const [handle] = await window.showOpenFilePicker({
         id: PICKER_ID,
         types: [{ description: 'feature.json', accept: { 'application/json': ['.json'] } }],
      });
      return { handle };
   });
}

export function pickFolder() {
   return cancellable(async () => resolveHandle(await window.showDirectoryPicker({ id: PICKER_ID, mode: 'read' })));
}

async function resolveHandle(handle) {
   if (handle.kind === 'file') return { handle };
   try {
      return { handle: await handle.getFileHandle(FEATURE_FILE), folder: handle.name };
   } catch (e) {
      if (e.name === 'NotFoundError' || e.name === 'TypeMismatchError') throw new Error(`the folder "${handle.name}" has no ${FEATURE_FILE}`);
      throw e;
   }
}

function fromItem(item) {
   const file = item.getAsFile();
   const fallback = file ? { file } : null;
   if (typeof item.getAsFileSystemHandle !== 'function') return Promise.resolve(fallback);
   return item
      .getAsFileSystemHandle()
      .catch(() => null)
      .then((handle) => (handle ? resolveHandle(handle) : fallback));
}

const fileItem = (data) => [...(data?.items ?? [])].find((i) => i.kind === 'file');

export function takeDrop(dataTransfer) {
   const item = fileItem(dataTransfer);
   if (item) return fromItem(item);
   const file = dataTransfer?.files?.[0];
   return Promise.resolve(file ? { file } : null);
}

export function takePaste(clipboard) {
   const item = fileItem(clipboard);
   if (item) return fromItem(item);
   const raw = clipboard?.getData('text/plain')?.trim() ?? '';
   if (!raw) return Promise.resolve(null);
   if (/^[[{]/.test(raw)) return Promise.resolve({ text: raw });
   const path = normalizePath(raw);
   return Promise.resolve(path ? { path, raw } : { unknown: raw });
}

export function normalizePath(text) {
   if (/[\r\n]/.test(text)) return null;
   let p = text.trim();
   if (/^(['"]).+\1$/.test(p)) p = p.slice(1, -1);
   if (p.startsWith('file://')) {
      try {
         p = decodeURIComponent(new URL(p).pathname);
      } catch {
         return null;
      }
   }
   if (/^[A-Za-z]:[\\/]/.test(p)) return p;
   if (!/^(\/|~\/)/.test(p)) return null;
   return p.replace(/\\(.)/g, '$1');
}

export function isFolderPath(path) {
   const last = path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? '';
   return /[\\/]$/.test(path) || !/\.[A-Za-z0-9]{1,8}$/.test(last);
}

export class Watcher {
   constructor({ onText, onError, onAlive }) {
      this.onText = onText;
      this.onError = onError;
      this.onAlive = onAlive;
      this.gen = 0;
      this.handle = null;
      this.busy = false;
   }

   watch(handle) {
      this.stop();
      this.handle = handle;
      this.signature = null;
      return this.tick(this.gen);
   }

   stop() {
      this.gen++;
      this.handle = null;
      this.busy = false;
      clearTimeout(this.timer);
   }

   poke() {
      if (this.handle) this.tick(this.gen);
   }

   async tick(gen) {
      if (gen !== this.gen || this.busy) return;
      clearTimeout(this.timer);
      this.busy = true;
      try {
         await this.check(gen);
         if (gen === this.gen) this.onAlive();
      } catch (e) {
         if (gen === this.gen) this.onError(e);
      } finally {
         if (gen === this.gen) this.busy = false;
      }
      if (gen === this.gen) this.timer = setTimeout(() => this.tick(gen), POLL_MS);
   }

   async check(gen) {
      const file = await this.handle.getFile();
      const signature = `${file.lastModified}:${file.size}`;
      if (gen !== this.gen || signature === this.signature) return;
      const text = await file.text();
      if (gen !== this.gen) return;
      this.signature = signature;
      this.onText(text, { name: file.name, modified: file.lastModified });
   }
}

export async function ensurePermission(handle, ask) {
   const opts = { mode: 'read' };
   if ((await handle.queryPermission?.(opts)) === 'granted') return true;
   if (!ask || !handle.requestPermission) return false;
   return (await handle.requestPermission(opts)) === 'granted';
}

let dbPromise = null;

function openDb() {
   dbPromise ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
   });
   return dbPromise;
}

async function transaction(mode, fn) {
   const db = await openDb();
   return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const result = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(result?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
   });
}

export async function listRecent() {
   if (!canWatch) return [];
   try {
      const all = await transaction('readonly', (store) => store.getAll());
      return (all ?? []).sort((a, b) => b.openedAt - a.openedAt);
   } catch {
      return [];
   }
}

export async function rememberRecent(handle, meta) {
   try {
      const all = await listRecent();
      let id = null;
      for (const r of all) {
         if (await r.handle.isSameEntry(handle).catch(() => false)) {
            id = r.id;
            break;
         }
      }
      const entry = { ...meta, id: id ?? crypto.randomUUID(), handle, openedAt: Date.now() };
      const stale = all.filter((r) => r.id !== entry.id).slice(MAX_RECENT - 1);
      await transaction('readwrite', (store) => {
         store.put(entry);
         for (const r of stale) store.delete(r.id);
      });
      return entry.id;
   } catch {
      return null;
   }
}

export async function forgetRecent(id) {
   try {
      await transaction('readwrite', (store) => store.delete(id));
   } catch {
      return;
   }
}
