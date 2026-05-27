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
  systemRole: text("system_role", { enum: ["USER", "SYSTEM_ADMIN"] }).notNull().default("USER"),
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

// ─── 9. Categories (記帳分類，支援兩層結構與家庭自訂) ────────────────────────
export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: ["INCOME", "EXPENSE"] }).notNull(),
    icon: text("icon"),          // Emoji 圖示
    color: text("color"),        // Hex 色碼
    // ── 兩層分類 ──
    parentId: text("parent_id"), // null = 大項；有值 = 細項（指向大項 id）
    // ── 管理欄位 ──
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false), // 系統預設不可刪除
    isHidden: integer("is_hidden", { mode: "boolean" }).notNull().default(false),   // 使用者可隱藏
    sortOrder: integer("sort_order").notNull().default(0),                           // 排列順序
  },
  (table) => ({
    familyIdx: index("idx_categories_family_id").on(table.familyId),
    parentIdx: index("idx_categories_parent_id").on(table.parentId),
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
    // -- 新增進階欄位 --
    walletId: text("wallet_id"), // 不加 foreign key constraint 避免 SQLite alter table 報錯
    merchantId: text("merchant_id"),
    recurringType: text("recurring_type", { 
      enum: ["NONE", "DAILY", "WORKDAY", "WEEKLY", "BIWEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUALLY", "ANNUALLY", "INSTALLMENT"] 
    }).default("NONE"),
    installments: integer("installments"), // 總期數
    installmentIndex: integer("installment_index"), // 當前第幾期
    parentId: text("parent_id"), // 指向原始的交易（用來追蹤分期或週期）
    // -- 帳簿與代墊結算 --
    currency: text("currency").notNull().default("TWD"),
    paidByUserId: text("paid_by_user_id").references(() => users.id),
    // ----------------
    createdAt: integer("created_at").default(sql`(cast(strftime('%s', 'now') as integer))`),
  },
  (table) => ({
    familyIdx: index("idx_tx_family_id").on(table.familyId),
    dateIdx: index("idx_tx_date").on(table.date),
    userIdx: index("idx_tx_user_id").on(table.userId),
    walletIdx: index("idx_tx_wallet_id").on(table.walletId),
  })
);

// ─── 11. Wallets (帳戶/帳簿來源) ──────────────────────────────────────────
export const wallets = sqliteTable("wallets", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["CASH", "BANK", "CREDIT_CARD", "E_WALLET", "OTHER"] }).notNull().default("CASH"),
  visibility: text("visibility", { enum: ["PERSONAL", "FAMILY", "CUSTOM"] }).notNull().default("FAMILY"),
  ownerId: text("owner_id").references(() => users.id), // 若為 PERSONAL，記錄誰是擁有者
  // -- 帳簿擴充 --
  currency: text("currency").notNull().default("TWD"),
  isSplitEnabled: integer("is_split_enabled", { mode: "boolean" }).notNull().default(false),
  monthlyBudget: real("monthly_budget"), // 每月預算（可選，null 代表不設定）
  // -- 期間限定帳簿 --
  startDate: text("start_date"),   // ISO 格式 "YYYY-MM-DD"，null = 無限制
  endDate: text("end_date"),       // ISO 格式 "YYYY-MM-DD"，null = 無限制
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false), // 封存後隱藏於日常記帳
  createdAt: integer("created_at").default(sql`(cast(strftime('%s', 'now') as integer))`),
});

// ─── 12. Wallet Members (帳戶存取權限，CUSTOM 模式專用) ──────────────────────
export const walletMembers = sqliteTable("wallet_members", {
  walletId: text("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.walletId, table.userId] }),
}));

// ─── 13. Merchants (商家) ───────────────────────────────────────────────────
export const merchants = sqliteTable("merchants", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: integer("created_at").default(sql`(cast(strftime('%s', 'now') as integer))`),
});

// ─── 型別匯出 (給 TypeScript 推導用) ─────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type Family = typeof families.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Authenticator = typeof authenticators.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type WalletMember = typeof walletMembers.$inferSelect;
export type Merchant = typeof merchants.$inferSelect;

import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
  familyMembers: many(familyMembers),
  transactions: many(transactions),
  ownedWallets: many(wallets),
}));

export const familiesRelations = relations(families, ({ many }) => ({
  members: many(familyMembers),
  categories: many(categories),
  transactions: many(transactions),
  wallets: many(wallets),
  merchants: many(merchants),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  family: one(families, {
    fields: [familyMembers.familyId],
    references: [families.id],
  }),
  user: one(users, {
    fields: [familyMembers.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  family: one(families, {
    fields: [categories.familyId],
    references: [families.id],
  }),
  transactions: many(transactions),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  family: one(families, {
    fields: [wallets.familyId],
    references: [families.id],
  }),
  owner: one(users, {
    fields: [wallets.ownerId],
    references: [users.id],
  }),
  transactions: many(transactions),
  walletMembers: many(walletMembers),
}));

export const walletMembersRelations = relations(walletMembers, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletMembers.walletId],
    references: [wallets.id],
  }),
  user: one(users, {
    fields: [walletMembers.userId],
    references: [users.id],
  }),
}));

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  family: one(families, {
    fields: [merchants.familyId],
    references: [families.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  family: one(families, {
    fields: [transactions.familyId],
    references: [families.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
  merchant: one(merchants, {
    fields: [transactions.merchantId],
    references: [merchants.id],
  }),
}));
