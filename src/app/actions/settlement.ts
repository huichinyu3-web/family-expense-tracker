"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { familyMembers, wallets, walletMembers, transactions, categories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { calculateSettlement, Member, Transaction as SettlementTx } from "@/lib/settlement";

/**
 * 取得指定帳簿的結算資料
 * - 回傳該帳簿成員的淨餘額列表，以及最少次數還款路徑
 */
export async function getWalletSettlement(walletId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // 1. 取得帳簿資訊
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.id, walletId),
    with: { walletMembers: true },
  });
  if (!wallet) throw new Error("Wallet not found");
  if (!wallet.isSplitEnabled) throw new Error("This wallet does not have split mode enabled");

  // 2. 確認目前使用者有權存取此帳簿
  const myMembership = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.userId, userId), eq(familyMembers.familyId, wallet.familyId)),
  });
  if (!myMembership) throw new Error("Forbidden");

  // 3. 取得帳簿所有成員清單（依帳簿類型決定）
  let memberIds: string[] = [];

  if (wallet.visibility === "FAMILY") {
    // FAMILY 帳簿：整個家庭所有成員
    const allMembers = await db.query.familyMembers.findMany({
      where: eq(familyMembers.familyId, wallet.familyId),
      with: { user: { columns: { id: true, name: true } } },
    });
    memberIds = allMembers.map(m => m.userId);

    // 建構 Member 清單
    const members: Member[] = allMembers.map(m => ({
      userId: m.userId,
      name: m.user?.name || "未知成員",
      avatarInitial: (m.user?.name || "?")[0].toUpperCase(),
      colorId: m.userId, // 用 userId 當 colorId seed
    }));

    // 4. 取得帳簿所有支出交易
    const txs = await db.query.transactions.findMany({
      where: eq(transactions.walletId, walletId),
      columns: { amount: true, type: true, paidByUserId: true, userId: true },
    });

    const settlementTxs: SettlementTx[] = txs.map(t => ({
      amount: t.amount,
      type: t.type as "INCOME" | "EXPENSE",
      paidByUserId: t.paidByUserId,
      userId: t.userId,
    }));

    return calculateSettlement(settlementTxs, members);

  } else {
    // CUSTOM / PERSONAL 帳簿：只有 wallet_members 裡的人 + 擁有者
    const wMembers = await db.query.walletMembers.findMany({
      where: eq(walletMembers.walletId, walletId),
      with: { user: { columns: { id: true, name: true } } },
    });

    // 再把 owner 加進來（若不在 walletMembers 裡）
    const ownerMembership = wallet.ownerId
      ? await db.query.familyMembers.findFirst({
          where: and(
            eq(familyMembers.userId, wallet.ownerId),
            eq(familyMembers.familyId, wallet.familyId)
          ),
          with: { user: { columns: { id: true, name: true } } },
        })
      : null;

    const memberSet = new Map<string, Member>();
    wMembers.forEach(wm => {
      if (wm.user) {
        memberSet.set(wm.userId, {
          userId: wm.userId,
          name: wm.user.name || "未知成員",
          avatarInitial: (wm.user.name || "?")[0].toUpperCase(),
          colorId: wm.userId,
        });
      }
    });

    if (ownerMembership?.user && !memberSet.has(ownerMembership.userId)) {
      memberSet.set(ownerMembership.userId, {
        userId: ownerMembership.userId,
        name: ownerMembership.user.name || "擁有者",
        avatarInitial: (ownerMembership.user.name || "?")[0].toUpperCase(),
        colorId: ownerMembership.userId,
      });
    }

    const members = Array.from(memberSet.values());

    // 取得帳簿所有交易
    const txs = await db.query.transactions.findMany({
      where: eq(transactions.walletId, walletId),
      columns: { amount: true, type: true, paidByUserId: true, userId: true },
    });

    const settlementTxs: SettlementTx[] = txs.map(t => ({
      amount: t.amount,
      type: t.type as "INCOME" | "EXPENSE",
      paidByUserId: t.paidByUserId,
      userId: t.userId,
    }));

    return calculateSettlement(settlementTxs, members);
  }
}

/**
 * 一鍵結清（Settle Up）
 * 當 A 確認已經轉帳給 B，呼叫此 Action
 * 系統會自動在帳簿內建立兩筆隱藏交易來平帳：
 *   - 一筆 A 的支出（A 支付了這筆錢）
 *   - 一筆 B 的收入（B 收到了這筆錢）
 */
export async function settleDebt(params: {
  walletId: string;
  familyId: string;
  fromUserId: string; // 還款者
  toUserId: string;   // 收款者
  amount: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const { walletId, familyId, fromUserId, toUserId, amount } = params;

  // 找到或建立「內部結清」分類
  const SETTLE_CAT_NAME = "內部結清";

  let expenseCat = await db.query.categories.findFirst({
    where: and(
      eq(categories.familyId, familyId),
      eq(categories.name, SETTLE_CAT_NAME),
      eq(categories.type, "EXPENSE")
    ),
  });
  if (!expenseCat) {
    const id = crypto.randomUUID();
    await db.insert(categories).values({
      id, familyId, name: SETTLE_CAT_NAME, type: "EXPENSE",
      icon: "💸", isDefault: false, isHidden: true,
    });
    expenseCat = { id } as any;
  }

  let incomeCat = await db.query.categories.findFirst({
    where: and(
      eq(categories.familyId, familyId),
      eq(categories.name, SETTLE_CAT_NAME),
      eq(categories.type, "INCOME")
    ),
  });
  if (!incomeCat) {
    const id = crypto.randomUUID();
    await db.insert(categories).values({
      id, familyId, name: SETTLE_CAT_NAME, type: "INCOME",
      icon: "💸", isDefault: false, isHidden: true,
    });
    incomeCat = { id } as any;
  }

  const now = Date.now();

  // A 的支出交易
  await db.insert(transactions).values({
    id: crypto.randomUUID(),
    familyId,
    userId: fromUserId,
    walletId,
    categoryId: expenseCat!.id,
    amount,
    type: "EXPENSE",
    date: now,
    note: `結清轉帳（內部）`,
    paidByUserId: fromUserId,
  });

  // B 的收入交易
  await db.insert(transactions).values({
    id: crypto.randomUUID(),
    familyId,
    userId: toUserId,
    walletId,
    categoryId: incomeCat!.id,
    amount,
    type: "INCOME",
    date: now,
    note: `結清收款（內部）`,
    paidByUserId: fromUserId,
  });

  revalidatePath("/dashboard");
  return { success: true };
}
