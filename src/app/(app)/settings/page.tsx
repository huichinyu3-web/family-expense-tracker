import { auth } from "@/lib/auth";
import { getAccessibleWallets } from "@/app/actions/wallet";
import { getCategories } from "@/app/actions/category";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const wallets = await getAccessibleWallets();
  const incomeCategories = await getCategories("INCOME");
  const expenseCategories = await getCategories("EXPENSE");

  return (
    <SettingsClient
      user={session?.user ?? null}
      wallets={wallets}
      incomeCategories={incomeCategories}
      expenseCategories={expenseCategories}
    />
  );
}
