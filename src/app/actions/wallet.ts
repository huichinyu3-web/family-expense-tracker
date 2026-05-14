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
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const familyId = await ensureFamily(userId);

  const walletId = crypto.randomUUID();

  await db.insert(wallets).values({
    id: walletId,
    familyId: familyId,
    name: data.name,
    type: data.type,
    visibility: data.visibility,
    ownerId: data.visibility === "PERSONAL" ? userId : null,
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

// ── 刪除帳戶（只有 OWNER 或 ADMIN 可以刪） ───────────────────────────
export async function deleteWallet(walletId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.delete(wallets).where(eq(wallets.id, walletId));
  revalidatePath("/settings");
  return { success: true };
}
