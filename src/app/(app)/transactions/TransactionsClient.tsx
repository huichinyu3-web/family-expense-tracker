"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import { Search, SlidersHorizontal, TrendingDown, TrendingUp, X, Edit2, Trash2 } from "lucide-react";
import { deleteTransaction } from "@/app/actions/transaction";
import { useRouter } from "next/navigation";
import QuickAddDrawer from "@/components/features/QuickAddDrawer";

const WALLET_ICONS: Record<string, string> = {
  CASH: "💵", BANK: "🏦", CREDIT_CARD: "💳", E_WALLET: "📱", OTHER: "💰"
};

const TYPES    = ["全部", "支出", "收入"];

function Avatar({ initial, colorId }: { initial: string; colorId: string }) {
  const isAlt = colorId.length % 2 === 0;
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
      style={{ background: isAlt ? "#ec4899" : "#6366f1" }}>
      {initial}
    </div>
  );
}

// 依日期分組
function groupByDate(txs: any[]) {
  const groups: Record<string, any[]> = {};
  txs.forEach(tx => {
    const dStr = new Date(tx.date).toISOString().split("T")[0];
    if (!groups[dStr]) groups[dStr] = [];
    groups[dStr].push(tx);
  });
  return groups;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return "今天";
  if (d.toDateString() === yesterday.toDateString()) return "昨天";
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export default function TransactionsClient({ initialData, wallets, currentUserId }: { initialData: any[]; wallets: any[]; currentUserId: string | undefined }) {
  const router = useRouter();
  const [search, setSearch]       = useState("");
  const [member, setMember]       = useState("全部");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [walletFilter, setWalletFilter] = useState("ALL");
  const [showFilter, setShowFilter] = useState(false);

  // 進階篩選狀態
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [merchantFilter, setMerchantFilter] = useState("全部");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // 動態提取選項
  const MEMBERS = ["全部", ...Array.from(new Set(initialData.map(t => t.user?.name).filter(Boolean)))];
  const CATEGORIES = ["全部", ...Array.from(new Set(initialData.map(t => t.category?.name).filter(Boolean)))];
  const MERCHANTS = ["全部", ...Array.from(new Set(initialData.map(t => t.merchant?.name).filter(Boolean)))];

  // 編輯與刪除狀態
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [editTxData, setEditTxData] = useState<any>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = initialData.filter(tx => {
    const searchTarget = `${tx.category?.name} ${tx.merchant?.name || ""} ${tx.note || ""}`;
    const matchSearch = searchTarget.includes(search);
    const matchMember = member === "全部" || tx.user?.name === member;
    const matchType   = typeFilter === "全部"
      || (typeFilter === "支出" && tx.type === "EXPENSE")
      || (typeFilter === "收入" && tx.type === "INCOME");
    const matchWallet = walletFilter === "ALL" || tx.walletId === walletFilter;
    const matchCat    = categoryFilter === "全部" || tx.category?.name === categoryFilter;
    const matchMerch  = merchantFilter === "全部" || tx.merchant?.name === merchantFilter;
    
    // 金額範圍
    const amt = Math.abs(tx.amount);
    const matchMin = minAmount ? amt >= Number(minAmount) : true;
    const matchMax = maxAmount ? amt <= Number(maxAmount) : true;

    // 日期範圍
    const txDate = new Date(tx.date).toISOString().split("T")[0];
    const matchStart = startDate ? txDate >= startDate : true;
    const matchEnd   = endDate ? txDate <= endDate : true;

    return matchSearch && matchMember && matchType && matchWallet && matchCat && matchMerch && matchMin && matchMax && matchStart && matchEnd;
  });

  const totalExpense = filtered.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome  = filtered.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const grouped = groupByDate(filtered);

  const handleDelete = () => {
    if (!selectedTx || selectedTx.userId !== currentUserId) return;
    if (!confirm("確定要刪除這筆紀錄嗎？")) return;
    
    startTransition(async () => {
      try {
        await deleteTransaction(selectedTx.id);
        setSelectedTx(null);
        router.refresh();
      } catch (e: any) {
        alert(e.message || "刪除失敗");
      }
    });
  };

  return (
    <div className="px-4 pt-6 pb-2 max-w-lg mx-auto">

      {/* ── 帳簿過濾選擇器 (仿 Dashboard) ── */}
      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-4">
        <button onClick={() => setWalletFilter("ALL")}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: walletFilter === "ALL" ? "rgba(99,102,241,0.15)" : "var(--bg-card)",
            color: walletFilter === "ALL" ? "#6366f1" : "var(--text-secondary)",
            border: walletFilter === "ALL" ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
          }}>
          📊 全部總覽
        </button>
        {wallets.map((w: any) => (
          <button key={w.id} onClick={() => setWalletFilter(w.id)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            style={{
              background: walletFilter === w.id ? "rgba(16,185,129,0.15)" : "var(--bg-card)",
              color: walletFilter === w.id ? "#10b981" : "var(--text-secondary)",
              border: walletFilter === w.id ? "1px solid rgba(16,185,129,0.4)" : "1px solid var(--border)",
            }}>
            <span>{w.name}</span>
          </button>
        ))}
      </div>

      {/* ── 頂部標題 ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>交易明細</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowFilter(f => !f)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: showFilter ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
            border: showFilter ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
          }}
        >
          <SlidersHorizontal size={15} color={showFilter ? "#6366f1" : "var(--text-secondary)"} />
        </motion.button>
      </div>

      {/* ── 搜尋列 ── */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="搜尋商家、分類或備註..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* ── 進階篩選面板 ── */}
      {showFilter && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
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

          {/* 收支類型 */}
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
            
            {/* 金額範圍 */}
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

      {/* ── 摘要列 ── */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 glass-card px-3 py-2.5 flex items-center gap-2">
          <TrendingDown size={13} color="#f43f5e" />
          <div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>支出</p>
            <p className="text-sm font-bold" style={{ color: "#f43f5e" }}>
              NT${totalExpense.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex-1 glass-card px-3 py-2.5 flex items-center gap-2">
          <TrendingUp size={13} color="#10b981" />
          <div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>收入</p>
            <p className="text-sm font-bold" style={{ color: "#10b981" }}>
              NT${totalIncome.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── 依日期分組的明細列表 ── */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-sm">找不到符合的紀錄</p>
        </div>
      ) : (
        Object.entries(grouped).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([date, txs]) => (
          <div key={date} className="mb-5">
            {/* 日期標頭 */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                {formatDate(date)}
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {txs.filter(t => t.type === "EXPENSE")
                  .reduce((s, t) => s + Math.abs(t.amount), 0) > 0 &&
                  `支出 NT$${txs.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString()}`
                }
              </span>
            </div>

            {/* 該日明細 */}
            <div className="flex flex-col gap-2">
              {txs.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedTx(tx)}
                  className="glass-card px-3.5 py-3 flex items-start gap-3 active:scale-95 transition-transform cursor-pointer"
                >
                  {/* Icon + 成員頭貼 */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      {tx.category?.icon || "📦"}
                    </div>
                    <div className="absolute -bottom-1 -right-1 ring-2 ring-[var(--bg-card)] rounded-full">
                      <Avatar initial={(tx.user?.name || "U")[0].toUpperCase()} colorId={tx.user?.id || "1"} />
                    </div>
                  </div>

                  {/* 描述區 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-semibold truncate flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                        {tx.merchant?.name || tx.category?.name || "未知"}
                      </p>
                      {/* 金額 */}
                      <span className="font-bold text-[15px] tabular-nums flex-shrink-0 ml-2"
                        style={{ color: tx.type === "INCOME" ? "#10b981" : "var(--text-primary)" }}>
                        {tx.type === "INCOME" ? "+" : ""}NT${Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                    
                    {/* Tag 標籤區 */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                        style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                        {tx.category?.name || "未知"}
                      </span>
                      {tx.wallet && (
                        <span className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                          style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                          <span>{WALLET_ICONS[tx.wallet.type || "OTHER"] || "💳"}</span>
                          {tx.wallet.name}
                        </span>
                      )}
                      {tx.recurringType === "INSTALLMENT" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                          style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                          分期 ({tx.installments}期)
                        </span>
                      )}
                      {tx.recurringType && tx.recurringType !== "INSTALLMENT" && tx.recurringType !== "NONE" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                          style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                          自動週期
                        </span>
                      )}
                    </div>
                    
                    {/* 備註區 */}
                    {tx.note && (
                      <p className="text-xs truncate mt-2 px-2 border-l-2" style={{ color: "var(--text-secondary)", borderColor: "rgba(99,102,241,0.3)" }}>
                        {tx.note}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* ── 交易操作彈出視窗 ── */}
      <AnimatePresence>
        {selectedTx && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} />
            
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-surface)] rounded-t-3xl border-t border-[var(--border)] pb-8 pt-4 px-6 max-w-lg mx-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {selectedTx.category?.name} <span className="text-[var(--text-muted)] font-normal text-xs ml-2">{new Date(selectedTx.date).toLocaleDateString()}</span>
                  </p>
                  <span className="font-semibold tabular-nums text-2xl" style={{ color: selectedTx.type === "INCOME" ? "#10b981" : (selectedTx.amount < 0 ? "#f43f5e" : "var(--text-primary)") }}>
                    {selectedTx.type === "INCOME" ? "+" : ""}NT${Math.abs(selectedTx.amount).toLocaleString()}
                  </span>
                </div>
                <button onClick={() => setSelectedTx(null)} className="p-2 bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] rounded-full transition-colors border border-[var(--border)]">
                  <X size={20} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              {selectedTx.userId === currentUserId ? (
                <div className="flex gap-3">
                  <button onClick={() => { setEditTxData(selectedTx); setIsEditDrawerOpen(true); setSelectedTx(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-surface)] transition-colors">
                    <Edit2 size={16} /> 編輯
                  </button>
                  <button onClick={handleDelete} disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-colors disabled:opacity-50">
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

    </div>
  );
}
