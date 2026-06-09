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

  // 如果已登入，3 秒後自動跳往 callbackUrl 或 Dashboard（硬性重整，清除 Router Cache）
  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = setTimeout(() => {
      window.location.href = callbackUrl; // 強制完整重新載入，避免 Router Cache 殘留上一個帳號的資料
    }, 2500);
    return () => clearTimeout(timer);
  }, [status, callbackUrl]);

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
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, #0a0a0f 70%)" }}>

        {/* ── App 名稱與介紹 ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            <Wallet size={28} color="white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>共享記帳本</h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            與夥伴一起輕鬆管理每一筆支出
          </p>

          {/* 功能特色小標籤 */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {[
              { icon: "💰", label: "即時記帳" },
              { icon: "🤝", label: "夥伴共享" },
              { icon: "📊", label: "月報分析" },
              { icon: "🔒", label: "隱私安全" },
            ].map(({ icon, label }) => (
              <span key={label}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "var(--text-secondary)" }}>
                {icon} {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── 帳號卡片 ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card w-full max-w-sm p-8 flex flex-col items-center gap-5 text-center">

          {session.user.image && (
            <img src={session.user.image} alt="" className="w-16 h-16 rounded-full border-2 border-indigo-500/40" />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>目前登入帳號</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{session.user.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{session.user.email}</p>
          </div>

          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { window.location.href = callbackUrl; }}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: "var(--gradient-primary)" }}>
            繼續使用
          </motion.button>

          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => signOut({ callbackUrl: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` })}
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
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>共享記帳本</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>與伴侶、室友、家人一起輕鬆管理每一筆支出</p>
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

      </motion.div>
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
