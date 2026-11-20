import React, { useEffect, useRef, useState } from 'react';
import { GameState } from '../types/game';
import {
  UserAccount,
  hasLegacySave,
  hydrateGameState,
  listAccounts,
  loginAccount,
  parseBackupData,
  registerAccount,
  saveActiveSession,
  saveGameForUser,
} from '../utils/storage';
import { sfx } from '../utils/sound';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  LogIn,
  ShieldCheck,
  Sparkles,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';

interface AuthScreenProps {
  onAuthenticated: (account: UserAccount, state: GameState) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sectName, setSectName] = useState('Thanh Vân Tiên Tông');
  const [rememberMe, setRememberMe] = useState(true);
  const [inheritLegacy, setInheritLegacy] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [legacyDetected, setLegacyDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLegacyDetected(hasLegacySave());
    listAccounts().then((list) => {
      setAccounts(list);
      if (list.length === 0) {
        setMode('register');
      } else {
        setUsername(list[0].username);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    sfx.click();

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Mật khẩu xác nhận không khớp.');
          return;
        }
        const res = await registerAccount({
          username,
          password,
          sectName,
          inheritLegacy: legacyDetected && inheritLegacy,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        saveActiveSession(rememberMe ? res.account.username : null);
        sfx.upgrade();
        onAuthenticated(res.account, res.state);
      } else {
        const res = await loginAccount({ username, password });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        saveActiveSession(rememberMe ? res.account.username : null);
        sfx.harvest();
        onAuthenticated(res.account, res.state);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setInfo(null);

    try {
      const text = await file.text();
      const parsed = parseBackupData(text);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }

      const payload = parsed.payload;
      const importedState = hydrateGameState(payload.state);
      const existingAccounts = await listAccounts();
      const targetUser = payload.username && payload.username !== 'imported' ? payload.username : '';

      const existing = existingAccounts.find((a) => a.username === targetUser);
      if (existing) {
        await saveGameForUser(existing.username, importedState, { createSnapshot: true });
        setUsername(existing.username);
        setMode('login');
        setInfo(
          `Đã khôi phục dữ liệu cho tài khoản "${existing.displayName}" (Tông Môn Cấp ${importedState.sectLevel}). Nhập mật khẩu để vào game!`,
        );
        sfx.harvest();
        return;
      }

      // If account doesn't exist yet on this browser, pre-fill register form and store imported save in legacy slot temporarily
      const suggestedUsername =
        targetUser && /^[a-z0-9_.-]{3,24}$/.test(targetUser) ? targetUser : 'daohuu_backup';
      setMode('register');
      setUsername(suggestedUsername);
      setSectName(importedState.sectName || 'Thanh Vân Tiên Tông');

      // Store into legacy key so registering immediately inherits this restored state
      try {
        localStorage.setItem('thanh_van_tien_tong_save_v1', JSON.stringify(importedState));
        setLegacyDetected(true);
        setInheritLegacy(true);
      } catch {
        // Ignore
      }
      setInfo(
        `Đã đọc bản sao lưu "${importedState.sectName}" (Cấp ${importedState.sectLevel}, ${importedState.disciples.length} đệ tử). Đặt mật khẩu và bấm "Tạo Tài Khoản" để khôi phục ngay!`,
      );
      sfx.harvest();
    } catch {
      setError('Không thể đọc file sao lưu.');
    }
  };

  return (
    <div className="relative h-full w-full overflow-y-auto bg-[#0E1C1B] flex items-center justify-center p-3 sm:p-4">
      {/* Scenic Xianxia Backdrop */}
      <img
        src="./assets/aistudio/1_80f8120e.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-45 scale-105 blur-[2px] select-none pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C1918]/85 via-[#102422]/65 to-[#091413]/92 pointer-events-none" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[460px]">
        {/* Header Title */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#162D2A]/90 border border-[#D4A24C]/60 text-[#F5D687] text-[11px] font-semibold tracking-wider uppercase mb-2 shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            Tu Tiên Tông Môn · Lưu Trữ Đa Lớp
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#FCE6A6] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] tracking-wide"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Thanh Vân Tiên Tông
          </h1>
          <p className="text-xs sm:text-sm text-[#C7DDD2] mt-1">
            Đăng nhập để bảo toàn đạo quả &amp; tiếp tục hành trình tu tiên
          </p>
        </div>

        {/* Parchment Scroll Form Container */}
        <div className="scroll-parchment px-5 py-4 sm:px-7 sm:py-5 text-[#24211C]">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#E4D7BE] border border-[#C6AF83] mb-4">
            <button
              type="button"
              onClick={() => {
                sfx.click();
                setMode('login');
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#1D3B37] text-[#FCE6A6] shadow-md'
                  : 'text-[#5A4830] hover:bg-[#D9C8A9]/60'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.click();
                setMode('register');
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#1D3B37] text-[#FCE6A6] shadow-md'
                  : 'text-[#5A4830] hover:bg-[#D9C8A9]/60'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Đăng Ký Mới
            </button>
          </div>

          {/* Quick Account Switcher (on Login tab if accounts exist) */}
          {mode === 'login' && accounts.length > 0 && (
            <div className="mb-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B5434] uppercase tracking-wide mb-1.5">
                <Users className="w-3.5 h-3.5" />
                Tài khoản đã lưu trên máy ({accounts.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((acc) => {
                  const selected = acc.username === username.trim().toLowerCase();
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => {
                        sfx.click();
                        setUsername(acc.username);
                        setError(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#1D3B37] border-[#B8893A] text-[#FCE6A6]'
                          : 'bg-[#FBF6EA] border-[#D4C09B] text-[#4A3B23] hover:bg-[#F0E4CC]'
                      }`}
                    >
                      {acc.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legacy Save Notice */}
          {mode === 'register' && legacyDetected && (
            <label className="flex items-start gap-2 p-2.5 mb-3.5 rounded-lg bg-[#FEF6DF] border border-[#D4A24C] text-xs text-[#5B3E0F] cursor-pointer">
              <input
                type="checkbox"
                checked={inheritLegacy}
                onChange={(e) => setInheritLegacy(e.target.checked)}
                className="mt-0.5 accent-[#1D3B37]"
              />
              <span>
                <strong className="block text-[#7A4E0B]">Phát hiện dữ liệu tu luyện cũ trên trình duyệt!</strong>
                Tích chọn để tự động kế thừa toàn bộ tông môn, đệ tử và trang bị cũ vào tài khoản mới.
              </span>
            </label>
          )}

          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-[#FEECEC] border border-[#D66A6A] text-xs font-semibold text-[#8E2020]">
              {error}
            </div>
          )}

          {info && (
            <div className="mb-3 p-2.5 rounded-lg bg-[#E6F6EE] border border-[#4EA578] text-xs font-semibold text-[#165C39] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#4A3B23] mb-1">
                Tên Tài Khoản (Đạo Danh)
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="VD: thanhvan_01"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FCF9F1] border border-[#C6AF83] text-sm text-[#24211C] focus:outline-none focus:border-[#1D3B37] focus:ring-2 focus:ring-[#1D3B37]/20"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-[#4A3B23] mb-1">
                  Tên Tông Môn
                </label>
                <input
                  type="text"
                  maxLength={32}
                  placeholder="Thanh Vân Tiên Tông"
                  value={sectName}
                  onChange={(e) => setSectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FCF9F1] border border-[#C6AF83] text-sm text-[#24211C] focus:outline-none focus:border-[#1D3B37] focus:ring-2 focus:ring-[#1D3B37]/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#4A3B23] mb-1">Mật Khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="Tối thiểu 4 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-[#FCF9F1] border border-[#C6AF83] text-sm text-[#24211C] focus:outline-none focus:border-[#1D3B37] focus:ring-2 focus:ring-[#1D3B37]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A6648] hover:text-[#24211C] cursor-pointer"
                  aria-label="Hiện/Ẩn mật khẩu"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-[#4A3B23] mb-1">
                  Xác Nhận Mật Khẩu
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FCF9F1] border border-[#C6AF83] text-sm text-[#24211C] focus:outline-none focus:border-[#1D3B37] focus:ring-2 focus:ring-[#1D3B37]/20"
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-xs text-[#5A4830] cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-[#1D3B37]"
              />
              Ghi nhớ đăng nhập trên trình duyệt này
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-b from-[#234B46] to-[#15312E] hover:from-[#2B5B55] hover:to-[#1B3E3A] border border-[#D4A24C] text-[#FCE6A6] font-bold text-sm shadow-lg transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {submitting
                ? 'Đang xử lý...'
                : mode === 'login'
                  ? 'Nhập Sơn Môn (Đăng Nhập)'
                  : 'Khai Tông Lập Phái (Đăng Ký)'}
            </button>
          </form>

          {/* Backup Restore & Storage Info Footer */}
          <div className="mt-4 pt-3 border-t border-[#D6C39E] space-y-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportBackupFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 rounded-lg bg-[#EFE4CC] hover:bg-[#E6D6B4] border border-[#C4A876] text-xs font-bold text-[#4A3B23] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Khôi Phục Dữ Liệu Từ File Sao Lưu (.json)
            </button>

            <div className="flex items-center justify-center gap-3 text-[11px] text-[#6B5434]">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1F7A53]" />
                Lưu kép IndexedDB + LocalStorage
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-[#8A5A0F]" />
                3 bản tự động sao lưu
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
