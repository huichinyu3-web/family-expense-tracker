import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

// ─── 1. Users ───────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  createdAt: integer("created_at").default(sql`(cast(strftime('%s', 'now') as integer))`),
});

// ─── 2. Accounts (NextAuth OAuth 供應商) ────────────────────────────────────
export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  })
);

// ─── 3. Sessions ─────────────────────────────────────────────────────────────
export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

// ─── 4. Verification Tokens (Magic Link / WebAuthn 用) ───────────────────────
export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

// ─── 5. Authenticators (WebAuthn / Passkeys 生物辨識公鑰) ────────────────────
export const authenticators = sqliteTable(
  "authenticators",
  {
    credentialID: text("credential_id").notNull().unique(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credential_device_type").notNull(),
    credentialBackedUp: integer("credential_backed_up", { mode: "boolean" }).notNull(),
    transports: text("transports"), // e.g. "usb,ble,nfc,internal"
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.credentialID] }),
  })
);

// ─── 6. Families (家庭群組) ──────────────────────────────────────────────────
export const families = sqliteTable("families", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at").default(sql`(cast(strftime('%s', 'now') as integer))`),
});

// ─── 7. Family Members (成員與 RBAC 角色) ───────────────────────────────────
export const familyMembers = sqliteTable(
  "family_members",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["OWNER", "ADMIN", "MEMBER", "VIEWER"] }).notNull().default("MEMBER"),
    joinedAt: integer("joined_at").default(sql`(cast(strftime('%s', 'now') as integer))`),
  },
  (table) => ({
    uniqueMember: uniqueIndex("unique_family_member").on(table.familyId, table.userId),
    familyIdx: index("idx_fm_family_id").on(table.familyId),
    userIdx: index("idx_fm_user_id").on(table.userId),
  })
);

// ─── 8. Invitations (邀請連結，24 小時時效 + 一次性) ────────────────────────
export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    inviterId: text("inviter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    role: text("role", { enum: ["ADMIN", "MEMBER", "VIEWER"] }).notNull().default("MEMBER"),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"), // null = 未使用；有值 = 已失效
    createdAt: integer("created_at").default(sql`(cast(strftime('%s', 'now') as integer))`),
  },
  (table) => ({
    tokenIdx: index("idx_invitations_token").on(table.token),
  })
);

// ─── 9. Categories (記帳分類，支援家庭自訂) ──────────────────────────────────
export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: ["INCOME", "EXPENSE"] }).notNull(),
    icon: text("icon"),   // Emoji 或 icon 名稱
    color: text("color"), // Hex 色碼
  },
  (table) => ({
    familyIdx: index("idx_categories_family_id").on(table.familyId),
  })
);

// ─── 10. Transactions (記帳明細，核心業務表) ─────────────────────────────────
export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id),
    categoryId: text("category_id").notNull().references(() => categories.id),
    amount: real("amount").notNull(),
    type: text("type", { enum: ["INCOME", "EXPENSE"] }).notNull(),
    date: integer("date").notNull(), // 消費日期 Unix Timestamp
    note: text("note"),
    imageUrl: text("image_url"),
    createdAt: integer("created_at").default(sql`(cast(strftime('%s', 'now') as integer))`),
  },
  (table) => ({
    familyIdx: index("idx_tx_family_id").on(table.familyId),
    dateIdx: index("idx_tx_date").on(table.date),
    userIdx: index("idx_tx_user_id").on(table.userId),
  })
);

// ─── 型別匯出 (給 TypeScript 推導用) ─────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type Family = typeof families.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Authenticator = typeof authenticators.$inferSelect;
