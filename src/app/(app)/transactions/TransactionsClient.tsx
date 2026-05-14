"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Search, SlidersHorizontal, TrendingDown, TrendingUp } from "lucide-react";

type TransactionItem = {
  id: string;
  icon: string;
  name: string;
  category: string;
  amount: number;
  member: string;
  avatar: string;
  date: string;
  type: string;
  walletName: string | null;
  walletType: string | null;
  merchantName: string | null;
  note: string | null;
  recurringType: string | null;
  installments: number | null;
};

const WALLET_ICONS: Record<string, string> = {
  CASH: "💵", BANK: "🏦", CREDIT_CARD: "💳", E_WALLET: "📱", OTHER: "💰"
};

const MEMBERS  = ["全部", "小明", "小花"];
const TYPES    = ["全部", "支出", "收入"];

function Avatar({ initial }: { initial: string }) {
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
      style={{ background: "var(--gradient-primary)" }}>
      {initial}
    </div>
  );
}

// 依日期分組
function groupByDate(txs: TransactionItem[]) {
  const groups: Record<string, TransactionItem[]> = {};
  txs.forEach(tx => {
    if (!groups[tx.date]) groups[tx.date] = [];
    groups[tx.date].push(tx);
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

export default function TransactionsClient({ initialData }: { initialData: TransactionItem[] }) {
  const [search, setSearch]       = useState("");
  const [member, setMember]       = useState("全部");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [showFilter, setShowFilter] = useState(false);

  const filtered = initialData.filter(tx => {
    const searchTarget = `${tx.name} ${tx.category} ${tx.merchantName || ""} ${tx.note || ""}`;
    const matchSearch = searchTarget.includes(search);
    const matchMember = member === "全部" || tx.member === member;
    const matchType   = typeFilter === "全部"
      || (typeFilter === "支出" && tx.type === "EXPENSE")
      || (typeFilter === "收入" && tx.type === "INCOME");
    return matchSearch && matchMember && matchType;
  });

  const totalExpense = filtered.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome  = filtered.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const grouped = groupByDate(filtered);

  return (
    <div className="px-4 pt-6 pb-2 max-w-lg mx-auto">

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

      {/* ── 篩選面板 ── */}
      {showFilter && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass-card p-4 mb-3 overflow-hidden"
        >
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>成員</p>
          <div className="flex gap-2 mb-3">
            {MEMBERS.map(m => (
              <button key={m} onClick={() => setMember(m)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: member === m ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
                  color: member === m ? "#6366f1" : "var(--text-secondary)",
                  border: member === m ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
                }}>
                {m}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>類型</p>
          <div className="flex gap-2">
            {TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: typeFilter === t ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
                  color: typeFilter === t ? "#6366f1" : "var(--text-secondary)",
                  border: typeFilter === t ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
                }}>
                {t}
              </button>
            ))}
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
        Object.entries(grouped).map(([date, txs]) => (
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
                  className="glass-card px-3.5 py-3 flex items-start gap-3"
                >
                  {/* Icon + 成員頭貼 */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      {tx.icon}
                    </div>
                    <div className="absolute -bottom-1 -right-1 ring-2 ring-[var(--bg-surface)] rounded-full">
                      <Avatar initial={tx.avatar} />
                    </div>
                  </div>

                  {/* 描述區 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-semibold truncate flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                        {tx.merchantName || tx.category}
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
                        {tx.category}
                      </span>
                      {tx.walletName && (
                        <span className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                          style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                          <span>{WALLET_ICONS[tx.walletType || "OTHER"] || "💳"}</span>
                          {tx.walletName}
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
    </div>
  );
}
