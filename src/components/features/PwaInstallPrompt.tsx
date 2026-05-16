"use client";

import { useEffect, useState } from "react";
import { X, Share, MoreVertical, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [os, setOs] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. 若已經安裝 (standalone mode)，絕對不顯示
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // 2. 檢查使用者是否已經關閉過
    const hasDismissed = localStorage.getItem("hidePwaPrompt");
    if (hasDismissed) return;

    // 3. 判斷 OS
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      setOs("ios");
    } else if (/android/i.test(ua)) {
      setOs("android");
    } else {
      // 桌面版通常不用特別提示，或者您可以選擇也提示
      return; 
    }

    // 稍微延遲顯示，避免一進畫面就干擾
    const timer = setTimeout(() => {
      setShow(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("hidePwaPrompt", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-4 right-4 z-[9000] mx-auto max-w-sm"
        >
          <div className="glass-card relative overflow-hidden rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-indigo-500/20 bg-[#0a0a0f]/90 backdrop-blur-xl">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400"
            >
              <X size={14} />
            </button>

            <div className="flex gap-3 items-start pr-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                <Smartphone size={20} className="text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white mb-1">將記帳本加到主畫面</h3>
                <p className="text-[11px] text-gray-300 mb-3 leading-relaxed">
                  安裝為專屬 App，無網址列干擾，開啟速度更快！
                </p>

                <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                  {os === "ios" ? (
                    <div className="flex items-center gap-2 text-xs text-gray-200">
                      1. 點擊下方 <Share size={12} className="text-indigo-400 mx-0.5" /> 分享 <br/>
                      2. 選擇「➕ 加入主畫面」
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-200">
                      1. 點擊右上角 <MoreVertical size={12} className="text-indigo-400 mx-0.5" /> <br/>
                      2. 選擇「安裝應用程式」或「加入主畫面」
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
