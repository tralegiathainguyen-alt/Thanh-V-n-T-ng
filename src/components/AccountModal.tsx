import React, { useEffect, useRef, useState } from 'react';
import { GameState } from '../types/game';
import {
  SaveSnapshot,
  StorageHealth,
  UserAccount,
  buildBackupPayload,
  changeAccountPassword,
  encodeBackupCode,
  hydrateGameState,
  listSnapshots,
  parseBackupData,
  requestPersistentStorage,
} from '../utils/storage';
import { sfx } from '../utils/sound';
import {
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  HardDrive,
  History,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  Upload,
  User,
  X,
} from 'lucide-react';

interface AccountModalProps {
  account: UserAccount;
  state: GameState;
  lastSavedAt: number | null;
  onClose: () => void;
  onManualSave: () => Promise<void>;
  onRestoreState: (restored: GameState, sourceLabel: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

function formatTime(ts: number | null): string {
  if (!ts) return 'Chưa lưu';
  return new Date(ts).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const AccountModal: React.FC<AccountModalProps> = ({
  account,
  state,
  lastSavedAt,
  onClose,
  onManualSave,
  onRestoreState,
  onLogout,
}) => {
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [snapshots, setSnapshots] = useState<SaveSnapshot[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [importCode, setImportCode] = useState('');
  const [showCodeImport, setShowCodeImport] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshData = async () => {
    const [h, snaps] = await Promise.all([
      requestPersistentStorage(),
      listSnapshots(account.username),
    ]);
    setHealth(h);
    setSnapshots(snaps);
  };

  useEffect(() => {
    refreshData();
  }, [account.username]);

  const handleSaveNow = async () => {
    setSaving(true);
    setStatusMsg(null);
    sfx.click();
    try {
      await onManualSave();
      await refreshData();
      setStatusMsg({ type: 'ok', text: 'Đã lưu kép vào IndexedDB + LocalStorage và tạo bản sao lưu mới!' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadJson = () => {
    sfx.harvest();
    const payload = buildBackupPayload(account, state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateTag = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thanh-van-tien-tong_${account.username}_${dateTag}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg({ type: 'ok', text: 'Đã tải file sao lưu (.json) về máy!' });
  };

  const handleCopyCode = async () => {
    sfx.click();
    try {
      const code = encodeBackupCode(account, state);
      await navigator.clipboard.writeText(code);
      setStatusMsg({ type: 'ok', text: 'Đã sao chép Mã Sao Lưu vào bộ nhớ tạm!' });
    } catch {
      setStatusMsg({ type: 'err', text: 'Trình duyệt không cho sao chép tự động. Hãy dùng nút Xuất File .json.' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const parsed = parseBackupData(text);
    if (!parsed.ok) {
      setStatusMsg({ type: 'err', text: parsed.error });
      return;
    }
    const hydrated = hydrateGameState(parsed.payload.state, account.sectName);
    await onRestoreState(hydrated, `file ${file.name}`);
    await refreshData();
    setStatusMsg({ type: 'ok', text: `Đã khôi phục thành công dữ liệu từ ${file.name}!` });
  };

  const handleImportCodeSubmit = async () => {
    if (!importCode.trim()) return;
    const parsed = parseBackupData(importCode);
    if (!parsed.ok) {
      setStatusMsg({ type: 'err', text: parsed.error });
      return;
    }
    const hydrated = hydrateGameState(parsed.payload.state, account.sectName);
    await onRestoreState(hydrated, 'Mã Sao Lưu');
    setImportCode('');
    setShowCodeImport(false);
    await refreshData();
    setStatusMsg({ type: 'ok', text: 'Đã khôi phục dữ liệu từ Mã Sao Lưu!' });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await changeAccountPassword({
      username: account.username,
      currentPassword: currentPw,
      newPassword: newPw,
    });
    if (!res.ok) {
      setStatusMsg({ type: 'err', text: res.error });
      return;
    }
    setCurrentPw('');
    setNewPw('');
    setShowPasswordForm(false);
    sfx.upgrade();
    setStatusMsg({ type: 'ok', text: 'Đổi mật khẩu thành công!' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4">
      <div className="scroll-parchment w-full max-w-xl max-h-[92%] flex flex-col text-[#24211C] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D2BE98]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#1D3B37] border-2 border-[#D4A24C] flex items-center justify-center text-[#FCE6A6] shadow">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-lg sm:text-xl font-bold text-[#2E2212] leading-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Tài Khoản &amp; Bảo Toàn Dữ Liệu
              </h2>
              <div className="text-xs text-[#6B5434] flex items-center gap-2">
                <span>
                  Đạo danh: <strong className="text-[#1D3B37]">{account.displayName}</strong>
                </span>
                <span>·</span>
                <span>Lưu gần nhất: {formatTime(lastSavedAt)}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.click();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#E5D7BA] hover:bg-[#D7C49E] text-[#4A3B23] flex items-center justify-center cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-4 pr-1">
          {statusMsg && (
            <div
              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                statusMsg.type === 'ok'
                  ? 'bg-[#E6F6EE] border-[#4EA578] text-[#165C39]'
                  : 'bg-[#FEECEC] border-[#D66A6A] text-[#8E2020]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Storage Health Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-[#F9F3E5] border border-[#D8C5A0] text-center">
              <HardDrive className="w-4 h-4 mx-auto text-[#1F7A53] mb-0.5" />
              <div className="text-[10px] text-[#6B5434]">IndexedDB</div>
              <div className="text-xs font-bold text-[#1F7A53]">
                {health?.indexedDbAvailable ? 'Hoạt động' : 'Dự phòng'}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#F9F3E5] border border-[#D8C5A0] text-center">
              <ShieldCheck className="w-4 h-4 mx-auto text-[#1F7A53] mb-0.5" />
              <div className="text-[10px] text-[#6B5434]">LocalStorage</div>
              <div className="text-xs font-bold text-[#1F7A53]">
                {health?.localStorageAvailable ? 'Đồng bộ kép' : 'Tắt'}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#F9F3E5] border border-[#D8C5A0] text-center">
              <Save className="w-4 h-4 mx-auto text-[#8A5A0F] mb-0.5" />
              <div className="text-[10px] text-[#6B5434]">Chống Xóa</div>
              <div className="text-xs font-bold text-[#6E450A]">
                {health?.persistentGranted ? 'Đã khóa bền' : 'Tiêu chuẩn'}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#F9F3E5] border border-[#D8C5A0] text-center">
              <Cloud className="w-4 h-4 mx-auto text-[#3B6D8C] mb-0.5" />
              <div className="text-[10px] text-[#6B5434]">Cloud Sync</div>
              <div className="text-xs font-bold text-[#3B6D8C]">
                {health?.cloudConfigured ? 'Supabase Bật' : 'Sẵn sàng'}
              </div>
            </div>
          </div>

          {/* Primary Save & Backup Actions */}
          <div className="p-3 rounded-xl bg-[#FBF6EA] border border-[#D8C5A0] space-y-2.5">
            <div className="text-xs font-bold text-[#4A3B23] uppercase tracking-wide">
              Sao Lưu &amp; Chuyển Thiết Bị
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveNow}
                disabled={saving}
                className="py-2 px-3 rounded-lg bg-[#1D3B37] hover:bg-[#264E49] border border-[#D4A24C] text-[#FCE6A6] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Đang lưu...' : 'Lưu Ngay & Tạo Snapshot'}
              </button>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="py-2 px-3 rounded-lg bg-[#7A4E0B] hover:bg-[#915E10] text-[#FFF7DC] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Xuất File Sao Lưu (.json)
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 rounded-lg bg-[#EFE4CC] hover:bg-[#E4D3B0] border border-[#C4A876] text-[#3F311D] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Nhập File Sao Lưu (.json)
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="py-2 px-3 rounded-lg bg-[#EFE4CC] hover:bg-[#E4D3B0] border border-[#C4A876] text-[#3F311D] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Sao Chép Mã Sao Lưu
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => setShowCodeImport((v) => !v)}
              className="text-xs font-semibold text-[#1D3B37] underline cursor-pointer"
            >
              {showCodeImport ? 'Ẩn ô dán Mã Sao Lưu' : 'Hoặc dán Mã Sao Lưu (TVTT2:...) để khôi phục'}
            </button>

            {showCodeImport && (
              <div className="space-y-2 pt-1">
                <textarea
                  rows={3}
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  placeholder="Dán chuỗi TVTT2:... vào đây"
                  className="w-full p-2 rounded-lg bg-white border border-[#C6AF83] text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleImportCodeSubmit}
                  className="px-3 py-1.5 rounded-lg bg-[#1D3B37] text-[#FCE6A6] text-xs font-bold cursor-pointer"
                >
                  Khôi Phục Từ Mã
                </button>
              </div>
            )}
          </div>

          {/* Rolling Auto-Snapshots */}
          <div className="p-3 rounded-xl bg-[#FBF6EA] border border-[#D8C5A0] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#4A3B23] uppercase tracking-wide">
              <History className="w-3.5 h-3.5" />
              Bản Sao Lưu Tự Động Gần Đây ({snapshots.length}/3)
            </div>
            {snapshots.length === 0 ? (
              <p className="text-xs text-[#7A6648]">
                Chưa có bản snapshot nào. Bấm &quot;Lưu Ngay &amp; Tạo Snapshot&quot; để tạo mốc khôi phục đầu tiên.
              </p>
            ) : (
              <div className="space-y-1.5">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F3E9D4] border border-[#D8C5A0] text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#2E2212]">
                        {snap.sectName} · Cấp {snap.sectLevel} ({snap.discipleCount} đệ tử)
                      </div>
                      <div className="text-[11px] text-[#6B5434]">{formatTime(snap.savedAt)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        sfx.click();
                        const hydrated = hydrateGameState(snap.state, account.sectName);
                        await onRestoreState(hydrated, `Snapshot ${formatTime(snap.savedAt)}`);
                        setStatusMsg({ type: 'ok', text: 'Đã khôi phục về mốc sao lưu đã chọn!' });
                      }}
                      className="px-2.5 py-1 rounded-md bg-[#1D3B37] hover:bg-[#274F4A] text-[#FCE6A6] font-semibold text-[11px] cursor-pointer shrink-0"
                    >
                      Khôi phục
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Password Change & Logout */}
          <div className="p-3 rounded-xl bg-[#FBF6EA] border border-[#D8C5A0] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowPasswordForm((v) => !v)}
                className="px-3 py-1.5 rounded-lg bg-[#EFE4CC] hover:bg-[#E4D3B0] border border-[#C4A876] text-xs font-bold text-[#3F311D] flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Đổi Mật Khẩu
              </button>
              <button
                type="button"
                onClick={async () => {
                  sfx.click();
                  await onLogout();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#8E2424] hover:bg-[#A62B2B] text-[#FFF3F3] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Lưu &amp; Đăng Xuất
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <input
                  type="password"
                  required
                  placeholder="Mật khẩu hiện tại"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-[#C6AF83] text-xs"
                />
                <input
                  type="password"
                  required
                  placeholder="Mật khẩu mới (≥4 ký tự)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-[#C6AF83] text-xs"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 py-1.5 rounded-lg bg-[#1D3B37] text-[#FCE6A6] text-xs font-bold cursor-pointer"
                >
                  Xác Nhận Đổi Mật Khẩu
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
