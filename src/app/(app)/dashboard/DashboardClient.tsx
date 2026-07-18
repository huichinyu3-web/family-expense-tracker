"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, ChevronLeft, ChevronRight, Bell, User, Users, Trash2, Edit2, X, SlidersHorizontal, Wallet } from "lucide-react";
import { useState, useMemo, useTransition, useEffect } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { deleteTransaction } from "@/app/actions/transaction";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import QuickAddDrawer from "@/components/features/QuickAddDrawer";
import SettlementModal from "@/components/features/SettlementModal";

const MONTHS = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
const TYPES    = ["全部", "支出", "收入"];

function AnimatedAmount({ value, isIncome = false, currency }: { value: number; isIncome?: boolean; currency?: string }) {
  const color = isIncome ? "#10b981" : value < 0 ? "#f43f5e" : "var(--text-primary)";
  const prefix = isIncome ? "+" : value < 0 ? "" : "";
  return (
    <span style={{ color }} className="font-semibold tabular-nums">
      {prefix}{currency || "TWD"} {Math.abs(value).toLocaleString()}
    </span>
  );
}

function Avatar({ initial, colorId }: { initial: string; colorId: string }) {
  // 簡單用字串長度與首字母產生顏色
  const isAlt = colorId.length % 2 === 0;
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
      style={{ background: isAlt ? "#ec4899" : "var(--theme-primary)" }}>
      {initial}
    </div>
  );
}

// @ts-ignore
export default function DashboardClient({ transactions: allTransactions, wallets: allWallets, currentUserId, userName, familyName, familyMembersCount, currentUserRole, mode = "regular" }) {
  const isActivity = mode === "activity";
  
  // 顯示所有帳簿；以下用 periodWalletIds 標記「期間帳簿」供 UI 標示用
  const wallets = allWallets;
  const transactions = allTransactions;

  const themeColor = isActivity ? "#14b8a6" : "#6366f1";
  const themeColorRgb = isActivity ? "20, 184, 166" : "99, 102, 241";
  const now = new Date();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const getGreeting = () => {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const twHour = new Date(utcMs + 8 * 3600000).getHours();
    if (twHour >= 5  && twHour < 12) return "早安！☀️";
    if (twHour >= 12 && twHour < 18) return "午安！🌤️";
    if (twHour >= 18 && twHour < 22) return "晚安！🌙";
    return "夜深了！🌛";
  };

  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [editTxData, setEditTxData] = useState<any>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);

  // 即時匯率（1外幣 = ? TWD）——從 frankfurter.app 地區拉取
  const [fxRates, setFxRates] = useState<Record<string, number>>({});
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string | null>(null);

  const usedForeignKeys = Array.from(
    new Set([
      ...transactions.map((t: any) => t.currency),
      ...wallets.map((w: any) => w.currency)
    ].filter((c: string) => c && c !== "TWD"))
  ) as string[];
  const usedForeignStr = JSON.stringify(usedForeignKeys.sort());

  useEffect(() => {
    const usedForeign = JSON.parse(usedForeignStr) as string[];
    if (usedForeign.length === 0) return;
    // 若已包含所有需要的匯率，就不重新抓
    if (usedForeign.every(c => fxRates[c] !== undefined)) return;

    // 使用 open.er-api.com（免費、無 Key、支援 TWD）
    // 取得所有幣別相對於 USD 的匯率，再計算 1外幣 = ?TWD
    fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(8000) })
      .then(r => { if (!r.ok) throw new Error("API error"); return r.json(); })
      .then(data => {
        const usdToTWD = data.rates?.["TWD"];
        if (!usdToTWD) throw new Error("TWD rate missing");
        const rates: Record<string, number> = {};
        usedForeign.forEach((c: string) => {
          const usdToC = data.rates?.[c];
          if (usdToC) {
            rates[c] = usdToTWD / usdToC; // 1 外幣 = ? TWD（交叉匯率）
          } else {
            console.warn(`[FX] 不支援幣別：${c}，此幣別將以 1:1 計算`);
          }
        });
        setFxRates(rates);
        const now2 = new Date();
        setFxUpdatedAt(`${now2.getMonth()+1}/${now2.getDate()} ${now2.getHours()}:${now2.getMinutes().toString().padStart(2,'0')}`);
      })
      .catch(() => {}); // API 失敗靜默處理（純 TWD 帳簿不受影響）
  }, [usedForeignStr]); // 依賴 usedForeignStr 確保幣別變更時會重抓

  // 將任意幣別金額轉換為台幣 (TWD)
  const toTWD = (amount: number, currency?: string) => {
    const rate = (!currency || currency === "TWD") ? 1 : (fxRates[currency] ?? 1);
    return Math.abs(amount) * rate;
  };

  // 極簡新手視覺導覽狀態
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem("hasSeenOnboarding_v1");
    if (!hasSeen) {
      setShowOnboarding(true);
    }
  }, []);

  const handleCloseOnboarding = () => {
    localStorage.setItem("hasSeenOnboarding_v1", "true");
    setShowOnboarding(false);
  };

  // 進階篩選狀態
  const [showFilter, setShowFilter] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [merchantFilter, setMerchantFilter] = useState("全部");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState("全部");
  const [search, setSearch] = useState("");
  const [showAllTx, setShowAllTx] = useState(false);
  // 活動模式：預設為「總計」（不限月份）
  const [showAllPeriod, setShowAllPeriod] = useState(true);

  // 動態提取選項
  const MEMBERS = Array.from(new Set(transactions.map((t:any) => t.user?.name).filter(Boolean))) as string[];
  const CATEGORIES = ["全部", ...Array.from(new Set(transactions.map((t:any) => t.category?.name).filter(Boolean)))];
  const MERCHANTS = ["全部", ...Array.from(new Set(transactions.map((t:any) => t.merchant?.name).filter(Boolean)))];

  const handleWalletToggle = (id: string) => {
    setSelectedWallets(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (next.length === 1) {
        localStorage.setItem("lastSelectedWallet", next[0]);
      }
      return next;
    });
  };

  const handleDelete = () => {
    if (!selectedTx || selectedTx.userId !== currentUserId) return;
    if (!confirm("確定要刪除這筆紀錄嗎？")) return;
    
    startTransition(async () => {
      try {
        await deleteTransaction(selectedTx.id);
        setSelectedTx(null);
        router.refresh(); // 強制重整重新載入資料
      } catch (e: any) {
        alert(e.message || "刪除失敗");
      }
    });
  };

  // 期間帳簿 ID 集合
  const periodWalletIds = useMemo(() => new Set(wallets.filter((w: any) => w.startDate).map((w: any) => w.id)), [wallets]);

  // 過濾資料 (依據月份、視角、帳簿、進階過濾器)
  const filteredTx = useMemo(() => {
    return transactions.filter((tx: any) => {
      const txDateObj = new Date(tx.date);
      // 月份過濾：活動總計模式不限月份
      const isSameMonth = (showAllPeriod && isActivity) ? true : (startDate || endDate) ? true : (txDateObj.getMonth() === monthIdx && txDateObj.getFullYear() === year);
      
      const matchWallet = selectedWallets.length === 0 || selectedWallets.includes(tx.walletId);
      
      const matchMember = selectedMembers.length === 0 || selectedMembers.includes(tx.user?.name);
      const matchType   = typeFilter === "全部"
        || (typeFilter === "支出" && tx.type === "EXPENSE")
        || (typeFilter === "收入" && tx.type === "INCOME");
      const matchCat    = categoryFilter === "全部" || tx.category?.name === categoryFilter;
      const matchMerch  = merchantFilter === "全部" || tx.merchant?.name === merchantFilter;
      
      // 金額範圍
      const amt = Math.abs(tx.amount);
      const matchMin = minAmount ? amt >= Number(minAmount) : true;
      const matchMax = maxAmount ? amt <= Number(maxAmount) : true;

      // 日期範圍
      const txDateStr = txDateObj.toISOString().split("T")[0];
      const matchStart = startDate ? txDateStr >= startDate : true;
      const matchEnd   = endDate ? txDateStr <= endDate : true;

      // 關鍵字搜尋
      const matchSearch = search.trim() === "" || (
        (tx.note?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (tx.merchant?.name?.toLowerCase() || "").includes(search.toLowerCase())
      );

      return isSameMonth && matchWallet && matchMember && matchType && matchCat && matchMerch && matchMin && matchMax && matchStart && matchEnd && matchSearch;
    });
  }, [transactions, monthIdx, year, selectedWallets, selectedMembers, typeFilter, categoryFilter, merchantFilter, minAmount, maxAmount, startDate, endDate, search, isActivity, showAllPeriod]);

  // 若只選了一個帳簿，才顯示拆帳/詳細餘額等資訊（須先定義，後面統計用到）
  const selectedWallet = selectedWallets.length === 1 ? wallets.find((w: any) => w.id === selectedWallets[0]) : null;

  // 期間帳簿「總計」模式：抓該帳簿所有交易（不受月份限制），供全期統計用
  // 月份模式：直接用 filteredTx（已依月份過濾）
  const walletAllTx = (isActivity && showAllPeriod && selectedWallet?.startDate)
    ? transactions.filter((tx: any) => tx.walletId === selectedWallet.id)
    : null;
  const walletAllExpenses = walletAllTx?.filter((tx: any) => tx.type === "EXPENSE") ?? null;
  const walletAllIncomes  = walletAllTx?.filter((tx: any) => tx.type === "INCOME")  ?? null;

  // 統計來源：
  // - 活動「總計」模式且單選期間帳簿 → walletAllTx（全期間）
  // - 活動選擇月份 或 日常模式 → filteredTx（已依月份/篩選條件過濾）
  const statExpenses = walletAllExpenses ?? filteredTx.filter((tx: any) => tx.type === "EXPENSE");
  const statIncomes  = walletAllIncomes  ?? filteredTx.filter((tx: any) => tx.type === "INCOME");

  // filteredTx 的 expenses/incomes 僅供明細列表使用
  const expenses = filteredTx.filter((tx: any) => tx.type === "EXPENSE");
  const totalExpense = statExpenses.reduce((sum: number, tx: any) => sum + toTWD(tx.amount, tx.currency), 0);
  const incomes = filteredTx.filter((tx: any) => tx.type === "INCOME");
  const totalIncome = statIncomes.reduce((sum: number, tx: any) => sum + toTWD(tx.amount, tx.currency), 0);
  
  // 計算已付與待付 (以今日為分界)
  const pastExpense = statExpenses.filter((tx: any) => tx.date <= now.getTime()).reduce((sum: number, tx: any) => sum + toTWD(tx.amount, tx.currency), 0);
  const futureExpense = statExpenses.filter((tx: any) => tx.date > now.getTime()).reduce((sum: number, tx: any) => sum + toTWD(tx.amount, tx.currency), 0);
  
  // 計算已收與待收 (以今日為分界)
  const pastIncome = statIncomes.filter((tx: any) => tx.date <= now.getTime()).reduce((sum: number, tx: any) => sum + toTWD(tx.amount, tx.currency), 0);
  const futureIncome = statIncomes.filter((tx: any) => tx.date > now.getTime()).reduce((sum: number, tx: any) => sum + toTWD(tx.amount, tx.currency), 0);
  
  // 計算拆帳狀態
  let splitState = null;
  if (selectedWallet?.isSplitEnabled) {
    // 當前帳簿總人數
    const membersCount = selectedWallet.visibility === "FAMILY" ? familyMembersCount : (selectedWallet.walletMembers?.length || 0) + 1;
    // 我代墊的總額（TWD）——期間帳簿用 statExpenses
    const myPaid = statExpenses.filter((tx: any) => tx.paidByUserId === currentUserId).reduce((s: number, t: any) => s + toTWD(t.amount, t.currency), 0);
    // 我應負擔的份額 (總支出 / 總人數)
    const myShare = membersCount > 0 ? totalExpense / membersCount : 0;
    // 淨餘額 (正: 別人欠我, 負: 我欠別人)
    const myNetBalance = myPaid - myShare;
    
    splitState = { myPaid, myShare, myNetBalance, membersCount };
  }

  // 計算預算：單選帳簿用該帳簿的預算轉換為 TWD；多選帳簿則加總所有已選帳簿有設預算者(皆轉為 TWD)
  const effectiveBudget = (() => {
    if (selectedWallet) {
      return selectedWallet.monthlyBudget ? toTWD(selectedWallet.monthlyBudget, selectedWallet.currency) : null;
    }
    // 多選或全選時：加總有設定 monthlyBudget 的帳簿
    const targetWallets = selectedWallets.length > 0
      ? wallets.filter((w: any) => selectedWallets.includes(w.id))
      : wallets;
    const total = targetWallets.reduce((sum: number, w: any) => sum + (w.monthlyBudget ? toTWD(w.monthlyBudget, w.currency) : 0), 0);
    return total > 0 ? total : null;
  })();

  // 1. 區間收支結餘 (取代原本的 allTimeSavings，改用當前過濾後的資料)
  // 區間結餘一律顯示為收入扣除支出
  const periodSavings = totalIncome - totalExpense;
  const periodSavingsRate = totalIncome > 0 ? (periodSavings / totalIncome) * 100 : 0;

  const spentPct = effectiveBudget != null ? Math.min((totalExpense / effectiveBudget) * 100, 100) : 0;

  // 圓餅圖：紅色為期間支出，綠色為區間結餘 (若透支則全紅)
  const CHART_DATA = [
    { name: "期間支出", value: totalExpense },
    { name: "區間結餘", value: Math.max(periodSavings, 0) || (totalExpense === 0 ? 1 : 0) },
  ];

  // ── 1. 分類支出排行 (Top Categories Breakdown) ──
  const categoryExpenses = useMemo(() => {
    // 期間帳簿：用該帳簿全部交易（包含旅行前購買）
    const src = walletAllExpenses ?? filteredTx.filter((tx: any) => tx.type === "EXPENSE");
    const catMap = new Map<string, number>();
    src.forEach((tx: any) => {
      const catName = tx.category?.name || "未分類";
      catMap.set(catName, (catMap.get(catName) || 0) + toTWD(tx.amount, tx.currency));
    });
    
    return Array.from(catMap.entries())
      .map(([name, amount]) => ({ name, amount, percent: totalExpense > 0 ? (amount / totalExpense) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [filteredTx, walletAllExpenses, totalExpense]);

  // ── 2. 智能洞察小語 (Smart Insights) ──
  const smartInsight = useMemo(() => {
    if (isActivity) {
      if (totalExpense === 0 && totalIncome === 0) {
        return { text: "🗓️ 此活動尚無記帳紀錄，開始記錄活動花費吧！", type: "success" };
      }
      if (selectedWallet?.startDate) {
        const s = new Date(selectedWallet.startDate);
        const e = selectedWallet.endDate ? new Date(selectedWallet.endDate) : null;
        const totalDays = e ? Math.max(Math.round((e.getTime() - s.getTime()) / 86400000) + 1, 1) : null;
        const elapsedDays = Math.min(Math.max(Math.round((now.getTime() - s.getTime()) / 86400000) + 1, 1), totalDays ?? 999);
        const avgPerDay = elapsedDays > 0 && totalExpense > 0 ? Math.round(totalExpense / elapsedDays) : 0;
        const isEnded = e && now > e;
        const isPending = now < s;
        if (isPending) return { text: `📅 「${selectedWallet.name}」即將開始，將在 ${s.toLocaleDateString("zh-TW")} 啟動記帳。`, type: "success" };
        if (isEnded)  return { text: `🏁 「${selectedWallet.name}」已結束，共消費 NT$${Math.round(totalExpense).toLocaleString()}，平均每天 NT$${avgPerDay.toLocaleString()}。`, type: "success" };
        if (totalDays) return { text: `✈️ 第 ${elapsedDays} 天，共消費 NT$${Math.round(totalExpense).toLocaleString()}  ·  日均 NT$${avgPerDay.toLocaleString()}，共 ${totalDays} 天。`, type: totalExpense > 0 ? "warning" : "success" };
      }
      return { text: "🔥 繼續記錄您的活動花費！", type: "success" };
    }
    if (selectedWallet && (selectedWallet.balance || 0) < 0) {
      return { text: `⚠️ 注意！【${selectedWallet.name}】餘額已呈現負數 ($ ${(selectedWallet.balance || 0).toLocaleString()})，請留意資金狀況。`, type: "danger" };
    }
    if (totalExpense === 0 && totalIncome === 0) {
      return { text: "📝 這個月還沒有任何記帳紀錄，好的開始！", type: "success" };
    }
    
    if (categoryExpenses.length > 0 && categoryExpenses[0].percent > 50) {
      return { text: `💡 提醒：本月【${categoryExpenses[0].name}】花費佔比高達 ${categoryExpenses[0].percent.toFixed(0)}%，可能需要稍微留意喔！`, type: "warning" };
    }

    // 預算超支提醒（只有設定了預算才顯示）
    if (effectiveBudget != null && spentPct >= 100) {
      return { text: `🚨 預算超標！${isActivity ? "活動" : "本月"}花費已超過設定的 NT$${Math.round(effectiveBudget).toLocaleString()} 預算，請留意控制開銷！`, type: "danger" };
    }
    if (effectiveBudget != null && spentPct > 80) {
      return { text: `⚠️ 提醒：${isActivity ? "活動" : "本月"}花費已達預算 ${spentPct.toFixed(0)}%，距離上限僅剩 NT$${Math.max(0, Math.round(effectiveBudget - totalExpense)).toLocaleString()}！`, type: "warning" };
    }

    // 尚未設定預算提示
    if (effectiveBudget == null && totalExpense > 0) {
      return { text: "💡 小提示：在「設定 > 帳簿管理」中為您的帳簿設定每月預算，就能在這裡看到精準的預算控管警示！", type: "success" };
    }

    return { text: "🔥 您已經開始記帳了，繼續保持這個好習慣！", type: "success" };
  }, [selectedWallet, totalExpense, totalIncome, categoryExpenses, spentPct, effectiveBudget]);

  const onboardingSlides = [
    {
      title: "🔒 共享與個人帳簿安全隔離",
      description: "您可以建立完全屬於自己的『個人帳簿』或與家人共享的『家庭帳簿』。不用擔心，未經授權的成員絕對看不到您的私密帳簿，隱私防護百分百！",
      color: "from-blue-500/20 to-indigo-500/20"
    },
    {
      title: "⚡ 智能週期帳務展開",
      description: "水電費、訂閱費、房租等重複開支，只需在記帳時設定『截止日期』，系統會智能自動逐月/逐年寫入。未來變更時更可享受一鍵『智慧覆蓋』！",
      color: "from-purple-500/20 to-pink-500/20"
    },
    {
      title: "⚖️ 智能拆帳與代墊系統",
      description: "在共享帳本啟用拆帳後，不管是買菜代墊還是家庭聚餐，記帳時選擇代墊者與分攤成員，系統會自動在總覽頂部精算出『誰欠誰多少錢』，省去算帳煩惱！",
      color: "from-emerald-500/20 to-teal-500/20"
    },
    {
      title: "📅 日期翻頁與多選篩選",
      description: "明細頁預設鎖定今日，提供 ◀ ▶ 快速日付切換。多選成員與多選帳簿更能靈活疊加，配合強大的進階搜尋，讓記帳與對帳成為每天極致流暢的享受！",
      color: "from-amber-500/20 to-orange-500/20"
    }
  ];

  const displayTx = showAllTx ? filteredTx : filteredTx.slice(0, 5);

  const prevMonth = () => {
    if (monthIdx === 0) { setMonthIdx(11); setYear(y => y - 1); }
    else setMonthIdx(m => m - 1);
  };
  const nextMonth = () => {
    if (monthIdx === 11) { setMonthIdx(0); setYear(y => y + 1); }
    else setMonthIdx(m => m + 1);
  };

  return (
    <div 
      className="px-4 pt-6 pb-2 max-w-lg mx-auto relative"
      style={{
        "--theme-primary": isActivity ? "#14b8a6" : "#6366f1",
        "--theme-primary-rgb": isActivity ? "20,184,166" : "99,102,241"
      } as React.CSSProperties}
    >
      {/* 活動專屬：動態光暈背景 */}
      {isActivity && (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[100px] animate-pulse-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>
      )}

      {/* ── 頂部：標題列與視角切換 ── */}
      <div className="relative flex items-center justify-between mb-6 h-12">
        {/* 左側：問候語與登入者名稱 */}
        <div className="flex flex-col justify-center">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{getGreeting()}</span>
          <span className="text-lg font-bold truncate max-w-[150px]" style={{ color: "var(--text-primary)" }}>
            {userName} 👤
          </span>
        </div>
        
        {/* 中間：置中標題 */}
        <div className="absolute left-1/2 -translate-x-1/2 text-base font-bold" style={{ color: "var(--text-primary)" }}>
          {isActivity ? "活動總覽" : "帳簿總覽"}
        </div>
        
        {/* 右側：過濾按鈕 */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilter(!showFilter)}
            className="px-2.5 py-1.5 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: showFilter ? `rgba(${themeColorRgb},0.15)` : "var(--bg-card)",
              color: showFilter ? themeColor : "var(--text-muted)",
              border: showFilter ? "1px solid rgba(var(--theme-primary-rgb),0.4)" : "1px solid var(--border)",
            }}
          >
            <SlidersHorizontal size={14} />
          </motion.button>
        </div>
      </div>

      {/* ── 智能洞察小語 ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-3.5 rounded-2xl flex items-start gap-3 shadow-sm"
        style={{
          background: smartInsight.type === "danger" ? "rgba(244,63,94,0.1)" :
                      smartInsight.type === "warning" ? "rgba(245,158,11,0.1)" :
                      "rgba(16,185,129,0.1)",
          border: `1px solid ${smartInsight.type === "danger" ? "rgba(244,63,94,0.25)" :
                      smartInsight.type === "warning" ? "rgba(245,158,11,0.25)" :
                      "rgba(16,185,129,0.25)"}`
        }}>
        <div className="flex-1 text-sm font-semibold leading-relaxed"
          style={{ color: smartInsight.type === "danger" ? "#f43f5e" :
                          smartInsight.type === "warning" ? "#d97706" :
                          "#10b981" }}>
          {smartInsight.text}
        </div>
      </motion.div>

      {/* ── 進階篩選面板 ── */}
      <AnimatePresence>
      {showFilter && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card p-4 mb-4 overflow-hidden"
        >
          {/* 日期範圍 */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>日期範圍</p>
            <div className="flex gap-2 items-center">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]" />
              <span className="text-[var(--text-muted)]">-</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]" />
            </div>
          </div>

          {/* 成員 (多選) */}
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>成員 (多選)</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {(MEMBERS as string[]).map(m => {
              const isSelected = selectedMembers.includes(m);
              return (
                <button key={m} onClick={() => {
                  setSelectedMembers(prev => 
                    isSelected ? prev.filter(x => x !== m) : [...prev, m]
                  );
                }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: isSelected ? `rgba(${themeColorRgb},0.2)` : "var(--bg-card)",
                    color: isSelected ? themeColor : "var(--text-secondary)",
                    border: isSelected ? "1px solid rgba(var(--theme-primary-rgb),0.4)" : "1px solid var(--border)",
                  }}>
                  {m}
                </button>
              );
            })}
          </div>

          {/* 分類 */}
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>分類</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {(CATEGORIES as string[]).map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: categoryFilter === c ? `rgba(${themeColorRgb},0.2)` : "var(--bg-card)",
                  color: categoryFilter === c ? themeColor : "var(--text-secondary)",
                  border: categoryFilter === c ? "1px solid rgba(var(--theme-primary-rgb),0.4)" : "1px solid var(--border)",
                }}>
                {c}
              </button>
            ))}
          </div>

          {/* 商家 */}
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>商家</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {(MERCHANTS as string[]).map(m => (
              <button key={m} onClick={() => setMerchantFilter(m)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: merchantFilter === m ? `rgba(${themeColorRgb},0.2)` : "var(--bg-card)",
                  color: merchantFilter === m ? themeColor : "var(--text-secondary)",
                  border: merchantFilter === m ? "1px solid rgba(var(--theme-primary-rgb),0.4)" : "1px solid var(--border)",
                }}>
                {m}
              </button>
            ))}
          </div>

          {/* 收支類型與金額 */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1">
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>收支類型</p>
              <div className="flex gap-2">
                {TYPES.map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: typeFilter === t ? `rgba(${themeColorRgb},0.2)` : "var(--bg-card)",
                      color: typeFilter === t ? themeColor : "var(--text-secondary)",
                      border: typeFilter === t ? "1px solid rgba(var(--theme-primary-rgb),0.4)" : "1px solid var(--border)",
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1">
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>金額範圍</p>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder="最低" value={minAmount} onChange={e => setMinAmount(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] text-center" />
                <span className="text-[var(--text-muted)]">-</span>
                <input type="number" placeholder="最高" value={maxAmount} onChange={e => setMaxAmount(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] text-center" />
              </div>
            </div>
          </div>

          {/* 關鍵字搜尋 */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>關鍵字搜尋</p>
            <div className="relative">
              <input 
                type="text" 
                placeholder="搜尋備註或商家名稱..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]"
              />
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--bg-card)]"
                >
                  <X size={12} style={{ color: "var(--text-muted)" }} />
                </button>
              )}
            </div>
          </div>

          {/* 清除按鈕 */}
          <div className="flex justify-end pt-2 border-t border-[var(--border)] mt-2">
            <button onClick={() => {
              setStartDate(""); setEndDate(""); setSelectedMembers([]); setCategoryFilter("全部"); 
              setMerchantFilter("全部"); setTypeFilter("全部"); setMinAmount(""); setMaxAmount("");
              setSearch("");
            }} className="text-xs font-bold text-rose-500 bg-rose-500/10 px-4 py-2 rounded-lg">
              清除所有篩選
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── 月份選擇器（活動模式含總計切換） ── */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {/* 活動模式：加入「總計」按鈕 */}
        {isActivity && (
          <button
            onClick={() => setShowAllPeriod(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: showAllPeriod ? `rgba(${themeColorRgb},0.2)` : "var(--bg-card)",
              color: showAllPeriod ? themeColor : "var(--text-muted)",
              border: showAllPeriod ? "1px solid rgba(var(--theme-primary-rgb),0.4)" : "1px solid var(--border)",
            }}>
            總計
          </button>
        )}
        <button onClick={() => { setShowAllPeriod(false); prevMonth(); }}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
          style={{ background: "var(--bg-card)", opacity: (showAllPeriod && isActivity) ? 0.35 : 1 }}>
          <ChevronLeft size={14} style={{ color: "var(--text-secondary)" }} />
        </button>
        <span
          className="text-sm font-semibold w-24 text-center whitespace-nowrap"
          style={{ color: (showAllPeriod && isActivity) ? "var(--text-muted)" : "var(--text-primary)" }}>
          {year} 年 {MONTHS[monthIdx]}
        </span>
        <button onClick={() => { setShowAllPeriod(false); nextMonth(); }}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
          style={{ background: "var(--bg-card)", opacity: (showAllPeriod && isActivity) ? 0.35 : 1 }}>
          <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      {/* ── 帳簿過濾選擇器（多選） ── */}
      <div className="mb-5 glass-card p-3 rounded-2xl border border-[var(--border)]">
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          <Wallet size={16} style={{ color: themeColor }} />
          <span className="text-sm font-bold text-[var(--text-primary)]">{isActivity ? "活動帳簿" : "帳務帳簿"}</span>
          <span className="text-xs text-[var(--text-muted)] ml-auto">可多選</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {wallets.map((w: any) => {
            const isSel = selectedWallets.includes(w.id);
            return (
              <button key={w.id} onClick={() => handleWalletToggle(w.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-start gap-0.5"
              style={{
                background: isSel ? "rgba(16,185,129,0.15)" : "var(--bg-card)",
                color: isSel ? "#10b981" : "var(--text-secondary)",
                border: isSel ? "1px solid rgba(16,185,129,0.4)" : "1px solid var(--border)",
              }}>
              <span>{w.name}</span>
              {w.startDate && (
                <span className="text-[9px] font-normal opacity-70">
                  {w.startDate.slice(5).replace("-","/")} – {w.endDate ? w.endDate.slice(5).replace("-","/") : "∞"}
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>

      {/* ── 期間帳簿提示橫條 ── */}
      {selectedWallet?.startDate && (() => {
        const s = new Date(selectedWallet.startDate);
        const e = selectedWallet.endDate ? new Date(selectedWallet.endDate) : null;
        const totalDays = e ? Math.round((e.getTime() - s.getTime()) / 86400000) + 1 : null;
        const today = new Date();
        const elapsed = Math.min(Math.max(Math.round((today.getTime() - s.getTime()) / 86400000) + 1, 1), totalDays ?? 1);
        const isActive = today >= s && (!e || today <= e);
        const isEnded = e && today > e;
        const fmt = (d: Date) => `${d.getMonth()+1}/${d.getDate()}`;
        return (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-4 py-3 rounded-2xl flex items-center gap-3"
            style={{ background: isEnded ? `rgba(${themeColorRgb},0.06)` : "rgba(16,185,129,0.08)", border: `1px solid ${isEnded ? `rgba(${themeColorRgb},0.2)` : "rgba(16,185,129,0.25)"}` }}
          >
            <span className="text-xl">{isEnded ? "🏁" : isActive ? "✈️" : "📅"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                {selectedWallet.name}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {fmt(s)} – {e ? fmt(e) : "不限"}
                {totalDays && ` · 共 ${totalDays} 天`}
              </p>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
              style={{
                background: isEnded ? `rgba(${themeColorRgb},0.12)` : isActive ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                color: isEnded ? themeColor : isActive ? "#10b981" : "#d97706"
              }}
            >
              {isEnded ? "已結束" : isActive ? `第 ${elapsed} 天` : "未開始"}
            </span>
          </motion.div>
        );
      })()}

      {/* ── 核心視覺：預算甜甜圈圖 ── */}
      <motion.div
        key={monthIdx} // 切換月份時重新播放動畫
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-6 mb-4 text-center"
        style={{ boxShadow: "var(--shadow-glow)" }}
      >
        <div className="relative w-52 h-52 mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={CHART_DATA}
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={90}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                {CHART_DATA.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? (isActivity ? "#f59e0b" : "#f43f5e") : (isActivity ? "#14b8a6" : "#10b981")} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* 圓心文字 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>區間淨結餘</p>
            <CountUp
              end={periodSavings}
              prefix="NT$"
              duration={1400}
              className="text-2xl font-bold"
              style={{ color: periodSavings >= 0 ? "#10b981" : "#f43f5e" }}
            />
            {periodSavings >= 0 ? (
              <p className="text-[10px] mt-0.5 opacity-80" style={{ color: "var(--text-muted)" }}>
                結餘率 {totalIncome > 0 ? periodSavingsRate.toFixed(0) : 0}%
              </p>
            ) : (
              <p className="text-[10px] mt-0.5 font-bold animate-pulse" style={{ color: "#f43f5e" }}>
                已透支！
              </p>
            )}
          </div>
        </div>

        {/* 預算或收支進度條 */}
        <div className="mt-4">
          <div className="flex justify-between items-end text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            <span className="flex flex-col gap-0.5 text-left">
              <span>{isActivity ? "總支出" : "預估總支出"} <span className="font-semibold text-[var(--text-primary)]">NT${Math.round(totalExpense).toLocaleString()}</span></span>
              <span className="text-[10px] opacity-80">已付 NT${Math.round(pastExpense).toLocaleString()}{futureExpense > 0 ? ` / 待付 NT$${Math.round(futureExpense).toLocaleString()}` : ""}</span>
            </span>
            <span className="text-right flex flex-col gap-0.5">
              <span>{isActivity ? "活動預算" : "本月預算"} <span className="font-semibold text-[var(--text-primary)]">{effectiveBudget != null ? `NT$${Math.round(effectiveBudget).toLocaleString()}` : "未設定"}</span></span>
              <span className="text-[10px] opacity-80">已收 NT${Math.round(pastIncome).toLocaleString()}{futureIncome > 0 ? ` / 待收 NT$${Math.round(futureIncome).toLocaleString()}` : ""}</span>
            </span>
          </div>
          {effectiveBudget != null ? (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${spentPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "var(--gradient-primary)" }}
              />
            </div>
          ) : (
            <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-card)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${totalExpense === 0 && totalIncome === 0 ? 0 : (totalExpense / (totalExpense + totalIncome) * 100)}%` }}
                className="h-full bg-rose-500"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${totalExpense === 0 && totalIncome === 0 ? 0 : (totalIncome / (totalExpense + totalIncome) * 100)}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 分類支出排行 Top 3 ── */}
      {categoryExpenses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-6 glass-card p-5">
          <p className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>📊 {isActivity ? "支出" : "本月支出"}占比 Top 3</p>
          <div className="flex flex-col gap-3">
            {categoryExpenses.map((cat, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{cat.name}</span>
                  <span className="font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>NT${Math.round(cat.amount).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden border border-[var(--border)]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percent}%` }}
                      transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: idx === 0 ? "#f43f5e" : idx === 1 ? "#f97316" : "#eab308" }}
                    />
                  </div>
                  <span className="text-xs font-bold w-9 text-right tabular-nums" style={{ color: "var(--text-muted)" }}>{cat.percent.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 拆帳進度卡片 ── */}
      {selectedWallet?.isSplitEnabled && splitState && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-3xl relative overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between mb-3 relative z-10">
            <div>
              <p className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 inline-block mb-1">
                📐 拆帳模式 {isActivity ? "(目前狀態)" : "(本月狀態)"}
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {splitState.myNetBalance >= 0 ? "目前您淨賺/應收回" : "目前您需補付"}
              </p>
            </div>
            <span className="text-xl font-black tabular-nums" style={{ color: splitState.myNetBalance >= 0 ? "#10b981" : "#f43f5e" }}>
              {splitState.myNetBalance > 0 ? "+" : ""}NT${Math.abs(Math.round(splitState.myNetBalance)).toLocaleString()}
            </span>
          </div>
          <div className="flex gap-2 relative z-10 text-xs mt-3 pt-3 border-t border-[var(--border)]">
            <div className="flex-1">
              <span style={{ color: "var(--text-muted)" }}>我已代墊</span>
              <p className="font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>NT${Math.round(splitState.myPaid).toLocaleString()}</p>
            </div>
            <div className="flex-1">
              <span style={{ color: "var(--text-muted)" }}>我應負擔 ({splitState.membersCount}人均分)</span>
              <p className="font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>NT${Math.round(splitState.myShare).toLocaleString()}</p>
            </div>
          </div>
          {/* 前往結算按鈕 */}
          <button
            onClick={() => setShowSettlement(true)}
            className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{
              background: `rgba(${themeColorRgb},0.1)`,
              color: themeColor,
              border: "1px solid rgba(var(--theme-primary-rgb),0.25)",
            }}
          >
            📐 前往結算中心
          </button>
        </motion.div>
      )}

      {/* ── 快速操作區 ── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* 支出 */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(244,63,94,0.15)" }}>
              <TrendingDown size={14} color="#f43f5e" />
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{isActivity ? "支出" : "本月支出"}</span>
          </div>
          <CountUp
            end={totalExpense}
            prefix="NT$"
            duration={1200}
            className="text-lg font-bold"
            style={{ color: "#f43f5e" }}
          />
          {fxUpdatedAt && <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>🌐 {fxUpdatedAt} 匯率換算</p>}
        </div>

        {/* 收入 */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              <TrendingUp size={14} color="#10b981" />
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{isActivity ? "收入" : "本月收入"}</span>
          </div>
          <CountUp
            end={totalIncome}
            prefix="NT$"
            duration={1200}
            className="text-lg font-bold"
            style={{ color: "#10b981" }}
          />
        </div>
      </div>

      {/* ── 期間帳簿：每日平均消費 ── */}
      {selectedWallet?.startDate && selectedWallet?.endDate && (() => {
        const s = new Date(selectedWallet.startDate);
        const e = new Date(selectedWallet.endDate);
        const totalDays = Math.max(Math.round((e.getTime() - s.getTime()) / 86400000) + 1, 1);
        const today = new Date();
        const elapsedDays = Math.min(Math.max(Math.round((today.getTime() - s.getTime()) / 86400000) + 1, 1), totalDays);
        const avgPerDay = elapsedDays > 0 ? totalExpense / elapsedDays : 0;
        const projectedTotal = avgPerDay * totalDays;
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 mb-6 flex items-center gap-4"
          >
            <div className="flex-1">
              <p className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>📊 每日均攤</p>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                NT${Math.round(avgPerDay).toLocaleString()}
                <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>/天</span>
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                已過 {elapsedDays} / 共 {totalDays} 天
              </p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>📈 預估總花費</p>
              <p className="text-lg font-bold" style={{ color: themeColor }}>
                NT${Math.round(projectedTotal).toLocaleString()}
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                依目前速率推算
              </p>
            </div>
          </motion.div>
        );
      })()}

      {/* ── 交易明細 ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{isActivity ? "活動明細" : "本月明細"} ({filteredTx.length})</h2>
          {filteredTx.length > 5 && (
            <button 
              onClick={() => setShowAllTx(!showAllTx)} 
              className="text-xs" 
              style={{ color: themeColor }}
            >
              {showAllTx ? "收起" : "查看全部"}
            </button>
          )}
        </div>

        {displayTx.length === 0 ? (
          <div className="text-center py-8 glass-card">
            <p className="text-2xl mb-2">🍃</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>本月尚無明細</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayTx.map((tx: any, i: number) => {
              const d = new Date(tx.date);
              const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  onClick={() => setSelectedTx(tx)}
                  className="glass-card px-4 py-3 flex items-center gap-3 active:scale-95 transition-transform cursor-pointer"
                >
                  {/* 分類 Icon + 成員頭像 */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: "var(--bg-card)" }}>
                      {tx.category?.icon || "📦"}
                    </div>
                    <div className="absolute -bottom-1 -right-1 ring-2 ring-[var(--bg-card)] rounded-full">
                      <Avatar initial={(tx.user?.name || "U")[0].toUpperCase()} colorId={tx.user?.id || "1"} />
                    </div>
                  </div>

                  {/* 描述 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {tx.merchant?.name ? `${tx.merchant.name} - ` : ""}{tx.category?.name || "未知"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {tx.user?.name || "未知"} · {dateStr} {tx.wallet ? `· ${tx.wallet.name}` : ""}
                    </p>
                  </div>

                  {/* 金額 */}
                  <AnimatedAmount value={tx.amount} isIncome={tx.type === "INCOME"} currency={tx.currency} />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 交易操作彈出視窗 ── */}
      <AnimatePresence>
        {selectedTx && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} />
            
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-surface)] rounded-t-3xl border-t border-[var(--border)] pb-8 pt-4 px-6">
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {selectedTx.category?.name} <span className="text-[var(--text-muted)] font-normal text-xs ml-2">{new Date(selectedTx.date).toLocaleDateString()}</span>
                  </p>
                  <AnimatedAmount value={selectedTx.amount} isIncome={selectedTx.type === "INCOME"} currency={selectedTx.currency} />
                </div>
                <button onClick={() => setSelectedTx(null)} className="p-2 bg-[var(--bg-card)] rounded-full">
                  <X size={20} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              {(selectedTx.userId === currentUserId || ["OWNER", "ADMIN"].includes(currentUserRole ?? "")) ? (
                <div className="flex gap-3">
                  <button onClick={() => { setEditTxData(selectedTx); setIsEditDrawerOpen(true); setSelectedTx(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)]">
                    <Edit2 size={16} /> 編輯
                  </button>
                  <button onClick={handleDelete} disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 disabled:opacity-50">
                    <Trash2 size={16} /> {isPending ? "刪除中..." : "刪除"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
                  <p className="text-sm text-[var(--text-secondary)] mb-1">這是 {selectedTx.user?.name || "其他成員"} 的紀錄</p>
                  <p className="text-xs text-[var(--text-muted)]">只有建立者、家庭擁有者或管理員可以編輯或刪除</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 編輯專用 Drawer ── */}
      <QuickAddDrawer 
        open={isEditDrawerOpen} 
        onClose={() => { setIsEditDrawerOpen(false); setEditTxData(null); }} 
        editData={editTxData} 
      />

      {/* ── 結算中心 Modal ── */}
      <AnimatePresence>
        {showSettlement && selectedWallet && (
          <SettlementModal
            walletId={selectedWallet.id}
            walletName={selectedWallet.name}
            familyId={selectedWallet.familyId}
            currentUserId={currentUserId}
            onClose={() => setShowSettlement(false)}
          />
        )}
      </AnimatePresence>

      {/* ── 首次登入極簡新手視覺導覽 ── */}
      <AnimatePresence>
        {showOnboarding && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseOnboarding}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            />
            {/* Modal 容器 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:max-w-md md:mx-auto z-50 overflow-hidden bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl  flex flex-col"
            >
              {/* 頂部裝飾背景 */}
              <div className={`h-28 bg-gradient-to-tr ${onboardingSlides[currentSlide].color} relative flex items-center justify-center transition-all duration-500`}>
                <div className="absolute top-4 right-4">
                  <button onClick={handleCloseOnboarding} className="p-1.5 bg-black/10 hover:bg-black/20 rounded-full text-white/80 transition-colors">
                    <X size={16} />
                  </button>
                </div>
                {/* 裝飾大圖示或文字 */}
                <span className="text-4xl filter drop-shadow-md">
                  {currentSlide === 0 ? "🔒" : currentSlide === 1 ? "🔁" : currentSlide === 2 ? "⚖️" : "🚀"}
                </span>
              </div>

              {/* 內容區 */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div className="min-h-[140px]">
                  <motion.h2 
                    key={`t-${currentSlide}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-lg font-bold mb-3 text-[var(--text-primary)]"
                  >
                    {onboardingSlides[currentSlide].title}
                  </motion.h2>
                  <motion.p 
                    key={`d-${currentSlide}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xs leading-relaxed text-[var(--text-secondary)]"
                  >
                    {onboardingSlides[currentSlide].description}
                  </motion.p>
                </div>

                {/* 控制與點點導航 */}
                <div className="mt-8 flex flex-col gap-4">
                  {/* 點點進度指示器 */}
                  <div className="flex justify-center gap-1.5">
                    {onboardingSlides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? "w-4 bg-theme" : "w-1.5 bg-[var(--border)]"}`}
                      />
                    ))}
                  </div>

                  {/* 按鈕組 */}
                  <div className="flex justify-between items-center gap-3">
                    <button
                      onClick={handleCloseOnboarding}
                      className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] px-4 py-2 transition-colors"
                    >
                      跳過引導
                    </button>
                    
                    <div className="flex gap-2">
                      {currentSlide > 0 && (
                        <button
                          onClick={() => setCurrentSlide(prev => prev - 1)}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-all"
                        >
                          上一步
                        </button>
                      )}
                      
                      {currentSlide < onboardingSlides.length - 1 ? (
                        <button
                          onClick={() => setCurrentSlide(prev => prev + 1)}
                          className="px-5 py-2 text-xs font-bold rounded-xl text-white hover:opacity-90 transition-all" 
                        style={{ backgroundColor: themeColor, boxShadow: `0 4px 12px rgba(${themeColorRgb}, 0.3)` }}
                        >
                          下一步
                        </button>
                      ) : (
                        <button
                          onClick={handleCloseOnboarding}
                          className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-white hover:opacity-90 transition-all shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
                        >
                          開始使用 ✨
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
