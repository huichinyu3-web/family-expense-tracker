"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, families, familyMembers, categories } from "@/lib/db/schema";
import { seedCategories } from "@/lib/db/seed-categories";
import { findOrCreateMerchant } from "./merchant";
import { eq, and, or, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

type RecurringType = "NONE" | "DAILY" | "WORKDAY" | "WEEKLY" | "BIWEEKLY" |
  "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "ANNUALLY" | "INSTALLMENT";

// ── 輔助函式：計算下一個日期 ──────────────────────────────────────────
function getNextRecurringDate(date: Date, type: RecurringType): Date {
  const nextDate = new Date(date);
  switch (type) {
    case "DAILY": nextDate.setDate(nextDate.getDate() + 1); break;
    case "WORKDAY": 
      do { nextDate.setDate(nextDate.getDate() + 1); } while (nextDate.getDay() === 0 || nextDate.getDay() === 6);
      break;
    case "WEEKLY": nextDate.setDate(nextDate.getDate() + 7); break;
    case "BIWEEKLY": nextDate.setDate(nextDate.getDate() + 14); break;
    case "MONTHLY": nextDate.setMonth(nextDate.getMonth() + 1); break;
    case "BIMONTHLY": nextDate.setMonth(nextDate.getMonth() + 2); break;
    case "QUARTERLY": nextDate.setMonth(nextDate.getMonth() + 3); break;
    case "SEMIANNUALLY": nextDate.setMonth(nextDate.getMonth() + 6); break;
    case "ANNUALLY": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
    default: break;
  }
  return nextDate;
}

// ── 確保使用者有 Family，沒有就自動建立 ──────────────────────────────
export async function ensureFamily(userId: string): Promise<string> {
  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
  });

  if (membership) return membership.familyId;

  const familyId = crypto.randomUUID();
  await db.insert(families).values({ id: familyId, name: "我的共享帳簿" });
  await db.insert(familyMembers).values({
    id: crypto.randomUUID(),
    familyId,
    userId,
    role: "OWNER",
  });
  await seedCategories(familyId);
  return familyId;
}

// ── 主要：新增交易紀錄 ────────────────────────────────────────────────
export async function addTransaction(data: {
  amount: number;
  type: "EXPENSE" | "INCOME";
  categoryId: string;           
  note?: string;
  date?: number;                
  walletId?: string;
  merchantName?: string;        
  recurringType?: RecurringType;
  installments?: number;        
  recurringEndDate?: number;    // 週期截止日期
  currency?: string;
  paidByUserId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const familyId = await ensureFamily(userId);
  const txDate = data.date ?? Date.now();
  const amount = data.type === "EXPENSE" ? -Math.abs(data.amount) : Math.abs(data.amount);

  // 處理商家
  let merchantId: string | null = null;
  if (data.merchantName?.trim()) {
    const merchant = await findOrCreateMerchant(data.merchantName.trim());
    merchantId = merchant.id;
  }

  // 處理分期付款
  if (data.recurringType === "INSTALLMENT" && data.installments && data.installments > 1) {
    const parentId = crypto.randomUUID();
    const perAmount = data.amount / data.installments;
    const rows = [];

    for (let i = 0; i < data.installments; i++) {
      const installDate = new Date(txDate);
      installDate.setMonth(installDate.getMonth() + i);

      rows.push({
        id: i === 0 ? parentId : crypto.randomUUID(),
        familyId,
        userId,
        categoryId: data.categoryId,
        amount: data.type === "EXPENSE" ? -Math.abs(perAmount) : Math.abs(perAmount),
        type: data.type,
        date: installDate.getTime(),
        note: data.note ? `${data.note}（第 ${i + 1}/${data.installments} 期）` : `第 ${i + 1}/${data.installments} 期`,
        walletId: data.walletId ?? null,
        merchantId,
        recurringType: "INSTALLMENT" as RecurringType,
        installments: data.installments,
        installmentIndex: i + 1,
        parentId: i === 0 ? null : parentId,
        currency: data.currency ?? "TWD",
        paidByUserId: data.paidByUserId ?? userId,
      });
    }

    await db.insert(transactions).values(rows);

  } else if (data.recurringType && data.recurringType !== "NONE" && data.recurringEndDate) {
    // 處理一次性展開的週期性帳目
    const parentId = crypto.randomUUID();
    const rows = [];
    let currentDate = new Date(txDate);
    const endDate = new Date(data.recurringEndDate);
    let index = 1;

    // 防止無窮迴圈，最多展開 1000 筆 (大約每日記帳近 3 年)
    while (currentDate.getTime() <= endDate.getTime() && rows.length < 1000) {
      rows.push({
        id: rows.length === 0 ? parentId : crypto.randomUUID(),
        familyId,
        userId,
        categoryId: data.categoryId,
        amount,
        type: data.type,
        date: currentDate.getTime(),
        note: data.note ?? null,
        walletId: data.walletId ?? null,
        merchantId,
        recurringType: data.recurringType,
        parentId: rows.length === 0 ? null : parentId,
        currency: data.currency ?? "TWD",
        paidByUserId: data.paidByUserId ?? userId,
      });
      currentDate = getNextRecurringDate(currentDate, data.recurringType);
      index++;
    }

    if (rows.length > 0) {
      await db.insert(transactions).values(rows);
    }
  } else {
    // 一般單筆
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      familyId,
      userId,
      categoryId: data.categoryId,
      amount,
      type: data.type,
      date: txDate,
      note: data.note ?? null,
      walletId: data.walletId ?? null,
      merchantId,
      recurringType: "NONE",
      currency: data.currency ?? "TWD",
      paidByUserId: data.paidByUserId ?? userId,
    });
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { success: true };
}

// ── 取得交易明細列表 ─────────────────────────────────────────────────
export async function getTransactions(walletId?: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;
  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
  });
  if (!membership) return [];

  const allTx = await db.query.transactions.findMany({
    where: eq(transactions.familyId, membership.familyId),
    with: {
      category: true,
      user: true,
      wallet: true,
      merchant: true,
    },
    orderBy: (tx, { desc }) => [desc(tx.date)],
    limit: 500,
  });

  // 若有指定帳戶，過濾之
  if (walletId) return allTx.filter((tx) => tx.walletId === walletId);
  return allTx;
}

// ── 取得儀表板摘要數字 ───────────────────────────────────────────────
export async function getDashboardSummary(month?: number, year?: number) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
  });
  if (!membership) return null;

  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth(); // 0-indexed

  const startOfMonth = new Date(targetYear, targetMonth, 1).getTime();
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999).getTime();

  const allTx = await db.query.transactions.findMany({
    where: eq(transactions.familyId, membership.familyId),
  });

  const thisMonth = allTx.filter(
    (tx) => tx.date >= startOfMonth && tx.date <= endOfMonth
  );

  const totalIncome = thisMonth
    .filter((tx) => tx.type === "INCOME")
    .reduce((s, tx) => s + tx.amount, 0);

  const totalExpense = Math.abs(
    thisMonth
      .filter((tx) => tx.type === "EXPENSE")
      .reduce((s, tx) => s + tx.amount, 0)
  );

  const recentTx = allTx.slice(0, 5); // 最近 5 筆

  return { totalIncome, totalExpense, recentTx };
}

// ── 刪除交易紀錄（僅限本人） ──────────────────────────────────────────
export async function deleteTransaction(transactionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
  });

  if (!tx) throw new Error("Transaction not found");
  
  const membership = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.userId, session.user.id), eq(familyMembers.familyId, tx.familyId))
  });

  if (tx.userId !== session.user.id && !(["OWNER", "ADMIN"].includes(membership?.role ?? ""))) {
    throw new Error("您只能刪除自己建立的紀錄，或由家庭擁有者/管理員刪除");
  }

  // 如果是分期付款的母筆或子筆，這裡為了簡單，先刪除該單筆（若是母筆也可以連鎖刪除，但我們暫時依據 ID 單筆刪除）
  await db.delete(transactions).where(eq(transactions.id, transactionId));

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

// ── 更新交易紀錄（僅限本人） ──────────────────────────────────────────
export async function updateTransaction(
  transactionId: string,
  data: {
    amount: number;
    type: "EXPENSE" | "INCOME";
    categoryId: string;
    note?: string;
    date?: number;
    walletId?: string;
    merchantName?: string;
    recurringType?: RecurringType;
    installments?: number;
    recurringEndDate?: number;
    currency?: string;
    paidByUserId?: string;
    updateMode?: "SINGLE" | "FUTURE"; // 單筆修改或連動未來
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
  });

  if (!tx) throw new Error("Transaction not found");

  const membership = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.userId, session.user.id), eq(familyMembers.familyId, tx.familyId))
  });

  if (tx.userId !== session.user.id && !(["OWNER", "ADMIN"].includes(membership?.role ?? ""))) {
    throw new Error("您只能編輯自己建立的紀錄，或由家庭擁有者/管理員編輯");
  }

  const amount = data.type === "EXPENSE" ? -Math.abs(data.amount) : Math.abs(data.amount);

  let merchantId: string | null = null;
  if (data.merchantName?.trim()) {
    const merchant = await findOrCreateMerchant(data.merchantName.trim());
    merchantId = merchant.id;
  }

  const txDate = data.date ?? tx.date;
  const targetRecurringType = data.recurringType ?? tx.recurringType;

  if (data.updateMode === "FUTURE" && tx.recurringType !== "INSTALLMENT") {
    // 智慧覆蓋模式：刪除未來舊有帳目，重新展開
    const rootParentId = tx.parentId || tx.id;
    
    // 1. 先更新當前這筆
    await db.update(transactions).set({
      categoryId: data.categoryId,
      amount,
      type: data.type,
      date: txDate,
      note: data.note ?? null,
      walletId: data.walletId ?? null,
      merchantId,
      recurringType: targetRecurringType,
      currency: data.currency ?? tx.currency,
      paidByUserId: data.paidByUserId ?? tx.paidByUserId,
    }).where(eq(transactions.id, transactionId));

    // 2. 刪除「同個父系列」且「時間嚴格大於原本交易時間」的所有舊分身
    await db.delete(transactions).where(
      and(
        or(eq(transactions.parentId, rootParentId), eq(transactions.id, rootParentId)),
        gt(transactions.date, tx.date)
      )
    );

    // 3. 重新推算未來的帳目並寫入
    if (targetRecurringType && targetRecurringType !== "NONE" && data.recurringEndDate) {
      const rows = [];
      let currentDate = getNextRecurringDate(new Date(txDate), targetRecurringType);
      const endDate = new Date(data.recurringEndDate);
      
      while (currentDate.getTime() <= endDate.getTime() && rows.length < 1000) {
        rows.push({
          id: crypto.randomUUID(),
          familyId: tx.familyId,
          userId: tx.userId,
          categoryId: data.categoryId,
          amount,
          type: data.type,
          date: currentDate.getTime(),
          note: data.note ?? null,
          walletId: data.walletId ?? null,
          merchantId,
          recurringType: targetRecurringType,
          parentId: rootParentId,
          currency: data.currency ?? tx.currency,
          paidByUserId: data.paidByUserId ?? tx.paidByUserId,
        });
        currentDate = getNextRecurringDate(currentDate, targetRecurringType);
      }
      
      if (rows.length > 0) {
        await db.insert(transactions).values(rows);
      }
    }
  } else {
    // 一般單筆修改
    await db.update(transactions).set({
      categoryId: data.categoryId,
      amount,
      type: data.type,
      date: txDate,
      note: data.note ?? null,
      walletId: data.walletId ?? null,
      merchantId,
      recurringType: targetRecurringType,
      currency: data.currency ?? tx.currency,
      paidByUserId: data.paidByUserId ?? tx.paidByUserId,
    }).where(eq(transactions.id, transactionId));
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}
