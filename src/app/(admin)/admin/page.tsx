import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { CalendarRange, Clock, Users, Percent, ArrowRight } from "lucide-react";

export default async function AdminHome() {
  const user = await requireAdmin();
  const db = createAdminClient();

  const [pola, jam, peg, pot] = await Promise.all([
    db.from("pola_hari_kerja").select("id", { count: "exact", head: true }).eq("instansi_id", user.instansiId),
    db.from("jam_kerja_sesi").select("id", { count: "exact", head: true }).eq("instansi_id", user.instansiId),
    db.from("pegawai").select("id", { count: "exact", head: true }).eq("instansi_id", user.instansiId),
    db.from("pengaturan_potongan").select("id", { count: "exact", head: true }).eq("instansi_id", user.instansiId),
  ]);

  const stat = [
    { label: "Pola hari kerja", nilai: pola.count ?? 0, href: "/admin/pola-hari-kerja", icon: CalendarRange },
    { label: "Baris jam kerja", nilai: jam.count ?? 0, href: "/admin/jam-kerja", icon: Clock },
    { label: "Pegawai", nilai: peg.count ?? 0, href: "/admin/pegawai", icon: Users },
    { label: "Aturan potongan", nilai: pot.count ?? 0, href: "/admin/potongan", icon: Percent },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Ringkasan konfigurasi instansi.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {stat.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="pressable group rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <s.icon className="size-5" />
              </div>
              <ArrowRight className="size-4 text-muted opacity-0 transition group-hover:opacity-100" />
            </div>
            <div className="tabular mt-3 text-3xl font-extrabold leading-none">{s.nilai}</div>
            <div className="mt-1 text-xs text-muted">{s.label}</div>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted">
        Fase 0 fokus pada <strong>Pola Hari Kerja</strong> &amp; <strong>Jam Kerja</strong>. Modul
        Pegawai, Kiosk, Potongan, Audit menyusul.
      </p>
    </div>
  );
}
