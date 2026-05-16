"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { getWalletSettlement } from "@/app/actions/settlement";
import { settleDebt } from "@/app/actions/settlement";
import type { NetBalance, SettlementDebt } from "@/lib/settlement";

// ── 頭像元件 ────────────────────────────────────────────────────────────
function Avatar({ name, colorId, size = "md" }: { name: string; colorId: string; size?: "sm" | "md" | "lg" }) {
  const colors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#10b981", "#06b6d4", "#3b82f6",
  ];
  const colorIndex = colorId.charCodeAt(0) % colors.length;
  const bg = colors[colorIndex];
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm";

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: bg }}
    >
      {name[0]?.toUpperCase() || "?"}
    </div>
  );
}

// ── 淨餘額列表項目 ───────────────────────────────────────────────────────
function BalanceRow({ balance }: { balance: NetBalance }) {
  const isPositive = balance.net >= 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar name={balance.name} colorId={balance.colorId} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
          {balance.name}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          代墊 NT${Math.round(balance.paid).toLocaleString()} · 應付 NT${Math.round(balance.share).toLocaleString()}
        </p>
      </div>
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: isPositive ? "#10b981" : "#f43f5e" }}
      >
        {isPositive ? "+" : ""}NT${Math.round(balance.net).toLocaleString()}
      </span>
    </div>
  );
}

// ── 還款路徑卡片 ─────────────────────────────────────────────────────────
function DebtCard({
  debt, index, currentUserId, familyId, walletId, onSettled
}: {
  debt: SettlementDebt;
  index: number;
  currentUserId: string;
  familyId: string;
  walletId: string;
  onSettled: () => void;
}) {
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);
  const isMyDebt = debt.fromUserId === currentUserId;

  const handleSettle = async () => {
    if (!isMyDebt) return;
    setSettling(true);
    try {
      await settleDebt({ walletId, familyId, fromUserId: debt.fromUserId, toUserId: debt.toUserId, amount: debt.amount });
      setSettled(true);
      setTimeout(onSettled, 900);
    } catch (e: any) {
      alert(e.message || "結清失敗，請稍後再試");
    } finally {
      setSettling(false);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: settled ? 0.4 : 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex flex-col gap-3 p-3 rounded-2xl"
      style={{ background: settled ? "rgba(16,185,129,0.06)" : "rgba(99,102,241,0.06)", border: `1px solid ${settled ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.12)"}` }}
    >
      <div className="flex items-center gap-3">
        {/* 還款方 */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <Avatar name={debt.fromName} colorId={debt.fromColorId} size="md" />
          <p className="text-[10px] font-medium text-center leading-tight" style={{ color: "var(--text-secondary)" }}>
            {debt.fromName}
          </p>
        </div>

        {/* 箭頭 + 金額 */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-base font-black tabular-nums" style={{ color: settled ? "#10b981" : "#6366f1" }}>
            NT${debt.amount.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 w-full">
            <div className="flex-1 h-px" style={{ background: settled ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)" }} />
            <ArrowRight size={14} color={settled ? "#10b981" : "#6366f1"} />
            <div className="w-2 h-px" style={{ background: settled ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)" }} />
          </div>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>轉帳給</span>
        </div>

        {/* 收款方 */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <Avatar name={debt.toName} colorId={debt.toColorId} size="md" />
          <p className="text-[10px] font-medium text-center leading-tight" style={{ color: "var(--text-secondary)" }}>
            {debt.toName}
          </p>
        </div>
      </div>

      {/* 已還款按鈕（僅還款者本人可見） */}
      {isMyDebt && (
        <button
          onClick={handleSettle}
          disabled={settling || settled}
          className="w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
          style={{
            background: settled ? "rgba(16,185,129,0.12)" : "rgba(99,102,241,0.1)",
            color: settled ? "#10b981" : "#6366f1",
            border: `1px solid ${settled ? "rgba(16,185,129,0.25)" : "rgba(99,102,241,0.25)"}`,
            opacity: settling ? 0.7 : 1,
          }}
        >
          {settling ? <Loader2 size={12} className="animate-spin" /> : settled ? <CheckCircle2 size={12} /> : null}
          {settled ? "已完成結清 ✔" : settling ? "處理中..." : "✅ 我已轉帳，確認結清"}
        </button>
      )}
      {!isMyDebt && (
        <p className="text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
          等待 {debt.fromName} 確認轉帳
        </p>
      )}
    </motion.div>
  );
}

// ── 主要 Modal 元件 ──────────────────────────────────────────────────────
interface SettlementModalProps {
  walletId: string;
  walletName: string;
  familyId: string;
  currentUserId: string;
  onClose: () => void;
}

export default function SettlementModal({ walletId, walletName, familyId, currentUserId, onClose }: SettlementModalProps) {
  const [isPending, startTransition] = useTransition();
  const [balances, setBalances] = useState<NetBalance[] | null>(null);
  const [debts, setDebts] = useState<SettlementDebt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"debts" | "balances">("debts");

  const loadSettlement = () => {
    startTransition(async () => {
      try {
        const result = await getWalletSettlement(walletId);
        setBalances(result.balances);
        setDebts(result.debts);
      } catch (e: any) {
        setError(e.message || "載入失敗，請稍後再試");
      }
    });
  };

  // 一進來就自動載入結算資料
  useState(() => { loadSettlement(); });

  return (
    <>
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      />

      {/* 面板本體 */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-w-lg mx-auto"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderBottom: "none",
          maxHeight: "82vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 頂部把手 */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
        </div>

        {/* 標題列 */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{walletName}</p>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>📐 結算中心</h2>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <X size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* Tab 切換 */}
        <div className="flex gap-1 mx-5 my-3 p-1 rounded-xl flex-shrink-0"
          style={{ background: "var(--bg-card)" }}>
          {([["debts", "💸 還款路徑"], ["balances", "📊 個人餘額"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: tab === key ? "var(--bg-surface)" : "transparent",
                color: tab === key ? "#6366f1" : "var(--text-muted)",
                boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* 內容區 (可滾動) */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">

          {/* 載入中 */}
          {isPending && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={28} className="animate-spin" style={{ color: "#6366f1" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>計算結算路徑中...</p>
            </div>
          )}

          {/* 錯誤 */}
          {error && (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">⚠️</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>
            </div>
          )}

          {/* 還款路徑 Tab */}
          {!isPending && !error && debts && tab === "debts" && (
            <div className="flex flex-col gap-3">
              {debts.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <CheckCircle2 size={40} color="#10b981" />
                  <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>帳目已平衡！</p>
                  <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                    目前所有人的代墊金額已均等，<br />不需要任何還款動作。
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold py-1" style={{ color: "var(--text-muted)" }}>
                    共需 {debts.length} 筆轉帳即可結清（最少次數）
                  </p>
                  {debts.map((debt, i) => (
                    <DebtCard
                      key={i}
                      debt={debt}
                      index={i}
                      currentUserId={currentUserId}
                      familyId={familyId}
                      walletId={walletId}
                      onSettled={loadSettlement}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* 個人餘額 Tab */}
          {!isPending && !error && balances && tab === "balances" && (
            <div>
              <p className="text-xs font-semibold py-1 mb-2" style={{ color: "var(--text-muted)" }}>
                每人的代墊收支狀況
              </p>
              <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                {balances
                  .sort((a, b) => b.net - a.net)
                  .map(b => <BalanceRow key={b.userId} balance={b} />)}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
