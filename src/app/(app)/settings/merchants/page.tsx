import { getMerchants } from "@/app/actions/merchant";
import MerchantsClient from "./MerchantsClient";

export const metadata = { title: "商家管理" };

export default async function MerchantsPage() {
  const merchants = await getMerchants();
  return <MerchantsClient initialMerchants={merchants} />;
}
