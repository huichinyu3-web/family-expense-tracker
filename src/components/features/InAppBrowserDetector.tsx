"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function InAppBrowserDetector({ children }: { children: React.ReactNode }) {
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    setCurrentUrl(window.location.href);

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const isLine = /Line/i.test(ua);
    const isFb = /FBAV|FBAN/i.test(ua);
    const isIg = /Instagram/i.test(ua);

    // 1. 若為 LINE 且還未加上 openExternalBrowser，直接嘗試重新導向
    if (isLine && !window.location.search.includes("openExternalBrowser=1")) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("openExternalBrowser", "1");
      window.location.href = newUrl.href;
      return;
    }

    // 2. 如果是其他內建瀏覽器，或是 LINE 加上參數後依然停留在網頁內（某些舊版可能），顯示擋板
    if (isLine || isFb || isIg) {
      setIsInAppBrowser(true);
    }
  }, []);

  const handleCopyLink = () => {
    // 移除 openExternalBrowser 參數讓複製的網址乾淨一點
    const url = new URL(currentUrl);
    url.searchParams.delete("openExternalBrowser");
    navigator.clipboard.writeText(url.href).then(() => {
      toast.success("連結已複製！請前往 Safari 或 Chrome 貼上");
    });
  };

  if (!isInAppBrowser) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-sm w-full p-8 flex flex-col items-center border border-red-500/30 shadow-[0_0_30px_rgba(244,63,94,0.15)]"
      >
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <ShieldAlert size={32} className="text-red-500" />
        </div>
        
        <h2 className="text-xl font-bold text-white mb-3">請使用外部瀏覽器開啟</h2>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          為了保護您的帳號安全，Google 禁用了 App 內建瀏覽器的登入功能。請依照下方指示操作：
        </p>

        <div className="w-full bg-white/5 rounded-xl p-4 text-left mb-6 space-y-3">
          <p className="text-sm text-gray-300">
            👉 <strong className="text-white">iOS (iPhone)</strong><br/>
            點擊右下角 <span className="inline-block p-1 bg-white/10 rounded text-xs mx-1">指南針</span> 圖示開啟 Safari。
          </p>
          <p className="text-sm text-gray-300">
            👉 <strong className="text-white">Android</strong><br/>
            點擊右上角 <span className="inline-block p-1 bg-white/10 rounded text-xs mx-1">⋮</span> 選擇「以 Chrome 開啟」。
          </p>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-medium bg-indigo-500 hover:bg-indigo-600 transition-colors text-white"
        >
          <Copy size={18} />
          一鍵複製完整連結
        </button>
      </motion.div>
    </div>
  );
}
