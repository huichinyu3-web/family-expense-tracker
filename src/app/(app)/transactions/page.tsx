import { getTransactions } from "@/app/actions/transaction";
import TransactionsClient from "./TransactionsClient";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await auth();
  const transactions = await getTransactions();

  return <TransactionsClient initialData={transactions} currentUserId={session?.user?.id} />;
}
