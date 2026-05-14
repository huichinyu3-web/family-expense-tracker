import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let url = process.env.TURSO_DATABASE_URL;
if (!url || url.trim() === "") {
  url = "file:./dummy.db";
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
