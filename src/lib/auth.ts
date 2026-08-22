import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export type Peran = "super_admin" | "admin_unit";

export interface SesiUser {
  authUserId: string;
  email: string | null;
  pegawaiId: string | null;
  nama: string | null;
  instansiId: string | null;
  peran: Peran | null; // null = pegawai biasa (bukan admin)
  unitKerjaIds: string[]; // unit yang diampu (untuk admin_unit)
  mustChangePassword: boolean; // wajib ganti password (kredensial sekali pakai)
}

/** Ambil user login + profil + peran. null jika belum login. */
export async function getSesiUser(): Promise<SesiUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Bypass RLS untuk baca profil/peran secara konsisten.
  const admin = createAdminClient();
  const [{ data: peg }, { data: roles }] = await Promise.all([
    admin
      .from("pegawai")
      .select("id, nama, instansi_id")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
    admin
      .from("admin_unit_kerja")
      .select("peran, unit_kerja_id")
      .eq("auth_user_id", user.id),
  ]);

  const isSuper = roles?.some((r) => r.peran === "super_admin") ?? false;
  const peran: Peran | null = isSuper
    ? "super_admin"
    : roles && roles.length > 0
      ? "admin_unit"
      : null;

  return {
    authUserId: user.id,
    email: user.email ?? null,
    pegawaiId: peg?.id ?? null,
    nama: peg?.nama ?? null,
    instansiId: peg?.instansi_id ?? null,
    peran,
    unitKerjaIds: roles?.map((r) => r.unit_kerja_id).filter(Boolean) ?? [],
    mustChangePassword: user.user_metadata?.must_change_password === true,
  };
}

/** Wajib login sebagai admin (unit atau super). Redirect jika tidak. */
export async function requireAdmin(): Promise<SesiUser> {
  const u = await getSesiUser();
  if (!u) redirect("/login?next=/admin");
  if (u.mustChangePassword) redirect("/ganti-password");
  if (!u.peran) redirect("/login?error=bukan_admin");
  return u;
}

/** Wajib login (pegawai atau admin). */
export async function requireUser(next = "/beranda"): Promise<SesiUser> {
  const u = await getSesiUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (u.mustChangePassword) redirect("/ganti-password");
  return u;
}

/** Hanya super admin. */
export async function requireSuperAdmin(): Promise<SesiUser> {
  const u = await requireAdmin();
  if (u.peran !== "super_admin") redirect("/admin?error=butuh_super_admin");
  return u;
}
