"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share } from "lucide-react";

type Platform = "ios" | "android" | "desktop" | null;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export default function InstallPWAPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<Platform>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa_install_dismissed");
    if (dismissed) return;

    // 已經是 standalone 模式（已安裝）就不顯示
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const p = detectPlatform();
    setPlatform(p);

    // Android/Desktop：監聽 beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 2000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS：手動顯示（沒有 beforeinstallprompt）
    if (p === "ios") {
      setTimeout(() => setShowBanner(true), 2000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (platform === "ios") {
      setShowIOSGuide(true);
      setShowBanner(false);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
        localStorage.setItem("pwa_install_dismissed", "1");
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa_install_dismissed", "1");
  };

  return (
    <>
      {/* 安裝橫條 */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-sm"
          >
            <div
              className="rounded-2xl p-4 flex items-center gap-3 shadow-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.95) 0%, rgba(16,185,129,0.9) 100%)",
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(20px)",
              }}
            >
              {/* App Icon */}
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192x192.png" alt="記帳本" className="w-full h-full object-cover" />
              </div>

              {/* 文字 */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">安裝「共享記帳本」</p>
                <p className="text-white/80 text-xs mt-0.5">
                  {platform === "ios" ? "加入主畫面，像 App 一樣使用" : "一鍵安裝，離線也能用"}
                </p>
              </div>

              {/* 按鈕 */}
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 bg-white text-indigo-600 font-bold text-xs px-3 py-2 rounded-xl flex-shrink-0 active:scale-95 transition-transform"
              >
                {platform === "ios" ? <Share size={12} /> : <Download size={12} />}
                {platform === "ios" ? "教我" : "安裝"}
              </button>

              {/* 關閉 */}
              <button onClick={handleDismiss} className="p-1 rounded-full text-white/70 hover:text-white flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS 安裝教學 Modal */}
      <AnimatePresence>
        {showIOSGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            onClick={handleDismiss}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl p-6"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  📱 加入主畫面
                </h3>
                <button onClick={handleDismiss}>
                  <X size={18} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {[
                  { step: "1", icon: "↑", title: "點下方分享按鈕", desc: "Safari 底部工具列中間的「分享」圖示" },
                  { step: "2", icon: "+", title: "選「加入主畫面」", desc: "往下捲動，找到「加入主畫面」選項" },
                  { step: "3", icon: "✓", title: "點右上角「新增」", desc: "確認後 App 就會出現在桌面上！" },
                ].map(({ step, icon, title, desc }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}
                    >
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleDismiss}
                className="mt-6 w-full py-3 rounded-xl text-sm font-bold"
                style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
              >
                了解了！
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
