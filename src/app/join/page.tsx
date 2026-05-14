import { Suspense } from "react";
import JoinClient from "./JoinClient";

export const dynamic = "force-dynamic";

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-main)" }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinClient />
    </Suspense>
  );
}
