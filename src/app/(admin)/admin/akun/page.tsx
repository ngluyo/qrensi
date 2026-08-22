import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { KeyRound, ChevronRight, LogOut, ShieldCheck } from "lucide-react";

export default async function AkunAdminPage() {
  const user = await requireAdmin();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Akun Saya</h1>
        <p className="mt-1 text-sm text-muted">Kelola kredensial akun Anda.</p>
      </header>

      <div className="flex items-center gap-4 rounded-2xl bg-brand p-5 text-brand-fg shadow-[var(--shadow-md)]">
        <div className="grid size-14 place-items-center rounded-full bg-white/15 text-xl font-bold">
          {(user.nama ?? user.email ?? "A").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{user.nama ?? "Administrator"}</div>
          <div className="truncate text-xs opacity-70">{user.email}</div>
          <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
            <ShieldCheck className="size-3" />
            {user.peran === "super_admin" ? "Super Admin" : "Admin Unit"}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Link
          href="/ganti-password"
          className="pressable flex w-full items-center gap-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-surface-2 text-muted">
            <KeyRound className="size-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">Ganti kata sandi</div>
            <div className="text-xs text-muted">Perbarui kata sandi akun Anda</div>
          </div>
          <ChevronRight className="size-5 text-muted" />
        </Link>

        <form action="/logout" method="post">
          <button className="pressable flex w-full items-center gap-3 rounded-2xl bg-danger-soft p-4 text-left text-danger">
            <div className="grid size-10 place-items-center rounded-xl bg-danger/10">
              <LogOut className="size-5" />
            </div>
            <span className="flex-1 font-semibold">Keluar</span>
          </button>
        </form>
      </div>
    </div>
  );
}
