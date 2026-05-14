"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import { useState } from "react";
import { CountUp } from "@/components/ui/CountUp";

// ── 模擬資料（之後替換成 React Query API 呼叫）──────
const MOCK_BUDGET = 30000;
const MOCK_SPENT  = 18450;
const MOCK_INCOME = 55000;

const MOCK_TRANSACTIONS = [
  { id: "1", icon: "🍜", name: "晚餐 - 火鍋",    category: "飲食", amount: -680,  member: "小明", avatar: "M", date: "今天 19:30" },
  { id: "2", icon: "🚇", name: "悠遊卡儲值",      category: "交通", amount: -500,  member: "小花", avatar: "H", date: "今天 08:12" },
  { id: "3", icon: "💰", name: "五月份薪資",      category: "收入", amount: 55000, member: "小明", avatar: "M", date: "昨天 09:00" },
  { id: "4", icon: "🛒", name: "好市多採購",      category: "購物", amount: -3200, member: "小花", avatar: "H", date: "05/12" },
  { id: "5", icon: "💊", name: "藥局",            category: "醫療", amount: -450,  member: "小明", avatar: "M", date: "05/11" },
];

const CHART_DATA = [
  { name: "已花費", value: MOCK_SPENT },
  { name: "剩餘",   value: Math.max(MOCK_BUDGET - MOCK_SPENT, 0) },
];
const CHART_COLORS = ["#6366f1", "#1c1c27"];

const MONTHS = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];

// ── 元件：數字動畫 ─────────────────────────────────
function AnimatedAmount({ value, isIncome = false }: { value: number; isIncome?: boolean }) {
  const color = isIncome ? "#10b981" : value < 0 ? "#f43f5e" : "var(--text-primary)";
  const prefix = isIncome ? "+" : value < 0 ? "" : "";
  return (
    <span style={{ color }} className="font-semibold tabular-nums">
      {prefix}NT${Math.abs(value).toLocaleString()}
    </span>
  );
}

// ── 元件：成員頭像 ─────────────────────────────────
function Avatar({ initial }: { initial: string }) {
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
      style={{ background: initial === "M" ? "#6366f1" : "#ec4899" }}>
      {initial}
    </div>
  );
}

// ── 主頁面 ─────────────────────────────────────────
export default function DashboardPage() {
  const now = new Date();
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const spentPct = Math.min((MOCK_SPENT / MOCK_BUDGET) * 100, 100);
  const remaining = MOCK_BUDGET - MOCK_SPENT;

  return (
    <div className="px-4 pt-6 pb-2 max-w-lg mx-auto">

      {/* ── 頂部：標題列 ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>家庭帳本</p>
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Smith 家族 👨‍👩‍👧</h1>
        </div>
        <button className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <Bell size={16} style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      {/* ── 月份選擇器 ── */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => setMonthIdx(m => Math.max(0, m - 1))}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "var(--bg-card)" }}>
          <ChevronLeft size={14} style={{ color: "var(--text-secondary)" }} />
        </button>
        <span className="text-sm font-semibold w-24 text-center whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
          2025 年 {MONTHS[monthIdx]}
        </span>
        <button onClick={() => setMonthIdx(m => Math.min(11, m + 1))}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "var(--bg-card)" }}>
          <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      {/* ── 核心視覺：預算甜甜圈圖 ── */}
      <motion.div
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
            <span>已花費 NT${MOCK_SPENT.toLocaleString()}</span>
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
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(244,63,94,0.15)" }}>
              <TrendingDown size={14} color="#f43f5e" />
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>本月支出</span>
          </div>
          <CountUp
            end={MOCK_SPENT}
            prefix="NT$"
            duration={1200}
            className="text-lg font-bold"
            style={{ color: "#f43f5e" }}
          />
        </motion.div>

        {/* 收入 */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              <TrendingUp size={14} color="#10b981" />
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>本月收入</span>
          </div>
          <CountUp
            end={MOCK_INCOME}
            prefix="NT$"
            duration={1200}
            className="text-lg font-bold"
            style={{ color: "#10b981" }}
          />
        </motion.div>
      </div>

      {/* ── 最近交易明細 ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>最近記帳</h2>
          <button className="text-xs" style={{ color: "#6366f1" }}>查看全部</button>
        </div>

        <div className="flex flex-col gap-2">
          {MOCK_TRANSACTIONS.map((tx, i) => (
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
                  {tx.icon}
                </div>
                <div className="absolute -bottom-1 -right-1 ring-2 ring-[#0a0a0f] rounded-full">
                  <Avatar initial={tx.avatar} />
                </div>
              </div>

              {/* 描述 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {tx.name}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {tx.member} · {tx.date}
                </p>
              </div>

              {/* 金額 */}
              <AnimatedAmount value={tx.amount} isIncome={tx.amount > 0} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
