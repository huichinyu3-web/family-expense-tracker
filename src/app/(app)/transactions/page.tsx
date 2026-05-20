import { getTransactions } from "@/app/actions/transaction";
import TransactionsClient from "./TransactionsClient";
import { getAccessibleWallets } from "@/app/actions/wallet";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { familyMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  
  const membership = userId ? await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
  }) : null;

  const transactions = await getTransactions();
  const wallets = await getAccessibleWallets();

  return <TransactionsClient 
    initialData={transactions} 
    wallets={wallets} 
    currentUserId={userId} 
    currentUserRole={membership?.role || "MEMBER"} 
  />;
}
