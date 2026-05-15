"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { X, Check, ChevronLeft, Plus } from "lucide-react";
import { getAccessibleWallets } from "@/app/actions/wallet";
import { getCategories, createChildCategory } from "@/app/actions/category";
import { getMerchants } from "@/app/actions/merchant";
import { addTransaction } from "@/app/actions/transaction";
import { useRouter } from "next/navigation";

type WalletItem = { id: string; name: string; type: string; visibility: string; balance?: number };
type CategoryChild = { id: string; name: string; icon: string | null };
type CategoryParent = { id: string; name: string; type: string; icon: string | null; children: CategoryChild[] };
type MerchantItem = { id: string; name: string };
type Panel = "category" | "wallet" | "date" | "merchant" | "note" | null;

const WALLET_ICONS: Record<string, string> = { CASH: "💵", BANK: "🏦", CREDIT_CARD: "💳", E_WALLET: "📱", OTHER: "💰" };

// ── 計算機邏輯 ──────────────────────────────────────────────────────────
function evalExpr(expr: string): number {
  try {
    const clean = expr.replace(/×/g, "*").replace(/÷/g, "/");
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${clean})`)();
    return isNaN(result) || !isFinite(result) ? 0 : Math.round(result * 100) / 100;
  } catch { return 0; }
}

export default function QuickAddDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── 記帳欄位 ────────────────────────────────────────────────────────
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [expr, setExpr] = useState("0");           // 算式字串（支援加減乘除）
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [merchantInput, setMerchantInput] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ── UI 狀態 ─────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [catTab, setCatTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");   // 分類面板的收支 tab
  const [drillParentId, setDrillParentId] = useState<string | null>(null); // 進入子分類
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null); // inline 新增子分類
  const [newChildName, setNewChildName] = useState("");
  const [newChildIcon, setNewChildIcon] = useState("📦");

  // ── 資料 ─────────────────────────────────────────────────────────────
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryParent[]>([]);
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [loading, setLoading] = useState(false);

  const displayAmount = useMemo(() => evalExpr(expr), [expr]);
  const categories = useMemo(() => allCategories.filter(c => c.type === catTab), [allCategories, catTab]);

  // ── 載入資料 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([getAccessibleWallets(), getCategories(), getMerchants()])
      .then(([w, c, m]) => {
        setWallets(w as WalletItem[]);
        if (w.length > 0 && !selectedWalletId) setSelectedWalletId((w as WalletItem[])[0].id);
        setAllCategories(c as CategoryParent[]);
        setMerchants(m as MerchantItem[]);
      }).finally(() => setLoading(false));
  }, [open]);

  // ── 重置 ─────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setExpr("0"); setSelectedParent(null); setSelectedChild(null);
      setNote(""); setSubmitted(false); setType("EXPENSE"); setCatTab("EXPENSE");
      setActivePanel(null); setDrillParentId(null); setAddingChildFor(null);
      setMerchantInput(""); setNewChildName(""); setNewChildIcon("📦");
      setSelectedDate(new Date().toISOString().split("T")[0]);
    }, 300);
  }, [onClose]);

  // ── 計算機鍵盤 ───────────────────────────────────────────────────────
  const handleKey = (key: string) => {
    if (key === "⌫") { setExpr(prev => prev.length > 1 ? prev.slice(0, -1) : "0"); return; }
    if (key === "=") { setExpr(String(evalExpr(expr))); return; }
    if (["+", "-", "×", "÷"].includes(key)) {
      setExpr(prev => {
        const last = prev.slice(-1);
        if (["+", "-", "×", "÷"].includes(last)) return prev.slice(0, -1) + key;
        return prev + key;
      });
      return;
    }
    if (key === ".") { const parts = expr.split(/[+\-×÷]/); if (!parts[parts.length - 1].includes(".")) setExpr(prev => prev + "."); return; }
    setExpr(prev => prev === "0" ? key : prev + key);
  };

  // ── 送出 ─────────────────────────────────────────────────────────────
  const canSubmit = selectedChild !== null && displayAmount > 0;
  const handleSubmit = async () => {
    if (!canSubmit || submitted) return;
    setSubmitted(true);
    try {
      const ts = new Date(selectedDate).getTime() + (new Date().getTime() % 86400000);
      await addTransaction({ type, amount: displayAmount, categoryId: selectedChild!, date: ts, note, walletId: selectedWalletId || undefined, merchantName: merchantInput });
      router.refresh();
      getAccessibleWallets().then(w => setWallets(w as WalletItem[]));
      setTimeout(() => handleClose(), 600);
    } catch (e) {
      console.error(e);
      setSubmitted(false);
      alert("儲存失敗，請重試");
    }
  };

  // ── 分類 inline 新增 ─────────────────────────────────────────────────
  const handleAddChild = (parentId: string) => {
    if (!newChildName.trim()) return;
    startTransition(async () => {
      try {
        const result = await createChildCategory({ name: newChildName.trim(), icon: newChildIcon, parentId });
        // 重新撈分類，並自動選取新增的
        const updated = await getCategories() as CategoryParent[];
        setAllCategories(updated);
        const parent = updated.find(p => p.id === parentId);
        const newChild = parent?.children.find(c => c.name === newChildName.trim());
        if (newChild) { setSelectedParent(parentId); setSelectedChild(newChild.id); setType(catTab); setActivePanel(null); }
        setAddingChildFor(null); setNewChildName(""); setNewChildIcon("📦");
      } catch (e: any) { alert(e.message); }
    });
  };

  // ── 輔助 ─────────────────────────────────────────────────────────────
  const accentColor = type === "EXPENSE" ? "#f43f5e" : "#10b981";
  const gradient = type === "EXPENSE" ? "linear-gradient(135deg,#f43f5e,#fb7185)" : "linear-gradient(135deg,#10b981,#34d399)";
  const todayStr = new Date().toISOString().split("T")[0];
  const displayDate = selectedDate === todayStr ? "今天" : selectedDate.replace(/-/g, "/");
  const selectedCatParent = allCategories.find(c => c.id === selectedParent);
  const selectedCatChild = selectedCatParent?.children.find(c => c.id === selectedChild);
  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  // 是否含有運算符（顯示算式）
  const hasOp = /[+\-×÷]/.test(expr);

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
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />

          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[70] mx-auto w-full max-w-lg flex flex-col rounded-t-[2rem] shadow-2xl"
            style={{ maxHeight: "92vh", background: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}
          >
            {/* 拖拉條 */}
            <div className="flex justify-center pt-3 pb-1" onClick={handleClose}>
              <div className="w-12 h-1.5 rounded-full" style={{ background: "var(--border)" }} />
            </div>

            {/* ── 金額 + 算式 ─── */}
            <div className="px-5 pt-2 pb-3 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>NT$</span>
                <motion.span key={displayAmount} initial={{ scale: 1.05 }} animate={{ scale: 1 }}
                  className="font-bold tabular-nums tracking-tight"
                  style={{ fontSize: hasOp ? "2rem" : "2.8rem", color: accentColor }}>
                  {displayAmount.toLocaleString("zh-TW", { maximumFractionDigits: 2 })}
                </motion.span>
              </div>
              {hasOp && (
                <p className="text-xs mt-0.5 tabular-nums" style={{ color: "var(--text-muted)" }}>{expr}</p>
              )}
            </div>

            {/* ── 膠囊摘要區 ── */}
            <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {/* 分類膠囊 */}
              <button onClick={() => { setActivePanel(activePanel === "category" ? null : "category"); setDrillParentId(null); setCatTab(type); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all"
                style={selectedCatChild
                  ? { background: `${accentColor}20`, color: accentColor, border: `1.5px solid ${accentColor}40` }
                  : { background: "transparent", border: "1.5px dashed var(--border)", color: "var(--text-muted)" }}>
                {selectedCatChild ? `${selectedCatParent?.icon} ${selectedCatParent?.name} › ${selectedCatChild.name}` : "選擇分類"}
              </button>

              {/* 帳戶膠囊 */}
              <button onClick={() => setActivePanel(activePanel === "wallet" ? null : "wallet")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all"
                style={selectedWallet
                  ? { background: "rgba(99,102,241,0.15)", color: "#6366f1", border: "1.5px solid rgba(99,102,241,0.35)" }
                  : { background: "transparent", border: "1.5px dashed var(--border)", color: "var(--text-muted)" }}>
                {selectedWallet ? `${WALLET_ICONS[selectedWallet.type] ?? "💰"} ${selectedWallet.name}${selectedWallet.visibility === "FAMILY" ? " 👥" : ""}` : "選擇帳戶"}
              </button>

              {/* 日期膠囊 */}
              <button onClick={() => setActivePanel(activePanel === "date" ? null : "date")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all"
                style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1.5px solid rgba(99,102,241,0.25)" }}>
                📅 {displayDate}
              </button>

              {/* 備註膠囊 */}
              <button onClick={() => setActivePanel(activePanel === "note" ? null : "note")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all"
                style={note
                  ? { background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1.5px solid rgba(245,158,11,0.35)" }
                  : { background: "transparent", border: "1.5px dashed var(--border)", color: "var(--text-muted)" }}>
                {note ? `📝 ${note.slice(0, 8)}${note.length > 8 ? "..." : ""}` : "備註"}
              </button>
            </div>

            {/* ── 動態面板區 ── */}
            <AnimatePresence>
              {activePanel && (
                <motion.div key={activePanel} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>

                  {/* 分類面板 */}
                  {activePanel === "category" && (
                    <div className="p-3">
                      {/* 收支 Tabs */}
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
                        // 大項 grid
                        <div className="grid grid-cols-4 gap-2">
                          {categories.map(cat => (
                            <button key={cat.id} onClick={() => setDrillParentId(cat.id)}
                              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                              style={{ background: selectedParent === cat.id ? `${catTab === "EXPENSE" ? "rgba(244,63,94,0.15)" : "rgba(16,185,129,0.15)"}` : "var(--bg-surface)", border: selectedParent === cat.id ? `1.5px solid ${catTab === "EXPENSE" ? "#f43f5e40" : "#10b98140"}` : "1px solid var(--border)" }}>
                              <span className="text-2xl">{cat.icon}</span>
                              <span className="text-[10px] text-center leading-tight" style={{ color: "var(--text-primary)" }}>{cat.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        // 子項
                        <div>
                          <button onClick={() => setDrillParentId(null)} className="flex items-center gap-1 mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
                            <ChevronLeft size={14} /> 返回
                          </button>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {categories.find(c => c.id === drillParentId)?.children.map(child => (
                              <button key={child.id} onClick={() => {
                                setSelectedParent(drillParentId!);
                                setSelectedChild(child.id);
                                setType(catTab);
                                setActivePanel(null);
                              }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                                style={{ background: selectedChild === child.id ? gradient : "var(--bg-surface)", color: selectedChild === child.id ? "#fff" : "var(--text-primary)", border: selectedChild === child.id ? "none" : "1px solid var(--border)" }}>
                                {child.icon} {child.name}
                              </button>
                            ))}

                            {/* ➕ 新增子分類按鈕 */}
                            {addingChildFor !== drillParentId ? (
                              <button onClick={() => { setAddingChildFor(drillParentId); setNewChildName(""); setNewChildIcon("📦"); }}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                                style={{ border: "1.5px dashed var(--border)", color: "var(--text-muted)" }}>
                                <Plus size={12} /> 新增
                              </button>
                            ) : (
                              <div className="w-full mt-2 flex items-center gap-2">
                                <input value={newChildIcon} onChange={e => setNewChildIcon(e.target.value)} maxLength={2}
                                  className="w-10 h-9 text-center rounded-lg text-lg outline-none flex-shrink-0"
                                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                                <input value={newChildName} onChange={e => setNewChildName(e.target.value)} placeholder="輸入名稱..."
                                  autoFocus className="flex-1 h-9 px-2 rounded-lg text-sm outline-none"
                                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                                <button onClick={() => handleAddChild(drillParentId!)} disabled={isPending || !newChildName.trim()}
                                  className="px-3 h-9 rounded-lg text-xs font-bold flex-shrink-0 disabled:opacity-50"
                                  style={{ background: "#6366f1", color: "#fff" }}>
                                  {isPending ? "..." : "確定"}
                                </button>
                                <button onClick={() => setAddingChildFor(null)}
                                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                                  <X size={13} style={{ color: "var(--text-muted)" }} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 帳戶面板 */}
                  {activePanel === "wallet" && (
                    <div className="p-3 max-h-48 overflow-y-auto">
                      {wallets.length === 0
                        ? <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>尚無帳戶，請至設定新增</p>
                        : <div className="flex flex-col gap-1.5">
                            {/* 共同帳戶排前面 */}
                            {[...wallets].sort((a, b) => (a.visibility === "FAMILY" ? -1 : 1)).map(w => (
                              <button key={w.id} onClick={() => { setSelectedWalletId(w.id); setActivePanel(null); }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left"
                                style={{ background: selectedWalletId === w.id ? "rgba(99,102,241,0.15)" : "var(--bg-surface)", border: selectedWalletId === w.id ? "1.5px solid rgba(99,102,241,0.4)" : "1px solid var(--border)", color: "var(--text-primary)" }}>
                                <span>{WALLET_ICONS[w.type] ?? "💰"}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium truncate">{w.name}</span>
                                    {w.visibility === "FAMILY" && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>👥 共同</span>
                                    )}
                                  </div>
                                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>NT$ {w.balance?.toLocaleString() || 0}</span>
                                </div>
                                {selectedWalletId === w.id && <Check size={14} style={{ color: "#6366f1" }} />}
                              </button>
                            ))}
                          </div>}
                    </div>
                  )}

                  {/* 日期面板 */}
                  {activePanel === "date" && (
                    <div className="p-3">
                      <div className="flex gap-2 mb-2">
                        {["今天", "昨天", "前天"].map((label, i) => {
                          const d = new Date(); d.setDate(d.getDate() - i);
                          const dStr = d.toISOString().split("T")[0];
                          return (
                            <button key={label} onClick={() => { setSelectedDate(dStr); setActivePanel(null); }}
                              className="flex-1 py-2 rounded-xl text-xs font-semibold"
                              style={{ background: selectedDate === dStr ? "rgba(99,102,241,0.2)" : "var(--bg-surface)", color: selectedDate === dStr ? "#6366f1" : "var(--text-muted)", border: selectedDate === dStr ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)" }}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setActivePanel(null); }}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                    </div>
                  )}

                  {/* 備註面板 */}
                  {activePanel === "note" && (
                    <div className="p-3 flex gap-2">
                      <input type="text" value={note} onChange={e => setNote(e.target.value)}
                        placeholder="加個備註..." autoFocus
                        className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                      <button onClick={() => setActivePanel(null)}
                        className="px-4 rounded-xl text-sm font-bold"
                        style={{ background: "#6366f1", color: "#fff" }}>完成</button>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 計算機鍵盤 ── */}
            <div className="p-3 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {CALC_KEYS.map((row, ri) =>
                  row.map((key, ci) => {
                    const isOp = ["+", "-", "×", "÷"].includes(key);
                    const isDel = key === "⌫";
                    return (
                      <motion.button key={`${ri}-${ci}`} whileTap={{ scale: 0.82 }} onClick={() => handleKey(key)}
                        className="h-11 rounded-xl flex items-center justify-center text-lg font-bold"
                        style={{
                          background: isOp ? "rgba(99,102,241,0.15)" : isDel ? "rgba(244,63,94,0.1)" : "var(--bg-card)",
                          color: isOp ? "#6366f1" : isDel ? "#f43f5e" : "var(--text-primary)",
                          border: "1px solid var(--border)",
                        }}>
                        {key}
                      </motion.button>
                    );
                  })
                )}
              </div>

              {/* = 結算列 + 送出 */}
              <div className="flex gap-1.5">
                {hasOp && (
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleKey("=")}
                    className="h-12 w-16 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{ background: "rgba(99,102,241,0.2)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.3)" }}>
                    =
                  </motion.button>
                )}
                <motion.button onClick={handleSubmit} disabled={!canSubmit}
                  whileTap={canSubmit ? { scale: 0.97 } : {}}
                  className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm"
                  animate={{ background: canSubmit ? gradient : "var(--bg-card)", color: canSubmit ? "#fff" : "var(--text-muted)" }}>
                  {submitted
                    ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={20} /></motion.div>
                    : <>{canSubmit ? (type === "EXPENSE" ? "💸" : "💰") : "🔒"} {canSubmit ? "確認記帳" : "請選分類與輸入金額"}</>}
                </motion.button>
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
