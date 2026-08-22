import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { EditProfilForm } from "./edit-profil-form";
import { FotoProfil } from "./foto-profil";
import { signedAvatar } from "@/lib/avatar";
import { ArrowLeft, Lock } from "lucide-react";

export default async function EditProfilPage() {
  const user = await requireUser("/profil/edit");
  const db = createAdminClient();

  const { data: peg } = user.pegawaiId
    ? await db
        .from("pegawai")
        .select("nama, nip, jabatan, no_hp, email_kontak, alamat, foto_path, unit_kerja(nama), pola_hari_kerja(nama)")
        .eq("id", user.pegawaiId)
        .maybeSingle()
    : { data: null };

  const fotoUrl = await signedAvatar(db, peg?.foto_path as string | null);

  const kepegawaian = [
    { label: "Nama", nilai: (peg?.nama as string) ?? "—" },
    { label: "NIP", nilai: (peg?.nip as string) ?? "—" },
    { label: "Jabatan", nilai: (peg?.jabatan as string) ?? "—" },
    { label: "Unit kerja", nilai: (peg?.unit_kerja as unknown as { nama: string } | null)?.nama ?? "—" },
    { label: "Pola hari kerja", nilai: (peg?.pola_hari_kerja as unknown as { nama: string } | null)?.nama ?? "—" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link href="/profil" className="pressable grid size-9 place-items-center rounded-xl bg-surface shadow-[var(--shadow-sm)]">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Edit Profil</h1>
          <p className="text-xs text-muted">Perbarui data kontak pribadi Anda.</p>
        </div>
      </header>

      <FotoProfil nama={(peg?.nama as string) ?? "Pegawai"} src={fotoUrl} />

      <EditProfilForm
        awal={{
          no_hp: (peg?.no_hp as string) ?? "",
          email_kontak: (peg?.email_kontak as string) ?? "",
          alamat: (peg?.alamat as string) ?? "",
        }}
      />

      {/* Data kepegawaian: hanya baca */}
      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Lock className="size-4 text-muted" /> Data kepegawaian
        </h2>
        <p className="mt-1 text-xs text-muted">
          Hanya dapat diubah oleh admin kepegawaian karena memengaruhi perhitungan presensi &amp;
          tunjangan. Ajukan lewat menu Izin &amp; Sanggahan bila ada yang keliru.
        </p>
        <dl className="mt-3 space-y-2">
          {kepegawaian.map((k) => (
            <div key={k.label} className="flex items-start justify-between gap-3 text-sm">
              <dt className="text-muted">{k.label}</dt>
              <dd className="max-w-[60%] text-right font-medium">{k.nilai}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
