"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition, useEffect } from "react";
import { Users, Crown, Trash2, ChevronDown } from "lucide-react";
import { getFamilyMembers, updateFamilyMemberRole, removeFamilyMember } from "@/app/actions/family";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  OWNER:  { label: "擁有者",   color: "#f59e0b", icon: "👑" },
  ADMIN:  { label: "管理員",   color: "#6366f1", icon: "🛡️" },
  MEMBER: { label: "一般成員", color: "#10b981", icon: "👤" },
  VIEWER: { label: "觀察者",   color: "#6b7280", icon: "👁️" },
};

const CHANGEABLE_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;

export default function FamilyMembersPanel({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const myMembership = members.find(m => m.userId === currentUserId);
  const canManage = myMembership?.role === "OWNER" || myMembership?.role === "ADMIN";

  useEffect(() => {
    getFamilyMembers().then(m => {
      setMembers(m);
      setLoading(false);
    });
  }, []);

  const handleRoleChange = (memberId: string, newRole: string) => {
    startTransition(async () => {
      try {
        await updateFamilyMemberRole(memberId, newRole as any);
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      } catch (e: any) {
        alert(e.message);
      }
    });
  };

  const handleRemove = (memberId: string, name: string) => {
    if (!confirm(`確定要將「${name}」從家庭中移除嗎？此操作無法復原。`)) return;
    startTransition(async () => {
      try {
        await removeFamilyMember(memberId);
        setMembers(prev => prev.filter(m => m.id !== memberId));
        router.refresh();
      } catch (e: any) {
        alert(e.message);
      }
    });
  };

  if (loading) return (
    <div className="py-6 flex justify-center">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {members.map(m => {
        const rl = ROLE_LABELS[m.role] ?? { label: m.role, color: "#999", icon: "?" };
        const isSelf = m.userId === currentUserId;
        const isOwner = m.role === "OWNER";
        const isManageable = canManage && !isSelf && !isOwner;

        return (
          <motion.div key={m.id} layout className="glass-card px-4 py-3 flex items-center gap-3">
            {m.user?.image
              ? <img src={m.user.image} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
              : <div className="w-10 h-10 rounded-full flex-shrink-0 bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400">
                  {m.user?.name?.[0] ?? "?"}
                </div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {m.user?.name ?? "未知"}
                  {isSelf && <span className="text-[10px] text-indigo-400 ml-1">(你)</span>}
                </p>
              </div>
              <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{m.user?.email}</p>
            </div>

            {/* 角色 */}
            {isManageable ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={m.role}
                  disabled={pending}
                  onChange={e => handleRoleChange(m.id, e.target.value)}
                  className="text-xs rounded-xl px-2 py-1.5 outline-none"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  {CHANGEABLE_ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r].icon} {ROLE_LABELS[r].label}</option>
                  ))}
                </select>
                <button onClick={() => handleRemove(m.id, m.user?.name ?? "此成員")} disabled={pending}
                  className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(244,63,94,0.1)" }}>
                  <Trash2 size={12} color="#f43f5e" />
                </button>
              </div>
            ) : (
              <span className="text-[11px] px-2 py-1 rounded-lg font-bold flex-shrink-0"
                style={{ background: `${rl.color}20`, color: rl.color }}>
                {rl.icon} {rl.label}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
