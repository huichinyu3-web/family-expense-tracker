"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, families, familyMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── 檢查是否為 System Admin ──────────────────────────────────────────────
async function ensureSystemAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || user.systemRole !== "SYSTEM_ADMIN") {
    throw new Error("Forbidden: System Admin only");
  }

  return user;
}

// ── 取得總覽數據（含各家庭成員）────────────────────────────────────────
export async function getSystemStats() {
  await ensureSystemAdmin();

  const allUsers = await db.select().from(users);
  const allFamilies = await db.select().from(families);

  // 取出所有成員關聯，並 join user 資訊
  const allMembers = await db.query.familyMembers.findMany({
    with: { user: { columns: { id: true, name: true, email: true, image: true } } },
  });

  // 將成員依家庭分組
  const familiesWithMembers = allFamilies.map(f => ({
    ...f,
    members: allMembers.filter(m => m.familyId === f.id),
  }));

  return {
    totalUsers: allUsers.length,
    totalFamilies: allFamilies.length,
    users: allUsers,
    families: familiesWithMembers,
  };
}

// ── 切換使用者的系統層級角色 ─────────────────────────────────────────────
export async function toggleUserSystemRole(targetUserId: string, currentRole: string) {
  await ensureSystemAdmin();

  const newRole = currentRole === "SYSTEM_ADMIN" ? "USER" : "SYSTEM_ADMIN";
  await db.update(users).set({ systemRole: newRole }).where(eq(users.id, targetUserId));

  revalidatePath("/system-admin");
  return { success: true };
}

// ── [System Admin] 修改某個成員的家庭角色 ───────────────────────────────
export async function adminUpdateFamilyMemberRole(
  memberId: string,
  newRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
) {
  await ensureSystemAdmin();

  await db.update(familyMembers)
    .set({ role: newRole })
    .where(eq(familyMembers.id, memberId));

  revalidatePath("/system-admin");
  return { success: true };
}

// ── [System Admin] 將某人從家庭中移除 ───────────────────────────────────
export async function adminRemoveFamilyMember(memberId: string) {
  await ensureSystemAdmin();

  const member = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.id, memberId),
  });
  if (!member) throw new Error("找不到此成員");
  if (member.role === "OWNER") throw new Error("不能移除家庭的擁有者");

  await db.delete(familyMembers).where(eq(familyMembers.id, memberId));

  revalidatePath("/system-admin");
  return { success: true };
}
