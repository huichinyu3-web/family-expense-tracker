"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { familyMembers, wallets, walletMembers, transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
