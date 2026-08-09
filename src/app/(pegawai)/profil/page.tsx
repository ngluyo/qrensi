import { ScanFace, Bell, LogOut, ChevronRight } from "lucide-react";

const menu = [
  { label: "Enrollment wajah", desc: "Daftarkan / perbarui wajah", icon: ScanFace },
  { label: "Notifikasi", desc: "Pengingat sebelum sesi tutup", icon: Bell },
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
        {menu.map((m) => (
          <button
            key={m.label}
            className="pressable flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left shadow-[var(--shadow-sm)]"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-surface-2 text-muted">
              <m.icon className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{m.label}</div>
              <div className="text-xs text-muted">{m.desc}</div>
            </div>
            <ChevronRight className="size-5 text-muted" />
          </button>
        ))}
        <button className="pressable flex w-full items-center gap-3 rounded-2xl bg-danger-soft p-4 text-left text-danger">
          <div className="grid size-10 place-items-center rounded-xl bg-danger/10">
            <LogOut className="size-5" />
          </div>
          <span className="flex-1 font-semibold">Keluar</span>
        </button>
      </div>
      <p className="text-center text-xs text-muted">Login &amp; enrollment aktif setelah wiring Supabase Auth.</p>
    </div>
  );
}
