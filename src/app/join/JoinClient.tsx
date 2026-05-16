"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { getInvitationByToken, acceptInvitation } from "@/app/actions/invitation";
import { Users, Clock, CheckCircle, XCircle, LogIn, RefreshCw } from "lucide-react";

export default function JoinClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const token = searchParams.get("token") ?? "";

  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    getInvitationByToken(token).then(info => {
      setInviteInfo(info);
      setLoading(false);
    });
  }, [token]);

  const handleAccept = () => {
    startTransition(async () => {
      try {
        const res = await acceptInvitation(token);
        if (res?.error) {
          setErrorMsg(res.error);
          setResult("error");
          return;
        }
        setResult("success");
        setTimeout(() => router.push("/"), 2000);
      } catch (e: any) {
        setErrorMsg(e.message || "加入失敗，請重試");
        setResult("error");
      }
    });
  };

  const ROLE_LABEL: Record<string, string> = {
    OWNER: "一家之主", ADMIN: "家庭管理員", MEMBER: "一般成員", VIEWER: "唯讀觀察者",
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-main)" }}>
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!token || !inviteInfo) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-main)" }}>
      <div className="glass-card p-8 text-center max-w-sm w-full">
        <XCircle size={48} className="mx-auto mb-4 text-red-500" />
        <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>邀請連結無效</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>此連結不存在或已失效，請向家庭管理員重新索取。</p>
        <button onClick={() => router.push("/")} className="w-full py-3 rounded-xl font-semibold text-sm text-white"
          style={{ background: "var(--gradient-primary)" }}>返回首頁</button>
      </div>
    </div>
  );

  if (inviteInfo.error === "expired") return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-main)" }}>
      <div className="glass-card p-8 text-center max-w-sm w-full">
        <Clock size={48} className="mx-auto mb-4 text-yellow-500" />
        <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>邀請連結已過期</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>此邀請連結已超過 24 小時，請向家庭管理員重新索取。</p>
        <button onClick={() => router.push("/")} className="w-full py-3 rounded-xl font-semibold text-sm text-white"
          style={{ background: "var(--gradient-primary)" }}>返回首頁</button>
      </div>
    </div>
  );

  if (inviteInfo.error === "used") return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-main)" }}>
      <div className="glass-card p-8 text-center max-w-sm w-full">
        <XCircle size={48} className="mx-auto mb-4 text-red-500" />
        <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>此連結已使用</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>此邀請連結只能使用一次，請向家庭管理員重新索取。</p>
        <button onClick={() => router.push("/")} className="w-full py-3 rounded-xl font-semibold text-sm text-white"
          style={{ background: "var(--gradient-primary)" }}>返回首頁</button>
      </div>
    </div>
  );

  if (result === "success") return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-main)" }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 text-center max-w-sm w-full">
        <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
        <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>成功加入家庭！🎉</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>正在帶您前往首頁...</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-main)" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>您收到了邀請！</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>有人邀請您加入他們的家庭記帳群組</p>
        </div>

        <div className="rounded-2xl p-4 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>家庭名稱</span>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{inviteInfo.familyName}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>邀請身份</span>
            <span className="text-sm font-bold text-indigo-400">{ROLE_LABEL[inviteInfo.role] || inviteInfo.role}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>連結到期</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {new Date(inviteInfo.expiresAt).toLocaleString("zh-TW")}
            </span>
          </div>
        </div>

        {result === "error" && (
          <p className="text-xs text-red-400 text-center mb-3">{errorMsg}</p>
        )}

        {errorMsg === "請先登入再接受邀請" || (!session && !errorMsg) ? (
          <motion.button
            whileTap={{ scale: 0.97 }} onClick={() => router.push(`/login?callbackUrl=/join?token=${token}`)}
            className="w-full h-12 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)" }}>
            <LogIn size={16} />
            請先登入
          </motion.button>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.97 }} onClick={handleAccept} disabled={pending}
              className="w-full h-12 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 mb-3"
              style={{ background: "var(--gradient-primary)" }}>
              <LogIn size={16} />
              {pending ? "加入中..." : "接受邀請並加入家庭"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => signOut({ callbackUrl: `/login?callbackUrl=/join?token=${token}` })}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              <RefreshCw size={15} />
              切換帳號 (目前為 {session?.user?.name || "未知"})
            </motion.button>
          </>
        )}
        
        <button onClick={() => router.push("/")} className="w-full mt-3 text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
          不了，謝謝
        </button>
      </motion.div>
    </div>
  );
}
