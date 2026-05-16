"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, ChevronLeft, ChevronRight, Bell, User, Users, Trash2, Edit2, X, SlidersHorizontal } from "lucide-react";
import { useState, useMemo, useTransition } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { deleteTransaction } from "@/app/actions/transaction";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import QuickAddDrawer from "@/components/features/QuickAddDrawer";
import SettlementModal from "@/components/features/SettlementModal";

const CHART_COLORS = ["#6366f1", "#f1f5f9"];
const MONTHS = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
const TYPES    = ["全部", "支出", "收入"];

function AnimatedAmount({ value, isIncome = false }: { value: number; isIncome?: boolean }) {
  const color = isIncome ? "#10b981" : value < 0 ? "#f43f5e" : "var(--text-primary)";
  const prefix = isIncome ? "+" : value < 0 ? "" : "";
  return (
    <span style={{ color }} className="font-semibold tabular-nums">
      {prefix}NT${Math.abs(value).toLocaleString()}
    </span>
  );
}

function Avatar({ initial, colorId }: { initial: string; colorId: string }) {
  // 簡單用字串長度與首字母產生顏色
  const isAlt = colorId.length % 2 === 0;
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
      style={{ background: isAlt ? "#ec4899" : "#6366f1" }}>
      {initial}
    </div>
  );
}

// @ts-ignore
export default function DashboardClient({ transactions, wallets, currentUserId, userName, familyName, familyMembersCount }) {
  const now = new Date();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [view, setView] = useState<"MY" | "FAMILY">("FAMILY");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("ALL");
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [editTxData, setEditTxData] = useState<any>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);

  // 進階篩選狀態
  const [showFilter, setShowFilter] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [merchantFilter, setMerchantFilter] = useState("全部");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [member, setMember] = useState("全部");
  const [typeFilter, setTypeFilter] = useState("全部");

  // 動態提取選項
  const MEMBERS = ["全部", ...Array.from(new Set(transactions.map((t:any) => t.user?.name).filter(Boolean)))];
  const CATEGORIES = ["全部", ...Array.from(new Set(transactions.map((t:any) => t.category?.name).filter(Boolean)))];
  const MERCHANTS = ["全部", ...Array.from(new Set(transactions.map((t:any) => t.merchant?.name).filter(Boolean)))];

  // 當選擇特定帳簿時，將 ID 寫入 localStorage 供 QuickAddDrawer 讀取
  const handleWalletSelect = (id: string) => {
    setSelectedWalletId(id);
    if (id !== "ALL") localStorage.setItem("lastSelectedWallet", id);
  };

  const handleDelete = () => {
    if (!selectedTx || selectedTx.userId !== currentUserId) return;
    if (!confirm("確定要刪除這筆紀錄嗎？")) return;
    
    startTransition(async () => {
      try {
        await deleteTransaction(selectedTx.id);
        setSelectedTx(null);
        router.refresh(); // 強制重整重新載入資料
      } catch (e: any) {
        alert(e.message || "刪除失敗");
      }
    });
  };

  // 過濾資料 (依據月份、視角、帳簿、進階過濾器)
  const filteredTx = useMemo(() => {
    return transactions.filter((tx: any) => {
      const txDateObj = new Date(tx.date);
      // 月份過濾 (如果沒有設定特定日期區間，才套用月份過濾)
      const isSameMonth = (startDate || endDate) ? true : (txDateObj.getMonth() === monthIdx && txDateObj.getFullYear() === year);
      
      const matchView = view === "FAMILY" || tx.userId === currentUserId;
      const matchWallet = selectedWalletId === "ALL" || tx.walletId === selectedWalletId;
      
      const matchMember = member === "全部" || tx.user?.name === member;
      const matchType   = typeFilter === "全部"
        || (typeFilter === "支出" && tx.type === "EXPENSE")
        || (typeFilter === "收入" && tx.type === "INCOME");
      const matchCat    = categoryFilter === "全部" || tx.category?.name === categoryFilter;
      const matchMerch  = merchantFilter === "全部" || tx.merchant?.name === merchantFilter;
      
      // 金額範圍
      const amt = Math.abs(tx.amount);
      const matchMin = minAmount ? amt >= Number(minAmount) : true;
      const matchMax = maxAmount ? amt <= Number(maxAmount) : true;

      // 日期範圍
      const txDateStr = txDateObj.toISOString().split("T")[0];
      const matchStart = startDate ? txDateStr >= startDate : true;
      const matchEnd   = endDate ? txDateStr <= endDate : true;

      return isSameMonth && matchView && matchWallet && matchMember && matchType && matchCat && matchMerch && matchMin && matchMax && matchStart && matchEnd;
    });
  }, [transactions, monthIdx, year, view, currentUserId, selectedWalletId, member, typeFilter, categoryFilter, merchantFilter, minAmount, maxAmount, startDate, endDate]);

  const totalExpense = filteredTx.filter((tx: any) => tx.type === "EXPENSE").reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0);
  const totalIncome = filteredTx.filter((tx: any) => tx.type === "INCOME").reduce((sum: number, tx: any) => sum + tx.amount, 0);
  
  const selectedWallet = selectedWalletId === "ALL" ? null : wallets.find((w: any) => w.id === selectedWalletId);
  
  // 計算拆帳狀態
  let splitState = null;
  if (selectedWallet?.isSplitEnabled) {
    // 當前帳簿總人數
    const membersCount = selectedWallet.visibility === "FAMILY" ? familyMembersCount : (selectedWallet.walletMembers?.length || 0) + 1;
    // 我代墊的總額
    const myPaid = filteredTx.filter((tx: any) => tx.type === "EXPENSE" && tx.paidByUserId === currentUserId).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
    // 我應負擔的份額 (總支出 / 總人數)
    const myShare = membersCount > 0 ? totalExpense / membersCount : 0;
    // 淨餘額 (正: 別人欠我, 負: 我欠別人)
    const myNetBalance = myPaid - myShare;
    
    splitState = { myPaid, myShare, myNetBalance, membersCount };
  }

  // 計算顯示的餘額或預算
  // 如果選了特定帳簿，中心顯示「該帳簿當前總餘額」
  // 如果是全部，則顯示簡易預算剩餘（Mock）
  const MOCK_BUDGET = view === "FAMILY" ? 50000 : 20000;
  const currentBalance = selectedWallet ? selectedWallet.balance : (MOCK_BUDGET - totalExpense);
  const spentPct = selectedWallet ? 0 : Math.min((totalExpense / MOCK_BUDGET) * 100, 100) || 0;

  // 圓餅圖：如果是單一帳簿，顯示本月的收入與支出比例，如果是全部，顯示預算與已花費
  const CHART_DATA = selectedWallet ? [
    { name: "本月支出", value: totalExpense },
    { name: "本月收入", value: totalIncome || 1 }, // 避免 0 造成無法繪製
  ] : [
    { name: "已花費", value: totalExpense },
    { name: "剩餘預算", value: Math.max(currentBalance, 0) },
  ];

  const recentTx = filteredTx.slice(0, 5);

  const prevMonth = () => {
    if (monthIdx === 0) { setMonthIdx(11); setYear(y => y - 1); }
    else setMonthIdx(m => m - 1);
  };
  const nextMonth = () => {
    if (monthIdx === 11) { setMonthIdx(0); setYear(y => y + 1); }
    else setMonthIdx(m => m + 1);
  };

  return (
    <div className="px-4 pt-6 pb-2 max-w-lg mx-auto">

      {/* ── 頂部：標題列與視角切換 ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{view === "FAMILY" ? "家庭帳本" : "個人帳本"}</p>
          <h1 className="text-lg font-bold truncate max-w-[150px]" style={{ color: "var(--text-primary)" }}>
            {view === "FAMILY" ? `${familyName} 👨‍👩‍👧` : `${userName} 👤`}
          </h1>
        </div>
        
        {/* 視角切換器與過濾按鈕 */}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilter(!showFilter)}
            className="px-2.5 py-1.5 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: showFilter ? "rgba(99,102,241,0.15)" : "var(--bg-card)",
              color: showFilter ? "#6366f1" : "var(--text-muted)",
              border: showFilter ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
            }}
          >
            <SlidersHorizontal size={14} />
          </motion.button>
          
          <div className="flex bg-[var(--bg-card)] rounded-xl p-1 border border-[var(--border)]">
            <button onClick={() => setView("MY")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: view === "MY" ? "rgba(99,102,241,0.15)" : "transparent",
                color: view === "MY" ? "#6366f1" : "var(--text-muted)",
              }}>
              <User size={12} /> 我的
            </button>
            <button onClick={() => setView("FAMILY")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: view === "FAMILY" ? "rgba(99,102,241,0.15)" : "transparent",
                color: view === "FAMILY" ? "#6366f1" : "var(--text-muted)",
              }}>
              <Users size={12} /> 全家
            </button>
          </div>
        </div>
      </div>

      {/* ── 進階篩選面板 ── */}
      <AnimatePresence>
      {showFilter && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card p-4 mb-4 overflow-hidden"
        >
          {/* 日期範圍 */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>日期範圍</p>
            <div className="flex gap-2 items-center">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]" />
              <span className="text-[var(--text-muted)]">-</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]" />
            </div>
          </div>

          {/* 成員 */}
          {view === "FAMILY" && (
            <>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>成員</p>
              <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-1">
                {(MEMBERS as string[]).map(m => (
                  <button key={m} onClick={() => setMember(m)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                    style={{
                      background: member === m ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
                      color: member === m ? "#6366f1" : "var(--text-secondary)",
                      border: member === m ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
                    }}>
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 分類 */}
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>分類</p>
          <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-1">
            {(CATEGORIES as string[]).map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                style={{
                  background: categoryFilter === c ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
                  color: categoryFilter === c ? "#6366f1" : "var(--text-secondary)",
                  border: categoryFilter === c ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
                }}>
                {c}
              </button>
            ))}
          </div>

          {/* 商家 */}
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>商家</p>
          <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-1">
            {(MERCHANTS as string[]).map(m => (
              <button key={m} onClick={() => setMerchantFilter(m)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                style={{
                  background: merchantFilter === m ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
                  color: merchantFilter === m ? "#6366f1" : "var(--text-secondary)",
                  border: merchantFilter === m ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
                }}>
                {m}
              </button>
            ))}
          </div>

          {/* 收支類型與金額 */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1">
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>收支類型</p>
              <div className="flex gap-2">
                {TYPES.map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: typeFilter === t ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
                      color: typeFilter === t ? "#6366f1" : "var(--text-secondary)",
                      border: typeFilter === t ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1">
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>金額範圍</p>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder="最低" value={minAmount} onChange={e => setMinAmount(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] text-center" />
                <span className="text-[var(--text-muted)]">-</span>
                <input type="number" placeholder="最高" value={maxAmount} onChange={e => setMaxAmount(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] text-center" />
              </div>
            </div>
          </div>

          {/* 清除按鈕 */}
          <div className="flex justify-end pt-2 border-t border-[var(--border)] mt-2">
            <button onClick={() => {
              setStartDate(""); setEndDate(""); setMember("全部"); setCategoryFilter("全部"); 
              setMerchantFilter("全部"); setTypeFilter("全部"); setMinAmount(""); setMaxAmount("");
            }} className="text-xs font-bold text-rose-500 bg-rose-500/10 px-4 py-2 rounded-lg">
              清除所有篩選
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── 月份選擇器 ── */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={prevMonth}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "var(--bg-card)" }}>
          <ChevronLeft size={14} style={{ color: "var(--text-secondary)" }} />
        </button>
        <span className="text-sm font-semibold w-24 text-center whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
          {year} 年 {MONTHS[monthIdx]}
        </span>
        <button onClick={nextMonth}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "var(--bg-card)" }}>
          <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      {/* ── 帳簿過濾選擇器 ── */}
      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-4">
        <button onClick={() => handleWalletSelect("ALL")}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: selectedWalletId === "ALL" ? "rgba(99,102,241,0.15)" : "var(--bg-card)",
            color: selectedWalletId === "ALL" ? "#6366f1" : "var(--text-secondary)",
            border: selectedWalletId === "ALL" ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
          }}>
          📊 全部總覽
        </button>
        {wallets.map((w: any) => (
          <button key={w.id} onClick={() => handleWalletSelect(w.id)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            style={{
              background: selectedWalletId === w.id ? "rgba(16,185,129,0.15)" : "var(--bg-card)",
              color: selectedWalletId === w.id ? "#10b981" : "var(--text-secondary)",
              border: selectedWalletId === w.id ? "1px solid rgba(16,185,129,0.4)" : "1px solid var(--border)",
            }}>
            <span>{w.name}</span>
          </button>
        ))}
      </div>

      {/* ── 核心視覺：預算甜甜圈圖 ── */}
      <motion.div
        key={view + monthIdx} // 切換視角或月份時重新播放動畫
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-6 mb-4 text-center"
        style={{ boxShadow: "var(--shadow-glow)" }}
      >
        <div className="relative w-52 h-52 mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={CHART_DATA}
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={90}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                {CHART_DATA.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* 圓心文字 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{selectedWallet ? "當前總餘額" : "本月剩餘"}</p>
            <CountUp
              end={currentBalance}
              prefix="NT$"
              duration={1400}
              className="text-2xl font-bold"
              style={{ color: currentBalance >= 0 ? "#10b981" : "#f43f5e" }}
            />
            {!selectedWallet && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                已用 {spentPct.toFixed(0)}%
              </p>
            )}
          </div>
        </div>

        {/* 預算或收支進度條 */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            <span>{selectedWallet ? "本月支出" : "已花費"} NT${totalExpense.toLocaleString()}</span>
            <span>{selectedWallet ? "本月收入" : "預算"} NT${(selectedWallet ? totalIncome : MOCK_BUDGET).toLocaleString()}</span>
          </div>
          {!selectedWallet && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${spentPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "var(--gradient-primary)" }}
              />
            </div>
          )}
          {selectedWallet && (
            <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${totalExpense === 0 && totalIncome === 0 ? 0 : (totalExpense / (totalExpense + totalIncome) * 100)}%` }}
                className="h-full bg-rose-500"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${totalExpense === 0 && totalIncome === 0 ? 0 : (totalIncome / (totalExpense + totalIncome) * 100)}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 拆帳進度卡片 ── */}
      {selectedWallet?.isSplitEnabled && splitState && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-3xl relative overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between mb-3 relative z-10">
            <div>
              <p className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 inline-block mb-1">
                📐 拆帳模式 (本月狀態)
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {splitState.myNetBalance >= 0 ? "目前您淨賺/應收回" : "目前您需補付"}
              </p>
            </div>
            <span className="text-xl font-black tabular-nums" style={{ color: splitState.myNetBalance >= 0 ? "#10b981" : "#f43f5e" }}>
              {splitState.myNetBalance > 0 ? "+" : ""}NT${Math.abs(Math.round(splitState.myNetBalance)).toLocaleString()}
            </span>
          </div>
          <div className="flex gap-2 relative z-10 text-xs mt-3 pt-3 border-t border-[var(--border)]">
            <div className="flex-1">
              <span style={{ color: "var(--text-muted)" }}>我已代墊</span>
              <p className="font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>NT${Math.round(splitState.myPaid).toLocaleString()}</p>
            </div>
            <div className="flex-1">
              <span style={{ color: "var(--text-muted)" }}>我應負擔 ({splitState.membersCount}人均分)</span>
              <p className="font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>NT${Math.round(splitState.myShare).toLocaleString()}</p>
            </div>
          </div>
          {/* 前往結算按鈕 */}
          <button
            onClick={() => setShowSettlement(true)}
            className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{
              background: "rgba(99,102,241,0.1)",
              color: "#6366f1",
              border: "1px solid rgba(99,102,241,0.25)",
            }}
          >
            📐 前往結算中心
          </button>
        </motion.div>
      )}

      {/* ── 快速操作區 ── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* 支出 */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(244,63,94,0.15)" }}>
              <TrendingDown size={14} color="#f43f5e" />
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>本月支出</span>
          </div>
          <CountUp
            end={totalExpense}
            prefix="NT$"
            duration={1200}
            className="text-lg font-bold"
            style={{ color: "#f43f5e" }}
          />
        </div>

        {/* 收入 */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              <TrendingUp size={14} color="#10b981" />
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>本月收入</span>
          </div>
          <CountUp
            end={totalIncome}
            prefix="NT$"
            duration={1200}
            className="text-lg font-bold"
            style={{ color: "#10b981" }}
          />
        </div>
      </div>

      {/* ── 最近交易明細 ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>最近記帳</h2>
          {recentTx.length > 0 && <button className="text-xs" style={{ color: "#6366f1" }}>查看全部</button>}
        </div>

        {recentTx.length === 0 ? (
          <div className="text-center py-8 glass-card">
            <p className="text-2xl mb-2">🍃</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>本月尚無明細</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentTx.map((tx: any, i: number) => {
              const d = new Date(tx.date);
              const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  onClick={() => setSelectedTx(tx)}
                  className="glass-card px-4 py-3 flex items-center gap-3 active:scale-95 transition-transform cursor-pointer"
                >
                  {/* 分類 Icon + 成員頭像 */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: "var(--bg-card)" }}>
                      {tx.category?.icon || "📦"}
                    </div>
                    <div className="absolute -bottom-1 -right-1 ring-2 ring-[var(--bg-card)] rounded-full">
                      <Avatar initial={(tx.user?.name || "U")[0].toUpperCase()} colorId={tx.user?.id || "1"} />
                    </div>
                  </div>

                  {/* 描述 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {tx.merchant?.name ? `${tx.merchant.name} - ` : ""}{tx.category?.name || "未知"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {tx.user?.name || "未知"} · {dateStr} {tx.wallet ? `· ${tx.wallet.name}` : ""}
                    </p>
                  </div>

                  {/* 金額 */}
                  <AnimatedAmount value={tx.amount} isIncome={tx.type === "INCOME"} />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 交易操作彈出視窗 ── */}
      <AnimatePresence>
        {selectedTx && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} />
            
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-surface)] rounded-t-3xl border-t border-[var(--border)] pb-8 pt-4 px-6">
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {selectedTx.category?.name} <span className="text-[var(--text-muted)] font-normal text-xs ml-2">{new Date(selectedTx.date).toLocaleDateString()}</span>
                  </p>
                  <AnimatedAmount value={selectedTx.amount} isIncome={selectedTx.type === "INCOME"} />
                </div>
                <button onClick={() => setSelectedTx(null)} className="p-2 bg-[var(--bg-card)] rounded-full">
                  <X size={20} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              {selectedTx.userId === currentUserId ? (
                <div className="flex gap-3">
                  <button onClick={() => { setEditTxData(selectedTx); setIsEditDrawerOpen(true); setSelectedTx(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)]">
                    <Edit2 size={16} /> 編輯
                  </button>
                  <button onClick={handleDelete} disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 disabled:opacity-50">
                    <Trash2 size={16} /> {isPending ? "刪除中..." : "刪除"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
                  <p className="text-sm text-[var(--text-secondary)] mb-1">這是 {selectedTx.user?.name || "其他成員"} 的紀錄</p>
                  <p className="text-xs text-[var(--text-muted)]">只有建立者可以編輯或刪除</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 編輯專用 Drawer ── */}
      <QuickAddDrawer 
        open={isEditDrawerOpen} 
        onClose={() => { setIsEditDrawerOpen(false); setEditTxData(null); }} 
        editData={editTxData} 
      />

      {/* ── 結算中心 Modal ── */}
      <AnimatePresence>
        {showSettlement && selectedWallet && (
          <SettlementModal
            walletId={selectedWallet.id}
            walletName={selectedWallet.name}
            familyId={selectedWallet.familyId}
            currentUserId={currentUserId}
            onClose={() => setShowSettlement(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
