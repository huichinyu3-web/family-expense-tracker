"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import { Link2, Copy, Check, X, Users, Clock, Shield } from "lucide-react";
import { createInvitation } from "@/app/actions/invitation";

const ROLE_OPTIONS = [
  { value: "MEMBER", label: "一般成員", desc: "可查看與新增記帳", icon: "👤", color: "#6366f1" },
  { value: "ADMIN", label: "家庭管理員", desc: "可管理分類與帳戶", icon: "👑", color: "#f59e0b" },
  { value: "VIEWER", label: "唯讀觀察者", desc: "只能查看，無法記帳", icon: "👁", color: "#6b7280" },
];

export default function InviteSheet({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState<"MEMBER" | "ADMIN" | "VIEWER">("MEMBER");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const { token } = await createInvitation(role);
        setInviteLink(`${baseUrl}/join?token=${token}`);
      } catch (e: any) {
        setError(e.message || "產生邀請連結失敗");
      }
    });
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Users size={18} /> 邀請家庭成員
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>產生一次性連結，有效時間 24 小時</p>
          </div>
          <button onClick={onClose}><X size={18} style={{ color: "var(--text-muted)" }} /></button>
        </div>

        {/* Role Selector */}
        {!inviteLink && (
          <>
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>邀請身份</p>
            <div className="flex flex-col gap-2 mb-6">
              {ROLE_OPTIONS.map(r => (
                <button key={r.value} onClick={() => setRole(r.value as any)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                  style={{
                    background: role === r.value ? `${r.color}15` : "var(--bg-card)",
                    border: role === r.value ? `1.5px solid ${r.color}60` : "1.5px solid var(--border)",
                  }}>
                  <span className="text-xl">{r.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: role === r.value ? r.color : "var(--text-primary)" }}>{r.label}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.desc}</p>
                  </div>
                  {role === r.value && <Check size={16} style={{ color: r.color }} />}
                </button>
              ))}
            </div>

            {error && <p className="text-xs text-red-400 mb-3 text-center">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.97 }} onClick={handleGenerate} disabled={pending}
              className="w-full h-12 rounded-2xl font-semibold text-sm text-white"
              style={{ background: "var(--gradient-primary)" }}>
              {pending ? "產生中..." : "🔗 產生邀請連結"}
            </motion.button>
          </>
        )}

        {/* Link Display */}
        {inviteLink && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl p-4 mb-4 flex flex-col gap-3"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <Clock size={12} /> 此連結 24 小時後自動失效，且只能使用一次
              </div>
              <p className="text-xs font-mono break-all rounded-lg p-2"
                style={{ background: "var(--bg-main)", color: "var(--text-secondary)" }}>
                {inviteLink}
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }} onClick={handleCopy}
              className="w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: copied ? "rgba(16,185,129,0.2)" : "var(--gradient-primary)", color: copied ? "#10b981" : "#fff", border: copied ? "1px solid #10b981" : "none" }}>
              {copied ? <><Check size={16} /> 已複製到剪貼板！</> : <><Copy size={16} /> 複製連結</>}
            </motion.button>

            <button onClick={() => { setInviteLink(null); setRole("MEMBER"); }}
              className="w-full mt-3 text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
              重新產生另一個連結
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
