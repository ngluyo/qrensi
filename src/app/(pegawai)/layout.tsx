import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { requireUser } from "@/lib/auth";

export default async function PegawaiLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg">
      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
