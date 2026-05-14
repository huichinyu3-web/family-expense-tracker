"use client";

import { motion } from "framer-motion";

/**
 * 頁面轉場動畫 Wrapper
 * 每個頁面包一層，切換時淡入 + 輕微上移
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
