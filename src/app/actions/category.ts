"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, familyMembers } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

// ── 取得分類（兩層結構）────────────────────────────────────────────────
export async function getCategories(type?: "INCOME" | "EXPENSE") {
  const session = await auth();
  if (!session?.user?.id) return [];

  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, session.user.id),
  });
  if (!membership) return [];

  const familyId = membership.familyId;

  // 取出大項（parentId 為 null 的）
  const parents = await db.query.categories.findMany({
    where: (c, { and, eq, isNull }) =>
      and(
        eq(c.familyId, familyId),
        isNull(c.parentId),
        eq(c.isHidden, false),
        ...(type ? [eq(c.type, type)] : [])
      ),
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });

  // 取出所有細項
  const children = await db.query.categories.findMany({
    where: (c, { and, eq, isNotNull }) =>
      and(
        eq(c.familyId, familyId),
        isNotNull(c.parentId),
        eq(c.isHidden, false),
        ...(type ? [eq(c.type, type)] : [])
      ),
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });

  // 組合成巢狀結構
  return parents.map((parent) => ({
    ...parent,
    children: children.filter((c) => c.parentId === parent.id),
  }));
}

// ── 新增自訂大項 ──────────────────────────────────────────────────────
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function createParentCategory(data: {
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, session.user.id),
  });
  if (!membership) throw new Error("No family");

  await db.insert(categories).values({
    id: crypto.randomUUID(),
    familyId: membership.familyId,
    name: data.name,
    type: data.type,
    icon: data.icon,
    parentId: null,
    isDefault: false,
    isHidden: false,
    sortOrder: 999,
  });

  revalidatePath("/settings");
  return { success: true };
}

// ── 新增自訂細項 ──────────────────────────────────────────────────────
export async function createChildCategory(data: {
  name: string;
  icon: string;
  parentId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, session.user.id),
  });
  if (!membership) throw new Error("No family");

  // 繼承大項的 type
  const parent = await db.query.categories.findFirst({
    where: eq(categories.id, data.parentId),
  });
  if (!parent) throw new Error("Parent category not found");

  await db.insert(categories).values({
    id: crypto.randomUUID(),
    familyId: membership.familyId,
    name: data.name,
    type: parent.type, // 繼承大項
    icon: data.icon,
    color: parent.color,
    parentId: data.parentId,
    isDefault: false,
    isHidden: false,
    sortOrder: 999,
  });

  revalidatePath("/settings");
  return { success: true };
}

// ── 隱藏 / 顯示分類 ──────────────────────────────────────────────────
export async function toggleCategoryVisibility(categoryId: string, isHidden: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.update(categories)
    .set({ isHidden })
    .where(eq(categories.id, categoryId));

  revalidatePath("/settings");
  return { success: true };
}

// ── 刪除自訂分類（isDefault = false 才能刪） ─────────────────────────
export async function deleteCategory(categoryId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const cat = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });
  if (!cat) throw new Error("Category not found");
  if (cat.isDefault) throw new Error("Cannot delete a default category");

  await db.delete(categories).where(eq(categories.id, categoryId));
  revalidatePath("/settings");
  return { success: true };
}
