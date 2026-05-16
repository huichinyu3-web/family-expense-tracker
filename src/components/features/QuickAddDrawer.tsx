"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import { X, Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getAccessibleWallets } from "@/app/actions/wallet";
import { getCategories, createChildCategory } from "@/app/actions/category";
import { getMerchants } from "@/app/actions/merchant";
import { addTransaction, updateTransaction } from "@/app/actions/transaction";
import { getFamilyMembers } from "@/app/actions/family";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

// ── Types ─────────────────────────────────────────────────────────────
type WalletItem = { id: string; name: string; type: string; visibility: string; balance?: number; currency: string; isSplitEnabled: boolean };
type CategoryChild = { id: string; name: string; icon: string | null };
type CategoryParent = { id: string; name: string; type: string; icon: string | null; children: CategoryChild[] };
type MerchantItem = { id: string; name: string };
type FamilyMemberItem = { id: string; userId: string; user: { id: string; name: string | null; image: string | null } };
type Panel = "category" | "wallet" | "date" | "merchant" | "recurring" | "note" | "numpad" | "paidBy";

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
    let clean = expr.replace(/[+\-×÷]+$/, "");
    clean = clean.replace(/×/g, "*").replace(/÷/g, "/");
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${clean})`)();
    return isNaN(result) || !isFinite(result) ? 0 : Math.round(result * 100) / 100;
  } catch { return 0; }
}

// ── Components ────────────────────────────────────────────────────────
function ListRow({ icon, label, value, onClick, active, valueColor }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-4 px-5 border-b border-[var(--border)] transition-colors"
      style={{ background: active ? "rgba(99,102,241,0.05)" : "transparent" }}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-base font-medium" style={{ color: "var(--text-primary)" }}>{label}</span>
      </div>
      <div className="flex items-center gap-2 max-w-[65%]">
        <span className="text-base font-bold truncate" style={{ color: valueColor || "var(--text-secondary)" }}>{value}</span>
        <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
      </div>
    </button>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────
export default function QuickAddDrawer({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: any }) {
  const router = useRouter();
  const { data: session } = useSession();
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
  const [paidByUserId, setPaidByUserId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // ── UI 狀態 ─────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<Panel>("numpad");
  const [drillParentId, setDrillParentId] = useState<string | null>(null); 
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null); 
  const [newChildName, setNewChildName] = useState("");
  const [newChildIcon, setNewChildIcon] = useState("📦");

  // ── 資料 ─────────────────────────────────────────────────────────────
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryParent[]>([]);
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [members, setMembers] = useState<FamilyMemberItem[]>([]);

  // 分類連動：根據頂部的 type 開關即時篩選
  const categories = useMemo(() => allCategories.filter(c => c.type === type), [allCategories, type]);

  useEffect(() => {
    if (!open) return;
    Promise.all([getAccessibleWallets(), getCategories(), getMerchants(), getFamilyMembers()])
      .then(([w, c, m, fm]) => {
        setWallets(w as WalletItem[]);
        setAllCategories(c as CategoryParent[]);
        setMerchants(m as MerchantItem[]);
        setMembers(fm as any);

        if (editData) {
          setType(editData.type);
          setExpr(Math.abs(editData.amount).toString());
          setSelectedChild(editData.categoryId);
          const parent = (c as CategoryParent[]).find(p => p.children.some(child => child.id === editData.categoryId));
          if (parent) setSelectedParent(parent.id);
          setSelectedWalletId(editData.walletId || null);
          const d = new Date(editData.date);
          setSelectedDate(`${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`);
          setMerchantInput(editData.merchant?.name || "");
          setRecurringType(editData.recurringType || "NONE");
          setNote(editData.note || "");
          setPaidByUserId(editData.paidByUserId || null);
        } else {
          if (w.length > 0 && !selectedWalletId) setSelectedWalletId((w as WalletItem[])[0].id);
          if (session?.user?.id) setPaidByUserId(session.user.id);
        }
      });
  }, [open, editData, session]);

  // 重置
  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setExpr("0"); setSelectedParent(null); setSelectedChild(null);
      setNote(""); setSubmitted(false); setType("EXPENSE");
      setActivePanel("numpad"); setDrillParentId(null); setAddingChildFor(null);
      setMerchantInput(""); setNewChildName(""); setNewChildIcon("📦");
      setRecurringType("NONE");
      setPaidByUserId(session?.user?.id || null);
      setSelectedDate(new Date().toISOString().split("T")[0]);
    }, 300);
  }, [onClose]);

  // ── 鍵盤處理 ───────────────────────────────────────────────────────
  const hasOp = /[+\-×÷]/.test(expr);

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(40);
    }
  };

  const handleKey = (key: string) => {
    triggerHaptic();
    if (key === "AC") { setExpr("0"); return; }
    if (key === "⌫") { setExpr(prev => prev.length > 1 ? prev.slice(0, -1) : "0"); return; }
    
    // 如果是 OK/Submit 鍵
    if (key === "OK") {
      if (hasOp) {
        setExpr(String(evalExpr(expr)));
      } else {
        handleSubmit();
      }
      return;
    }

    if (["+", "-", "×", "÷"].includes(key)) {
      setExpr(prev => {
        const last = prev.slice(-1);
        if (["+", "-", "×", "÷"].includes(last)) return prev.slice(0, -1) + key;
        return prev + key;
      });
      return;
    }

    if (key === ".") { 
      const parts = expr.split(/[+\-×÷]/); 
      if (!parts[parts.length - 1].includes(".")) setExpr(prev => prev + "."); 
      return; 
    }

    setExpr(prev => prev === "0" ? key : prev + key);
  };

  const finalAmount = evalExpr(expr);
  const canSubmit = selectedChild !== null && finalAmount > 0 && !hasOp; 

  const handleSubmit = async () => {
    if (!canSubmit || submitted || isPending) return;
    
    startTransition(async () => {
      setSubmitted(true);
      try {
      const ts = new Date(selectedDate).getTime() + (new Date().getTime() % 86400000);
      const dataToSave = { 
        type, 
        amount: finalAmount, 
        categoryId: selectedChild!, 
        date: ts, 
        note, 
        walletId: selectedWalletId || undefined, 
        merchantName: merchantInput,
        recurringType: recurringType as any,
        installments: recurringType === "INSTALLMENT" ? installments : undefined,
        currency: selectedWallet?.currency || "TWD",
        paidByUserId: (selectedWallet?.isSplitEnabled && paidByUserId) ? paidByUserId : undefined
      };

      if (editData) {
        await updateTransaction(editData.id, dataToSave);
      } else {
        await addTransaction(dataToSave);
      }
        
        router.refresh();
        getAccessibleWallets().then(w => setWallets(w as WalletItem[]));
        toast.success(editData ? "修改成功" : "記帳成功", {
          style: { background: "#10b981", color: "white", border: "none" }
        });
        triggerHaptic();
        setTimeout(() => handleClose(), 800); // 稍微加長讓打勾動畫顯示久一點
      } catch (e) {
        console.error(e);
        setSubmitted(false);
        toast.error("儲存失敗，請重試");
      }
    });
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
  const isCategoryValid = selectedCatParent?.type === type;
  const categoryName = (selectedCatChild && isCategoryValid) ? `${selectedCatParent?.icon} ${selectedCatParent?.name} > ${selectedCatChild.name}` : "請選擇";
  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const selectedPaidByUser = members.find(m => m.userId === paidByUserId)?.user;

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
            className="fixed bottom-0 left-0 right-0 z-[70] mx-auto w-full max-w-lg flex flex-col rounded-t-3xl shadow-2xl"
            style={{ height: "92vh", background: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}
          >
            {/* ── 頂部導覽列：返回 / 收支切換 ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] rounded-t-3xl">
              <button onClick={handleClose} className="text-base font-semibold text-[var(--text-secondary)]">取消</button>
              <div className="flex bg-[var(--bg-surface)] rounded-xl p-1 border border-[var(--border)]">
                <button onClick={() => { setType("EXPENSE"); setDrillParentId(null); if(selectedCatParent?.type !== "EXPENSE") setSelectedChild(null); }} 
                  className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all ${type === "EXPENSE" ? "bg-[rgba(244,63,94,0.15)] text-[#f43f5e]" : "text-[var(--text-muted)]"}`}>
                  支出
                </button>
                <button onClick={() => { setType("INCOME"); setDrillParentId(null); if(selectedCatParent?.type !== "INCOME") setSelectedChild(null); }} 
                  className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all ${type === "INCOME" ? "bg-[rgba(16,185,129,0.15)] text-[#10b981]" : "text-[var(--text-muted)]"}`}>
                  收入
                </button>
              </div>
              <div className="w-8" /> {/* 為了讓中間置中的墊片 */}
            </div>

            {/* ── 金額顯示 ── */}
            <div className="px-5 py-4 border-b text-right flex flex-col items-end justify-center min-h-[90px]" style={{ borderColor: "var(--border)" }}>
              <motion.div key={expr} initial={{ scale: 1.02 }} animate={{ scale: 1 }} className="flex items-baseline justify-end gap-1 w-full overflow-hidden">
                <span className="text-base font-medium flex-shrink-0" style={{ color: "var(--text-muted)" }}>{selectedWallet?.currency || "NT$"}</span>
                <span className="font-bold tabular-nums tracking-tight truncate"
                  style={{ fontSize: expr.length > 8 ? "2.5rem" : "3.5rem", color: accentColor }}>
                  {expr}
                </span>
              </motion.div>
            </div>

            {/* ── 中間：直列欄位清單 (可滑動) ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ListRow icon="📅" label="日期" value={displayDate} onClick={() => togglePanel("date")} active={activePanel==="date"} valueColor="#6366f1" />
              <ListRow icon="🏷️" label="分類" value={categoryName} onClick={() => togglePanel("category")} active={activePanel==="category"} valueColor={isCategoryValid ? accentColor : "var(--text-muted)"} />
              <ListRow icon="💳" label="帳簿" value={selectedWallet ? `${selectedWallet.name}${selectedWallet.visibility === "FAMILY" ? " 👥" : ""}` : "請選擇"} onClick={() => togglePanel("wallet")} active={activePanel==="wallet"} valueColor={selectedWallet ? "var(--text-primary)" : "var(--text-muted)"} />
              {selectedWallet?.isSplitEnabled && (
                <ListRow icon="🙋" label="代墊人 (Paid By)" value={selectedPaidByUser?.name || "請選擇"} onClick={() => togglePanel("paidBy")} active={activePanel==="paidBy"} valueColor={selectedPaidByUser ? "var(--text-primary)" : "var(--text-muted)"} />
              )}
              <ListRow icon="🏪" label="商家" value={merchantInput || "未輸入"} onClick={() => togglePanel("merchant")} active={activePanel==="merchant"} valueColor={merchantInput ? "var(--text-primary)" : "var(--text-muted)"} />
              <ListRow icon="🔄" label="週期" value={RECURRING_OPTIONS.find(r=>r.value===recurringType)?.label ?? "單次"} onClick={() => togglePanel("recurring")} active={activePanel==="recurring"} valueColor={recurringType !== "NONE" ? "var(--text-primary)" : "var(--text-muted)"} />
              <ListRow icon="📝" label="備註" value={note || "點擊輸入"} onClick={() => togglePanel("note")} active={activePanel==="note"} valueColor={note ? "var(--text-primary)" : "var(--text-muted)"} />
            </div>

            {/* ── 底部：固定高度面板區 (取代鍵盤) ── */}
            <div className="h-[290px] border-t flex flex-col" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
              
              {/* 非數字鍵盤面板時，頂部顯示返回按鈕與標題 */}
              {activePanel !== "numpad" && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)]">
                  <span className="text-sm font-bold text-[var(--text-secondary)]">
                    {activePanel === "category" ? "選擇分類" : activePanel === "wallet" ? "選擇帳簿" : activePanel === "date" ? "選擇日期" : activePanel === "merchant" ? "輸入商家" : activePanel === "recurring" ? "設定週期" : activePanel === "paidBy" ? "誰先代墊這筆錢？" : "填寫備註"}
                  </span>
                  <button onClick={() => setActivePanel("numpad")} className="p-1 rounded-full bg-[var(--bg-card)]">
                    <X size={20} style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>
              )}

              {/* === 各式面板內容 === */}
              <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                
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
                      <motion.button whileTap={(!isPending && !submitted) ? { scale: 0.95 } : undefined} onClick={() => !isPending && !submitted && handleKey("OK")}
                        className="col-span-3 rounded-xl flex items-center justify-center text-lg font-bold transition-colors"
                        style={{ 
                          background: isPending ? "rgba(255,255,255,0.05)" : (submitted ? "#10b981" : (hasOp ? "rgba(99,102,241,0.2)" : (canSubmit ? accentColor : "var(--bg-surface)"))), 
                          color: isPending ? "var(--text-muted)" : (submitted ? "#fff" : (hasOp ? "#6366f1" : (canSubmit ? "#fff" : "var(--text-muted)"))), 
                          border: "1px solid var(--border)" 
                        }}>
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-semibold">處理中...</span>
                          </div>
                        ) : submitted ? (
                          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                            <Check size={24} strokeWidth={3} />
                            <span className="text-base font-bold">完成</span>
                          </motion.div>
                        ) : (
                          hasOp ? "= OK" : (canSubmit ? "✓ 儲存" : "請選分類與金額")
                        )}
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* 2. 分類面板 */}
                {activePanel === "category" && (
                  <div className="p-3">
                    {!drillParentId ? (
                      <div className="grid grid-cols-4 gap-2">
                        {categories.map(cat => (
                          <button key={cat.id} onClick={() => setDrillParentId(cat.id)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                            style={{ background: selectedParent === cat.id ? `${type === "EXPENSE" ? "rgba(244,63,94,0.15)" : "rgba(16,185,129,0.15)"}` : "var(--bg-surface)", border: "1px solid var(--border)" }}>
                            <span className="text-3xl">{cat.icon}</span>
                            <span className="text-sm font-medium text-center" style={{ color: "var(--text-primary)" }}>{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <button onClick={() => setDrillParentId(null)} className="flex items-center gap-1 mb-4 text-base font-semibold text-indigo-400">
                          <ChevronLeft size={18} /> 回大項
                        </button>
                        <div className="flex flex-wrap gap-2">
                          {categories.find(c => c.id === drillParentId)?.children.map(child => (
                            <button key={child.id} onClick={() => {
                              setSelectedParent(drillParentId!); setSelectedChild(child.id); setActivePanel("numpad");
                            }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-base font-bold"
                              style={{ background: selectedChild === child.id ? accentColor : "var(--bg-surface)", color: selectedChild === child.id ? "#fff" : "var(--text-primary)", border: selectedChild === child.id ? "none" : "1px solid var(--border)" }}>
                              {child.icon} {child.name}
                            </button>
                          ))}
                          {addingChildFor !== drillParentId ? (
                            <button onClick={() => { setAddingChildFor(drillParentId); setNewChildName(""); setNewChildIcon("📦"); }}
                              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-base font-bold transition-all"
                              style={{ border: "1.5px dashed var(--border)", color: "var(--text-muted)" }}>
                              <Plus size={16} /> 新增
                            </button>
                          ) : (
                            <div className="w-full mt-2 flex gap-2">
                              <input value={newChildIcon} onChange={e => setNewChildIcon(e.target.value)} maxLength={2}
                                className="w-14 h-12 text-center rounded-xl text-xl outline-none flex-shrink-0"
                                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
                              {/* 注意：這裡使用 text-base (16px) 避免 iOS 縮放 */}
                              <input value={newChildName} onChange={e => setNewChildName(e.target.value)} placeholder="輸入名稱..."
                                autoFocus className="flex-1 h-12 px-3 rounded-xl text-base outline-none bg-transparent border border-[var(--border)]" />
                              <button onClick={() => handleAddChild(drillParentId!)} disabled={isPending || !newChildName.trim()}
                                className="px-5 h-12 rounded-xl text-base font-bold bg-indigo-500 text-white disabled:opacity-50">
                                {isPending ? "..." : "確定"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. 帳簿面板 */}
                {activePanel === "wallet" && (
                  <div className="flex flex-col">
                    {[...wallets].sort((a, b) => (a.visibility === "FAMILY" ? -1 : 1)).map(w => (
                      <button key={w.id} onClick={() => { setSelectedWalletId(w.id); setActivePanel("numpad"); }}
                        className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border)] text-left"
                        style={{ background: selectedWalletId === w.id ? "rgba(99,102,241,0.15)" : "transparent", color: "var(--text-primary)" }}>
                        <span className="text-2xl">{WALLET_ICONS[w.type] ?? "💰"}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base">{w.name}</span>
                            {w.visibility === "FAMILY" && <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 font-semibold">👥 共同</span>}
                            {w.isSplitEnabled && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-semibold">📐 拆帳</span>}
                          </div>
                          <span className="text-sm text-[var(--text-muted)]">餘額 {w.currency} {w.balance?.toLocaleString() || 0}</span>
                        </div>
                        {selectedWalletId === w.id && <Check size={20} className="text-indigo-500" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* 3.5 代墊人面板 */}
                {activePanel === "paidBy" && (
                  <div className="flex flex-col">
                    {members.map(m => (
                      <button key={m.userId} onClick={() => { setPaidByUserId(m.userId); setActivePanel("numpad"); }}
                        className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border)] text-left"
                        style={{ background: paidByUserId === m.userId ? "rgba(99,102,241,0.15)" : "transparent", color: "var(--text-primary)" }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-indigo-500/20 text-xl flex-shrink-0">
                          {m.user?.image ? <img src={m.user.image} alt="avatar" /> : "😊"}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-base">{m.user?.name || "未知成員"}</span>
                        </div>
                        {paidByUserId === m.userId && <Check size={20} className="text-indigo-500" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* 4. 日期面板 */}
                {activePanel === "date" && (
                  <div className="p-5">
                    <div className="flex gap-2 mb-5">
                      {["今天", "昨天", "前天"].map((label, i) => {
                        const d = new Date(); d.setDate(d.getDate() - i);
                        const dStr = d.toISOString().split("T")[0];
                        return (
                          <button key={label} onClick={() => { setSelectedDate(dStr); setActivePanel("numpad"); }}
                            className="flex-1 py-3 rounded-xl text-base font-bold"
                            style={{ background: selectedDate === dStr ? "rgba(99,102,241,0.2)" : "var(--bg-surface)", color: selectedDate === dStr ? "#6366f1" : "var(--text-muted)", border: "1px solid var(--border)" }}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {/* 使用 text-base 避免 iOS 縮放 */}
                    <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setActivePanel("numpad"); }}
                      className="w-full px-4 py-3 rounded-xl text-base outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]" />
                  </div>
                )}

                {/* 5. 商家面板 */}
                {activePanel === "merchant" && (
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex gap-2">
                      <input type="text" value={merchantInput} onChange={e => setMerchantInput(e.target.value)} placeholder="輸入商家名稱..." autoFocus
                        className="flex-1 px-4 py-3 rounded-xl text-base outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]" />
                      <button onClick={() => setActivePanel("numpad")} className="px-6 rounded-xl text-base font-bold bg-indigo-500 text-white">確定</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-5 overflow-y-auto">
                      {merchants.filter(m => m.name.includes(merchantInput)).slice(0, 10).map(m => (
                        <button key={m.id} onClick={() => { setMerchantInput(m.name); setActivePanel("numpad"); }}
                          className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white">
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. 週期面板 */}
                {activePanel === "recurring" && (
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      {RECURRING_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => { setRecurringType(opt.value); if(opt.value!=="INSTALLMENT") setActivePanel("numpad"); }}
                          className="px-4 py-2.5 rounded-xl text-sm font-bold"
                          style={{ background: recurringType === opt.value ? "rgba(99,102,241,0.2)" : "var(--bg-surface)", color: recurringType === opt.value ? "#6366f1" : "var(--text-secondary)", border: "1px solid var(--border)" }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {recurringType === "INSTALLMENT" && (
                      <div className="mt-6 flex items-center justify-between p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
                        <span className="text-base font-bold text-[var(--text-primary)]">分期總期數</span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setInstallments(n => Math.max(2,n-1))} className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-2xl font-bold">-</button>
                          <span className="text-2xl font-bold w-10 text-center">{installments}</span>
                          <button onClick={() => setInstallments(n => Math.min(36,n+1))} className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-2xl font-bold">+</button>
                        </div>
                        <button onClick={() => setActivePanel("numpad")} className="px-5 py-3 rounded-xl text-base font-bold bg-indigo-500 text-white">設定</button>
                      </div>
                    )}
                  </div>
                )}

                {/* 7. 備註面板 */}
                {activePanel === "note" && (
                  <div className="p-5 flex gap-2">
                    <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="加個備註..." autoFocus
                      className="flex-1 px-4 py-3 rounded-xl text-base outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]" />
                    <button onClick={() => setActivePanel("numpad")} className="px-6 rounded-xl text-base font-bold bg-indigo-500 text-white">確定</button>
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
