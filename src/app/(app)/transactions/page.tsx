import { getTransactions } from "@/app/actions/transaction";
import TransactionsClient from "./TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const transactions = await getTransactions();

  // 轉換為前端需要的格式
  const formattedData = transactions.map(tx => {
    const d = new Date(tx.date);
    // YYYY-MM-DD format for grouping
    const dateStr = d.toISOString().split("T")[0];

    return {
      id: tx.id,
      icon: tx.category.icon || "📦",
      name: tx.category.name,
      category: tx.category.name,
      amount: tx.amount,
      member: tx.user?.name || "未知",
      avatar: (tx.user?.name || "U")[0].toUpperCase(),
      date: dateStr,
      type: tx.type,
    };
  });

  return <TransactionsClient initialData={formattedData} />;
}
