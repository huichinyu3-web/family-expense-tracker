"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wallets, walletMembers, familyMembers, transactions, categories } from "@/lib/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// ── 取得目前使用者可使用的帳戶清單 ──────────────────────────────────
// 規則：FAMILY 的任何人都能用；PERSONAL 只有 owner 能用；CUSTOM 看 wallet_members
export async function getAccessibleWallets() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;

  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
  });
  if (!membership) return [];

  const familyId = membership.familyId;

  // 取得這個家庭所有帳戶，並帶入關聯的明細以計算餘額
  const allWallets = await db.query.wallets.findMany({
    where: eq(wallets.familyId, familyId),
    with: { 
      walletMembers: true,
      // 之後在前端或這裡算餘額，但 findMany 不支援直接 sum，所以我們可以在這裡撈全部交易，或者先回傳。
      // 這裡先不動，稍後前端或這裡可以優化。
    },
  });

  // 為了計算即時餘額，我們去撈這個家庭的所有交易
  const allTxs = await db.query.transactions.findMany({
    where: eq(transactions.familyId, familyId),
    columns: { walletId: true, amount: true, type: true }
  });

  // 計算每個錢包的餘額
  const balances: Record<string, number> = {};
  allTxs.forEach(tx => {
    if (!tx.walletId) return;
    if (!balances[tx.walletId]) balances[tx.walletId] = 0;
    balances[tx.walletId] += tx.type === "INCOME" ? Math.abs(tx.amount) : -Math.abs(tx.amount);
  });

  // 過濾出該使用者有權限的帳戶
  const accessible = allWallets.filter((w) => {
    // 擁有者或管理員擁有最高權限，可看到並管理所有帳簿
    if (membership.role === "OWNER" || membership.role === "ADMIN") return true;

    if (w.visibility === "FAMILY") return true;
    if (w.visibility === "PERSONAL") return w.ownerId === userId;
    if (w.visibility === "CUSTOM") {
      return w.walletMembers.some((wm) => wm.userId === userId);
    }
    return false;
  }).map(w => ({
    ...w,
    balance: balances[w.id] || 0
  }));

  return accessible;
}

import { ensureFamily } from "./transaction";

// ── 建立新帳戶 ────────────────────────────────────────────────────────
export async function createWallet(data: {
  name: string;
  type: "CASH" | "BANK" | "CREDIT_CARD" | "E_WALLET" | "OTHER";
  visibility: "PERSONAL" | "FAMILY" | "CUSTOM";
  memberIds?: string[]; // CUSTOM 模式指定的成員
  initialBalance?: number;
  currency?: string;
  isSplitEnabled?: boolean;
  monthlyBudget?: number | null;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const familyId = await ensureFamily(userId);

  if (data.visibility === "FAMILY") {
    const myMember = await db.query.familyMembers.findFirst({
      where: and(eq(familyMembers.userId, userId), eq(familyMembers.familyId, familyId))
    });
    if (myMember?.role !== "OWNER" && myMember?.role !== "ADMIN") {
      throw new Error("Only OWNER or ADMIN can create FAMILY wallets.");
    }
  }

  const walletId = crypto.randomUUID();

  await db.insert(wallets).values({
    id: walletId,
    familyId: familyId,
    name: data.name,
    type: data.type,
    visibility: data.visibility,
    ownerId: userId, // 記錄創建者，讓創建者也能管理自己建的 CUSTOM 帳簿
    currency: data.currency || "TWD",
    isSplitEnabled: data.isSplitEnabled || false,
    monthlyBudget: data.monthlyBudget ?? null,
  });

  // 若是 CUSTOM，插入指定成員
  if (data.visibility === "CUSTOM" && data.memberIds?.length) {
    await db.insert(walletMembers).values(
      data.memberIds.map((uid) => ({ walletId, userId: uid }))
    );
  }

  // 若有初始金額，建立一筆系統初始明細
  if (data.initialBalance && data.initialBalance !== 0) {
    const txType = data.initialBalance > 0 ? "INCOME" : "EXPENSE";
    const amount = Math.abs(data.initialBalance);
    
    // 找尋或建立隱藏的系統分類
    let cat = await db.query.categories.findFirst({
      where: and(eq(categories.familyId, familyId), eq(categories.name, "系統初始調整"), eq(categories.type, txType))
    });

    if (!cat) {
      const newCatId = crypto.randomUUID();
      await db.insert(categories).values({
        id: newCatId,
        familyId,
        name: "系統初始調整",
        type: txType,
        icon: "⚙️",
        isDefault: true,
        isHidden: true,
      });
      cat = { id: newCatId } as any;
    }

    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      familyId,
      userId,
      walletId,
      categoryId: cat!.id,
      amount,
      type: txType,
      date: Date.now(),
      note: "帳戶初始金額設定",
    });
  }

  revalidatePath("/settings");
  return { success: true, walletId };
}

// ── 查詢帳戶下的交易數量（刪除前確認用）──────────────────────────────
export async function getWalletTxCount(walletId: string): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const txs = await db.query.transactions.findMany({
    where: eq(transactions.walletId, walletId),
    columns: { id: true },
  });
  return txs.length;
}

// ── 刪除帳戶（Strategy B：確認後串聯刪除）───────────────────────────
export async function deleteWallet(walletId: string, force = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.id, walletId)
  });
  if (!wallet) throw new Error("Wallet not found");

  const myMember = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.userId, session.user.id), eq(familyMembers.familyId, wallet.familyId))
  });
  const isAdmin = myMember?.role === "OWNER" || myMember?.role === "ADMIN";

  if (!isAdmin) {
    if (wallet.visibility === "FAMILY") {
      throw new Error("Only OWNER or ADMIN can delete FAMILY wallets.");
    }
    if (wallet.visibility === "PERSONAL" && wallet.ownerId !== session.user.id) {
      throw new Error("You can only delete your own PERSONAL wallets.");
    }
    if (wallet.visibility === "CUSTOM" && wallet.ownerId !== session.user.id) {
      throw new Error("Only OWNER, ADMIN, or the creator can delete CUSTOM wallets.");
    }
  }

  // 取得交易數量
  const txCount = await getWalletTxCount(walletId);

  // 若有交易但非強制模式，回傳 needsConfirm
  if (txCount > 0 && !force) {
    return { needsConfirm: true, txCount };
  }

  // 串聯刪除：先刪交易，再刪帳戶
  if (txCount > 0) {
    await db.delete(transactions).where(eq(transactions.walletId, walletId));
  }

  await db.delete(wallets).where(eq(wallets.id, walletId));
  revalidatePath("/settings");
  return { success: true };
}

// ── 更新帳戶 ─────────────────────────────────────────────────────────
export async function updateWallet(
  walletId: string,
  data: {
    name: string;
    type: "CASH" | "BANK" | "CREDIT_CARD" | "E_WALLET" | "OTHER";
    visibility: "PERSONAL" | "FAMILY" | "CUSTOM";
    memberIds?: string[];
    currency?: string;
    isSplitEnabled?: boolean;
    monthlyBudget?: number | null;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.id, walletId)
  });
  if (!wallet) throw new Error("Wallet not found");

  const myMember = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.userId, session.user.id), eq(familyMembers.familyId, wallet.familyId))
  });
  const isAdmin = myMember?.role === "OWNER" || myMember?.role === "ADMIN";

  // 權限檢查：只有 ADMIN/OWNER 或是創建者可以編輯
  if (!isAdmin && wallet.ownerId !== session.user.id) {
    throw new Error("Only OWNER, ADMIN, or the creator can edit this wallet.");
  }

  // 若改為 FAMILY，只有 ADMIN/OWNER 可執行
  if (data.visibility === "FAMILY" && !isAdmin) {
    throw new Error("Only OWNER or ADMIN can set a wallet to FAMILY visibility.");
  }

  // 更新錢包基本資訊
  await db.update(wallets)
    .set({
      name: data.name,
      type: data.type,
      visibility: data.visibility,
      currency: data.currency,
      isSplitEnabled: data.isSplitEnabled,
      monthlyBudget: data.monthlyBudget ?? null,
    })
    .where(eq(wallets.id, walletId));

  // 更新 CUSTOM 成員：先刪除舊的，再插入新的
  await db.delete(walletMembers).where(eq(walletMembers.walletId, walletId));
  
  if (data.visibility === "CUSTOM" && data.memberIds?.length) {
    await db.insert(walletMembers).values(
      data.memberIds.map((uid) => ({ walletId, userId: uid }))
    );
  }

  revalidatePath("/settings");
  return { success: true };
}
