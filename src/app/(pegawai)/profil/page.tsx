import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { NotifToggle } from "@/components/notif-toggle";
import { Avatar } from "@/components/ui/avatar";
import { signedAvatar } from "@/lib/avatar";
import { ScanFace, LogOut, ChevronRight, FileText, KeyRound, UserPen } from "lucide-react";

export default async function ProfilPage() {
  const user = await requireUser("/profil");
  const db = createAdminClient();

  const { data: peg } = user.pegawaiId
    ? await db
        .from("pegawai")
        .select("nama, nip, jabatan, foto_path, unit_kerja(nama)")
        .eq("id", user.pegawaiId)
        .maybeSingle()
    : { data: null };

  const enrolled = user.pegawaiId
    ? !!(await db.from("pegawai_face_enrollment").select("pegawai_id").eq("pegawai_id", user.pegawaiId).maybeSingle()).data
    : false;

  const nama = (peg?.nama as string) ?? user.nama ?? "Pegawai";
  const fotoUrl = await signedAvatar(db, peg?.foto_path as string | null);
  const unit = (peg?.unit_kerja as unknown as { nama: string } | null)?.nama;

  const menu = [
    { label: "Edit profil", desc: "Nomor HP, email kontak, alamat", icon: UserPen, href: "/profil/edit" },
    { label: "Izin & Sanggahan", desc: "Ajukan izin/sakit/cuti/dinas", icon: FileText, href: "/izin" },
    { label: "Ganti kata sandi", desc: "Perbarui kata sandi akun", icon: KeyRound, href: "/ganti-password" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Profil</h1>
      </header>

      <div className="flex items-center gap-4 rounded-2xl bg-brand p-5 text-brand-fg shadow-[var(--shadow-md)]">
        <Avatar nama={nama} src={fotoUrl} size={56} className="bg-white/15 text-brand-fg" />
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{nama}</div>
          <div className="tabular truncate text-xs opacity-70">
            {(peg?.nip as string) ?? "NIP belum diisi"}
            {unit ? ` · ${unit}` : ""}
          </div>
          <span className="mt-1 inline-block rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
            {enrolled ? "Wajah terdaftar" : "Wajah belum terdaftar"}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {menu.map((m) => (
          <Link
            key={m.label}
            href={m.href}
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
          </Link>
        ))}

        {!enrolled && (
          <div className="flex items-center gap-3 rounded-2xl bg-warning-soft p-4 text-warning">
            <ScanFace className="size-5 shrink-0" />
            <p className="text-xs font-medium">
              Wajah Anda belum terdaftar. Hubungi admin kepegawaian unit Anda untuk enrollment.
            </p>
          </div>
        )}

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
    </div>
  );
}
