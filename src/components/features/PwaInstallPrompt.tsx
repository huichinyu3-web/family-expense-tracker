"use client";

import { useEffect, useState } from "react";
import { X, Share, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [os, setOs] = useState<"ios" | "android" | "other">("other");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 已安裝 (standalone) 就不顯示
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // 已關閉過就不顯示
    if (localStorage.getItem("hidePwaPrompt")) return;

    // 判斷 OS
    const ua = navigator.userAgent || "";
    let detectedOs: "ios" | "android" | "other" = "other";
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      detectedOs = "ios";
    } else if (/android/i.test(ua)) {
      detectedOs = "android";
    }
    setOs(detectedOs);

    // Android / Desktop：監聽原生安裝事件
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 1500);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS：手動延遲顯示
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (detectedOs === "ios") {
      timer = setTimeout(() => setShow(true), 1500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (os === "ios") {
      setShowIOSSteps(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") handleDismiss();
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("hidePwaPrompt", "true");
    setShow(false);
    setShowIOSSteps(false);
  };

  return (
    <>
      {/* ── 安裝橫條 ── */}
      <AnimatePresence>
        {show && !showIOSSteps && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 22 }}
            className="fixed bottom-5 left-4 right-4 z-[9000] mx-auto max-w-sm"
          >
            <div
              className="rounded-2xl p-4 flex items-center gap-3 shadow-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.97) 0%, rgba(79,70,229,0.95) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg border border-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192x192.png" alt="記帳本" className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">安裝「共享記帳本」</p>
                <p className="text-white/75 text-[11px] mt-0.5 leading-tight">
                  {os === "ios" ? "📱 加入主畫面，使用更流暢" : "⚡ 一鍵安裝，快速開啟"}
                </p>
              </div>

              <button
                onClick={handleInstall}
                className="flex items-center gap-1 bg-white text-indigo-600 font-bold text-xs px-3 py-2 rounded-xl flex-shrink-0 active:scale-95 transition-transform shadow"
              >
                {os === "ios" ? <Share size={11} /> : <Download size={11} />}
                {os === "ios" ? "教我" : "安裝"}
              </button>

              <button onClick={handleDismiss} className="p-1 text-white/60 hover:text-white flex-shrink-0 -mr-1">
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── iOS 安裝步驟 Modal ── */}
      <AnimatePresence>
        {showIOSSteps && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9100] flex items-end justify-center p-4"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
            onClick={handleDismiss}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl p-6 mb-2"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/icon-192x192.png" alt="" className="w-full h-full" />
                  </div>
                  <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    加入主畫面
                  </h3>
                </div>
                <button onClick={handleDismiss}>
                  <X size={18} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {[
                  { icon: "⬆️", title: "點底部「分享」按鈕", desc: "Safari 下方工具列，中間的方框加箭頭圖示" },
                  { icon: "➕", title: "選「加入主畫面」", desc: "往下滑找到「加入主畫面」選項並點擊" },
                  { icon: "✅", title: "點右上角「新增」", desc: "App 圖示就會出現在桌面上！" },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <span className="text-xl leading-none mt-0.5 flex-shrink-0">{icon}</span>
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
                好，我知道了！
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
