"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { X, Calendar, FileText, Camera, Check } from "lucide-react";

// ── 預設分類資料 ────────────────────────────────────
const EXPENSE_CATEGORIES = [
  { id: "food",      icon: "🍜", label: "飲食" },
  { id: "transport", icon: "🚇", label: "交通" },
  { id: "shopping",  icon: "🛍️", label: "購物" },
  { id: "medical",   icon: "💊", label: "醫療" },
  { id: "bill",      icon: "📱", label: "帳單" },
  { id: "entertain", icon: "🎬", label: "娛樂" },
  { id: "education", icon: "📚", label: "教育" },
  { id: "other",     icon: "📦", label: "其他" },
];

const INCOME_CATEGORIES = [
  { id: "salary",    icon: "💰", label: "薪資" },
  { id: "bonus",     icon: "🎁", label: "獎金" },
  { id: "invest",    icon: "📈", label: "投資" },
  { id: "other_in",  icon: "💵", label: "其他" },
];

// ── 自訂數字鍵盤按鍵 ────────────────────────────────
const KEYS = [
  "1","2","3",
  "4","5","6",
  "7","8","9",
  ".","0","⌫",
];

interface QuickAddDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function QuickAddDrawer({ open, onClose }: QuickAddDrawerProps) {
  const [type, setType]             = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount]         = useState("0");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [note, setNote]             = useState("");
  const [showNote, setShowNote]     = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const categories = type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const canSubmit  = parseFloat(amount) > 0 && selectedCat !== null;

  // ── 重置狀態 ──────────────────────────────────────
  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setAmount("0");
      setSelectedCat(null);
      setNote("");
      setShowNote(false);
      setSubmitted(false);
      setType("EXPENSE");
    }, 300);
  }, [onClose]);

  // ── 按鍵邏輯 ─────────────────────────────────────
  const handleKey = (key: string) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(30); // 觸覺回饋
    }
    setAmount(prev => {
      if (key === "⌫") {
        const next = prev.slice(0, -1);
        return next === "" || next === "-" ? "0" : next;
      }
      if (key === "." && prev.includes(".")) return prev;
      if (prev === "0" && key !== ".") return key;
      if (prev.replace(".", "").length >= 8) return prev; // 最多 8 位數
      return prev + key;
    });
  };

  // ── 送出 ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitted(true);
    // TODO: 呼叫 API，此處為示意
    await new Promise(r => setTimeout(r, 800));
    handleClose();
  };

  const isExpense = type === "EXPENSE";
  const gradientColor = isExpense
    ? "linear-gradient(135deg, #f43f5e, #fb923c)"
    : "linear-gradient(135deg, #10b981, #06b6d4)";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          />

          {/* 抽屜主體 */}
          <motion.div
            key="drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto rounded-t-3xl flex flex-col"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderBottom: "none",
              maxHeight: "92dvh", // 限制最高高度，確保不超出螢幕
            }}
          >
            {/* 允許內部滾動區塊 */}
            <div className="overflow-y-auto flex-1 flex flex-col" style={{ scrollbarWidth: "none" }}>
            {/* 拖曳把手 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--border-hover)" }} />
            </div>

            {/* 關閉按鈕 */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "var(--bg-card)" }}
            >
              <X size={14} style={{ color: "var(--text-secondary)" }} />
            </button>

            {/* ── 頂部：類型切換 + 金額顯示 ── */}
            <div className="px-6 pt-2 pb-4">
              {/* 支出 / 收入切換 */}
              <div className="flex gap-2 mb-4 p-1 rounded-xl w-fit mx-auto"
                style={{ background: "var(--bg-card)" }}>
                {(["EXPENSE", "INCOME"] as const).map(t => (
                  <motion.button
                    key={t}
                    onClick={() => { setType(t); setSelectedCat(null); }}
                    className="px-5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    animate={{
                      background: type === t ? (t === "EXPENSE" ? "#f43f5e" : "#10b981") : "transparent",
                      color: type === t ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {t === "EXPENSE" ? "支出" : "收入"}
                  </motion.button>
                ))}
              </div>

              {/* 金額大顯示 */}
              <div className="text-center mb-2">
                <motion.div
                  key={amount}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.1 }}
                >
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>NT$</span>
                  <span className="text-5xl font-bold ml-1 tabular-nums"
                    style={{ color: "var(--text-primary)" }}>
                    {parseFloat(amount || "0").toLocaleString("zh-TW", {
                      minimumFractionDigits: amount.includes(".") ? Math.min(amount.split(".")[1]?.length ?? 0, 2) : 0,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </motion.div>
              </div>
            </div>

            {/* ── 分類橫向滾動列 ── */}
            <div className="px-4 pb-4 overflow-x-auto flex gap-3 scrollbar-hide"
              style={{ scrollbarWidth: "none" }}>
              {categories.map(cat => (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedCat(cat.id)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all"
                    style={{
                      background: selectedCat === cat.id ? gradientColor : "var(--bg-card)",
                      border: selectedCat === cat.id ? "none" : "1px solid var(--border)",
                      boxShadow: selectedCat === cat.id ? "0 4px 12px rgba(99,102,241,0.3)" : "none",
                    }}
                  >
                    {cat.icon}
                  </div>
                  <span className="text-[10px]"
                    style={{ color: selectedCat === cat.id ? "#fff" : "var(--text-muted)" }}>
                    {cat.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* 分隔線 */}
            <div className="h-px mx-4 mb-3" style={{ background: "var(--border)" }} />

            {/* ── 附加選項列 ── */}
            <div className="flex gap-2 px-4 mb-3">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}>
                <Calendar size={12} />今天
              </button>
              <button
                onClick={() => setShowNote(n => !n)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{
                  background: showNote ? "rgba(99,102,241,0.15)" : "var(--bg-card)",
                  color: showNote ? "#6366f1" : "var(--text-secondary)",
                  border: showNote ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                }}
              >
                <FileText size={12} />備註
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}>
                <Camera size={12} />拍照
              </button>
            </div>

            {/* 備註輸入框 */}
            <AnimatePresence>
              {showNote && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 mb-3"
                >
                  <input
                    type="text"
                    placeholder="加個備註..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 自訂數字鍵盤 ── */}
            <div className="grid grid-cols-3 gap-2 px-4 pb-2">
              {KEYS.map(key => (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleKey(key)}
                  className="h-14 rounded-2xl flex items-center justify-center text-xl font-semibold"
                  style={{
                    background: key === "⌫" ? "var(--bg-overlay)" : "var(--bg-card)",
                    color: key === "⌫" ? "#f43f5e" : "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {key}
                </motion.button>
              ))}
            </div>

            {/* ── 送出按鈕 ── */}
            <div className="px-4 pt-2 pb-8">
              <motion.button
                onClick={handleSubmit}
                disabled={!canSubmit}
                whileTap={canSubmit ? { scale: 0.97 } : {}}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-base transition-all"
                animate={{
                  background: canSubmit ? gradientColor : "var(--bg-card)",
                  color: canSubmit ? "#fff" : "var(--text-muted)",
                  boxShadow: canSubmit ? "0 0 30px rgba(99,102,241,0.25)" : "none",
                }}
              >
                {submitted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Check size={22} />
                  </motion.div>
                ) : (
                  <>
                    {canSubmit ? (isExpense ? "💸" : "💰") : "🔒"}
                    <span>{canSubmit ? "確認記帳" : "請選擇分類與金額"}</span>
                  </>
                )}
              </motion.button>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
