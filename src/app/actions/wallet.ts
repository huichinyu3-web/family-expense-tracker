"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wallets, walletMembers, familyMembers } from "@/lib/db/schema";
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

  // 取得這個家庭所有帳戶
  const allWallets = await db.query.wallets.findMany({
    where: eq(wallets.familyId, familyId),
    with: { walletMembers: true },
  });

  // 過濾出該使用者有權限的帳戶
  const accessible = allWallets.filter((w) => {
    if (w.visibility === "FAMILY") return true;
    if (w.visibility === "PERSONAL") return w.ownerId === userId;
    if (w.visibility === "CUSTOM") {
      return w.walletMembers.some((wm) => wm.userId === userId);
    }
    return false;
  });

  return accessible;
}

import { ensureFamily } from "./transaction";

// ── 建立新帳戶 ────────────────────────────────────────────────────────
export async function createWallet(data: {
  name: string;
  type: "CASH" | "BANK" | "CREDIT_CARD" | "E_WALLET" | "OTHER";
  visibility: "PERSONAL" | "FAMILY" | "CUSTOM";
  memberIds?: string[]; // CUSTOM 模式指定的成員
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
