import { getTransactions } from "@/app/actions/transaction";
import TransactionsClient from "./TransactionsClient";
import { getAccessibleWallets } from "@/app/actions/wallet";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await auth();
  const transactions = await getTransactions();
  const wallets = await getAccessibleWallets();

  return <TransactionsClient initialData={transactions} wallets={wallets} currentUserId={session?.user?.id} />;
}
