import { getSystemStats } from "@/app/actions/admin";
import SystemAdminClient from "./SystemAdminClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SystemAdminPage() {
  try {
    const stats = await getSystemStats();
    return <SystemAdminClient stats={stats} />;
  } catch (error) {
    // 若拋出未授權錯誤，直接導回首頁
    redirect("/");
  }
}
