"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, Trash2, Store } from "lucide-react";
import { deleteMerchant } from "@/app/actions/merchant";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function MerchantsClient({ initialMerchants }: { initialMerchants: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`確定要刪除商家「${name}」嗎？\n\n這不會刪除原本的交易紀錄，只會從記帳時的快速選擇清單中移除。`)) return;
    startTransition(async () => {
      await deleteMerchant(id);
      router.refresh();
    });
  };

  return (
    <div className="max-w-lg mx-auto pb-20">
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/settings" className="p-2 -ml-2 rounded-xl" style={{ color: "var(--text-secondary)" }}>
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>商家管理</h1>
        <div className="w-9" />
      </div>

      <div className="p-4">
        <p className="text-xs mb-4 px-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          您在記帳時輸入的新商家會自動加入此清單。<br/>刪除商家不會影響已記帳的明細，只會從建議清單中移除。
        </p>

        <div className="space-y-2">
          {initialMerchants.length === 0 && (
            <p className="text-center py-10 text-sm" style={{ color: "var(--text-muted)" }}>尚無商家紀錄</p>
          )}
          <AnimatePresence>
            {initialMerchants.map(m => (
              <motion.div key={m.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between p-4 glass-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
                    <Store size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{new Date(m.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(m.id, m.name)} disabled={isPending}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
