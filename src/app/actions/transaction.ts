"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, families, familyMembers, categories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function addTransaction(data: {
  amount: number;
  type: "EXPENSE" | "INCOME";
  categoryName: string;
  categoryIcon: string;
  note?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  // 1. 確保使用者有 Family
  let userFamily = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
    with: { family: true },
  });

  let familyId = userFamily?.familyId;

  if (!familyId) {
    // 若沒有家庭，自動建立一個預設家庭
    familyId = crypto.randomUUID();
    await db.insert(families).values({
      id: familyId,
      name: "我的家庭",
    });
    await db.insert(familyMembers).values({
      id: crypto.randomUUID(),
      familyId,
      userId,
      role: "OWNER",
    });
  }

  // 2. 尋找或建立該分類
  let category = await db.query.categories.findFirst({
    where: and(
      eq(categories.familyId, familyId),
      eq(categories.name, data.categoryName),
      eq(categories.type, data.type)
    ),
  });

  let categoryId = category?.id;

  if (!categoryId) {
    categoryId = crypto.randomUUID();
    await db.insert(categories).values({
      id: categoryId,
      familyId,
      name: data.categoryName,
      type: data.type,
      icon: data.categoryIcon,
      color: data.type === "EXPENSE" ? "#f43f5e" : "#10b981",
    });
  }

  // 3. 寫入交易紀錄
  await db.insert(transactions).values({
    id: crypto.randomUUID(),
    familyId,
    userId,
    categoryId,
    amount: data.type === "EXPENSE" ? -Math.abs(data.amount) : Math.abs(data.amount),
    type: data.type,
    date: Date.now(),
    note: data.note || null,
  });

  // 4. 重新驗證頁面，更新畫面
  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function getTransactions() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const userId = session.user.id;

  // 找出使用者的 familyId
  const userFamily = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
  });

  if (!userFamily) return [];

  // 取得該家庭的所有明細
  const allTx = await db.query.transactions.findMany({
    where: eq(transactions.familyId, userFamily.familyId),
    with: {
      category: true, // 需要在 schema.ts 中設定關聯，或者這裡我們自己 join
      user: true, // user 資訊 (為了拿名字和頭貼)
    },
    orderBy: (tx, { desc }) => [desc(tx.date)],
    limit: 100,
  });

  return allTx;
}
