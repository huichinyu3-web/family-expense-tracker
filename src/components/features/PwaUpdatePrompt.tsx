"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export default function PwaUpdatePrompt() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // 監聽 Service Worker 控制權轉移事件
      // 因為 sw.ts 中設定了 skipWaiting: true，新版下載後會直接啟動並觸發此事件
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        toast.info("🔄 有新版本可用，點此立即更新", {
          action: {
            label: "立即更新",
            onClick: () => {
              window.location.reload();
            },
          },
          duration: Infinity, // 不自動消失，讓使用者自行決定
        });
      });
    }
  }, []);

  return null;
}
