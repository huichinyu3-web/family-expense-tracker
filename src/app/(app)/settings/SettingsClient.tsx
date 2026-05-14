"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import {
  Fingerprint, Shield, ShieldAlert, ChevronRight, Users, Bell,
  Trash2, LogOut, Moon, Globe, Key, Plus, Wallet,
  Tag, X, ChevronDown, ChevronUp, Eye, EyeOff
} from "lucide-react";
import { createWallet, deleteWallet } from "@/app/actions/wallet";
import { createParentCategory, createChildCategory, toggleCategoryVisibility, deleteCategory } from "@/app/actions/category";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import InviteSheet from "@/components/features/InviteSheet";

// ── 型別 ──────────────────────────────────────────────────────────────
type Wallet = {
  id: string; name: string; type: string; visibility: string; ownerId?: string | null; balance?: number;
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

// ── 新增帳戶對話框 ────────────────────────────────────────────────────
function AddWalletSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"CASH"|"BANK"|"CREDIT_CARD"|"E_WALLET"|"OTHER">("CASH");
  const [visibility, setVisibility] = useState<"PERSONAL"|"FAMILY"|"CUSTOM">("FAMILY");
  const [initialBalance, setInitialBalance] = useState("0");
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      await createWallet({ name: name.trim(), type, visibility, initialBalance: parseFloat(initialBalance) || 0 });
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
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>新增帳戶</h2>
          <button onClick={onClose}><X size={18} style={{ color: "var(--text-muted)" }} /></button>
        </div>

        {/* 名稱 */}
        <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>帳戶名稱</label>
        <input
          className="w-full px-3 py-2.5 rounded-xl text-sm mb-4 outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          placeholder="例如：中信聯名卡、家庭現金"
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
            { k: "PERSONAL", label: "👤 僅限本人" },
            { k: "FAMILY",   label: "🏠 全家共用" },
            { k: "CUSTOM",   label: "🤝 指定成員" },
          ].map(({ k, label }) => (
            <button key={k} onClick={() => setVisibility(k as typeof visibility)}
              className="flex-1 py-2 rounded-xl text-xs font-medium"
              style={{
                background: visibility === k ? "rgba(99,102,241,0.2)" : "var(--bg-card)",
                color: visibility === k ? "#6366f1" : "var(--text-secondary)",
                border: visibility === k ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* 初始金額 */}
        <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>初始餘額</label>
        <div className="relative mb-6">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>NT$</span>
          <input
            type="number"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            placeholder="0"
            value={initialBalance} onChange={e => setInitialBalance(e.target.value)}
          />
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

// ── 主設定頁面 ────────────────────────────────────────────────────────
export default function SettingsClient({
  user, wallets, incomeCategories, expenseCategories,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null; systemRole?: string } | null;
  wallets: Wallet[];
  incomeCategories: CategoryParent[];
  expenseCategories: CategoryParent[];
}) {
  const router = useRouter();
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [expandedCatType, setExpandedCatType] = useState<"INCOME"|"EXPENSE"|null>(null);
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [showAddChildFor, setShowAddChildFor] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState("");
  const [newChildIcon, setNewChildIcon] = useState("📦");
  const [isPending, startTransition] = useTransition();

  const handleDeleteWallet = (id: string) => {
    startTransition(async () => {
      await deleteWallet(id);
      router.refresh();
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
      await deleteCategory(id);
      router.refresh();
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
            家庭擁有者 (Owner)
          </span>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
      </div>

      {/* ── 帳戶管理 ── */}
      <SectionTitle>💳 帳戶管理</SectionTitle>
      {wallets.length === 0 && (
        <p className="text-xs px-1 mb-3" style={{ color: "var(--text-muted)" }}>尚無帳戶，請先新增</p>
      )}
      {wallets.map(w => {
        const t = WALLET_TYPE_LABELS[w.type] ?? { label: w.type, icon: "💰" };
        const v = VISIBILITY_LABELS[w.visibility] ?? { label: w.visibility, color: "#999" };
        return (
          <motion.div key={w.id} layout className="glass-card px-4 py-3 flex items-center gap-3 mb-2">
            <span className="text-xl">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{w.name}</p>
                <span className="text-sm font-bold tabular-nums flex-shrink-0 ml-2" style={{ color: w.balance! < 0 ? "#f43f5e" : "var(--text-primary)" }}>
                  NT$ {w.balance?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${v.color}20`, color: v.color }}>
                  {v.label}
                </span>
              </div>
            </div>
            <button onClick={() => handleDeleteWallet(w.id)} className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center ml-1" style={{ background: "rgba(244,63,94,0.1)" }}>
              <Trash2 size={12} color="#f43f5e" />
            </button>
          </motion.div>
        );
      })}
      <motion.button
        whileTap={{ scale: 0.97 }} onClick={() => setShowAddWallet(true)}
        className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-medium mb-6"
        style={{ border: "1px dashed var(--border-hover)", color: "#6366f1" }}>
        <Plus size={14} /> 新增帳戶
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

      {/* ── 家庭設定 ── */}
      <div className="mt-2">
        <SectionTitle>👨‍👩‍👧 家庭設定</SectionTitle>
        <motion.button onClick={() => alert("「管理成員」功能將於下一個版本 (Phase 6) 推出，敬請期待！")} whileTap={{ scale: 0.98 }} className="w-full glass-card px-4 py-3.5 flex items-center gap-3 mb-2 text-left">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-card)" }}>
            <Users size={16} style={{ color: "#6366f1" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>管理家庭成員</p>
          </div>
          <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
        </motion.button>
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
        Family Expense Tracker v0.2.0
      </p>

      {/* ── 新增帳戶 Drawer ── */}
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
            <InviteSheet onClose={() => setShowInvite(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
