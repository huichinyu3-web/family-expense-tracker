import { auth } from "@/lib/auth";
import { getTransactions } from "@/app/actions/transaction";
import { db } from "@/lib/db";
import { familyMembers, families } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return <div>請先登入</div>;
  }

  // 取得使用者的 Family 名稱
  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
    with: { family: true },
  });

  const transactions = await getTransactions();

  return (
    <DashboardClient 
      transactions={transactions} 
      currentUserId={userId}
      userName={session.user.name || "使用者"}
      familyName={membership?.family?.name || "我的家庭"}
    />
  );
}
