"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { merchants, familyMembers, transactions } from "@/lib/db/schema";
import { eq, like, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// ── 取得家庭所有商家 ──────────────────────────────────────────────────
export async function getMerchants(search?: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, session.user.id),
  });
  if (!membership) return [];

  if (search && search.length > 0) {
    return db.query.merchants.findMany({
      where: (m, { and, eq, like }) =>
        and(eq(m.familyId, membership.familyId), like(m.name, `%${search}%`)),
      limit: 10,
    });
  }

  return db.query.merchants.findMany({
    where: eq(merchants.familyId, membership.familyId),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
    limit: 50,
  });
}

// ── 取得常用商家 (基於最近 100 筆交易頻率) ──────────────────────────────
export async function getFrequentMerchants(limit: number = 5) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, session.user.id),
  });
  if (!membership) return [];

  const txs = await db.query.transactions.findMany({
    where: eq(transactions.familyId, membership.familyId),
    with: { merchant: true },
    orderBy: [desc(transactions.date)],
    limit: 100,
  });

  const freqMap = new Map<string, { merchant: any; count: number }>();
  for (const tx of txs) {
    if (tx.merchant) {
      const existing = freqMap.get(tx.merchant.id);
      if (existing) {
        existing.count++;
      } else {
        freqMap.set(tx.merchant.id, { merchant: tx.merchant, count: 1 });
      }
    }
  }

  return Array.from(freqMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(x => x.merchant);
}

// ── 建立商家（若重名則直接回傳現有的） ───────────────────────────────
export async function findOrCreateMerchant(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, session.user.id),
  });
  if (!membership) throw new Error("No family found");

  const existing = await db.query.merchants.findFirst({
    where: (m, { and, eq }) =>
      and(eq(m.familyId, membership.familyId), eq(m.name, name)),
  });
  if (existing) return existing;

  const id = crypto.randomUUID();
  await db.insert(merchants).values({
    id,
    familyId: membership.familyId,
    name,
  });

  return { id, familyId: membership.familyId, name, createdAt: Date.now() };
}

// ── 刪除商家 ─────────────────────────────────────────────────────────
export async function deleteMerchant(merchantId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.delete(merchants).where(eq(merchants.id, merchantId));
  revalidatePath("/settings");
  return { success: true };
}
