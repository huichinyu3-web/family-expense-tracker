"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import { toggleUserSystemRole, adminUpdateFamilyMemberRole, adminRemoveFamilyMember, adminDeleteFamily } from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import { Users, Home, ShieldAlert, ShieldCheck, ChevronDown, ChevronRight, Trash2, Crown } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  OWNER:  { label: "擁有者", color: "#f59e0b", icon: "👑" },
  ADMIN:  { label: "管理員", color: "#6366f1", icon: "🛡️" },
  MEMBER: { label: "一般成員", color: "#10b981", icon: "👤" },
  VIEWER: { label: "觀察者", color: "#6b7280", icon: "👁️" },
};

const ALL_FAMILY_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;

export default function SystemAdminClient({ stats }: { stats: any }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null); // memberId

  const handleToggleSystemRole = (userId: string, currentRole: string) => {
    if (!confirm(`確定要切換此用戶的系統權限？\n(目前: ${currentRole})`)) return;
    startTransition(async () => {
      await toggleUserSystemRole(userId, currentRole);
      router.refresh();
    });
  };

  const handleFamilyRoleChange = (memberId: string, newRole: string) => {
    startTransition(async () => {
      await adminUpdateFamilyMemberRole(memberId, newRole as any);
      setChangingRole(null);
      router.refresh();
    });
  };

  const handleRemoveMember = (memberId: string, name: string) => {
    if (!confirm(`確定要將「${name}」從此家庭中移除嗎？\n(若為擁有者，移除後該家庭將處於無擁有者狀態)`)) return;
    startTransition(async () => {
      await adminRemoveFamilyMember(memberId);
      router.refresh();
    });
  };

  const handleDeleteFamily = (familyId: string, name: string) => {
    if (!confirm(`⚠️ 警告 ⚠️\n您即將徹底刪除「${name}」家庭群組。\n此操作將會清除該家庭所有的：\n- 成員關聯\n- 分類設定\n- 所有帳戶\n- 所有記帳明細\n\n您確定要繼續嗎？此操作無法復原！`)) return;
    startTransition(async () => {
      await adminDeleteFamily(familyId);
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: "var(--bg-main)" }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-red-500">
              <ShieldAlert size={22} /> 系統管理中心
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>僅限 System Admin | 禁止查閱家庭帳務明細</p>
          </div>
          <button onClick={() => router.push("/")}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            返回首頁
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: <Users size={20} />, label: "總註冊人數", value: stats.totalUsers, color: "#6366f1" },
            { icon: <Home size={20} />, label: "共享群組數", value: stats.totalFamilies, color: "#10b981" },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
              <div>
                <p className="text-[11px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── 群組管理 ── */}
        <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>👥 群組管理</h2>
        <div className="flex flex-col gap-2 mb-6">
          {stats.families.map((f: any) => (
            <div key={f.id} className="glass-card overflow-hidden">
              <div className="w-full flex items-center justify-between px-4 py-3">
                <button onClick={() => setExpandedFamily(expandedFamily === f.id ? null : f.id)} className="flex items-center gap-3 flex-1 text-left">
                  <span className="text-lg">🏠</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{f.name}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{f.members.length} 位成員</p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleDeleteFamily(f.id, f.name)} disabled={pending}
                    className="p-1.5 rounded-lg transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                    title="刪除此群組">
                    <Trash2 size={16} className="text-rose-500" />
                  </button>
                  <button onClick={() => setExpandedFamily(expandedFamily === f.id ? null : f.id)} className="p-1">
                    {expandedFamily === f.id ? <ChevronDown size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedFamily === f.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-3 flex flex-col gap-2 border-t" style={{ borderColor: "var(--border)" }}>
                      {f.members.map((m: any) => {
                        const rl = ROLE_LABELS[m.role] ?? { label: m.role, color: "#999", icon: "?" };
                        return (
                          <div key={m.id} className="flex items-center gap-3 py-2">
                            {m.user?.image
                              ? <img src={m.user.image} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                              : <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-600 text-xs text-white">{m.user?.name?.[0] ?? "?"}</div>}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{m.user?.name ?? "未知"}</p>
                              <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{m.user?.email}</p>
                            </div>

                            {/* 角色 badge / 選單 */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {m.role === "OWNER" ? (
                                <span className="text-xs px-2 py-1.5 rounded-lg font-bold flex-shrink-0"
                                  style={{ background: `${rl.color}20`, color: rl.color }}>{rl.icon} {rl.label}</span>
                              ) : (
                                <select
                                  disabled={pending}
                                  value={m.role}
                                  onChange={e => handleFamilyRoleChange(m.id, e.target.value)}
                                  className="text-xs rounded-lg px-2 py-1.5 outline-none"
                                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                                  {ALL_FAMILY_ROLES.map(r => (
                                    <option key={r} value={r}>{ROLE_LABELS[r].icon} {ROLE_LABELS[r].label}</option>
                                  ))}
                                </select>
                              )}
                              <button onClick={() => handleRemoveMember(m.id, m.user?.name ?? "此成員")} disabled={pending}
                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                                style={{ background: "rgba(244,63,94,0.1)" }}>
                                <Trash2 size={12} color="#f43f5e" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* ── 系統帳號管理 ── */}
        <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>👤 系統帳號管理</h2>
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
              <tr>
                <th className="px-4 py-3 font-semibold">用戶</th>
                <th className="px-4 py-3 font-semibold">系統權限</th>
                <th className="px-4 py-3 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {stats.users.map((u: any) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.image
                        ? <img src={u.image} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-600 text-xs text-white">{u.name?.[0] ?? "?"}</div>}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{u.name || "無名稱"}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${u.systemRole === "SYSTEM_ADMIN" ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-400"}`}>
                      {u.systemRole}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleToggleSystemRole(u.id, u.systemRole)} disabled={pending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-white/10 disabled:opacity-50"
                      style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                      {u.systemRole === "SYSTEM_ADMIN" ? "降為 USER" : "升為 ADMIN"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
