"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export default function PwaUpdatePrompt() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // 監聽 Service Worker 控制權轉移事件
      // 因為 sw.ts 中設定了 skipWaiting: true，新版下載後會直接啟動並觸發此事件
      navigator.serviceWorker.addEventListener("controllerchange", async () => {
        try {
          // 動態抓取最新的更新日誌，使用時間戳避免快取
          const res = await fetch(`/changelog.json?t=${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            toast.info(data.title || "🔄 有新版本可用", {
              description: data.message || "點此立即更新，體驗最新功能！",
              action: {
                label: "立即更新",
                onClick: () => {
                  window.location.reload();
                },
              },
              duration: Infinity, // 不自動消失，讓使用者自行決定
              position: "top-center",
            });
            return;
          }
        } catch (e) {
          console.error("Failed to fetch changelog", e);
        }

        // 預設降級顯示
        toast.info("🔄 有新版本可用", {
          description: "點此立即更新，體驗最新功能！",
          action: {
            label: "立即更新",
            onClick: () => {
              window.location.reload();
            },
          },
          duration: Infinity, 
          position: "top-center",
        });
      });
    }
  }, []);

  return null;
}
