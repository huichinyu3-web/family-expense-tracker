"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, ChevronLeft, ChevronRight, Bell, User, Users } from "lucide-react";
import { useState, useMemo } from "react";
import { CountUp } from "@/components/ui/CountUp";

const CHART_COLORS = ["#6366f1", "#1c1c27"];
const MONTHS = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];

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
export default function DashboardClient({ transactions, currentUserId, userName, familyName }) {
  const now = new Date();
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [view, setView] = useState<"MY" | "FAMILY">("FAMILY");

  // 過濾資料 (依據月份與視角)
  const filteredTx = useMemo(() => {
    return transactions.filter((tx: any) => {
      const d = new Date(tx.date);
      const isSameMonth = d.getMonth() === monthIdx && d.getFullYear() === year;
      // 我的視角：只看我自己建立的
      const matchView = view === "FAMILY" || tx.userId === currentUserId;
      return isSameMonth && matchView;
    });
  }, [transactions, monthIdx, year, view, currentUserId]);

  const totalExpense = filteredTx.filter((tx: any) => tx.type === "EXPENSE").reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0);
  const totalIncome = filteredTx.filter((tx: any) => tx.type === "INCOME").reduce((sum: number, tx: any) => sum + tx.amount, 0);
  
  // 簡單寫死預算 (未來可開放在設定調整)
  const MOCK_BUDGET = view === "FAMILY" ? 50000 : 20000;
  const spentPct = Math.min((totalExpense / MOCK_BUDGET) * 100, 100) || 0;
  const remaining = MOCK_BUDGET - totalExpense;

  const CHART_DATA = [
    { name: "已花費", value: totalExpense },
    { name: "剩餘",   value: Math.max(remaining, 0) },
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
        
        {/* 視角切換器 */}
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

      {/* ── 月份選擇器 ── */}
      <div className="flex items-center justify-center gap-4 mb-6">
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
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>本月剩餘</p>
            <CountUp
              end={remaining}
              prefix="NT$"
              duration={1400}
              className="text-2xl font-bold"
              style={{ color: remaining > 0 ? "#10b981" : "#f43f5e" }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              已用 {spentPct.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* 預算進度條 */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            <span>已花費 NT${totalExpense.toLocaleString()}</span>
            <span>預算 NT${MOCK_BUDGET.toLocaleString()}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${spentPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "var(--gradient-primary)" }}
            />
          </div>
        </div>
      </motion.div>

      {/* ── 收支摘要卡片 ── */}
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
                  className="glass-card px-4 py-3 flex items-center gap-3"
                >
                  {/* 分類 Icon + 成員頭像 */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: "var(--bg-card)" }}>
                      {tx.category?.icon || "📦"}
                    </div>
                    <div className="absolute -bottom-1 -right-1 ring-2 ring-[#0a0a0f] rounded-full">
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
    </div>
  );
}
