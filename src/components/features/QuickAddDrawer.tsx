"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { X, Check, ChevronLeft, Plus } from "lucide-react";
import { getAccessibleWallets } from "@/app/actions/wallet";
import { getCategories, createChildCategory } from "@/app/actions/category";
import { getMerchants } from "@/app/actions/merchant";
import { addTransaction } from "@/app/actions/transaction";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────
type WalletItem = { id: string; name: string; type: string; visibility: string; balance?: number };
type CategoryChild = { id: string; name: string; icon: string | null };
type CategoryParent = { id: string; name: string; type: string; icon: string | null; children: CategoryChild[] };
type MerchantItem = { id: string; name: string };
type Panel = "category" | "wallet" | "date" | "merchant" | "recurring" | "note" | "numpad";

const RECURRING_OPTIONS = [
  { value: "NONE", label: "單次不重複" },
  { value: "DAILY", label: "每日" },
  { value: "WORKDAY", label: "工作日" },
  { value: "WEEKLY", label: "每週" },
  { value: "BIWEEKLY", label: "每雙週" },
  { value: "MONTHLY", label: "每月" },
  { value: "INSTALLMENT", label: "分期付款" },
];

const WALLET_ICONS: Record<string, string> = { CASH: "💵", BANK: "🏦", CREDIT_CARD: "💳", E_WALLET: "📱", OTHER: "💰" };

// ── 計算機邏輯 ──────────────────────────────────────────────────────────
function evalExpr(expr: string): number {
  try {
    // 移除尾部多餘的運算符再計算
    let clean = expr.replace(/[+\-×÷]+$/, "");
    clean = clean.replace(/×/g, "*").replace(/÷/g, "/");
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${clean})`)();
    return isNaN(result) || !isFinite(result) ? 0 : Math.round(result * 100) / 100;
  } catch { return 0; }
}

// ── Components ────────────────────────────────────────────────────────
function ListRow({ icon, label, value, onClick, active }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-3.5 px-4 mb-1 transition-all rounded-xl"
      style={{ background: active ? "rgba(99,102,241,0.1)" : "transparent" }}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{label}</span>
      </div>
      <div className="flex items-center gap-2 max-w-[65%]">
        <span className="text-sm font-medium truncate" style={{ color: active ? "#6366f1" : "var(--text-secondary)" }}>{value}</span>
      </div>
    </button>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────
export default function QuickAddDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── 記帳欄位 ────────────────────────────────────────────────────────
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [expr, setExpr] = useState("0");           
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [merchantInput, setMerchantInput] = useState("");
  const [recurringType, setRecurringType] = useState("NONE");
  const [installments, setInstallments] = useState(3);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ── UI 狀態 ─────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<Panel>("numpad");
  const [catTab, setCatTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");   
  const [drillParentId, setDrillParentId] = useState<string | null>(null); 
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null); 
  const [newChildName, setNewChildName] = useState("");
  const [newChildIcon, setNewChildIcon] = useState("📦");

  // ── 資料 ─────────────────────────────────────────────────────────────
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryParent[]>([]);
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);

  const categories = useMemo(() => allCategories.filter(c => c.type === catTab), [allCategories, catTab]);

  // 初始化
  useEffect(() => {
    if (!open) return;
    Promise.all([getAccessibleWallets(), getCategories(), getMerchants()])
      .then(([w, c, m]) => {
        setWallets(w as WalletItem[]);
        if (w.length > 0 && !selectedWalletId) setSelectedWalletId((w as WalletItem[])[0].id);
        setAllCategories(c as CategoryParent[]);
        setMerchants(m as MerchantItem[]);
      });
  }, [open]);

  // 重置
  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setExpr("0"); setSelectedParent(null); setSelectedChild(null);
      setNote(""); setSubmitted(false); setType("EXPENSE"); setCatTab("EXPENSE");
      setActivePanel("numpad"); setDrillParentId(null); setAddingChildFor(null);
      setMerchantInput(""); setNewChildName(""); setNewChildIcon("📦");
      setRecurringType("NONE");
      setSelectedDate(new Date().toISOString().split("T")[0]);
    }, 300);
  }, [onClose]);

  // ── 鍵盤處理 ───────────────────────────────────────────────────────
  const hasOp = /[+\-×÷]/.test(expr);
  const handleKey = (key: string) => {
    if (key === "AC") { setExpr("0"); return; }
    if (key === "⌫") { setExpr(prev => prev.length > 1 ? prev.slice(0, -1) : "0"); return; }
    
    // 如果是 OK/Submit 鍵
    if (key === "OK") {
      if (hasOp) {
        // 純計算
        setExpr(String(evalExpr(expr)));
      } else {
        // 送出記帳
        handleSubmit();
      }
      return;
    }

    // 運算符
    if (["+", "-", "×", "÷"].includes(key)) {
      setExpr(prev => {
        const last = prev.slice(-1);
        if (["+", "-", "×", "÷"].includes(last)) return prev.slice(0, -1) + key;
        return prev + key;
      });
      return;
    }

    // 小數點
    if (key === ".") { 
      const parts = expr.split(/[+\-×÷]/); 
      if (!parts[parts.length - 1].includes(".")) setExpr(prev => prev + "."); 
      return; 
    }

    // 數字
    setExpr(prev => prev === "0" ? key : prev + key);
  };

  const finalAmount = evalExpr(expr);
  const canSubmit = selectedChild !== null && finalAmount > 0 && !hasOp; // 必須沒有運算符才能送出

  const handleSubmit = async () => {
    if (!canSubmit || submitted) return;
    setSubmitted(true);
    try {
      const ts = new Date(selectedDate).getTime() + (new Date().getTime() % 86400000);
      await addTransaction({ 
        type, 
        amount: finalAmount, 
        categoryId: selectedChild!, 
        date: ts, 
        note, 
        walletId: selectedWalletId || undefined, 
        merchantName: merchantInput,
        recurringType: recurringType as any,
        installments: recurringType === "INSTALLMENT" ? installments : null
      });
      router.refresh();
      getAccessibleWallets().then(w => setWallets(w as WalletItem[]));
      setTimeout(() => handleClose(), 600);
    } catch (e) {
      console.error(e);
      setSubmitted(false);
      alert("儲存失敗，請重試");
    }
  };

  const handleAddChild = (parentId: string) => {
    if (!newChildName.trim()) return;
    startTransition(async () => {
      try {
        await createChildCategory({ name: newChildName.trim(), icon: newChildIcon, parentId });
        const updated = await getCategories() as CategoryParent[];
        setAllCategories(updated);
        const parent = updated.find(p => p.id === parentId);
        const newChild = parent?.children.find(c => c.name === newChildName.trim());
        if (newChild) { 
          setSelectedParent(parentId); 
          setSelectedChild(newChild.id); 
          setType(catTab); 
          setActivePanel("numpad"); 
        }
        setAddingChildFor(null); setNewChildName(""); setNewChildIcon("📦");
      } catch (e: any) { alert(e.message); }
    });
  };

  const togglePanel = (panel: Panel) => {
    setActivePanel(prev => prev === panel ? "numpad" : panel);
  };

  const accentColor = type === "EXPENSE" ? "#f43f5e" : "#10b981";
  const todayStr = new Date().toISOString().split("T")[0];
  const displayDate = selectedDate === todayStr ? "今天" : selectedDate.replace(/-/g, "/");
  const selectedCatParent = allCategories.find(c => c.id === selectedParent);
  const selectedCatChild = selectedCatParent?.children.find(c => c.id === selectedChild);
  const categoryName = selectedCatChild ? `${selectedCatParent?.icon} ${selectedCatParent?.name} > ${selectedCatChild.name}` : "尚未選擇";
  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  const CALC_KEYS = [
    ["7","8","9","÷"],
    ["4","5","6","×"],
    ["1","2","3","-"],
    [".","0","⌫","+"],
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />

          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[70] mx-auto w-full max-w-lg flex flex-col rounded-t-[2rem] shadow-2xl"
            style={{ height: "92vh", background: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}
          >
            {/* 拖拉條 */}
            <div className="flex justify-center pt-3 pb-1" onClick={handleClose}>
              <div className="w-12 h-1.5 rounded-full" style={{ background: "var(--border)" }} />
            </div>

            {/* ── 頂部：算式 or 金額顯示 ── */}
            <div className="px-5 py-4 border-b text-right flex flex-col items-end justify-center min-h-[90px]" style={{ borderColor: "var(--border)" }}>
              <motion.div key={expr} initial={{ scale: 1.02 }} animate={{ scale: 1 }} className="flex items-baseline justify-end gap-1 w-full overflow-hidden">
                <span className="text-sm font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>NT$</span>
                <span className="font-bold tabular-nums tracking-tight truncate"
                  style={{ fontSize: expr.length > 8 ? "2.5rem" : "3.5rem", color: accentColor }}>
                  {expr}
                </span>
              </motion.div>
            </div>

            {/* ── 中間：直列欄位清單 (可滑動) ── */}
            <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
              <ListRow icon="📅" label="日期" value={displayDate} onClick={() => togglePanel("date")} active={activePanel==="date"} />
              <ListRow icon="🏷️" label="分類" value={categoryName} onClick={() => togglePanel("category")} active={activePanel==="category"} />
              <ListRow icon="💳" label="帳戶" value={selectedWallet ? `${selectedWallet.name}${selectedWallet.visibility === "FAMILY" ? " 👥" : ""}` : "尚未選擇"} onClick={() => togglePanel("wallet")} active={activePanel==="wallet"} />
              <ListRow icon="🏪" label="商家" value={merchantInput || "尚未輸入"} onClick={() => togglePanel("merchant")} active={activePanel==="merchant"} />
              <ListRow icon="🔄" label="週期" value={RECURRING_OPTIONS.find(r=>r.value===recurringType)?.label ?? "單次"} onClick={() => togglePanel("recurring")} active={activePanel==="recurring"} />
              <ListRow icon="📝" label="備註" value={note || "點擊輸入"} onClick={() => togglePanel("note")} active={activePanel==="note"} />
            </div>

            {/* ── 底部：固定高度面板區 (取代鍵盤) ── */}
            <div className="h-[290px] border-t flex flex-col" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
              
              {/* 非數字鍵盤面板時，頂部顯示返回按鈕與標題 */}
              {activePanel !== "numpad" && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-surface)]">
                  <span className="text-sm font-bold text-[var(--text-secondary)]">
                    {activePanel === "category" ? "選擇分類" : activePanel === "wallet" ? "選擇帳戶" : activePanel === "date" ? "選擇日期" : activePanel === "merchant" ? "輸入商家" : activePanel === "recurring" ? "設定週期" : "填寫備註"}
                  </span>
                  <button onClick={() => setActivePanel("numpad")} className="p-1 rounded-full bg-[var(--bg-card)]">
                    <X size={18} style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>
              )}

              {/* === 各式面板內容 === */}
              <div className="flex-1 overflow-y-auto relative">
                
                {/* 1. 數字鍵盤 (預設) */}
                {activePanel === "numpad" && (
                  <div className="p-3 h-full flex flex-col justify-between">
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {CALC_KEYS.map((row, ri) =>
                        row.map((key, ci) => {
                          const isOp = ["+", "-", "×", "÷"].includes(key);
                          const isDel = key === "⌫";
                          return (
                            <motion.button key={`${ri}-${ci}`} whileTap={{ scale: 0.85 }} onClick={() => handleKey(key)}
                              className="h-11 rounded-xl flex items-center justify-center text-[1.3rem] font-semibold"
                              style={{
                                background: isOp ? "rgba(99,102,241,0.15)" : isDel ? "rgba(244,63,94,0.1)" : "var(--bg-surface)",
                                color: isOp ? "#6366f1" : isDel ? "#f43f5e" : "var(--text-primary)",
                                border: "1px solid var(--border)",
                              }}>
                              {key}
                            </motion.button>
                          );
                        })
                      )}
                    </div>
                    {/* AC 與 OK 列 */}
                    <div className="grid grid-cols-4 gap-2 flex-1">
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleKey("AC")}
                        className="col-span-1 rounded-xl flex items-center justify-center text-lg font-bold"
                        style={{ background: "rgba(244,63,94,0.15)", color: "#f43f5e", border: "1px solid var(--border)" }}>
                        AC
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleKey("OK")}
                        className="col-span-3 rounded-xl flex items-center justify-center text-lg font-bold transition-colors"
                        style={{ background: hasOp ? "rgba(99,102,241,0.2)" : (canSubmit ? accentColor : "var(--bg-surface)"), color: hasOp ? "#6366f1" : (canSubmit ? "#fff" : "var(--text-muted)"), border: "1px solid var(--border)" }}>
                        {submitted ? <Check size={24} /> : (hasOp ? "= OK" : (canSubmit ? "✓ 儲存" : "請選分類與金額"))}
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* 2. 分類面板 */}
                {activePanel === "category" && (
                  <div className="p-3">
                    <div className="flex gap-1 mb-3">
                      {(["EXPENSE", "INCOME"] as const).map(t => (
                        <button key={t} onClick={() => { setCatTab(t); setDrillParentId(null); }}
                          className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background: catTab === t ? (t === "EXPENSE" ? "rgba(244,63,94,0.2)" : "rgba(16,185,129,0.2)") : "transparent", color: catTab === t ? (t === "EXPENSE" ? "#f43f5e" : "#10b981") : "var(--text-muted)", border: catTab === t ? "none" : "1px solid transparent" }}>
                          {t === "EXPENSE" ? "💸 支出" : "💰 收入"}
                        </button>
                      ))}
                    </div>
                    {!drillParentId ? (
                      <div className="grid grid-cols-4 gap-2">
                        {categories.map(cat => (
                          <button key={cat.id} onClick={() => setDrillParentId(cat.id)}
                            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                            style={{ background: selectedParent === cat.id ? `${catTab === "EXPENSE" ? "rgba(244,63,94,0.15)" : "rgba(16,185,129,0.15)"}` : "var(--bg-surface)", border: "1px solid var(--border)" }}>
                            <span className="text-2xl">{cat.icon}</span>
                            <span className="text-xs text-center" style={{ color: "var(--text-primary)" }}>{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <button onClick={() => setDrillParentId(null)} className="flex items-center gap-1 mb-3 text-sm font-semibold text-indigo-400">
                          <ChevronLeft size={16} /> 回大項
                        </button>
                        <div className="flex flex-wrap gap-2">
                          {categories.find(c => c.id === drillParentId)?.children.map(child => (
                            <button key={child.id} onClick={() => {
                              setSelectedParent(drillParentId!); setSelectedChild(child.id); setType(catTab); setActivePanel("numpad");
                            }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
                              style={{ background: selectedChild === child.id ? (catTab === "EXPENSE" ? "#f43f5e" : "#10b981") : "var(--bg-surface)", color: selectedChild === child.id ? "#fff" : "var(--text-primary)", border: selectedChild === child.id ? "none" : "1px solid var(--border)" }}>
                              {child.icon} {child.name}
                            </button>
                          ))}
                          {addingChildFor !== drillParentId ? (
                            <button onClick={() => { setAddingChildFor(drillParentId); setNewChildName(""); setNewChildIcon("📦"); }}
                              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                              style={{ border: "1.5px dashed var(--border)", color: "var(--text-muted)" }}>
                              <Plus size={14} /> 新增
                            </button>
                          ) : (
                            <div className="w-full mt-2 flex gap-2">
                              <input value={newChildIcon} onChange={e => setNewChildIcon(e.target.value)} maxLength={2}
                                className="w-12 h-10 text-center rounded-xl text-lg outline-none flex-shrink-0"
                                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
                              <input value={newChildName} onChange={e => setNewChildName(e.target.value)} placeholder="輸入名稱..."
                                autoFocus className="flex-1 h-10 px-3 rounded-xl text-sm outline-none bg-transparent border border-[var(--border)]" />
                              <button onClick={() => handleAddChild(drillParentId!)} disabled={isPending || !newChildName.trim()}
                                className="px-4 h-10 rounded-xl text-sm font-bold bg-indigo-500 text-white disabled:opacity-50">
                                {isPending ? "..." : "確定"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. 帳戶面板 */}
                {activePanel === "wallet" && (
                  <div className="p-3 flex flex-col gap-2">
                    {[...wallets].sort((a, b) => (a.visibility === "FAMILY" ? -1 : 1)).map(w => (
                      <button key={w.id} onClick={() => { setSelectedWalletId(w.id); setActivePanel("numpad"); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left"
                        style={{ background: selectedWalletId === w.id ? "rgba(99,102,241,0.15)" : "var(--bg-surface)", border: selectedWalletId === w.id ? "1.5px solid rgba(99,102,241,0.4)" : "1px solid var(--border)", color: "var(--text-primary)" }}>
                        <span className="text-xl">{WALLET_ICONS[w.type] ?? "💰"}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{w.name}</span>
                            {w.visibility === "FAMILY" && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400">👥 共同</span>}
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">餘額 NT$ {w.balance?.toLocaleString() || 0}</span>
                        </div>
                        {selectedWalletId === w.id && <Check size={18} className="text-indigo-500" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* 4. 日期面板 */}
                {activePanel === "date" && (
                  <div className="p-4">
                    <div className="flex gap-2 mb-4">
                      {["今天", "昨天", "前天"].map((label, i) => {
                        const d = new Date(); d.setDate(d.getDate() - i);
                        const dStr = d.toISOString().split("T")[0];
                        return (
                          <button key={label} onClick={() => { setSelectedDate(dStr); setActivePanel("numpad"); }}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                            style={{ background: selectedDate === dStr ? "rgba(99,102,241,0.2)" : "var(--bg-surface)", color: selectedDate === dStr ? "#6366f1" : "var(--text-muted)", border: "1px solid var(--border)" }}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setActivePanel("numpad"); }}
                      className="w-full px-4 py-3 rounded-xl text-base outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]" />
                  </div>
                )}

                {/* 5. 商家面板 */}
                {activePanel === "merchant" && (
                  <div className="p-4 flex flex-col h-full">
                    <div className="flex gap-2">
                      <input type="text" value={merchantInput} onChange={e => setMerchantInput(e.target.value)} placeholder="輸入商家名稱..." autoFocus
                        className="flex-1 px-4 py-3 rounded-xl text-sm outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]" />
                      <button onClick={() => setActivePanel("numpad")} className="px-5 rounded-xl text-sm font-bold bg-indigo-500 text-white">確定</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 overflow-y-auto">
                      {merchants.filter(m => m.name.includes(merchantInput)).slice(0, 10).map(m => (
                        <button key={m.id} onClick={() => { setMerchantInput(m.name); setActivePanel("numpad"); }}
                          className="px-4 py-2 rounded-xl text-sm bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white">
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. 週期面板 */}
                {activePanel === "recurring" && (
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {RECURRING_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => { setRecurringType(opt.value); if(opt.value!=="INSTALLMENT") setActivePanel("numpad"); }}
                          className="px-4 py-2 rounded-xl text-sm font-semibold"
                          style={{ background: recurringType === opt.value ? "rgba(99,102,241,0.2)" : "var(--bg-surface)", color: recurringType === opt.value ? "#6366f1" : "var(--text-secondary)", border: "1px solid var(--border)" }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {recurringType === "INSTALLMENT" && (
                      <div className="mt-6 flex items-center justify-between p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
                        <span className="text-sm font-bold text-[var(--text-primary)]">分期總期數</span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setInstallments(n => Math.max(2,n-1))} className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xl font-bold">-</button>
                          <span className="text-xl font-bold w-8 text-center">{installments}</span>
                          <button onClick={() => setInstallments(n => Math.min(36,n+1))} className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xl font-bold">+</button>
                        </div>
                        <button onClick={() => setActivePanel("numpad")} className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-500 text-white">設定</button>
                      </div>
                    )}
                  </div>
                )}

                {/* 7. 備註面板 */}
                {activePanel === "note" && (
                  <div className="p-4 flex gap-2">
                    <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="加個備註..." autoFocus
                      className="flex-1 px-4 py-3 rounded-xl text-sm outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]" />
                    <button onClick={() => setActivePanel("numpad")} className="px-5 rounded-xl text-sm font-bold bg-indigo-500 text-white">確定</button>
                  </div>
                )}
                
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
