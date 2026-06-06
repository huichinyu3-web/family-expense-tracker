"use client";

import { useState, useEffect, useCallback } from "react";
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
          代墊 ${Math.round(balance.paid).toLocaleString()} · 應付 ${Math.round(balance.share).toLocaleString()}
        </p>
      </div>
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: isPositive ? "#10b981" : "#f43f5e" }}
      >
        {isPositive ? "+" : ""}${Math.round(balance.net).toLocaleString()}
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
            ${debt.amount.toLocaleString()}
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
  const [isLoading, setIsLoading] = useState(false);
  const [balances, setBalances] = useState<NetBalance[] | null>(null);
  const [debts, setDebts] = useState<SettlementDebt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"debts" | "balances">("debts");

  // 多幣別支援
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, string>>({}); // string 方便輸入框編輯
  const [ratesConfirmed, setRatesConfirmed] = useState(false);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [isFetchingRates, setIsFetchingRates] = useState(false);

  // 是否包含非 TWD 幣別
  const hasMultiCurrency = currencies.some(c => c !== "TWD");

  // 靜態 fallback 匯率（當 API 無法連線時使用）
  const FALLBACK_RATES: Record<string, string> = {
    JPY: "0.22", USD: "32", EUR: "35", HKD: "4.1",
    CNY: "4.4", KRW: "0.024", GBP: "40"
  };

  // 從 frankfurter.app 拉取即時匯率
  const fetchLiveRates = useCallback(async (foreignCurrencies: string[]) => {
    if (foreignCurrencies.length === 0) return;
    setIsFetchingRates(true);
    try {
      const targets = foreignCurrencies.join(",");
      // 使用 open.er-api.com（免費、無 Key、支援 TWD）
      const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const usdToTWD = data.rates?.["TWD"];
      if (!usdToTWD) throw new Error("TWD rate missing");
      const liveRates: Record<string, string> = {};
      foreignCurrencies.forEach(c => {
        const usdToC = data.rates?.[c];
        if (usdToC) {
          liveRates[c] = (usdToTWD / usdToC).toFixed(4); // 1 外幣 = ? TWD（交叉匯率）
        } else {
          liveRates[c] = FALLBACK_RATES[c] || "1";
        }
      });
      setExchangeRates(prev => ({ ...prev, ...liveRates }));
      const now = new Date();
      setRatesUpdatedAt(`${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
    } catch {
      // 靜默失敗，使用 fallback
      setExchangeRates(prev => {
        const next = { ...prev };
        foreignCurrencies.forEach(c => { if (!next[c]) next[c] = FALLBACK_RATES[c] || "1"; });
        return next;
      });
    } finally {
      setIsFetchingRates(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettlement = useCallback(async (rates?: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    const numericRates: Record<string, number> = {};
    Object.entries(rates ?? {}).forEach(([k, v]) => {
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) numericRates[k] = n;
    });

    try {
      const result = await getWalletSettlement(walletId, numericRates);
      setBalances(result.balances);
      setDebts(result.debts);
      if (result.currencies.length > 0) {
        setCurrencies(result.currencies);
        const foreign = result.currencies.filter(c => c !== "TWD");
        if (foreign.length > 0 && !rates) {
          // 只在首次載入時拉即時匯率（使用者手動確認後不再重拉）
          await fetchLiveRates(foreign);
        }
      }
    } catch (e: any) {
      setError(e.message || "載入失敗，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  }, [walletId, fetchLiveRates]);

  // 一進來就自動載入結算資料
  useEffect(() => { loadSettlement(); }, [loadSettlement]);

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

        {/* 幣別匯率設定區 (遇到非 TWD 幣別時顯示) */}
        {!isLoading && hasMultiCurrency && !ratesConfirmed && (
          <div className="px-5 pb-4">
            <div className="p-4 rounded-2xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold" style={{ color: "#d97706" }}>⚠️ 偵測到多幣別交易</p>
                {isFetchingRates ? (
                  <span className="text-[10px] flex items-center gap-1" style={{ color: "#6366f1" }}>
                    <span className="inline-block w-2.5 h-2.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    拉取即時匯率中...
                  </span>
                ) : ratesUpdatedAt ? (
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>🌐 即時匯率 · {ratesUpdatedAt}</span>
                ) : null}
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                此帳簿包含非台幣交易，請確認各幣別匯率（1 外幣 = ? 台幣）：
              </p>
              <div className="flex flex-col gap-2 mb-3">
                {currencies.filter(c => c !== "TWD").map(c => (
                  <div key={c} className="flex items-center gap-2">
                    <span className="text-xs font-bold w-12 text-center py-1.5 rounded-lg" style={{ background: "rgba(245,158,11,0.15)", color: "#d97706" }}>{c}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>1 {c} =</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={exchangeRates[c] || ""}
                      onChange={e => setExchangeRates(r => ({ ...r, [c]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm font-bold outline-none text-center"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      placeholder={isFetchingRates ? "載入中..." : "匯率"}
                      disabled={isFetchingRates}
                    />
                    <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>TWD</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchLiveRates(currencies.filter(c => c !== "TWD"))}
                  disabled={isFetchingRates}
                  className="py-2.5 px-3 rounded-xl text-sm font-bold transition-all active:scale-95 flex-shrink-0"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", opacity: isFetchingRates ? 0.6 : 1 }}
                >
                  🔄 重新拉取
                </button>
                <button
                  onClick={() => { setRatesConfirmed(true); loadSettlement(exchangeRates); }}
                  disabled={isFetchingRates}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.3)", opacity: isFetchingRates ? 0.6 : 1 }}
                >
                  確認匯率，開始結算
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 已確認匯率後可重新設定 */}
        {!isLoading && hasMultiCurrency && ratesConfirmed && (
          <div className="px-5 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {currencies.filter(c => c !== "TWD").map(c => (
                <span key={c} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}>
                  1 {c} = {exchangeRates[c]} TWD
                </span>
              ))}
              <button
                onClick={() => setRatesConfirmed(false)}
                className="text-[10px] px-2 py-1 rounded-lg ml-auto"
                style={{ color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                修改匯率
              </button>
            </div>
          </div>
        )}

        {/* 內容區 (可滾動) */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">

          {/* 載入中 */}
          {isLoading && (
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
          {!isLoading && !error && debts && tab === "debts" && (
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
                      onSettled={() => { loadSettlement(); }}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* 個人餘額 Tab */}
          {!isLoading && !error && balances && tab === "balances" && (
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
