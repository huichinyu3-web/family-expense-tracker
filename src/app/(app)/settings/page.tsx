"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Fingerprint, Shield, ChevronRight, Users, Bell,
  Trash2, LogOut, Moon, Globe, Key
} from "lucide-react";

// ── 模擬的已註冊裝置 ────────────────────────────────
const MOCK_DEVICES = [
  { id: "1", name: "iPhone 15 Pro",   addedAt: "2025-05-10", icon: "📱" },
  { id: "2", name: "MacBook Pro",      addedAt: "2025-05-11", icon: "💻" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider px-1 mb-2"
      style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  );
}

function SettingRow({
  icon, label, value, onClick, danger = false, rightElement
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full glass-card px-4 py-3.5 flex items-center gap-3 mb-2 text-left"
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: danger ? "rgba(244,63,94,0.15)" : "var(--bg-card)" }}>
        <span style={{ color: danger ? "#f43f5e" : "#6366f1" }}>{icon}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: danger ? "#f43f5e" : "var(--text-primary)" }}>
          {label}
        </p>
        {value && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{value}</p>}
      </div>
      {rightElement ?? <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />}
    </motion.button>
  );
}

export default function SettingsPage() {
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [devices, setDevices] = useState(MOCK_DEVICES);
  const [showAddDevice, setShowAddDevice] = useState(false);

  const removeDevice = (id: string) => {
    setDevices(d => d.filter(dev => dev.id !== id));
  };

  return (
    <div className="px-4 pt-6 pb-2 max-w-lg mx-auto">

      {/* ── 頂部：個人資料 ── */}
      <div className="flex items-center gap-4 glass-card p-4 mb-6"
        style={{ boxShadow: "var(--shadow-glow)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: "var(--gradient-primary)" }}>
          😊
        </div>
        <div className="flex-1">
          <p className="font-bold" style={{ color: "var(--text-primary)" }}>小明</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>ming@example.com</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block"
            style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>
            家庭擁有者 (Owner)
          </span>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
      </div>

      {/* ── 生物辨識設定 ── */}
      <SectionTitle>🔐 生物辨識登入</SectionTitle>

      {/* 主開關 */}
      <div className="glass-card px-4 py-3.5 flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: biometricEnabled ? "rgba(99,102,241,0.15)" : "var(--bg-card)" }}>
          <Fingerprint size={16} color={biometricEnabled ? "#6366f1" : "var(--text-muted)"} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            指紋 / 臉部辨識登入
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {biometricEnabled ? "已啟用 · 開啟 App 即可快速登入" : "已停用"}
          </p>
        </div>
        {/* Toggle Switch */}
        <motion.button
          onClick={() => setBiometricEnabled(b => !b)}
          className="w-11 h-6 rounded-full relative flex-shrink-0"
          animate={{ background: biometricEnabled ? "#6366f1" : "var(--bg-card)" }}
          style={{ border: "1px solid var(--border)" }}
        >
          <motion.div
            animate={{ x: biometricEnabled ? 20 : 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
          />
        </motion.button>
      </div>

      {/* 已註冊裝置列表 */}
      <AnimatePresence>
        {biometricEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <p className="text-xs px-1 mb-2" style={{ color: "var(--text-muted)" }}>
              已註冊的裝置（{devices.length} 台）
            </p>
            {devices.map(dev => (
              <motion.div
                key={dev.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="glass-card px-4 py-3 flex items-center gap-3 mb-2"
              >
                <span className="text-xl">{dev.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {dev.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    新增於 {dev.addedAt}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => removeDevice(dev.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(244,63,94,0.1)" }}
                >
                  <Trash2 size={12} color="#f43f5e" />
                </motion.button>
              </motion.div>
            ))}

            {/* 新增裝置按鈕 */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddDevice(true)}
              className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-medium mb-4"
              style={{
                border: "1px dashed var(--border-hover)",
                color: "#6366f1",
                background: "transparent",
              }}
            >
              <Key size={14} />
              新增此裝置的生物辨識
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 家庭設定 ── */}
      <SectionTitle>👨‍👩‍👧 家庭設定</SectionTitle>
      <SettingRow icon={<Users size={16} />} label="管理家庭成員" value="Smith 家族 · 2 位成員" />
      <SettingRow icon={<Shield size={16} />} label="邀請新成員" value="產生邀請連結（24 小時有效）" />

      {/* ── 偏好設定 ── */}
      <div className="mt-4">
        <SectionTitle>⚙️ 偏好設定</SectionTitle>
        <SettingRow icon={<Bell size={16} />}    label="通知設定" />
        <SettingRow icon={<Moon size={16} />}    label="深色模式" value="自動" />
        <SettingRow icon={<Globe size={16} />}   label="語言" value="繁體中文" />
      </div>

      {/* ── 帳號 ── */}
      <div className="mt-4 mb-6">
        <SectionTitle>🔑 帳號</SectionTitle>
        <SettingRow
          icon={<LogOut size={16} />}
          label="登出"
          danger
          rightElement={<span />}
        />
      </div>

      {/* 版本號 */}
      <p className="text-center text-xs pb-2" style={{ color: "var(--text-muted)" }}>
        Family Expense Tracker v0.1.0
      </p>
    </div>
  );
}
