"use client";

import { motion } from "framer-motion";
import { Users, Home, ShieldAlert, ShieldCheck } from "lucide-react";
import { toggleUserRole } from "@/app/actions/admin";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function SystemAdminClient({ stats }: { stats: any }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleToggleRole = (userId: string, currentRole: string) => {
    if (confirm(`確定要切換此用戶的權限嗎？\n(目前: ${currentRole})`)) {
      startTransition(async () => {
        await toggleUserRole(userId, currentRole);
        router.refresh();
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "#f43f5e" }}>
              <ShieldAlert size={24} /> 系統最高權限管理中心
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>此區域僅供 System Admin 存取，嚴禁窺探家庭內部明細。</p>
          </div>
          <button onClick={() => router.push("/")} className="px-4 py-2 rounded-xl text-sm font-bold bg-white/10 text-white">
            返回首頁
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/20 text-blue-500">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">總註冊人數</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
          </div>
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-green-500/20 text-green-500">
              <Home size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">建立家庭數</p>
              <p className="text-2xl font-bold text-white">{stats.totalFamilies}</p>
            </div>
          </div>
        </div>

        {/* User Management */}
        <h2 className="text-lg font-bold text-white mb-4">帳號管理列表</h2>
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/20 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">用戶 ID / 姓名</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">系統權限</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {stats.users.map((u: any) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.image ? (
                        <img src={u.image} alt="avatar" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white">U</div>
                      )}
                      <div>
                        <p className="font-semibold text-white">{u.name || "無名稱"}</p>
                        <p className="text-[10px] text-gray-500">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      u.systemRole === "SYSTEM_ADMIN" ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                    }`}>
                      {u.systemRole}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleRole(u.id, u.systemRole)}
                      disabled={pending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/20 text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {u.systemRole === "SYSTEM_ADMIN" ? "降級為 USER" : "升級為 ADMIN"}
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
