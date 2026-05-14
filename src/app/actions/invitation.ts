"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invitations, familyMembers, families } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { ensureFamily } from "./transaction";

// ── 產生邀請連結 ─────────────────────────────────────────────────────
export async function createInvitation(role: "ADMIN" | "MEMBER" | "VIEWER" = "MEMBER") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const familyId = await ensureFamily(userId);

  // 檢查是否為 OWNER 或 ADMIN 才能邀請
  const membership = await db.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.familyId, familyId),
      eq(familyMembers.userId, userId)
    ),
  });

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new Error("只有管理員才能產生邀請連結");
  }

  // 產生一次性 Token（32 bytes hex）
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 小時後到期

  await db.insert(invitations).values({
    id: crypto.randomUUID(),
    familyId,
    inviterId: userId,
    token,
    role,
    expiresAt,
  });

  return { token };
}

// ── 查詢邀請資訊（給接受邀請頁面用）────────────────────────────────
export async function getInvitationByToken(token: string) {
  const inv = await db.query.invitations.findFirst({
    where: eq(invitations.token, token),
  });
  if (!inv) return null;

  // 檢查是否過期或已使用
  if (inv.expiresAt < Date.now()) return { error: "expired" as const };
  if (inv.usedAt !== null) return { error: "used" as const };

  // 取得家庭名稱
  const family = await db.query.families.findFirst({
    where: eq(families.id, inv.familyId),
  });

  return {
    token: inv.token,
    familyId: inv.familyId,
    familyName: family?.name ?? "未知家庭",
    role: inv.role,
    expiresAt: inv.expiresAt,
  };
}

// ── 接受邀請 ─────────────────────────────────────────────────────────
export async function acceptInvitation(token: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("請先登入再接受邀請");

  const userId = session.user.id;

  const inv = await db.query.invitations.findFirst({
    where: eq(invitations.token, token),
  });

  if (!inv) throw new Error("邀請連結無效");
  if (inv.expiresAt < Date.now()) throw new Error("邀請連結已過期");
  if (inv.usedAt !== null) throw new Error("此邀請連結已被使用過");

  // 確認還不是這個家庭的成員
  const existing = await db.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.familyId, inv.familyId),
      eq(familyMembers.userId, userId)
    ),
  });

  if (existing) throw new Error("您已經是此家庭的成員了");

  // 加入家庭
  await db.insert(familyMembers).values({
    id: crypto.randomUUID(),
    familyId: inv.familyId,
    userId,
    role: inv.role,
  });

  // 標記邀請已使用
  await db.update(invitations)
    .set({ usedAt: Date.now() })
    .where(eq(invitations.token, token));

  revalidatePath("/");
  return { success: true, familyId: inv.familyId };
}
