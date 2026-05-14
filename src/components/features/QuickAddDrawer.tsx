"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Check, Calendar, Store, RefreshCw, FileText, Wallet, ChevronRight, ChevronLeft } from "lucide-react";
import { getAccessibleWallets } from "@/app/actions/wallet";
import { getCategories } from "@/app/actions/category";
import { getMerchants } from "@/app/actions/merchant";
import { addTransaction } from "@/app/actions/transaction";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────
type WalletItem = { id: string; name: string; type: string; visibility: string; balance?: number };
type CategoryChild = { id: string; name: string; icon: string | null };
type CategoryParent = { id: string; name: string; type: string; icon: string | null; children: CategoryChild[] };
type MerchantItem = { id: string; name: string };

const KEYS = ["1","2","3","4","5","6","7","8","9",".","0","⌫"];
const RECURRING_OPTIONS = [
  { value: "NONE", label: "單次不重複" },
  { value: "DAILY", label: "每日" },
  { value: "WORKDAY", label: "每個工作日" },
  { value: "WEEKLY", label: "每週" },
  { value: "BIWEEKLY", label: "每雙週" },
  { value: "MONTHLY", label: "每月" },
  { value: "INSTALLMENT", label: "分期付款" },
];

const WALLET_ICONS: Record<string, string> = {
  CASH: "💵", BANK: "🏦", CREDIT_CARD: "💳", E_WALLET: "📱", OTHER: "💰"
};

// ── Components ────────────────────────────────────────────────────────
function ListRow({ icon, label, value, onClick, active, valueColor }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-3.5 px-2 border-b"
      style={{ borderColor: "var(--border)", background: active ? "rgba(99,102,241,0.05)" : "transparent" }}>
      <div className="flex items-center gap-3">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium" style={{ color: valueColor || "var(--text-muted)" }}>{value}</span>
        <ChevronRight size={14} style={{ color: "var(--text-secondary)", transform: active ? "rotate(90deg)" : "none", transition: "0.2s" }} />
      </div>
    </button>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────
export default function QuickAddDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  // 狀態
  const [type, setType]               = useState<"EXPENSE"|"INCOME">("EXPENSE");
  const [amount, setAmount]           = useState("0");
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedChild, setSelectedChild]   = useState<string | null>(null);
  const [note, setNote]               = useState("");
  const [submitted, setSubmitted]     = useState(false);
  const [activePanel, setActivePanel] = useState<"type"|"category"|"date"|"wallet"|"merchant"|"recurring"|"note"|null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [merchantInput, setMerchantInput] = useState("");
  const [recurringType, setRecurringType] = useState("NONE");
  const [installments, setInstallments]   = useState(3);
  
  // Category sub-state
  const [selectingParentId, setSelectingParentId] = useState<string | null>(null);

  // 資料
  const [wallets, setWallets]       = useState<WalletItem[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryParent[]>([]);
  const [merchants, setMerchants]   = useState<MerchantItem[]>([]);
  const [loading, setLoading]       = useState(false);

  const categories = useMemo(() => allCategories.filter(c => c.type === type), [allCategories, type]);

  // 初始化載入
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    // 一次性載入全部（不帶 type 參數）
    Promise.all([ getAccessibleWallets(), getCategories(), getMerchants() ])
      .then(([w, c, m]) => {
        setWallets(w as WalletItem[]);
        // 預設選擇第一個帳戶
        if (w.length > 0 && !selectedWalletId) {
          setSelectedWalletId((w as WalletItem[])[0].id);
        }
        setAllCategories(c as CategoryParent[]);
        setMerchants(m as MerchantItem[]);
      }).finally(() => setLoading(false));
  }, [open]);

  // 切換收支類型時重置選擇狀態
  useEffect(() => {
    if (!open) return;
    setSelectedParent(null);
    setSelectedChild(null);
    setSelectingParentId(null);
  }, [type, open]);

  // 重置
  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setAmount("0"); setSelectedParent(null); setSelectedChild(null);
      setNote(""); setSubmitted(false); setType("EXPENSE");
      setActivePanel(null); setSelectingParentId(null);
      setMerchantInput(""); setRecurringType("NONE");
      setSelectedDate(new Date().toISOString().split("T")[0]);
      // 保持 selectedWalletId 為上一次的選擇
    }, 300);
  }, [onClose]);

  // 鍵盤處理
  const handleKey = (key: string) => {
    if (key === "⌫") {
      setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
    } else if (key === ".") {
      if (!amount.includes(".")) setAmount(prev => prev + ".");
    } else {
      setAmount(prev => prev === "0" ? key : prev + key);
    }
  };

  // 送出
  const canSubmit = selectedChild !== null && parseFloat(amount || "0") > 0;
  const handleSubmit = async () => {
    if (!canSubmit || submitted) return;
    setSubmitted(true);
    try {
      const ts = new Date(selectedDate).getTime() + (new Date().getTime() % 86400000); // 保持當天加上目前時分秒
      await addTransaction({
        type, amount: parseFloat(amount),
        categoryId: selectedChild,
        date: ts, note, walletId: selectedWalletId || undefined, merchantName: merchantInput,
        recurringType: recurringType as any, installments,
      });
      router.refresh();
      // 重新載入帳戶餘額
      getAccessibleWallets().then(w => setWallets(w as WalletItem[]));
      
      setTimeout(() => handleClose(), 600);
    } catch (error) {
      console.error(error);
      setSubmitted(false);
      alert("儲存失敗，請重試");
    }
  };

  const togglePanel = (panel: typeof activePanel) => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
      if (panel === "category") {
        setSelectingParentId(null); // 開啟分類時預設回到大項
      }
    }
  };

  const formatDisplayDate = (dStr: string) => {
    if (dStr === new Date().toISOString().split("T")[0]) return "今天";
    return dStr.replace(/-/g, "/");
  };

  const currentCategoryName = useMemo(() => {
    if (!selectedParent || !selectedChild) return "尚未選擇";
    const p = categories.find(c => c.id === selectedParent);
    const c = p?.children.find(c => c.id === selectedChild);
    if (!p || !c) return "尚未選擇";
    return `${p.icon} ${p.name} > ${c.name}`;
  }, [selectedParent, selectedChild, categories]);

  // 主色調
  const accentColor = type === "EXPENSE" ? "#f43f5e" : "#10b981";
  const gradientColor = type === "EXPENSE" ? "linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)" : "linear-gradient(135deg, #10b981 0%, #34d399 100%)";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 z-[70] mx-auto w-full max-w-lg flex flex-col rounded-t-[2rem] shadow-2xl"
            style={{ height: "90vh", background: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}
          >
            {/* 拖拉條 */}
            <div className="w-full flex justify-center pt-3 pb-1" onClick={handleClose}>
              <div className="w-12 h-1.5 rounded-full" style={{ background: "var(--border)" }} />
            </div>
            <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "var(--bg-card)" }}>
              <X size={14} style={{ color: "var(--text-secondary)" }} />
            </button>

            {/* 可滾動內容區 */}
            <div className="overflow-y-auto flex-1 flex flex-col px-4 custom-scrollbar">

              {/* ── 金額 ── */}
              <div className="text-center py-6 border-b border-[var(--border)]">
                <motion.div key={amount} initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 0.1 }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>NT$</span>
                  <span className="text-[3rem] font-bold ml-1 tabular-nums tracking-tight" style={{ color: "var(--text-primary)" }}>
                    {parseFloat(amount || "0").toLocaleString("zh-TW", { maximumFractionDigits: 2 })}
                  </span>
                </motion.div>
              </div>

              {/* ── 獨立選單列表 ── */}
              <div className="flex flex-col py-2">
                
                {/* 類型 */}
                <ListRow icon={type==="EXPENSE"?"💸":"💰"} label="類型" value={type==="EXPENSE"?"支出":"收入"} valueColor={accentColor} onClick={() => togglePanel("type")} active={activePanel==="type"} />
                <AnimatePresence>
                  {activePanel === "type" && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                      <div className="p-3 flex gap-2" style={{ background: "var(--bg-card)" }}>
                        <button onClick={() => { setType("EXPENSE"); setActivePanel(null); }} className="flex-1 py-2 rounded-xl text-sm font-bold transition-all" style={{ background: type==="EXPENSE"?"var(--bg-surface)":"transparent", color: type==="EXPENSE"?"#f43f5e":"var(--text-muted)", border: type==="EXPENSE"?"1px solid rgba(244,63,94,0.3)":"1px solid transparent" }}>支出</button>
                        <button onClick={() => { setType("INCOME"); setActivePanel(null); }} className="flex-1 py-2 rounded-xl text-sm font-bold transition-all" style={{ background: type==="INCOME"?"var(--bg-surface)":"transparent", color: type==="INCOME"?"#10b981":"var(--text-muted)", border: type==="INCOME"?"1px solid rgba(16,185,129,0.3)":"1px solid transparent" }}>收入</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 分類 */}
                <ListRow icon="🏷️" label="分類" value={currentCategoryName} onClick={() => togglePanel("category")} active={activePanel==="category"} />
                <AnimatePresence>
                  {activePanel === "category" && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                      <div className="p-3 rounded-b-xl" style={{ background: "var(--bg-card)" }}>
                        {!selectingParentId ? (
                          // 顯示大項
                          <div className="grid grid-cols-4 gap-2">
                            {categories.map(cat => (
                              <button key={cat.id} onClick={() => setSelectingParentId(cat.id)} className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                                <span className="text-2xl">{cat.icon}</span>
                                <span className="text-[10px] text-center" style={{ color: "var(--text-primary)" }}>{cat.name}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          // 顯示細項
                          <div>
                            <button onClick={() => setSelectingParentId(null)} className="flex items-center gap-1 mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
                              <ChevronLeft size={14} /> 返回大項
                            </button>
                            <div className="flex flex-wrap gap-2">
                              {categories.find(c => c.id === selectingParentId)?.children.map(child => (
                                <button key={child.id} onClick={() => {
                                  setSelectedParent(selectingParentId);
                                  setSelectedChild(child.id);
                                  setActivePanel(null);
                                }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                                  style={{
                                    background: selectedChild === child.id ? gradientColor : "var(--bg-surface)",
                                    color: selectedChild === child.id ? "#fff" : "var(--text-primary)",
                                    border: selectedChild === child.id ? "none" : "1px solid var(--border)",
                                  }}>
                                  {child.icon} {child.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 日期 */}
                <ListRow icon="📅" label="日期" value={formatDisplayDate(selectedDate)} onClick={() => togglePanel("date")} active={activePanel==="date"} />
                <AnimatePresence>
                  {activePanel === "date" && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                      <div className="p-3" style={{ background: "var(--bg-card)" }}>
                        <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setActivePanel(null); }}
                          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 帳戶 */}
                <ListRow icon="💳" label="帳戶" value={wallets.find(w=>w.id===selectedWalletId)?.name ?? "尚未選擇"} onClick={() => togglePanel("wallet")} active={activePanel==="wallet"} />
                <AnimatePresence>
                  {activePanel === "wallet" && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                      <div className="p-3 max-h-[200px] overflow-y-auto custom-scrollbar" style={{ background: "var(--bg-card)" }}>
                        {wallets.length === 0 ? <p className="text-xs" style={{ color: "var(--text-muted)" }}>尚無帳戶，請至設定新增</p> : (
                          <div className="flex flex-col gap-1.5">
                            {wallets.map(w => (
                              <button key={w.id} onClick={() => { setSelectedWalletId(w.id); setActivePanel(null); }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm"
                                style={{ background: selectedWalletId===w.id ? "rgba(99,102,241,0.15)" : "var(--bg-surface)", border: selectedWalletId===w.id ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)", color: "var(--text-primary)" }}>
                                <span>{WALLET_ICONS[w.type]??'💰'}</span>
                                <div className="flex-1 text-left flex flex-col">
                                  <span className="font-medium">{w.name}</span>
                                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>餘額 NT$ {w.balance?.toLocaleString() || 0}</span>
                                </div>
                                {selectedWalletId===w.id && <Check size={14} style={{ color:"#6366f1" }} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 商家 */}
                <ListRow icon="🏪" label="商家" value={merchantInput || "尚未輸入"} onClick={() => togglePanel("merchant")} active={activePanel==="merchant"} />
                <AnimatePresence>
                  {activePanel === "merchant" && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                      <div className="p-3" style={{ background: "var(--bg-card)" }}>
                        <input type="text" value={merchantInput} onChange={e => setMerchantInput(e.target.value)} placeholder="輸入商家名稱..."
                          className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-2"
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                        <div className="flex flex-wrap gap-1.5">
                          {merchants.filter(m => m.name.includes(merchantInput)).slice(0,8).map(m => (
                            <button key={m.id} onClick={() => { setMerchantInput(m.name); setActivePanel(null); }}
                              className="px-3 py-1.5 rounded-lg text-xs"
                              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                              {m.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 週期 */}
                <ListRow icon="🔄" label="週期" value={RECURRING_OPTIONS.find(r=>r.value===recurringType)?.label ?? "單次"} onClick={() => togglePanel("recurring")} active={activePanel==="recurring"} />
                <AnimatePresence>
                  {activePanel === "recurring" && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                      <div className="p-3" style={{ background: "var(--bg-card)" }}>
                        <div className="flex flex-wrap gap-2">
                          {RECURRING_OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => { setRecurringType(opt.value); if(opt.value!=="INSTALLMENT") setActivePanel(null); }}
                              className="px-3 py-1.5 rounded-xl text-xs font-medium"
                              style={{ background: recurringType===opt.value ? "rgba(99,102,241,0.2)" : "var(--bg-surface)", color: recurringType===opt.value ? "#6366f1" : "var(--text-secondary)", border: recurringType===opt.value ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)" }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {recurringType === "INSTALLMENT" && (
                          <div className="mt-4 flex items-center gap-3">
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>分期期數</p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setInstallments(n => Math.max(2,n-1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>-</button>
                              <span className="text-lg font-bold w-8 text-center" style={{ color: "var(--text-primary)" }}>{installments}</span>
                              <button onClick={() => setInstallments(n => Math.min(36,n+1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>+</button>
                            </div>
                            <button onClick={() => setActivePanel(null)} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#6366f1", color: "#fff" }}>確定</button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 備註 */}
                <ListRow icon="📝" label="備註" value={note || "點擊輸入"} onClick={() => togglePanel("note")} active={activePanel==="note"} />
                <AnimatePresence>
                  {activePanel === "note" && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                      <div className="p-3" style={{ background: "var(--bg-card)" }}>
                        <div className="flex gap-2">
                          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="加個備註..."
                            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                          <button onClick={() => setActivePanel(null)} className="px-4 rounded-xl text-sm font-bold" style={{ background: "#6366f1", color: "#fff" }}>完成</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>

            {/* ── 底部鍵盤區與送出按鈕 ── */}
            <div className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border)] shadow-[0_-10px_20px_rgba(0,0,0,0.2)]">
              {/* 數字鍵盤 */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {KEYS.map(key => (
                  <motion.button key={key} whileTap={{ scale: 0.85 }} onClick={() => handleKey(key)}
                    className="h-12 rounded-xl flex items-center justify-center text-xl font-bold"
                    style={{
                      background: key === "⌫" ? "var(--bg-overlay)" : "var(--bg-card)",
                      color: key === "⌫" ? "#f43f5e" : "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }}>
                    {key}
                  </motion.button>
                ))}
              </div>

              {/* 送出按鈕 */}
              <motion.button onClick={handleSubmit} disabled={!canSubmit}
                whileTap={canSubmit ? { scale: 0.97 } : {}}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-base"
                animate={{
                  background: canSubmit ? gradientColor : "var(--bg-card)",
                  color: canSubmit ? "#fff" : "var(--text-muted)",
                }}>
                {submitted
                  ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={22} /></motion.div>
                  : <>{canSubmit ? (type==="EXPENSE"?"💸":"💰") : "🔒"}<span>{canSubmit?"確認記帳":"請選擇分類與輸入金額"}</span></>
                }
              </motion.button>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
