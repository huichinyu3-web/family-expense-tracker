/**
 * 預設分類種子資料
 * 呼叫 seedCategories(db, familyId) 即可為新家庭建立完整的兩層分類結構
 */

export type CategorySeed = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
  color: string;
  sortOrder: number;
  children: {
    id: string;
    name: string;
    icon: string;
    sortOrder: number;
  }[];
};

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  // ══════════════════════════════════════════
  // 收入大項
  // ══════════════════════════════════════════
  {
    id: "income_career",
    name: "職涯所得",
    type: "INCOME",
    icon: "💼",
    color: "#10b981",
    sortOrder: 1,
    children: [
      { id: "income_career_salary",   name: "每月薪資", icon: "💰", sortOrder: 1 },
      { id: "income_career_overtime", name: "加班津貼", icon: "⏰", sortOrder: 2 },
      { id: "income_career_fulltime", name: "全勤獎金", icon: "🏆", sortOrder: 3 },
    ],
  },
  {
    id: "income_bonus",
    name: "額外獎酬",
    type: "INCOME",
    icon: "🎁",
    color: "#10b981",
    sortOrder: 2,
    children: [
      { id: "income_bonus_annual",    name: "年終獎金", icon: "🎊", sortOrder: 1 },
      { id: "income_bonus_perf",      name: "績效分紅", icon: "📈", sortOrder: 2 },
      { id: "income_bonus_holiday",   name: "三節禮金", icon: "🧧", sortOrder: 3 },
    ],
  },
  {
    id: "income_passive",
    name: "被動收益",
    type: "INCOME",
    icon: "📈",
    color: "#10b981",
    sortOrder: 3,
    children: [
      { id: "income_passive_dividend", name: "股票股利", icon: "📊", sortOrder: 1 },
      { id: "income_passive_interest", name: "利息收入", icon: "🏦", sortOrder: 2 },
      { id: "income_passive_rent",     name: "房屋租金", icon: "🏠", sortOrder: 3 },
    ],
  },
  {
    id: "income_side",
    name: "業餘兼差",
    type: "INCOME",
    icon: "💻",
    color: "#10b981",
    sortOrder: 4,
    children: [
      { id: "income_side_freelance", name: "接案收入", icon: "🖥️", sortOrder: 1 },
      { id: "income_side_resale",    name: "網拍所得", icon: "🛒", sortOrder: 2 },
      { id: "income_side_labor",     name: "勞務報酬", icon: "🔧", sortOrder: 3 },
    ],
  },
  {
    id: "income_other",
    name: "其他收入",
    type: "INCOME",
    icon: "💵",
    color: "#10b981",
    sortOrder: 5,
    children: [
      { id: "income_other_lottery", name: "發票中獎", icon: "🎰", sortOrder: 1 },
      { id: "income_other_gift",    name: "親友紅包", icon: "🧧", sortOrder: 2 },
      { id: "income_other_refund",  name: "政府退稅", icon: "🏛️", sortOrder: 3 },
    ],
  },

  // ══════════════════════════════════════════
  // 支出大項
  // ══════════════════════════════════════════
  {
    id: "expense_food",
    name: "餐飲食安",
    type: "EXPENSE",
    icon: "🍜",
    color: "#f43f5e",
    sortOrder: 1,
    children: [
      { id: "expense_food_meal",     name: "日常三餐", icon: "🍱", sortOrder: 1 },
      { id: "expense_food_drink",    name: "飲品點心", icon: "🧋", sortOrder: 2 },
      { id: "expense_food_dining",   name: "聚會大餐", icon: "🍽️", sortOrder: 3 },
    ],
  },
  {
    id: "expense_clothing",
    name: "衣著美化",
    type: "EXPENSE",
    icon: "👗",
    color: "#f43f5e",
    sortOrder: 2,
    children: [
      { id: "expense_clothing_fashion",  name: "服飾配件", icon: "👔", sortOrder: 1 },
      { id: "expense_clothing_beauty",   name: "美容美髮", icon: "💇", sortOrder: 2 },
      { id: "expense_clothing_laundry",  name: "洗滌保養", icon: "🧴", sortOrder: 3 },
    ],
  },
  {
    id: "expense_housing",
    name: "居家住所",
    type: "EXPENSE",
    icon: "🏠",
    color: "#f43f5e",
    sortOrder: 3,
    children: [
      { id: "expense_housing_rent",    name: "居住開銷", icon: "🏡", sortOrder: 1 },
      { id: "expense_housing_utility", name: "能源修繕", icon: "💡", sortOrder: 2 },
      { id: "expense_housing_goods",   name: "生活雜物", icon: "🧹", sortOrder: 3 },
    ],
  },
  {
    id: "expense_transport",
    name: "行旅交通",
    type: "EXPENSE",
    icon: "🚇",
    color: "#f43f5e",
    sortOrder: 4,
    children: [
      { id: "expense_transport_public", name: "通勤工具", icon: "🚌", sortOrder: 1 },
      { id: "expense_transport_car",    name: "私家車輛", icon: "🚗", sortOrder: 2 },
      { id: "expense_transport_taxi",   name: "計程叫車", icon: "🚕", sortOrder: 3 },
    ],
  },
  {
    id: "expense_education",
    name: "育才教育",
    type: "EXPENSE",
    icon: "📚",
    color: "#f43f5e",
    sortOrder: 5,
    children: [
      { id: "expense_education_self",  name: "自我提升", icon: "🎓", sortOrder: 1 },
      { id: "expense_education_child", name: "子女教育", icon: "🧒", sortOrder: 2 },
      { id: "expense_education_cert",  name: "專業證照", icon: "📜", sortOrder: 3 },
    ],
  },
  {
    id: "expense_leisure",
    name: "休閒娛樂",
    type: "EXPENSE",
    icon: "🎬",
    color: "#f43f5e",
    sortOrder: 6,
    children: [
      { id: "expense_leisure_media",   name: "視聽娛樂", icon: "🎮", sortOrder: 1 },
      { id: "expense_leisure_travel",  name: "旅遊休閒", icon: "✈️", sortOrder: 2 },
      { id: "expense_leisure_hobby",   name: "興趣嗜好", icon: "⚽", sortOrder: 3 },
    ],
  },
  {
    id: "expense_health",
    name: "醫療保險",
    type: "EXPENSE",
    icon: "💊",
    color: "#f43f5e",
    sortOrder: 7,
    children: [
      { id: "expense_health_medical",  name: "醫療門診", icon: "🏥", sortOrder: 1 },
      { id: "expense_health_insurance", name: "保險規費", icon: "🛡️", sortOrder: 2 },
    ],
  },
  {
    id: "expense_social",
    name: "人際社會",
    type: "EXPENSE",
    icon: "🤝",
    color: "#f43f5e",
    sortOrder: 8,
    children: [
      { id: "expense_social_gifts",  name: "紅白禮金", icon: "🎀", sortOrder: 1 },
      { id: "expense_social_family", name: "孝親奉養", icon: "👨‍👩‍👧", sortOrder: 2 },
    ],
  },
];

/**
 * 為指定的家庭，將預設分類種子資料寫入資料庫
 * 使用 "INSERT OR IGNORE" 語義（Drizzle 的 onConflictDoNothing）避免重複插入
 */
import { db } from "./index";
import { categories } from "./schema";

export async function seedCategories(familyId: string) {
  const rows: typeof categories.$inferInsert[] = [];

  for (const cat of DEFAULT_CATEGORIES) {
    // 大項
    rows.push({
      id: `${familyId}_${cat.id}`,
      familyId,
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
      parentId: null,
      isDefault: true,
      isHidden: false,
      sortOrder: cat.sortOrder,
    });

    // 細項
    for (const child of cat.children) {
      rows.push({
        id: `${familyId}_${child.id}`,
        familyId,
        name: child.name,
        type: cat.type,         // 繼承大項的 type
        icon: child.icon,
        color: cat.color,        // 繼承大項的 color
        parentId: `${familyId}_${cat.id}`,
        isDefault: true,
        isHidden: false,
        sortOrder: child.sortOrder,
      });
    }
  }

  // 批次插入，若已存在則跳過（冪等操作）
  await db.insert(categories).values(rows).onConflictDoNothing();
}
