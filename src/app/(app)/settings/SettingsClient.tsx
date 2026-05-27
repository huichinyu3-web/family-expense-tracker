"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import {
  Fingerprint, Shield, ShieldAlert, ChevronRight, Users, Bell,
  Trash2, LogOut, Moon, Globe, Key, Plus, Wallet,
  Tag, X, ChevronDown, ChevronUp, Eye, EyeOff, Check, Edit2, Loader2
} from "lucide-react";
import { createWallet, deleteWallet, updateWallet, archiveWallet } from "@/app/actions/wallet";
import { createParentCategory, createChildCategory, toggleCategoryVisibility, deleteCategory } from "@/app/actions/category";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InviteSheet from "@/components/features/InviteSheet";
import FamilyMembersPanel from "@/components/features/FamilyMembersPanel";
import { COMMON_CURRENCIES } from "@/lib/currencies";

// ── 型別 ──────────────────────────────────────────────────────────────
type Wallet = {
  id: string; name: string; type: string; visibility: string; ownerId?: string | null; balance?: number;
  currency: string; isSplitEnabled: boolean; monthlyBudget?: number | null;
  startDate?: string | null; endDate?: string | null; isArchived?: boolean;
  walletMembers?: { userId: string }[];
};
type CategoryChild = { id: string; name: string; icon: string | null; isDefault: boolean; isHidden: boolean; };
type CategoryParent = { id: string; name: string; icon: string | null; type: string; isDefault: boolean; isHidden: boolean; children: CategoryChild[]; };

const WALLET_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  CASH:        { label: "現金",   icon: "💵" },
  BANK:        { label: "銀行",   icon: "🏦" },
  CREDIT_CARD: { label: "信用卡", icon: "💳" },
  E_WALLET:    { label: "電子錢包", icon: "📱" },
  OTHER:       { label: "其他",   icon: "💰" },
};

const VISIBILITY_LABELS: Record<string, { label: string; color: string }> = {
  PERSONAL: { label: "個人",   color: "#6366f1" },
  FAMILY:   { label: "全家",   color: "#10b981" },
  CUSTOM:   { label: "指定",   color: "#f59e0b" },
};

// ── 子元件 ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider px-1 mb-2"
      style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  );
}

// ── 新增帳簿對話框 ────────────────────────────────────────────────────
function AddWalletSheet({ onClose, onDone, familyRole, familyMembers }: { onClose: () => void; onDone: () => void; familyRole: string; familyMembers: any[] }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"CASH"|"BANK"|"CREDIT_CARD"|"E_WALLET"|"OTHER">("CASH");
  const [visibility, setVisibility] = useState<"PERSONAL"|"FAMILY"|"CUSTOM">("FAMILY");
  const [initialBalance, setInitialBalance] = useState("");
  const [currency, setCurrency] = useState("TWD");
  const [isSplitEnabled, setIsSplitEnabled] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    if (!name.trim()) return;
    if (visibility === "CUSTOM" && selectedMembers.length === 0) {
      alert("請至少選擇一位共享成員！");
      return;
    }
    startTransition(async () => {
      await createWallet({ name: name.trim(), type, visibility, initialBalance: parseFloat(initialBalance) || 0, currency, isSplitEnabled, monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null, memberIds: selectedMembers, startDate: startDate || null, endDate: endDate || null });
      onDone();
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-lg mx-auto rounded-t-3xl p-6"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderBottom: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>新增帳簿 (Ledger)</h2>
          <button onClick={onClose}><X size={18} style={{ color: "var(--text-muted)" }} /></button>
        </div>

        {/* 名稱 */}
        <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>帳簿名稱</label>
        <input
          className="w-full px-3 py-2.5 rounded-xl text-sm mb-4 outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          placeholder="例如：日本旅遊公積金、家庭日常"
          value={name} onChange={e => setName(e.target.value)}
        />

        {/* 類型 */}
        <label className="block text-xs mb-2" style={{ color: "var(--text-muted)" }}>類型</label>
        <div className="flex gap-2 flex-wrap mb-4">
          {(Object.entries(WALLET_TYPE_LABELS) as [string, {label:string;icon:string}][]).map(([k, v]) => (
            <button key={k} onClick={() => setType(k as typeof type)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{
                background: type === k ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
                color: type === k ? "#6366f1" : "var(--text-secondary)",
                border: type === k ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
              }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* 存取範圍 */}
        <label className="block text-xs mb-2" style={{ color: "var(--text-muted)" }}>存取範圍</label>
        <div className="flex gap-2 mb-4">
          {[
            { k: "PERSONAL", label: "👤 僅限本人", disabled: false },
            { k: "FAMILY",   label: "🏠 全家共用", disabled: familyRole !== "OWNER" && familyRole !== "ADMIN" },
            { k: "CUSTOM",   label: "🤝 指定成員", disabled: false },
          ].map(({ k, label, disabled }) => (
            <button key={k} onClick={() => !disabled && setVisibility(k as typeof visibility)}
              disabled={disabled}
              className={`flex-1 py-2 rounded-xl text-xs font-medium ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
              style={!disabled ? {
                background: visibility === k ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
                color: visibility === k ? "#6366f1" : "var(--text-secondary)",
                border: visibility === k ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
              } : { background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* 選擇成員 (僅限 CUSTOM) */}
        {visibility === "CUSTOM" && (
          <div className="mb-6 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--text-primary)" }}>選擇要共享的成員</label>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {familyMembers.map(m => {
                const isSelected = selectedMembers.includes(m.userId);
                return (
                  <div key={m.userId} 
                    onClick={() => {
                      if (isSelected) setSelectedMembers(prev => prev.filter(id => id !== m.userId));
                      else setSelectedMembers(prev => [...prev, m.userId]);
                    }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-surface)] cursor-pointer">
                    <div className={`w-5 h-5 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-[var(--border)]'}`}>
                      {isSelected && <Check size={14} color="#fff" />}
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      {m.user?.image ? <img src={m.user.image} alt="avatar" /> : <span className="text-xs">😊</span>}
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{m.user?.name || "未知成員"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 初始金額 */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>幣別</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              value={currency} onChange={e => setCurrency(e.target.value)}
            >
              {COMMON_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>初始餘額</label>
            <input
              type="number"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              placeholder="0"
              value={initialBalance} onChange={e => setInitialBalance(e.target.value)}
            />
          </div>
        </div>

        {/* 拆帳模式 */}
        {visibility !== "PERSONAL" && (
          <label className="flex items-center gap-3 p-3 rounded-xl mb-4 cursor-pointer" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <input type="checkbox" checked={isSplitEnabled} onChange={e => setIsSplitEnabled(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
            <div className="flex-1">
              <span className="block text-sm font-bold" style={{ color: "var(--text-primary)" }}>啟用拆帳與代墊結算</span>
              <span className="block text-[10px]" style={{ color: "var(--text-muted)" }}>記錄每筆交易由誰代墊，並自動計算成員間的結算差額。</span>
            </div>
          </label>
        )}

        {/* 每月預算 */}
        <div className="mb-6">
          <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>每月預算（選填）</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: "var(--text-muted)" }}>NT$</span>
            <input
              type="number"
              min="0"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              placeholder="不設定則不顯示預算警示"
              value={monthlyBudget} onChange={e => setMonthlyBudget(e.target.value)}
            />
          </div>
        </div>

        {/* 期間設定（選填）*/}
        <div className="mb-6 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <p className="text-xs font-bold mb-2.5" style={{ color: "var(--text-primary)" }}>📅 期間限定（選填）</p>
          <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>設定後，選取此帳簿時儀表板日期將自動切換至此區間，適合旅遊、專案等一次性帳簿。</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>開始日期</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>結束日期</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={pending || !name.trim()}
          className="w-full h-12 rounded-2xl font-semibold text-sm"
          style={{
            background: name.trim() ? "var(--gradient-primary)" : "var(--bg-card)",
            color: name.trim() ? "#fff" : "var(--text-muted)",
          }}>
          {pending ? "儲存中..." : "確認新增"}
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── 編輯帳簿對話框 ────────────────────────────────────────────────────
function EditWalletSheet({ wallet, onClose, onDone, familyRole, familyMembers }: { wallet: Wallet; onClose: () => void; onDone: () => void; familyRole: string; familyMembers: any[] }) {
  const [name, setName] = useState(wallet.name);
  const [type, setType] = useState<"CASH"|"BANK"|"CREDIT_CARD"|"E_WALLET"|"OTHER">(wallet.type as any);
  const [visibility, setVisibility] = useState<"PERSONAL"|"FAMILY"|"CUSTOM">(wallet.visibility as any);
  const [currency, setCurrency] = useState(wallet.currency || "TWD");
  const [isSplitEnabled, setIsSplitEnabled] = useState(wallet.isSplitEnabled || false);
  const [monthlyBudget, setMonthlyBudget] = useState(wallet.monthlyBudget != null ? String(wallet.monthlyBudget) : "");
  const [startDate, setStartDate] = useState(wallet.startDate || "");
  const [endDate, setEndDate] = useState(wallet.endDate || "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(wallet.walletMembers?.map(m => m.userId) || []);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    if (!name.trim()) return;
    if (visibility === "CUSTOM" && selectedMembers.length === 0) {
      alert("請至少選擇一位共享成員！");
      return;
    }
    startTransition(async () => {
      try {
        await updateWallet(wallet.id, { name: name.trim(), type, visibility, memberIds: selectedMembers, currency, isSplitEnabled, monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null, startDate: startDate || null, endDate: endDate || null });
        onDone();
      } catch (e: any) {
        alert(e.message || "更新失敗");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-lg mx-auto rounded-t-3xl p-6"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderBottom: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>編輯帳簿 (Edit Ledger)</h2>
          <button onClick={onClose}><X size={18} style={{ color: "var(--text-muted)" }} /></button>
        </div>

        {/* 名稱 */}
        <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>帳簿名稱</label>
        <input
          className="w-full px-3 py-2.5 rounded-xl text-sm mb-4 outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          placeholder="例如：日本旅遊公積金、家庭日常"
          value={name} onChange={e => setName(e.target.value)}
        />

        {/* 類型 */}
        <label className="block text-xs mb-2" style={{ color: "var(--text-muted)" }}>類型</label>
        <div className="flex gap-2 flex-wrap mb-4">
          {(Object.entries(WALLET_TYPE_LABELS) as [string, {label:string;icon:string}][]).map(([k, v]) => (
            <button key={k} onClick={() => setType(k as typeof type)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{
                background: type === k ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
                color: type === k ? "#6366f1" : "var(--text-secondary)",
                border: type === k ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
              }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* 存取範圍 */}
        <label className="block text-xs mb-2" style={{ color: "var(--text-muted)" }}>存取範圍</label>
        <div className="flex gap-2 mb-4">
          {[
            { k: "PERSONAL", label: "👤 僅限本人", disabled: false },
            { k: "FAMILY",   label: "🏠 全家共用", disabled: familyRole !== "OWNER" && familyRole !== "ADMIN" },
            { k: "CUSTOM",   label: "🤝 指定成員", disabled: false },
          ].map(({ k, label, disabled }) => (
            <button key={k} onClick={() => !disabled && setVisibility(k as typeof visibility)}
              disabled={disabled}
              className={`flex-1 py-2 rounded-xl text-xs font-medium ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
              style={!disabled ? {
                background: visibility === k ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
                color: visibility === k ? "#6366f1" : "var(--text-secondary)",
                border: visibility === k ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
              } : { background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* 選擇成員 (僅限 CUSTOM) */}
        {visibility === "CUSTOM" && (
          <div className="mb-6 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--text-primary)" }}>選擇要共享的成員</label>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {familyMembers.map(m => {
                const isSelected = selectedMembers.includes(m.userId);
                return (
                  <div key={m.userId} 
                    onClick={() => {
                      if (isSelected) setSelectedMembers(prev => prev.filter(id => id !== m.userId));
                      else setSelectedMembers(prev => [...prev, m.userId]);
                    }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-surface)] cursor-pointer">
                    <div className={`w-5 h-5 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-[var(--border)]'}`}>
                      {isSelected && <Check size={14} color="#fff" />}
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      {m.user?.image ? <img src={m.user.image} alt="avatar" /> : <span className="text-xs">😊</span>}
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{m.user?.name || "未知成員"}</span>
                  </div>
                );
              })}
            </div>
          </div>

        )}

        {/* 幣別 (編輯時可修改幣別) */}
        <div className="mb-6">
          <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>預設幣別</label>
          <select
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            value={currency} onChange={e => setCurrency(e.target.value)}
          >
            {COMMON_CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* 拆帳模式 */}
        {visibility !== "PERSONAL" && (
          <label className="flex items-center gap-3 p-3 rounded-xl mb-4 cursor-pointer" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <input type="checkbox" checked={isSplitEnabled} onChange={e => setIsSplitEnabled(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
            <div className="flex-1">
              <span className="block text-sm font-bold" style={{ color: "var(--text-primary)" }}>啟用拆帳與代墊結算</span>
              <span className="block text-[10px]" style={{ color: "var(--text-muted)" }}>記錄每筆交易由誰代墊，並自動計算成員間的結算差額。</span>
            </div>
          </label>
        )}

        {/* 每月預算 */}
        <div className="mb-6">
          <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>每月預算（選填）</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: "var(--text-muted)" }}>NT$</span>
            <input
              type="number"
              min="0"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              placeholder="不設定則不顯示預算警示"
              value={monthlyBudget} onChange={e => setMonthlyBudget(e.target.value)}
            />
          </div>
        </div>

        {/* 期間設定（選填）*/}
        <div className="mb-6 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <p className="text-xs font-bold mb-2.5" style={{ color: "var(--text-primary)" }}>📅 期間限定（選填）</p>
          <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>設定後，選取此帳簿時儀表板日期將自動切換至此區間。</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>開始日期</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>結束日期</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={pending || !name.trim()}
          className="w-full h-12 rounded-2xl font-semibold text-sm"
          style={{
            background: name.trim() ? "var(--gradient-primary)" : "var(--bg-card)",
            color: name.trim() ? "#fff" : "var(--text-muted)",
          }}>
          {pending ? "儲存中..." : "確認儲存"}
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── 主設定頁面 ────────────────────────────────────────────────────────
export default function SettingsClient({
  user, wallets, incomeCategories, expenseCategories, familyMembers
}: {
  user: { id?: string | null; name?: string | null; email?: string | null; image?: string | null; systemRole?: string; familyRole?: string } | null;
  wallets: Wallet[];
  incomeCategories: CategoryParent[];
  expenseCategories: CategoryParent[];
  familyMembers: any[];
}) {
  const router = useRouter();
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [expandedCatType, setExpandedCatType] = useState<"INCOME"|"EXPENSE"|null>(null);
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [showAddChildFor, setShowAddChildFor] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState("");
  const [newChildIcon, setNewChildIcon] = useState("📦");
  const [isPending, startTransition] = useTransition();

  const handleDeleteWallet = (id: string, name: string) => {
    if (deletingWalletId) return; // 避免連按
    setDeletingWalletId(id);
    startTransition(async () => {
      try {
        const result = await deleteWallet(id, false);
        if (result && 'needsConfirm' in result && result.needsConfirm) {
          const confirmed = confirm(
            `⚠️ 警告：「${name}」帳戶下有 ${result.txCount} 筆交易記錄。\n\n` +
            `刪除帳戶將會一併永久刪除這 ${result.txCount} 筆交易，此操作無法復原！\n\n確定要繼續嗎？`
          );
          if (!confirmed) {
            setDeletingWalletId(null);
            return;
          }
          await deleteWallet(id, true);
        }
        router.refresh();
      } catch (e: any) {
        alert(e.message || "刪除失敗");
      } finally {
        setDeletingWalletId(null);
      }
    });
  };

  const handleAddChild = (parentId: string) => {
    if (!newChildName.trim()) return;
    startTransition(async () => {
      await createChildCategory({ name: newChildName.trim(), icon: newChildIcon, parentId });
      setNewChildName(""); setNewChildIcon("📦"); setShowAddChildFor(null);
      router.refresh();
    });
  };

  const handleToggleHidden = (id: string, isHidden: boolean) => {
    startTransition(async () => {
      await toggleCategoryVisibility(id, !isHidden);
      router.refresh();
    });
  };

  const handleDeleteCat = (id: string) => {
    startTransition(async () => {
      try {
        await deleteCategory(id);
        router.refresh();
      } catch (e: any) {
        alert(`❌ 無法刪除分類\n\n${e.message}`);
      }
    });
  };

  const renderCategories = (cats: CategoryParent[]) => (
    <div className="space-y-2 mb-4">
      {cats.map(parent => (
        <div key={parent.id} className="glass-card overflow-hidden">
          {/* 大項 Header */}
          <button
            className="w-full px-4 py-3 flex items-center gap-3"
            onClick={() => setExpandedParent(expandedParent === parent.id ? null : parent.id)}
          >
            <span className="text-xl">{parent.icon}</span>
            <span className="flex-1 text-sm font-medium text-left" style={{ color: "var(--text-primary)" }}>{parent.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full mr-2" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
              {parent.children.length} 個細項
            </span>
            {parent.isHidden
              ? <EyeOff size={13} style={{ color: "var(--text-muted)" }} />
              : expandedParent === parent.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />
            }
          </button>

          {/* 細項展開 */}
          <AnimatePresence>
            {expandedParent === parent.id && (
              <motion.div
                initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-1.5 border-t" style={{ borderColor: "var(--border)" }}>
                  {parent.children.map(child => (
                    <div key={child.id} className="flex items-center gap-2 py-1.5">
                      <span>{child.icon}</span>
                      <span className="flex-1 text-sm" style={{ color: child.isHidden ? "var(--text-muted)" : "var(--text-primary)" }}>{child.name}</span>
                      {child.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>預設</span>
                      )}
                      <button onClick={() => handleToggleHidden(child.id, child.isHidden)} className="p-1">
                        {child.isHidden
                          ? <Eye size={13} style={{ color: "var(--text-muted)" }} />
                          : <EyeOff size={13} style={{ color: "var(--text-muted)" }} />
                        }
                      </button>
                      {!child.isDefault && (
                        <button onClick={() => handleDeleteCat(child.id)} className="p-1">
                          <Trash2 size={13} color="#f43f5e" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* 新增細項 */}
                  {showAddChildFor === parent.id ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        className="w-10 px-2 py-1.5 rounded-lg text-center text-sm outline-none"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                        value={newChildIcon} onChange={e => setNewChildIcon(e.target.value)}
                        maxLength={2}
                      />
                      <input
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        placeholder="細項名稱..."
                        value={newChildName} onChange={e => setNewChildName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAddChild(parent.id)}
                      />
                      <button onClick={() => handleAddChild(parent.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "#6366f1", color: "#fff" }}>
                        新增
                      </button>
                      <button onClick={() => setShowAddChildFor(null)} className="p-1">
                        <X size={14} style={{ color: "var(--text-muted)" }} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowAddChildFor(parent.id); setNewChildName(""); }}
                      className="w-full py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 mt-1"
                      style={{ border: "1px dashed var(--border-hover)", color: "#6366f1" }}>
                      <Plus size={11} /> 新增細項
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">

      {/* ── 個人資料卡 ── */}
      <div className="flex items-center gap-4 glass-card p-4 mb-6" style={{ boxShadow: "var(--shadow-glow)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
          style={{ background: "var(--gradient-primary)" }}>
          {user?.image ? <img src={user.image} alt="avatar" className="w-full h-full object-cover" /> : "😊"}
        </div>
        <div className="flex-1">
          <p className="font-bold" style={{ color: "var(--text-primary)" }}>{user?.name ?? "使用者"}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{user?.email ?? ""}</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block"
            style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>
            {user?.familyRole === "OWNER" ? "共享帳簿擁有者 (Owner)" : user?.familyRole === "ADMIN" ? "管理員 (Admin)" : "一般成員"}
          </span>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
      </div>

      {/* ── 帳簿管理 ── */}
      <SectionTitle>💳 帳簿管理 (Ledgers)</SectionTitle>
      {wallets.length === 0 && (
        <p className="text-xs px-1 mb-3" style={{ color: "var(--text-muted)" }}>尚無帳簿，請先新增</p>
      )}
      {wallets.map(w => {
        const t = WALLET_TYPE_LABELS[w.type] ?? { label: w.type, icon: "💰" };
        const v = VISIBILITY_LABELS[w.visibility] ?? { label: w.visibility, color: "#999" };
        return (
          <motion.div key={w.id} layout className={`glass-card px-4 py-3 flex items-center gap-3 mb-2 ${w.isArchived ? 'opacity-60' : ''}`}>
            <span className="text-xl">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{w.name}
                  {w.isArchived && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(156,163,175,0.2)", color: "#9ca3af" }}>封存中</span>}
                </p>
                <span className="text-sm font-bold tabular-nums flex-shrink-0 ml-2" style={{ color: w.balance! < 0 ? "#f43f5e" : "var(--text-primary)" }}>
                  {w.currency} {w.balance?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${v.color}20`, color: v.color }}>
                  {v.label}
                </span>
                {w.isSplitEnabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                    📐 拆帳模式
                  </span>
                )}
                {(w.startDate || w.endDate) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                    📅 {w.startDate || "?"} ~ {w.endDate || "?"}
                  </span>
                )}
              </div>
            </div>
            
            {((user?.familyRole === "OWNER" || user?.familyRole === "ADMIN") || w.ownerId === user?.id) && (
              <div className="flex items-center gap-1 ml-2">
                {/* 封存 / 解封存 */}
                <button
                  title={w.isArchived ? "解除封存" : "封存帳簿"}
                  onClick={() => startTransition(async () => { await archiveWallet(w.id, !w.isArchived); router.refresh(); })}
                  className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: w.isArchived ? "rgba(99,102,241,0.15)" : "var(--bg-card)", border: "1px solid var(--border)", color: w.isArchived ? "#6366f1" : "var(--text-muted)" }}>
                  <span className="text-[11px]">{w.isArchived ? "📂" : "🗄️"}</span>
                </button>
                <button onClick={() => setEditingWallet(w)} className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <Edit2 size={12} />
                </button>
                <button onClick={() => handleDeleteWallet(w.id, w.name)} disabled={deletingWalletId === w.id} className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors" style={{ background: "rgba(244,63,94,0.1)" }}>
                  {deletingWalletId === w.id ? <Loader2 size={12} className="animate-spin text-red-500" /> : <Trash2 size={12} color="#f43f5e" />}
                </button>
              </div>
            )}
          </motion.div>
        );
      })}
      <motion.button
        whileTap={{ scale: 0.97 }} onClick={() => setShowAddWallet(true)}
        className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-medium mb-6"
        style={{ border: "1px dashed var(--border-hover)", color: "#6366f1" }}>
        <Plus size={14} /> 新增帳簿
      </motion.button>

      {/* ── 分類管理 ── */}
      <SectionTitle>🏷️ 分類管理</SectionTitle>
      <div className="flex gap-2 mb-3">
        {(["EXPENSE", "INCOME"] as const).map(t => (
          <button key={t} onClick={() => setExpandedCatType(expandedCatType === t ? null : t)}
            className="flex-1 py-2 rounded-xl text-sm font-medium"
            style={{
              background: expandedCatType === t ? (t === "EXPENSE" ? "rgba(244,63,94,0.15)" : "rgba(16,185,129,0.15)") : "var(--bg-card)",
              color: expandedCatType === t ? (t === "EXPENSE" ? "#f43f5e" : "#10b981") : "var(--text-secondary)",
              border: `1px solid ${expandedCatType === t ? (t === "EXPENSE" ? "#f43f5e" : "#10b981") : "var(--border)"}`,
            }}>
            {t === "EXPENSE" ? "💸 支出分類" : "💰 收入分類"}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {expandedCatType && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            {renderCategories(expandedCatType === "EXPENSE" ? expenseCategories : incomeCategories)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 共享設定 ── */}
      <div className="mt-2">
        <SectionTitle>🤝 共享設定</SectionTitle>

        {/* 管理成員 手風琴 */}
        <motion.button onClick={() => setShowMembers(v => !v)} whileTap={{ scale: 0.98 }}
          className="w-full glass-card px-4 py-3.5 flex items-center gap-3 mb-2 text-left">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
            <Users size={16} style={{ color: "#6366f1" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>管理成員</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>查看成員、修改角色或移除</p>
          </div>
          <ChevronRight size={14} style={{ color: "var(--text-muted)", transform: showMembers ? "rotate(90deg)" : "none", transition: "0.2s" }} />
        </motion.button>

        <AnimatePresence>
          {showMembers && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-2">
              <FamilyMembersPanel currentUserId={user?.id ?? ""} />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button onClick={() => setShowInvite(true)} whileTap={{ scale: 0.98 }} className="w-full glass-card px-4 py-3.5 flex items-center gap-3 mb-2 text-left">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)" }}>
            <Shield size={16} style={{ color: "#6366f1" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>邀請新成員</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>產生邀請連結（24 小時有效）</p>
          </div>
          <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
        </motion.button>
      </div>

      {/* ── 資料管理 ── */}
      <div className="mt-4 mb-2">
        <SectionTitle>📊 資料管理</SectionTitle>
        <Link href="/settings/merchants" className="w-full glass-card px-4 py-3.5 flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-500/15">
            <Tag size={16} className="text-indigo-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>商家管理</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>檢視與刪除常用商家清單</p>
          </div>
          <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
        </Link>
      </div>

      {/* ── 帳號 ── */}
      <div className="mt-4 mb-6">
        <SectionTitle>🔑 帳號</SectionTitle>

        {user?.systemRole === "SYSTEM_ADMIN" && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/system-admin")}
            className="w-full glass-card px-4 py-3.5 flex items-center gap-3 text-left mb-2 border border-red-500/30">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10">
              <ShieldAlert size={16} color="#f43f5e" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-500">進入系統管理中心</p>
              <p className="text-[10px] text-red-500/70">超級管理員專屬</p>
            </div>
            <ChevronRight size={14} className="text-red-500/50" />
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full glass-card px-4 py-3.5 flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(244,63,94,0.15)" }}>
            <LogOut size={16} color="#f43f5e" />
          </div>
          <p className="text-sm font-medium" style={{ color: "#f43f5e" }}>登出</p>
        </motion.button>
      </div>

      <p className="text-center text-xs pb-2" style={{ color: "var(--text-muted)" }}>
        Shared Expense Tracker v0.2.0
      </p>

      {/* ── 新增帳簿 Drawer ── */}
      <AnimatePresence>
        {showAddWallet && (
          <>
            <motion.div className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowAddWallet(false)}
            />
            <AddWalletSheet
              onClose={() => setShowAddWallet(false)}
              onDone={() => { setShowAddWallet(false); router.refresh(); }}
              familyRole={user?.familyRole || "MEMBER"}
              familyMembers={familyMembers}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── 編輯帳簿 Drawer ── */}
      <AnimatePresence>
        {editingWallet && (
          <>
            <motion.div className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={() => setEditingWallet(null)}
            />
            <EditWalletSheet
              wallet={editingWallet}
              onClose={() => setEditingWallet(null)}
              onDone={() => { setEditingWallet(null); router.refresh(); }}
              familyRole={user?.familyRole || "MEMBER"}
              familyMembers={familyMembers}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── 邀請成員 Sheet ── */}
      <AnimatePresence>
        {showInvite && (
          <>
            <motion.div className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowInvite(false)}
            />
            <InviteSheet onClose={() => setShowInvite(false)} familyRole={user?.familyRole || "MEMBER"} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
