import React from 'react';
import { GameState } from '../types/game';
import { calculateOfflineRewards, formatNum, getBuildingProductionPerMin } from '../utils/gameLogic';
import { ScrollModalShell } from './ElementIcons';
import { Clock, FastForward, Gift, Sparkles } from 'lucide-react';

interface OfflineIdleModalProps {
  state: GameState;
  mode: 'offline' | 'gifts';
  onClose: () => void;
  onClaimOffline: () => void;
  onSimulateOfflineBoost: () => void;
  onClaimDailyGift: () => void;
}

function formatDuration(sec: number): string {
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (hrs > 0) return `${hrs} giờ ${mins} phút`;
  if (mins > 0) return `${mins} phút ${s} giây`;
  return `${s} giây`;
}

export function OfflineIdleModal({
  state,
  mode,
  onClose,
  onClaimOffline,
  onSimulateOfflineBoost,
  onClaimDailyGift,
}: OfflineIdleModalProps) {
  const rewards = calculateOfflineRewards(state, state.pendingOfflineSeconds);
  const hasRewards = state.pendingOfflineSeconds >= 30;

  if (mode === 'gifts') {
    return (
      <ScrollModalShell
        title="Phúc Lợi Tông Môn & Quà Đăng Nhập"
        subtitle="Nhận tiếp tế hằng ngày từ Tiên Minh để đẩy nhanh tiến độ tu luyện"
        onClose={onClose}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-[#F5EFE0] border-2 border-[#C9A45C] text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#D4A24C]/25 text-[#9A6914] flex items-center justify-center">
              <Gift className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#1E3331]" style={{ fontFamily: 'var(--font-display)' }}>
              Tiên Tông Tiếp Tế Hằng Ngày
            </h3>
            <p className="text-xs text-[#5E5444]">
              Bao gồm: <strong>+2.000 Linh Thạch</strong> · <strong>+120 Tiên Ngọc</strong> · <strong>+3 Đột Phá Đan</strong> ·{' '}
              <strong>+25 Cường Hóa Thạch</strong> · <strong>+1 Trang Bị Sử Thi/Huyền Thoại</strong>!
            </p>
            <button
              disabled={state.dailyGiftClaimed}
              onClick={onClaimDailyGift}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm ${
                state.dailyGiftClaimed
                  ? 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
                  : 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer'
              }`}
            >
              {state.dailyGiftClaimed ? 'Đã Nhận Quà Hôm Nay' : 'Nhận Quà Ngay'}
            </button>
          </div>
        </div>
      </ScrollModalShell>
    );
  }

  return (
    <ScrollModalShell
      title="Treo Máy Offline · Tu Luyện Tự Động"
      subtitle="Tông môn và Linh Mạch vẫn tự động tích lũy tài nguyên ngay cả khi bạn thoát game (tối đa 12 giờ)"
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-[#1E3B38] text-[#F6EBD0] border border-[#C9A45C] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="w-7 h-7 text-[#F5D687]" />
            <div>
              <div className="text-xs text-[#C1D7CD]">Thời gian tích lũy treo máy</div>
              <div className="text-xl font-mono font-bold text-[#FCE7A7]">
                {formatDuration(rewards.effectiveSeconds)}
              </div>
            </div>
          </div>

          <button
            onClick={onSimulateOfflineBoost}
            className="px-3.5 py-2 rounded-lg bg-[#D4A24C] hover:bg-[#E5B864] text-[#1D150A] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FastForward className="w-4 h-4" />
            Tăng Tốc Tu Luyện (+2 Giờ)
          </button>
        </div>

        {/* Production Rate Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums">
          <div className="p-2.5 rounded-lg bg-[#EAE1CD] border border-[#D4C39F]">
            <div className="font-sans text-[11px] text-[#6B5F4C]">Linh Thạch / phút</div>
            <div className="font-bold text-[#8A5A0F]">+{getBuildingProductionPerMin(state, 'chinh_dien')}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#EAE1CD] border border-[#D4C39F]">
            <div className="font-sans text-[11px] text-[#6B5F4C]">Linh Khí / phút</div>
            <div className="font-bold text-[#1D5E8C]">+{getBuildingProductionPerMin(state, 'tu_linh_tran')}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#EAE1CD] border border-[#D4C39F]">
            <div className="font-sans text-[11px] text-[#6B5F4C]">Linh Thảo / phút</div>
            <div className="font-bold text-[#257A52]">+{getBuildingProductionPerMin(state, 'duoc_dien')}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#EAE1CD] border border-[#D4C39F]">
            <div className="font-sans text-[11px] text-[#6B5F4C]">Thưởng Bí Cảnh</div>
            <div className="font-bold text-[#7B4EA3]">+{state.clearedRealms.length * 25}%</div>
          </div>
        </div>

        {/* Accumulated Rewards */}
        <div className="p-4 rounded-xl bg-[#F5EFE0] border border-[#D4C39F] space-y-3">
          <div className="text-xs font-bold text-[#1E3331]">Tài Nguyên Đã Tích Lũy Chờ Nhận</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono tabular-nums">
            <div className="p-2.5 rounded bg-[#FAF6EC] border border-[#DFD2B6]">
              Linh Thạch: <strong className="text-[#8A5A0F]">+{formatNum(rewards.linhThach)}</strong>
            </div>
            <div className="p-2.5 rounded bg-[#FAF6EC] border border-[#DFD2B6]">
              Linh Khí: <strong className="text-[#1D5E8C]">+{formatNum(rewards.linhKhi)}</strong>
            </div>
            <div className="p-2.5 rounded bg-[#FAF6EC] border border-[#DFD2B6]">
              Linh Thảo: <strong className="text-[#257A52]">+{formatNum(rewards.linhThao)}</strong>
            </div>
            <div className="p-2.5 rounded bg-[#FAF6EC] border border-[#DFD2B6]">
              Huyền Thiết: <strong>+{formatNum(rewards.huyenThiet)}</strong>
            </div>
            <div className="p-2.5 rounded bg-[#FAF6EC] border border-[#DFD2B6]">
              Cường Hóa Thạch: <strong>+{rewards.cuongHoaThach}</strong>
            </div>
            <div className="p-2.5 rounded bg-[#FAF6EC] border border-[#DFD2B6]">
              Tiên Ngọc (Linh Mạch): <strong className="text-[#15803D]">+{rewards.tienNgoc}</strong>
            </div>
          </div>
          {rewards.bonusGearCount > 0 && (
            <div className="text-xs font-semibold text-[#B4690E]">
              + Thưởng thám hiểm ngẫu nhiên: {rewards.bonusGearCount} Trang Bị (Hiếm ~ Huyền Thoại)!
            </div>
          )}

          <button
            disabled={!hasRewards}
            onClick={onClaimOffline}
            className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${
              hasRewards
                ? 'bg-[#1E3B38] hover:bg-[#2A514D] text-[#F9E6B3] cursor-pointer'
                : 'bg-[#CFC5B1] text-[#6E6557] cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {hasRewards ? 'Thu Nhận Toàn Bộ Thưởng Treo Máy' : 'Đang tích lũy (chờ ít nhất 30 giây hoặc bấm Tăng Tốc)'}
          </button>
        </div>
      </div>
    </ScrollModalShell>
  );
}
