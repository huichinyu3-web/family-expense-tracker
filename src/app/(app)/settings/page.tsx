import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAccessibleWallets } from "@/app/actions/wallet";
import { getCategories } from "@/app/actions/category";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  
  let systemRole = "USER";
  if (session?.user?.id) {
    const u = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { systemRole: true }
    });
    if (u) systemRole = u.systemRole;
  }

  const wallets = await getAccessibleWallets();
  const incomeCategories = await getCategories("INCOME");
  const expenseCategories = await getCategories("EXPENSE");

  return (
    <SettingsClient
      user={session?.user ? { ...session.user, systemRole } : null}
      wallets={wallets}
      incomeCategories={incomeCategories}
      expenseCategories={expenseCategories}
    />
  );
}
