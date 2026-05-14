"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { X, Calendar, FileText, Camera, Check, ChevronRight, Wallet, Store, RefreshCw } from "lucide-react";
import { addTransaction } from "@/app/actions/transaction";
import { getAccessibleWallets } from "@/app/actions/wallet";
import { getCategories } from "@/app/actions/category";
import { getMerchants } from "@/app/actions/merchant";

// ── 類型 ──────────────────────────────────────────────────────────────
type WalletItem = { id: string; name: string; type: string; visibility: string; };
type CategoryChild = { id: string; name: string; icon: string | null; };
type CategoryParent = { id: string; name: string; icon: string | null; type: string; children: CategoryChild[]; };
type MerchantItem = { id: string; name: string; };

const RECURRING_OPTIONS = [
  { value: "NONE",          label: "單次" },
  { value: "DAILY",         label: "每天" },
  { value: "WORKDAY",       label: "每個工作日" },
  { value: "WEEKLY",        label: "每週" },
  { value: "BIWEEKLY",      label: "每兩週" },
  { value: "MONTHLY",       label: "每月" },
  { value: "BIMONTHLY",     label: "每兩個月" },
  { value: "QUARTERLY",     label: "每三個月" },
  { value: "SEMIANNUALLY",  label: "每半年" },
  { value: "ANNUALLY",      label: "每年" },
  { value: "INSTALLMENT",   label: "分期付款" },
];

const WALLET_ICONS: Record<string, string> = {
  CASH: "💵", BANK: "🏦", CREDIT_CARD: "💳", E_WALLET: "📱", OTHER: "💰",
};

const KEYS = ["1","2","3","4","5","6","7","8","9",".","0","⌫"];

interface Props { open: boolean; onClose: () => void; }

export default function QuickAddDrawer({ open, onClose }: Props) {
  // ── 基本狀態 ──────────────────────────────────────────────────────
  const [type, setType]               = useState<"EXPENSE"|"INCOME">("EXPENSE");
  const [amount, setAmount]           = useState("0");
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedChild, setSelectedChild]   = useState<string | null>(null);
  const [note, setNote]               = useState("");
  const [submitted, setSubmitted]     = useState(false);

  // ── 進階選項 ──────────────────────────────────────────────────────
  const [showAdvanced, setShowAdvanced]       = useState(false);
  const [activePanel, setActivePanel]         = useState<"date"|"wallet"|"merchant"|"recurring"|"note"|null>(null);
  const [selectedDate, setSelectedDate]       = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [merchantInput, setMerchantInput]     = useState("");
  const [recurringType, setRecurringType]     = useState("NONE");
  const [installments, setInstallments]       = useState(3);

  // ── 資料 ──────────────────────────────────────────────────────────
  const [wallets, setWallets]       = useState<WalletItem[]>([]);
  const [categories, setCategories] = useState<CategoryParent[]>([]);
  const [merchants, setMerchants]   = useState<MerchantItem[]>([]);
  const [loading, setLoading]       = useState(false);

  // 開啟時載入資料
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      getAccessibleWallets(),
      getCategories(type),
      getMerchants(),
    ]).then(([w, c, m]) => {
      setWallets(w as WalletItem[]);
      setCategories(c as CategoryParent[]);
      setMerchants(m as MerchantItem[]);
    }).finally(() => setLoading(false));
  }, [open, type]);

  // 切換收支類型時重載分類
  useEffect(() => {
    if (!open) return;
    getCategories(type).then(c => {
      setCategories(c as CategoryParent[]);
      setSelectedParent(null);
      setSelectedChild(null);
    });
  }, [type]);

  // ── 重置 ──────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setAmount("0"); setSelectedParent(null); setSelectedChild(null);
      setNote(""); setSubmitted(false); setType("EXPENSE");
      setShowAdvanced(false); setActivePanel(null);
      setSelectedWalletId(null); setMerchantInput(""); setRecurringType("NONE");
      setSelectedDate(new Date().toISOString().split("T")[0]);
    }, 300);
  }, [onClose]);

  // ── 數字鍵盤 ──────────────────────────────────────────────────────
  const handleKey = (key: string) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(20);
    setAmount(prev => {
      if (key === "⌫") { const n = prev.slice(0,-1); return n === "" || n === "-" ? "0" : n; }
      if (key === "." && prev.includes(".")) return prev;
      if (prev === "0" && key !== ".") return key;
      if (prev.replace(".","").length >= 8) return prev;
      return prev + key;
    });
  };

  // ── 送出 ──────────────────────────────────────────────────────────
  const currentChildren = categories.find(p => p.id === selectedParent)?.children ?? [];
  const canSubmit = parseFloat(amount) > 0 && selectedChild !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitted(true);
    try {
      await addTransaction({
        amount: parseFloat(amount),
        type,
        categoryId: selectedChild!,
        note: note || undefined,
        date: new Date(selectedDate).getTime(),
        walletId: selectedWalletId ?? undefined,
        merchantName: merchantInput.trim() || undefined,
        recurringType: recurringType as never,
        installments: recurringType === "INSTALLMENT" ? installments : undefined,
      });
      await new Promise(r => setTimeout(r, 600));
      handleClose();
    } catch (e) {
      console.error(e);
      setSubmitted(false);
      alert("儲存失敗，請重試");
    }
  };

  const isExpense = type === "EXPENSE";
  const gradientColor = isExpense ? "linear-gradient(135deg,#f43f5e,#fb923c)" : "linear-gradient(135deg,#10b981,#06b6d4)";
  const accentColor  = isExpense ? "#f43f5e" : "#10b981";

  // 面板切換
  const togglePanel = (panel: typeof activePanel) => {
    setShowAdvanced(true);
    setActivePanel(prev => prev === panel ? null : panel);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩 */}
          <motion.div key="overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={handleClose} className="fixed inset-0 z-[60]"
            style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }} />

          {/* 抽屜主體 */}
          <motion.div key="drawer"
            initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
            transition={{ type:"spring", damping:28, stiffness:280 }}
            className="fixed bottom-0 left-0 right-0 z-[70] max-w-lg mx-auto rounded-t-3xl flex flex-col"
            style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", borderBottom:"none", maxHeight:"92dvh" }}
          >
            {/* 拖曳把手 */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background:"var(--border-hover)" }} />
            </div>

            {/* 關閉 */}
            <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background:"var(--bg-card)" }}>
              <X size={14} style={{ color:"var(--text-secondary)" }} />
            </button>

            {/* 可滾動內容區 */}
            <div className="overflow-y-auto flex-1 flex flex-col" style={{ scrollbarWidth:"none" }}>

              {/* ── 收支切換 ── */}
              <div className="px-6 pt-2">
                <div className="flex gap-2 mb-4 p-1 rounded-xl w-fit mx-auto" style={{ background:"var(--bg-card)" }}>
                  {(["EXPENSE","INCOME"] as const).map(t => (
                    <motion.button key={t} onClick={() => setType(t)}
                      className="px-5 py-1.5 rounded-lg text-xs font-semibold"
                      animate={{ background: type===t ? (t==="EXPENSE"?"#f43f5e":"#10b981") : "transparent", color: type===t ? "#fff" : "var(--text-muted)" }}>
                      {t === "EXPENSE" ? "支出" : "收入"}
                    </motion.button>
                  ))}
                </div>

                {/* ── 金額 ── */}
                <div className="text-center mb-4">
                  <motion.div key={amount} initial={{ scale:1.05 }} animate={{ scale:1 }} transition={{ duration:0.1 }}>
                    <span className="text-xs" style={{ color:"var(--text-muted)" }}>NT$</span>
                    <span className="text-5xl font-bold ml-1 tabular-nums" style={{ color:"var(--text-primary)" }}>
                      {parseFloat(amount||"0").toLocaleString("zh-TW",{ maximumFractionDigits:2 })}
                    </span>
                  </motion.div>
                </div>
              </div>

              {/* ── 大項選擇 ── */}
              <div className="px-4 pb-2">
                <p className="text-[10px] px-1 mb-2" style={{ color:"var(--text-muted)" }}>選擇大項</p>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
                  {loading ? (
                    <p className="text-xs" style={{ color:"var(--text-muted)" }}>載入中...</p>
                  ) : categories.map(cat => (
                    <motion.button key={cat.id} whileTap={{ scale:0.9 }}
                      onClick={() => { setSelectedParent(cat.id); setSelectedChild(null); }}
                      className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[56px]">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all"
                        style={{
                          background: selectedParent===cat.id ? gradientColor : "var(--bg-card)",
                          border: selectedParent===cat.id ? "none" : "1px solid var(--border)",
                        }}>
                        {cat.icon}
                      </div>
                      <span className="text-[9px] text-center leading-tight" style={{ color: selectedParent===cat.id ? accentColor : "var(--text-muted)" }}>
                        {cat.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── 細項選擇（有大項後才顯示） ── */}
              <AnimatePresence>
                {selectedParent && currentChildren.length > 0 && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }}
                    className="overflow-hidden px-4 pb-2">
                    <p className="text-[10px] px-1 mb-2" style={{ color:"var(--text-muted)" }}>選擇細項</p>
                    <div className="flex gap-2 flex-wrap">
                      {currentChildren.map(child => (
                        <motion.button key={child.id} whileTap={{ scale:0.9 }}
                          onClick={() => setSelectedChild(child.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                          style={{
                            background: selectedChild===child.id ? gradientColor : "var(--bg-card)",
                            color: selectedChild===child.id ? "#fff" : "var(--text-secondary)",
                            border: selectedChild===child.id ? "none" : "1px solid var(--border)",
                          }}>
                          {child.icon} {child.name}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── 分隔線 ── */}
              <div className="h-px mx-4 mb-3" style={{ background:"var(--border)" }} />

              {/* ── 快速選項列 ── */}
              <div className="flex flex-wrap gap-2 px-4 mb-2">
                {[
                  { key:"date",     icon:<Calendar size={12}/>,    label: selectedDate === new Date().toISOString().split("T")[0] ? "今天" : selectedDate.slice(5).replace("-","/") },
                  { key:"wallet",   icon:<Wallet size={12}/>,      label: wallets.find(w=>w.id===selectedWalletId)?.name ?? "帳戶" },
                  { key:"merchant", icon:<Store size={12}/>,       label: merchantInput || "商家" },
                  { key:"recurring",icon:<RefreshCw size={12}/>,   label: RECURRING_OPTIONS.find(r=>r.value===recurringType)?.label ?? "單次" },
                ].map(item => (
                  <button key={item.key}
                    onClick={() => togglePanel(item.key as typeof activePanel)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
                    style={{
                      background: activePanel===item.key ? "rgba(99,102,241,0.15)" : "var(--bg-card)",
                      color: activePanel===item.key ? "#6366f1" : "var(--text-secondary)",
                      border: activePanel===item.key ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                    }}>
                    {item.icon}{item.label}
                  </button>
                ))}
                <button onClick={() => setActivePanel(p => p==="note" ? null : "note")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
                  style={{
                    background: activePanel==="note" ? "rgba(99,102,241,0.15)" : "var(--bg-card)",
                    color: activePanel==="note" ? "#6366f1" : "var(--text-secondary)",
                    border: activePanel==="note" ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  }}>
                  <FileText size={12}/>{note || "備註"}
                </button>
              </div>

              {/* ── 進階面板 ── */}
              <AnimatePresence>
                {activePanel && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }}
                    className="overflow-hidden px-4 mb-2">
                    <div className="p-3 rounded-2xl" style={{ background:"var(--bg-card)", border:"1px solid var(--border)" }}>

                      {/* 日期面板 */}
                      {activePanel === "date" && (
                        <div>
                          <p className="text-xs font-medium mb-2" style={{ color:"var(--text-muted)" }}>選擇日期</p>
                          <input type="date" value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-primary)" }} />
                        </div>
                      )}

                      {/* 帳戶面板 */}
                      {activePanel === "wallet" && (
                        <div>
                          <p className="text-xs font-medium mb-2" style={{ color:"var(--text-muted)" }}>選擇帳戶</p>
                          {wallets.length === 0
                            ? <p className="text-xs" style={{ color:"var(--text-muted)" }}>尚無帳戶，請至設定中新增</p>
                            : <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                                {wallets.map(w => (
                                  <button key={w.id} onClick={() => setSelectedWalletId(w.id===selectedWalletId ? null : w.id)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm flex-shrink-0"
                                    style={{
                                      background: selectedWalletId===w.id ? "rgba(99,102,241,0.15)" : "var(--bg-surface)",
                                      border: selectedWalletId===w.id ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
                                      color: "var(--text-primary)",
                                    }}>
                                    <span>{WALLET_ICONS[w.type]??'💰'}</span>
                                    <span className="flex-1 text-left">{w.name}</span>
                                    {selectedWalletId===w.id && <Check size={13} style={{ color:"#6366f1" }} />}
                                  </button>
                                ))}
                              </div>
                          }
                        </div>
                      )}

                      {/* 商家面板 */}
                      {activePanel === "merchant" && (
                        <div>
                          <p className="text-xs font-medium mb-2" style={{ color:"var(--text-muted)" }}>商家名稱</p>
                          <input type="text" value={merchantInput}
                            onChange={e => setMerchantInput(e.target.value)}
                            placeholder="輸入商家名稱..."
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-2"
                            style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-primary)" }} />
                          {merchants.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {merchants.filter(m => m.name.includes(merchantInput)).slice(0,8).map(m => (
                                <button key={m.id} onClick={() => setMerchantInput(m.name)}
                                  className="px-2.5 py-1 rounded-lg text-xs"
                                  style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-secondary)" }}>
                                  {m.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 週期面板 */}
                      {activePanel === "recurring" && (
                        <div>
                          <p className="text-xs font-medium mb-2" style={{ color:"var(--text-muted)" }}>付款週期</p>
                          <div className="flex flex-wrap gap-1.5">
                            {RECURRING_OPTIONS.map(opt => (
                              <button key={opt.value} onClick={() => setRecurringType(opt.value)}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                                style={{
                                  background: recurringType===opt.value ? "rgba(99,102,241,0.2)" : "var(--bg-surface)",
                                  color: recurringType===opt.value ? "#6366f1" : "var(--text-secondary)",
                                  border: recurringType===opt.value ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
                                }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          {recurringType === "INSTALLMENT" && (
                            <div className="mt-3 flex items-center gap-3">
                              <p className="text-xs" style={{ color:"var(--text-muted)" }}>分期期數</p>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setInstallments(n => Math.max(2,n-1))}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-lg font-bold"
                                  style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-primary)" }}>-</button>
                                <span className="text-lg font-bold w-8 text-center" style={{ color:"var(--text-primary)" }}>{installments}</span>
                                <button onClick={() => setInstallments(n => Math.min(36,n+1))}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-lg font-bold"
                                  style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-primary)" }}>+</button>
                              </div>
                              <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                                每期 NT${(parseFloat(amount||"0")/installments).toFixed(0)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 備註面板 */}
                      {activePanel === "note" && (
                        <div>
                          <p className="text-xs font-medium mb-2" style={{ color:"var(--text-muted)" }}>備註</p>
                          <input type="text" value={note} onChange={e => setNote(e.target.value)}
                            placeholder="加個備註..."
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-primary)" }} />
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── 數字鍵盤 ── */}
              <div className="grid grid-cols-3 gap-2 px-4 pb-2">
                {KEYS.map(key => (
                  <motion.button key={key} whileTap={{ scale:0.9 }} onClick={() => handleKey(key)}
                    className="h-13 rounded-2xl flex items-center justify-center text-xl font-semibold"
                    style={{
                      height: "3.25rem",
                      background: key==="⌫" ? "var(--bg-overlay)" : "var(--bg-card)",
                      color: key==="⌫" ? "#f43f5e" : "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }}>
                    {key}
                  </motion.button>
                ))}
              </div>

              {/* ── 送出按鈕 ── */}
              <div className="px-4 pt-2 pb-8">
                <motion.button onClick={handleSubmit} disabled={!canSubmit}
                  whileTap={canSubmit ? { scale:0.97 } : {}}
                  className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-base"
                  animate={{
                    background: canSubmit ? gradientColor : "var(--bg-card)",
                    color: canSubmit ? "#fff" : "var(--text-muted)",
                  }}>
                  {submitted
                    ? <motion.div initial={{ scale:0 }} animate={{ scale:1 }}><Check size={22}/></motion.div>
                    : <>{canSubmit ? (isExpense?"💸":"💰") : "🔒"}<span>{canSubmit?"確認記帳":"請選擇大項與細項"}</span></>
                  }
                </motion.button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
