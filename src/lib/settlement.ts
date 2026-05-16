/**
 * 結算演算法 (Greedy Settlement Algorithm)
 * 
 * 核心邏輯：
 * 1. 計算每個人的「淨餘額 (Net Balance)」：代墊金額 - 應分擔金額
 * 2. 將成員分為「債主 (creditors)」和「負債者 (debtors)」
 * 3. 用貪婪演算法配對，每次都讓最大債主與最大負債者互相抵銷
 * 4. 產出「最少交易次數」的還款路徑
 */

export interface Member {
  userId: string;
  name: string;
  avatarInitial: string;
  colorId: string;
}

export interface Transaction {
  amount: number;
  type: "INCOME" | "EXPENSE";
  paidByUserId?: string | null;
  userId: string;
}

export interface SettlementDebt {
  fromUserId: string;
  fromName: string;
  fromColorId: string;
  toUserId: string;
  toName: string;
  toColorId: string;
  amount: number; // 四捨五入至整數元
}

export interface NetBalance {
  userId: string;
  name: string;
  colorId: string;
  paid: number;    // 我代墊的總金額
  share: number;   // 我應分擔的金額
  net: number;     // 淨餘額 (正=別人欠我, 負=我欠別人)
}

/**
 * 主函式：計算結算路徑
 * 
 * @param transactions 帳簿內所有 EXPENSE 交易
 * @param members 帳簿內所有成員
 * @returns { balances, debts } - 每人的淨餘額 + 最少次數的還款路徑
 */
export function calculateSettlement(
  transactions: Transaction[],
  members: Member[]
): { balances: NetBalance[]; debts: SettlementDebt[] } {
  
  if (members.length === 0) return { balances: [], debts: [] };

  const memberCount = members.length;
  const memberMap = new Map(members.map(m => [m.userId, m]));

  // 步驟 1：計算「總支出」和「每人的代墊金額」
  const expenseTxs = transactions.filter(t => t.type === "EXPENSE");
  const totalExpense = expenseTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // 每人應分擔的均等金額
  const sharePerPerson = memberCount > 0 ? totalExpense / memberCount : 0;

  // 統計每人「實際代墊」的金額 (以 paidByUserId 為準，若沒填則以 userId 代替)
  const paidMap = new Map<string, number>(members.map(m => [m.userId, 0]));
  expenseTxs.forEach(tx => {
    const payer = tx.paidByUserId || tx.userId;
    if (paidMap.has(payer)) {
      paidMap.set(payer, (paidMap.get(payer) || 0) + Math.abs(tx.amount));
    }
  });

  // 步驟 2：計算每個人的淨餘額
  const balances: NetBalance[] = members.map(m => {
    const paid = paidMap.get(m.userId) || 0;
    const net = paid - sharePerPerson;
    return {
      userId: m.userId,
      name: m.name,
      colorId: m.colorId,
      paid,
      share: sharePerPerson,
      net,
    };
  });

  // 步驟 3：貪婪演算法 - 計算最少次數的還款路徑
  const debts: SettlementDebt[] = [];

  // 複製一份 net balance 用於計算（避免修改原始資料）
  const netArr = balances.map(b => ({ ...b, balance: b.net }));

  // 貪婪：每輪找出最大債主和最大負債者配對
  for (let iter = 0; iter < members.length * members.length; iter++) {
    // 找出最大債主 (net > 0)
    netArr.sort((a, b) => b.balance - a.balance);
    const creditor = netArr[0];
    const debtor = netArr[netArr.length - 1];

    // 若最大債主的淨餘額 <= 0，表示所有人都平衡了，可以結束
    if (Math.abs(creditor.balance) < 0.01 || Math.abs(debtor.balance) < 0.01) break;
    if (creditor.balance <= 0 || debtor.balance >= 0) break;

    // 這次能抵銷的金額 = 取兩者較小的絕對值
    const amount = Math.min(creditor.balance, -debtor.balance);

    debts.push({
      fromUserId: debtor.userId,
      fromName: debtor.name,
      fromColorId: debtor.colorId,
      toUserId: creditor.userId,
      toName: creditor.name,
      toColorId: creditor.colorId,
      amount: Math.round(amount), // 四捨五入至整數元
    });

    // 更新雙方餘額
    creditor.balance -= amount;
    debtor.balance += amount;
  }

  return { balances, debts };
}
