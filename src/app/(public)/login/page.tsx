"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Fingerprint, LogIn, Wallet, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function LoginClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // 如果已登入，3 秒後自動跳往 callbackUrl 或 Dashboard
  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = setTimeout(() => {
      router.replace(callbackUrl);
    }, 3000);
    return () => clearTimeout(timer); // 若使用者提前點「繼續使用」則取消計時器
  }, [status, router, callbackUrl]);

  // 載入中（避免閃爍）
  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, #0a0a0f 70%)" }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  // ── 已登入：顯示目前帳號 + 切換帳號選項 ──
  if (status === "authenticated" && session?.user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, #0a0a0f 70%)" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card w-full max-w-sm p-8 flex flex-col items-center gap-5 text-center">

          {session.user.image && (
            <img src={session.user.image} alt="" className="w-16 h-16 rounded-full border-2 border-indigo-500/40" />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>目前登入帳號</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{session.user.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{session.user.email}</p>
          </div>

          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.replace(callbackUrl)}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: "var(--gradient-primary)" }}>
            繼續使用
          </motion.button>

          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <RefreshCw size={15} />
            切換帳號
          </motion.button>
        </motion.div>
      </main>
    );
  }

  // ── 未登入：正常登入畫面 ──
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, #0a0a0f 70%)" }}>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
          <Wallet size={36} color="white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>家庭記帳本</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>與家人一起輕鬆管理每一筆支出</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card w-full max-w-sm p-8 flex flex-col gap-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-center mb-2" style={{ color: "var(--text-muted)" }}>
          選擇登入方式
        </p>

        {/* Google 登入 */}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => signIn("google", { callbackUrl })}
          className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-semibold text-sm transition-all"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hover)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
          <LogIn size={20} />
          使用 Google 帳號登入
        </motion.button>

        {/* 分隔線 */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>或</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        {/* 生物辨識 */}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => signIn("webauthn", { callbackUrl })}
          className="btn-primary flex items-center justify-center gap-3 w-full py-3.5 text-sm"
          style={{ boxShadow: "var(--shadow-glow)" }}>
          <Fingerprint size={20} />
          指紋 / 臉部辨識快速登入
        </motion.button>

        <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
          支援 Face ID、Touch ID、Windows Hello
        </p>
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="mt-8 text-xs text-center" style={{ color: "var(--text-muted)" }}>
        您的生物特徵永不離開裝置，安全有保障
      </motion.p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, #0a0a0f 70%)" }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <LoginClient />
    </Suspense>
  );
}
