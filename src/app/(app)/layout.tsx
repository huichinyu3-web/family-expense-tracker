"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, CalendarDays, Settings, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import QuickAddDrawer from "@/components/features/QuickAddDrawer";

const navItems = [
  { href: "/dashboard", icon: Wallet, label: "帳務" },
  { href: "/transactions", icon: CalendarDays, label: "活動" },
  { href: "/settings", icon: Settings, label: "設定" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActivity = pathname === "/transactions";
  const themeColor = isActivity ? "#14b8a6" : "#6366f1";
  const themeColorRgb = isActivity ? "20, 184, 166" : "99, 102, 241";

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg-base)" }}>
      {/* 主內容區（預留底部 Nav 空間） */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* 極速記帳 Drawer */}
      <QuickAddDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* 底部導覽列 */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-4 pt-3 pb-6"
        style={{
          background: "rgba(19,19,26,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border)",
        }}
      >
        {/* 左側兩個 Tab */}
        {navItems.slice(0, 2).map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 flex-1 py-1">
              <motion.div whileTap={{ scale: 0.85 }}>
                <Icon
                  size={22}
                  style={{ color: isActive ? themeColor : "var(--text-muted)" }}
                />
              </motion.div>
              <span className="text-[10px] font-medium"
                style={{ color: isActive ? themeColor : "var(--text-muted)" }}>
                {label}
              </span>
            </Link>
          );
        })}

        {/* 中間 FAB「+」號 */}
        <div className="flex flex-col items-center -mt-8 flex-1">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setDrawerOpen(true)}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: isActivity ? "linear-gradient(135deg, #14b8a6, #34d399)" : "var(--gradient-primary)",
              boxShadow: `0 10px 40px rgba(${themeColorRgb}, 0.3), 0 4px 20px rgba(0,0,0,0.4)`,
            }}
          >
            <Plus size={26} color="white" />
          </motion.button>
        </div>

        {/* 右側一個 Tab */}
        {navItems.slice(2).map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 flex-1 py-1">
              <motion.div whileTap={{ scale: 0.85 }}>
                <Icon
                  size={22}
                  style={{ color: isActive ? themeColor : "var(--text-muted)" }}
                />
              </motion.div>
              <span className="text-[10px] font-medium"
                style={{ color: isActive ? themeColor : "var(--text-muted)" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
