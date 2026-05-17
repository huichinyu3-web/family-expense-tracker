"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { familyMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ensureFamily } from "./transaction";

type FamilyRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

// ── 確認目前使用者在家庭內的角色 ─────────────────────────────────────
async function ensureFamilyAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const familyId = await ensureFamily(userId);

  const membership = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)),
  });

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new Error("只有家庭管理員可以執行此操作");
  }

  return { userId, familyId, role: membership.role };
}

// ── 取得家庭所有成員（含 user 資訊）────────────────────────────────────
export async function getFamilyMembers() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const familyId = await ensureFamily(userId);

  const members = await db.query.familyMembers.findMany({
    where: eq(familyMembers.familyId, familyId),
    with: { user: { columns: { id: true, name: true, email: true, image: true } } },
  });

  return members;
}

// ── 修改家庭成員角色（OWNER 不能被修改；OWNER 才能指派新 OWNER）────────
export async function updateFamilyMemberRole(memberId: string, newRole: FamilyRole) {
  const { userId, familyId, role: myRole } = await ensureFamilyAdmin();

  const target = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, memberId), eq(familyMembers.familyId, familyId)),
  });

  if (!target) throw new Error("找不到此成員");
  if (target.userId === userId) throw new Error("不能修改自己的角色");
  if (target.role === "OWNER") throw new Error("不能修改擁有者的角色");
  if (newRole === "OWNER" && myRole !== "OWNER") throw new Error("只有擁有者可以指派新擁有者");

  await db.update(familyMembers).set({ role: newRole }).where(eq(familyMembers.id, memberId));

  revalidatePath("/settings");
  return { success: true };
}

// ── 移除家庭成員（不能移除自己或 OWNER）─────────────────────────────────
export async function removeFamilyMember(memberId: string) {
  const { userId, familyId } = await ensureFamilyAdmin();

  const target = await db.query.familyMembers.findFirst({
    where: and(eq(familyMembers.id, memberId), eq(familyMembers.familyId, familyId)),
  });

  if (!target) throw new Error("找不到此成員");
  if (target.userId === userId) throw new Error("不能移除自己");
  if (target.role === "OWNER") throw new Error("不能移除擁有者");

  await db.delete(familyMembers).where(eq(familyMembers.id, memberId));

  revalidatePath("/settings");
  return { success: true };
}
