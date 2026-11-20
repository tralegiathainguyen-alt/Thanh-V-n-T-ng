import { GameState } from '../types/game';
import { createDefaultVipState, createInitialGameState } from './gameLogic';

export const LEGACY_SAVE_KEY = 'thanh_van_tien_tong_save_v1';
const ACCOUNTS_LS_KEY = 'tvtt_accounts_v2';
const SESSION_LS_KEY = 'tvtt_session_v2';
const SAVE_LS_PREFIX = 'tvtt_save_v2_';
const BACKUP_LS_PREFIX = 'tvtt_backups_v2_';

const IDB_NAME = 'ThanhVanTienTongDB';
const IDB_VERSION = 1;
const STORE_ACCOUNTS = 'accounts';
const STORE_SAVES = 'saves';
const STORE_BACKUPS = 'backups';

export interface UserAccount {
  username: string; // lowercase normalized key
  displayName: string;
  sectName: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
  lastLoginAt: number;
}

export interface StoredSaveRecord {
  username: string;
  state: GameState;
  savedAt: number;
  version: number;
  checksum: string;
}

export interface SaveSnapshot {
  id: string;
  username: string;
  savedAt: number;
  sectLevel: number;
  sectName: string;
  discipleCount: number;
  state: GameState;
}

export interface StorageHealth {
  indexedDbAvailable: boolean;
  localStorageAvailable: boolean;
  persistentGranted: boolean | null;
  cloudConfigured: boolean;
}

export interface BackupFilePayload {
  format: 'thanh_van_tien_tong_backup_v2';
  exportedAt: number;
  username: string;
  displayName: string;
  state: GameState;
  checksum: string;
}

// ---------------------------------------------------------------------------
// Hashing & Checksum helpers
// ---------------------------------------------------------------------------

function simpleHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function computeStateChecksum(state: GameState): string {
  try {
    return simpleHash(JSON.stringify(state));
  } catch {
    return '0';
  }
}

function generateSalt(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const payload = `tvtt::${salt}::${password}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const data = new TextEncoder().encode(payload);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback below
  }
  return `fb_${simpleHash(payload)}_${simpleHash(payload.split('').reverse().join(''))}`;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (u.length < 3 || u.length > 24) {
    return 'Tên tài khoản phải từ 3 đến 24 ký tự.';
  }
  if (!/^[a-z0-9_.-]+$/.test(u)) {
    return 'Tên tài khoản chỉ gồm chữ thường/số và ký tự _ . -';
  }
  return null;
}

// ---------------------------------------------------------------------------
// IndexedDB Layer
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_ACCOUNTS)) {
          db.createObjectStore(STORE_ACCOUNTS, { keyPath: 'username' });
        }
        if (!db.objectStoreNames.contains(STORE_SAVES)) {
          db.createObjectStore(STORE_SAVES, { keyPath: 'username' });
        }
        if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
          const store = db.createObjectStore(STORE_BACKUPS, { keyPath: 'id' });
          store.createIndex('by_username', 'username', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

async function idbGet<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function idbPut<T>(storeName: string, value: T): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbDelete(storeName: string, key: IDBValidKey): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// ---------------------------------------------------------------------------
// State Sanitization & Legacy Migration
// ---------------------------------------------------------------------------

export function hydrateGameState(raw: Partial<GameState> | null | undefined, fallbackSectName?: string): GameState {
  if (!raw || !raw.disciples || !raw.buildings || !raw.resources) {
    const fresh = createInitialGameState();
    if (fallbackSectName && fallbackSectName.trim()) {
      fresh.sectName = fallbackSectName.trim();
    }
    return fresh;
  }
  const now = Date.now();
  const offlineSec = Math.max(0, Math.floor((now - (raw.lastActiveAt || now)) / 1000));
  return {
    ...(raw as GameState),
    vip: {
      ...createDefaultVipState(),
      ...(raw.vip || {}),
    },
    lastActiveAt: now,
    pendingOfflineSeconds: Math.min(12 * 3600, (raw.pendingOfflineSeconds || 0) + offlineSec),
  };
}

export function hasLegacySave(): boolean {
  try {
    const raw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return Boolean(parsed && parsed.disciples && parsed.buildings);
  } catch {
    return false;
  }
}

export function readLegacySave(): GameState | null {
  try {
    const raw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (!parsed || !parsed.disciples || !parsed.buildings) return null;
    return hydrateGameState(parsed);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Optional Supabase Cloud Sync (auto-enabled when env vars are provided)
// ---------------------------------------------------------------------------

function getCloudConfig(): { url: string; anonKey: string } | null {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const url = env?.VITE_SUPABASE_URL?.trim();
  const anonKey = env?.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ''), anonKey };
}

export function isCloudSyncConfigured(): boolean {
  return getCloudConfig() !== null;
}

export async function pushSaveToCloud(record: StoredSaveRecord): Promise<boolean> {
  const cfg = getCloudConfig();
  if (!cfg) return false;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/tvtt_saves`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        username: record.username,
        state: record.state,
        saved_at: record.savedAt,
        checksum: record.checksum,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pullSaveFromCloud(username: string): Promise<StoredSaveRecord | null> {
  const cfg = getCloudConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/tvtt_saves?username=eq.${encodeURIComponent(username)}&select=username,state,saved_at,checksum`,
      {
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${cfg.anonKey}`,
        },
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      username: string;
      state: GameState;
      saved_at: number;
      checksum: string;
    }>;
    if (!rows || rows.length === 0) return null;
    const row = rows[0];
    return {
      username: row.username,
      state: row.state,
      savedAt: row.saved_at,
      version: 2,
      checksum: row.checksum,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Account Management (Dual-stored in IndexedDB + localStorage)
// ---------------------------------------------------------------------------

function readAccountsFromLS(): Record<string, UserAccount> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, UserAccount>;
  } catch {
    return {};
  }
}

function writeAccountsToLS(map: Record<string, UserAccount>): void {
  try {
    localStorage.setItem(ACCOUNTS_LS_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota errors
  }
}

export async function listAccounts(): Promise<UserAccount[]> {
  const map: Record<string, UserAccount> = { ...readAccountsFromLS() };
  const idbList = await idbGetAll<UserAccount>(STORE_ACCOUNTS);
  for (const acc of idbList) {
    const existing = map[acc.username];
    if (!existing || acc.lastLoginAt >= existing.lastLoginAt) {
      map[acc.username] = acc;
    }
  }
  return Object.values(map).sort((a, b) => b.lastLoginAt - a.lastLoginAt);
}

async function saveAccountRecord(account: UserAccount): Promise<void> {
  const map = readAccountsFromLS();
  map[account.username] = account;
  writeAccountsToLS(map);
  await idbPut(STORE_ACCOUNTS, account);
}

export async function registerAccount(params: {
  username: string;
  password: string;
  sectName?: string;
  inheritLegacy?: boolean;
}): Promise<{ ok: true; account: UserAccount; state: GameState } | { ok: false; error: string }> {
  const err = validateUsername(params.username);
  if (err) return { ok: false, error: err };
  if (params.password.length < 4) {
    return { ok: false, error: 'Mật khẩu phải có ít nhất 4 ký tự.' };
  }

  const username = normalizeUsername(params.username);
  const existing = await listAccounts();
  if (existing.some((a) => a.username === username)) {
    return { ok: false, error: 'Tài khoản này đã tồn tại. Vui lòng chọn tên khác hoặc đăng nhập.' };
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(params.password, salt);
  const sectName = params.sectName?.trim() || 'Thanh Vân Tiên Tông';
  const now = Date.now();

  const account: UserAccount = {
    username,
    displayName: params.username.trim(),
    sectName,
    passwordHash,
    salt,
    createdAt: now,
    lastLoginAt: now,
  };

  let initialState: GameState;
  if (params.inheritLegacy && hasLegacySave()) {
    const legacy = readLegacySave();
    initialState = legacy ? { ...legacy, sectName: legacy.sectName || sectName } : createInitialGameState();
  } else {
    initialState = createInitialGameState();
    initialState.sectName = sectName;
  }

  await saveAccountRecord(account);
  await saveGameForUser(username, initialState, { createSnapshot: true });
  return { ok: true, account, state: initialState };
}

export async function loginAccount(params: {
  username: string;
  password: string;
}): Promise<{ ok: true; account: UserAccount; state: GameState } | { ok: false; error: string }> {
  const username = normalizeUsername(params.username);
  const accounts = await listAccounts();
  const account = accounts.find((a) => a.username === username);
  if (!account) {
    return { ok: false, error: 'Không tìm thấy tài khoản này trên thiết bị.' };
  }

  const hash = await hashPassword(params.password, account.salt);
  if (hash !== account.passwordHash) {
    return { ok: false, error: 'Mật khẩu không chính xác.' };
  }

  const updatedAccount: UserAccount = { ...account, lastLoginAt: Date.now() };
  await saveAccountRecord(updatedAccount);
  const state = await loadGameForUser(username, updatedAccount.sectName);
  return { ok: true, account: updatedAccount, state };
}

export async function changeAccountPassword(params: {
  username: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (params.newPassword.length < 4) {
    return { ok: false, error: 'Mật khẩu mới phải có ít nhất 4 ký tự.' };
  }
  const username = normalizeUsername(params.username);
  const accounts = await listAccounts();
  const account = accounts.find((a) => a.username === username);
  if (!account) return { ok: false, error: 'Không tìm thấy tài khoản.' };

  const currentHash = await hashPassword(params.currentPassword, account.salt);
  if (currentHash !== account.passwordHash) {
    return { ok: false, error: 'Mật khẩu hiện tại không đúng.' };
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(params.newPassword, newSalt);
  await saveAccountRecord({ ...account, salt: newSalt, passwordHash: newHash });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Session Persistence
// ---------------------------------------------------------------------------

export function saveActiveSession(username: string | null): void {
  try {
    if (!username) {
      localStorage.removeItem(SESSION_LS_KEY);
    } else {
      localStorage.setItem(SESSION_LS_KEY, JSON.stringify({ username: normalizeUsername(username), at: Date.now() }));
    }
  } catch {
    // Ignore
  }
}

export async function restoreActiveSession(): Promise<{ account: UserAccount; state: GameState } | null> {
  try {
    const raw = localStorage.getItem(SESSION_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { username?: string };
    if (!parsed.username) return null;
    const accounts = await listAccounts();
    const account = accounts.find((a) => a.username === parsed.username);
    if (!account) return null;
    const state = await loadGameForUser(account.username, account.sectName);
    return { account, state };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Durable Multi-Layer Save & Recovery (IndexedDB + localStorage + Snapshots)
// ---------------------------------------------------------------------------

function readSaveFromLS(username: string): StoredSaveRecord | null {
  try {
    const raw = localStorage.getItem(`${SAVE_LS_PREFIX}${username}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSaveRecord;
    if (!parsed || !parsed.state || !parsed.state.disciples) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSaveToLS(record: StoredSaveRecord): boolean {
  try {
    localStorage.setItem(`${SAVE_LS_PREFIX}${record.username}`, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function saveGameSyncMirror(username: string, state: GameState): StoredSaveRecord {
  const norm = normalizeUsername(username);
  const record: StoredSaveRecord = {
    username: norm,
    state,
    savedAt: Date.now(),
    version: 2,
    checksum: computeStateChecksum(state),
  };
  writeSaveToLS(record);
  return record;
}

export async function saveGameForUser(
  username: string,
  state: GameState,
  options?: { createSnapshot?: boolean; syncCloud?: boolean },
): Promise<{ savedAt: number; idbOk: boolean; lsOk: boolean; cloudOk: boolean }> {
  const norm = normalizeUsername(username);
  const record: StoredSaveRecord = {
    username: norm,
    state,
    savedAt: Date.now(),
    version: 2,
    checksum: computeStateChecksum(state),
  };

  const lsOk = writeSaveToLS(record);
  const idbOk = await idbPut(STORE_SAVES, record);

  if (options?.createSnapshot) {
    await createRollingSnapshot(norm, state, record.savedAt);
  }

  let cloudOk = false;
  if (options?.syncCloud && isCloudSyncConfigured()) {
    cloudOk = await pushSaveToCloud(record);
  }

  return { savedAt: record.savedAt, idbOk, lsOk, cloudOk };
}

export async function loadGameForUser(username: string, fallbackSectName?: string): Promise<GameState> {
  const norm = normalizeUsername(username);
  const candidates: StoredSaveRecord[] = [];

  const [idbRec, cloudRec] = await Promise.all([
    idbGet<StoredSaveRecord>(STORE_SAVES, norm),
    isCloudSyncConfigured() ? pullSaveFromCloud(norm) : Promise.resolve(null),
  ]);
  const lsRec = readSaveFromLS(norm);

  for (const rec of [idbRec, lsRec, cloudRec]) {
    if (rec && rec.state && rec.state.disciples && rec.state.buildings) {
      candidates.push(rec);
    }
  }

  // Pick the newest valid record (prefer matching checksum if timestamps tie)
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.savedAt - a.savedAt);
    const valid = candidates.find((c) => !c.checksum || c.checksum === computeStateChecksum(c.state)) || candidates[0];
    const hydrated = hydrateGameState(valid.state, fallbackSectName);
    // Heal both layers silently
    await saveGameForUser(norm, hydrated);
    return hydrated;
  }

  // Fallback: try latest rolling snapshot if primary saves were somehow wiped
  const snaps = await listSnapshots(norm);
  if (snaps.length > 0) {
    const hydrated = hydrateGameState(snaps[0].state, fallbackSectName);
    await saveGameForUser(norm, hydrated);
    return hydrated;
  }

  const fresh = createInitialGameState();
  if (fallbackSectName) fresh.sectName = fallbackSectName;
  return fresh;
}

// ---------------------------------------------------------------------------
// Rolling Snapshots (Keep latest 3 auto-backups per account)
// ---------------------------------------------------------------------------

async function createRollingSnapshot(username: string, state: GameState, savedAt: number): Promise<void> {
  const snapshot: SaveSnapshot = {
    id: `${username}_${savedAt}`,
    username,
    savedAt,
    sectLevel: state.sectLevel,
    sectName: state.sectName,
    discipleCount: state.disciples.length,
    state,
  };

  await idbPut(STORE_BACKUPS, snapshot);

  const all = await listSnapshots(username);
  const toDelete = all.slice(3);
  for (const old of toDelete) {
    await idbDelete(STORE_BACKUPS, old.id);
  }

  // Also keep latest 2 lightweight backups in localStorage if space allows
  try {
    const kept = all.slice(0, 2);
    localStorage.setItem(`${BACKUP_LS_PREFIX}${username}`, JSON.stringify(kept));
  } catch {
    // Ignore quota errors for secondary backup mirror
  }
}

export async function listSnapshots(username: string): Promise<SaveSnapshot[]> {
  const norm = normalizeUsername(username);
  const byId = new Map<string, SaveSnapshot>();

  const idbAll = await idbGetAll<SaveSnapshot>(STORE_BACKUPS);
  for (const snap of idbAll) {
    if (snap.username === norm && snap.state?.disciples) {
      byId.set(snap.id, snap);
    }
  }

  try {
    const raw = localStorage.getItem(`${BACKUP_LS_PREFIX}${norm}`);
    if (raw) {
      const lsSnaps = JSON.parse(raw) as SaveSnapshot[];
      for (const snap of lsSnaps) {
        if (snap.username === norm && snap.state?.disciples && !byId.has(snap.id)) {
          byId.set(snap.id, snap);
        }
      }
    }
  } catch {
    // Ignore
  }

  return Array.from(byId.values()).sort((a, b) => b.savedAt - a.savedAt);
}

// ---------------------------------------------------------------------------
// Export / Import Backup File & Code
// ---------------------------------------------------------------------------

export function buildBackupPayload(account: UserAccount, state: GameState): BackupFilePayload {
  return {
    format: 'thanh_van_tien_tong_backup_v2',
    exportedAt: Date.now(),
    username: account.username,
    displayName: account.displayName,
    state,
    checksum: computeStateChecksum(state),
  };
}

export function encodeBackupCode(account: UserAccount, state: GameState): string {
  const json = JSON.stringify(buildBackupPayload(account, state));
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `TVTT2:${btoa(binary)}`;
}

export function parseBackupData(rawText: string): { ok: true; payload: BackupFilePayload } | { ok: false; error: string } {
  try {
    const trimmed = rawText.trim();
    let jsonStr = trimmed;
    if (trimmed.startsWith('TVTT2:')) {
      const b64 = trimmed.slice(6).trim();
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      jsonStr = new TextDecoder().decode(bytes);
    }

    const parsed = JSON.parse(jsonStr) as Partial<BackupFilePayload> & Partial<GameState>;

    // Support both v2 backup format and raw GameState JSON
    if (parsed.format === 'thanh_van_tien_tong_backup_v2' && parsed.state?.disciples && parsed.state?.buildings) {
      return {
        ok: true,
        payload: parsed as BackupFilePayload,
      };
    }
    if (parsed.disciples && parsed.buildings && parsed.resources) {
      const state = hydrateGameState(parsed);
      return {
        ok: true,
        payload: {
          format: 'thanh_van_tien_tong_backup_v2',
          exportedAt: Date.now(),
          username: 'imported',
          displayName: state.sectName || 'Đạo Hữu',
          state,
          checksum: computeStateChecksum(state),
        },
      };
    }

    return { ok: false, error: 'File hoặc mã sao lưu không hợp lệ.' };
  } catch {
    return { ok: false, error: 'Không thể giải mã dữ liệu sao lưu. Vui lòng kiểm tra lại.' };
  }
}

export async function requestPersistentStorage(): Promise<StorageHealth> {
  const db = await openDB();
  let lsOk = false;
  try {
    const testKey = '__tvtt_ls_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    lsOk = true;
  } catch {
    lsOk = false;
  }

  let persistentGranted: boolean | null = null;
  try {
    if (navigator.storage?.persisted) {
      const already = await navigator.storage.persisted();
      if (already) {
        persistentGranted = true;
      } else if (navigator.storage.persist) {
        persistentGranted = await navigator.storage.persist();
      }
    }
  } catch {
    persistentGranted = null;
  }

  return {
    indexedDbAvailable: db !== null,
    localStorageAvailable: lsOk,
    persistentGranted,
    cloudConfigured: isCloudSyncConfigured(),
  };
}
