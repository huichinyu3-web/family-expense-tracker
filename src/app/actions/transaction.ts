"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, families, familyMembers, categories } from "@/lib/db/schema";
import { seedCategories } from "@/lib/db/seed-categories";
import { findOrCreateMerchant } from "./merchant";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

type RecurringType = "NONE" | "DAILY" | "WORKDAY" | "WEEKLY" | "BIWEEKLY" |
  "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "ANNUALLY" | "INSTALLMENT";

// ── 確保使用者有 Family，沒有就自動建立 ──────────────────────────────
export async function ensureFamily(userId: string): Promise<string> {
  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
  });

  if (membership) return membership.familyId;

  const familyId = crypto.randomUUID();
  await db.insert(families).values({ id: familyId, name: "我的家庭" });
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
  categoryId: string;           // 現在接受細項的真實 ID
  note?: string;
  date?: number;                // Unix ms，預設今天
  walletId?: string;
  merchantName?: string;        // 輸入商家名稱，後端自動建立或對應
  recurringType?: RecurringType;
  installments?: number;        // 分期總期數
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

  // 若是分期，建立多筆明細
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
  } else {
    // 一般或週期性單筆
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
      recurringType: data.recurringType ?? "NONE",
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
    limit: 100,
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
  if (tx.userId !== session.user.id) throw new Error("您只能刪除自己建立的紀錄");

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
    currency?: string;
    paidByUserId?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
  });

  if (!tx) throw new Error("Transaction not found");
  if (tx.userId !== session.user.id) throw new Error("您只能編輯自己建立的紀錄");

  const amount = data.type === "EXPENSE" ? -Math.abs(data.amount) : Math.abs(data.amount);

  let merchantId: string | null = null;
  if (data.merchantName?.trim()) {
    const merchant = await findOrCreateMerchant(data.merchantName.trim());
    merchantId = merchant.id;
  }

  // 目前編輯功能只支援修改該筆單筆紀錄（若是分期付款，也只改這單筆，不連動）
  await db.update(transactions).set({
    categoryId: data.categoryId,
    amount,
    type: data.type,
    date: data.date ?? tx.date,
    note: data.note ?? null,
    walletId: data.walletId ?? null,
    merchantId,
    recurringType: data.recurringType ?? tx.recurringType,
    currency: data.currency ?? tx.currency,
    paidByUserId: data.paidByUserId ?? tx.paidByUserId,
  }).where(eq(transactions.id, transactionId));

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}
