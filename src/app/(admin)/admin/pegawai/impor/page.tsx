import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { scopeUnits } from "@/lib/izin";
import { ImporClient } from "./impor-client";
import { ArrowLeft } from "lucide-react";

export default async function ImporPage() {
  const user = await requireAdmin();
  const db = createAdminClient();
  const lingkup = scopeUnits(user);

  let unitQ = db.from("unit_kerja").select("nama").eq("instansi_id", user.instansiId).order("nama");
  if (lingkup) unitQ = unitQ.in("id", lingkup.length ? lingkup : ["-"]);
  const [{ data: units }, { data: pola }] = await Promise.all([
    unitQ,
    db.from("pola_hari_kerja").select("nama").eq("instansi_id", user.instansiId).order("nama"),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/pegawai" className="pressable grid size-9 place-items-center rounded-xl bg-surface shadow-[var(--shadow-sm)]">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Impor Pegawai</h1>
          <p className="text-sm text-muted">Tambah banyak pegawai sekaligus dari berkas CSV.</p>
        </div>
      </header>

      <ImporClient
        daftarUnit={(units ?? []).map((u) => u.nama as string)}
        daftarPola={(pola ?? []).map((p) => p.nama as string)}
      />
    </div>
  );
}
