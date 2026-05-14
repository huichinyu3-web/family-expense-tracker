const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .then(r => {
    console.log('=== 已建立的資料表 ===');
    r.rows.forEach(row => console.log(' ✅', row.name));
    console.log(`\n共 ${r.rows.length} 張資料表`);
  })
  .catch(console.error);
