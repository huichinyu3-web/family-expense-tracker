"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, families } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

// ── 取得總覽數據 ────────────────────────────────────────────────────────
export async function getSystemStats() {
  await ensureSystemAdmin();

  const allUsers = await db.select().from(users);
  const allFamilies = await db.select().from(families);

  return {
    totalUsers: allUsers.length,
    totalFamilies: allFamilies.length,
    users: allUsers,
  };
}

// ── 將某個使用者設為 SYSTEM_ADMIN (這通常是開發者直接改 DB，這裡提供一個切換按鈕供展示用) ──
export async function toggleUserRole(targetUserId: string, currentRole: string) {
  await ensureSystemAdmin();

  const newRole = currentRole === "SYSTEM_ADMIN" ? "USER" : "SYSTEM_ADMIN";
  await db.update(users).set({ systemRole: newRole }).where(eq(users.id, targetUserId));

  revalidatePath("/system-admin");
  return { success: true };
}
