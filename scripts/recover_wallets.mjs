/**
 * recover_wallets.mjs
 * 從 transactions 找出所有曾使用的 walletId，
 * 並在 wallets 表中重建對應的帳簿（保留原 ID 讓交易繼續連結）
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 讀取 .env.local
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envContent.split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => l.split("=").map(s => s.trim()))
    .map(([k, ...v]) => [k, v.join("=")])
);

const db = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log("🔌 連接 Turso 資料庫...");

  // 1. 找出所有曾使用的 walletId 及其 familyId
  const result = await db.execute(`
    SELECT DISTINCT wallet_id, family_id
    FROM transactions
    WHERE wallet_id IS NOT NULL
    ORDER BY wallet_id
  `);

  const walletGroups = result.rows;
  console.log(`\n📊 找到 ${walletGroups.length} 個不重複的 walletId：`);
  walletGroups.forEach((r, i) => {
    console.log(`  ${i + 1}. walletId: ${r.wallet_id} | familyId: ${r.family_id}`);
  });

  if (walletGroups.length === 0) {
    console.log("✅ 沒有找到任何 walletId，無需修復");
    return;
  }

  // 2. 找出建立者（取每個 walletId 最早的交易的 user_id 作為 ownerId）
  const ownerResult = await db.execute(`
    SELECT wallet_id, user_id, MIN(created_at) as earliest
    FROM transactions
    WHERE wallet_id IS NOT NULL
    GROUP BY wallet_id
  `);

  const ownerMap = {};
  ownerResult.rows.forEach(r => {
    ownerMap[r.wallet_id] = r.user_id;
  });

  // 3. 確認 wallets 表格目前是空的
  const currentWallets = await db.execute("SELECT COUNT(*) as cnt FROM wallets");
  console.log(`\n💳 目前 wallets 表格有 ${currentWallets.rows[0].cnt} 筆`);

  // 4. 重建帳簿
  console.log("\n🔧 開始重建帳簿...");
  let count = 0;
  for (const [i, row] of walletGroups.entries()) {
    const walletId = row.wallet_id;
    const familyId = row.family_id;
    const ownerId = ownerMap[walletId] || null;
    const walletName = `帳簿 ${i + 1}`;

    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO wallets (id, family_id, name, type, visibility, owner_id, currency, is_split_enabled, is_archived)
              VALUES (?, ?, ?, 'OTHER', 'FAMILY', ?, 'TWD', 0, 0)`,
        args: [walletId, familyId, walletName, ownerId],
      });
      console.log(`  ✅ 建立「${walletName}」 (${walletId})`);
      count++;
    } catch (e) {
      console.error(`  ❌ 建立失敗 ${walletId}:`, e.message);
    }
  }

  // 5. 也要處理沒有 walletId 的交易（這些交易不需要帳簿）
  const noWalletTx = await db.execute(`
    SELECT COUNT(*) as cnt FROM transactions WHERE wallet_id IS NULL
  `);
  console.log(`\n📝 另有 ${noWalletTx.rows[0].cnt} 筆交易沒有帳簿（wallet_id IS NULL），已略過`);

  // 6. 確認結果
  const finalWallets = await db.execute("SELECT id, name, family_id FROM wallets");
  console.log(`\n✅ 修復完成！共重建 ${count} 個帳簿：`);
  finalWallets.rows.forEach(w => console.log(`  - ${w.name} (${w.id})`));
  console.log("\n⚠️  請至設定頁面，將帳簿名稱由「帳簿 1, 2...」改回原本的名稱！");
}

main().catch(e => {
  console.error("❌ 執行失敗：", e);
  process.exit(1);
});
