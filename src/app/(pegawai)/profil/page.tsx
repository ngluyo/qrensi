import Link from "next/link";
import { ScanFace, LogOut, ChevronRight, FileText, KeyRound } from "lucide-react";
import { NotifToggle } from "@/components/notif-toggle";

const menu = [
  { label: "Izin & Sanggahan", desc: "Ajukan izin/sakit/cuti/dinas", icon: FileText, href: "/izin" },
  { label: "Ganti kata sandi", desc: "Perbarui kata sandi akun", icon: KeyRound, href: "/ganti-password" },
  { label: "Enrollment wajah", desc: "Daftarkan / perbarui wajah", icon: ScanFace, href: null },
];

export default function ProfilPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Profil</h1>
      </header>

      <div className="flex items-center gap-4 rounded-2xl bg-brand p-5 text-brand-fg shadow-[var(--shadow-md)]">
        <div className="grid size-14 place-items-center rounded-full bg-white/15 text-xl font-bold">
          B
        </div>
        <div>
          <div className="text-lg font-bold">Budi Santoso</div>
          <div className="text-xs opacity-70 tabular">NIP 1987… · Unit Metrologi Legal</div>
        </div>
      </div>

      <div className="space-y-2">
        {menu.map((m) => {
          const inner = (
            <>
              <div className="grid size-10 place-items-center rounded-xl bg-surface-2 text-muted">
                <m.icon className="size-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{m.label}</div>
                <div className="text-xs text-muted">{m.desc}</div>
              </div>
              <ChevronRight className="size-5 text-muted" />
            </>
          );
          const cls = "pressable flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left shadow-[var(--shadow-sm)]";
          return m.href ? (
            <Link key={m.label} href={m.href} className={cls}>{inner}</Link>
          ) : (
            <button key={m.label} className={cls}>{inner}</button>
          );
        })}
        <NotifToggle />
        <form action="/logout" method="post">
          <button className="pressable flex w-full items-center gap-3 rounded-2xl bg-danger-soft p-4 text-left text-danger">
            <div className="grid size-10 place-items-center rounded-xl bg-danger/10">
              <LogOut className="size-5" />
            </div>
            <span className="flex-1 font-semibold">Keluar</span>
          </button>
        </form>
      </div>
      <p className="text-center text-xs text-muted">Login &amp; enrollment aktif setelah wiring Supabase Auth.</p>
    </div>
  );
}
