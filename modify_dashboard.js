const fs = require('fs');

let content = fs.readFileSync('src/app/(app)/dashboard/DashboardClient.tsx', 'utf8');

// 1. Rewrite the props and add mode-specific filtering
const search1 = `export default function DashboardClient({ transactions, wallets, currentUserId, userName, familyName, familyMembersCount, currentUserRole, mode = "regular" }) {
  const isActivity = mode === "activity";
  const themeColor = isActivity ? "#14b8a6" : "#6366f1";`;

const replace1 = `export default function DashboardClient({ transactions: allTransactions, wallets: allWallets, currentUserId, userName, familyName, familyMembersCount, currentUserRole, mode = "regular" }) {
  const isActivity = mode === "activity";
  
  // 依照模式嚴格分離帳簿與交易 (分開計算統計圖表的支出、結餘與預算)
  const wallets = useMemo(() => allWallets.filter((w) => isActivity ? !!w.startDate : !w.startDate), [allWallets, isActivity]);
  const walletIds = useMemo(() => new Set(wallets.map(w => w.id)), [wallets]);
  const transactions = useMemo(() => allTransactions.filter((t) => walletIds.has(t.walletId)), [allTransactions, walletIds]);

  const themeColor = isActivity ? "#14b8a6" : "#6366f1";`;

// 2. Remove isExcludedPeriod logic
const search2 = `      const matchWallet = selectedWallets.length === 0 || selectedWallets.includes(tx.walletId);
      // 按模式排除：帳務模式排除期間帳簿，活動模式排除一般帳簿
      const isExcludedPeriod = selectedWallets.length === 0 && (
        isActivity
          ? !periodWalletIds.has(tx.walletId)   // 活動：只要期間帳簿
          : periodWalletIds.has(tx.walletId)     // 帳務：排除期間帳簿
      );
      
      const matchMember = selectedMembers.length === 0 || selectedMembers.includes(tx.user?.name);`;

const replace2 = `      const matchWallet = selectedWallets.length === 0 || selectedWallets.includes(tx.walletId);
      
      const matchMember = selectedMembers.length === 0 || selectedMembers.includes(tx.user?.name);`;

// 3. Remove isExcludedPeriod and periodWalletIds from deps
const search3 = `return isSameMonth && matchWallet && !isExcludedPeriod && matchMember && matchType && matchCat && matchMerch && matchMin && matchMax && matchStart && matchEnd && matchSearch;
    });
  }, [transactions, monthIdx, year, selectedWallets, selectedMembers, typeFilter, categoryFilter, merchantFilter, minAmount, maxAmount, startDate, endDate, search, periodWalletIds, isActivity, showAllPeriod]);`;

const replace3 = `return isSameMonth && matchWallet && matchMember && matchType && matchCat && matchMerch && matchMin && matchMax && matchStart && matchEnd && matchSearch;
    });
  }, [transactions, monthIdx, year, selectedWallets, selectedMembers, typeFilter, categoryFilter, merchantFilter, minAmount, maxAmount, startDate, endDate, search, isActivity, showAllPeriod]);`;

// 4. Update periodSavings calculation
const search4 = `  // 1. 區間收支結餘 (取代原本的 allTimeSavings，改用當前過濾後的資料)
  // 活動且有設定預算時，結餘顯示為「剩餘預算」，否則為「收入 - 支出」
  const periodSavings = (isActivity && effectiveBudget != null)
    ? effectiveBudget - totalExpense
    : totalIncome - totalExpense;
  const periodSavingsRate = totalIncome > 0 ? (periodSavings / totalIncome) * 100 : 0;

  const spentPct = effectiveBudget != null ? Math.min((totalExpense / effectiveBudget) * 100, 100) : 0;

  // 圓餅圖：紅色為期間支出，綠色為結餘或剩餘預算 (若透支則全紅)
  const CHART_DATA = [
    { name: "期間支出", value: totalExpense },
    { name: (isActivity && effectiveBudget != null) ? "剩餘預算" : "期間結餘", value: Math.max(periodSavings, 0) || (totalExpense === 0 ? 1 : 0) },
  ];`;

const replace4 = `  // 1. 區間收支結餘 (取代原本的 allTimeSavings，改用當前過濾後的資料)
  // 區間結餘一律顯示為收入扣除支出
  const periodSavings = totalIncome - totalExpense;
  const periodSavingsRate = totalIncome > 0 ? (periodSavings / totalIncome) * 100 : 0;

  const spentPct = effectiveBudget != null ? Math.min((totalExpense / effectiveBudget) * 100, 100) : 0;

  // 圓餅圖：紅色為期間支出，綠色為區間結餘 (若透支則全紅)
  const CHART_DATA = [
    { name: "期間支出", value: totalExpense },
    { name: "區間結餘", value: Math.max(periodSavings, 0) || (totalExpense === 0 ? 1 : 0) },
  ];`;


// Because of CRLF vs LF, we should replace ignoring the exact newlines if possible
function smartReplace(content, search, replace) {
  const norm = str => str.replace(/\r\n/g, '\n');
  const nContent = norm(content);
  const nSearch = norm(search);
  const nReplace = norm(replace);
  return nContent.replace(nSearch, nReplace);
}

content = smartReplace(content, search1, replace1);
content = smartReplace(content, search2, replace2);
content = smartReplace(content, search3, replace3);
content = smartReplace(content, search4, replace4);

fs.writeFileSync('src/app/(app)/dashboard/DashboardClient.tsx', content);
console.log('Modified DashboardClient.tsx successfully.');
