import { redirect } from "next/navigation";
import { getSesiUser } from "@/lib/auth";
import { GantiPasswordForm } from "./ganti-password-form";

export default async function GantiPasswordPage() {
  const user = await getSesiUser();
  if (!user) redirect("/login?next=/ganti-password");

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Ganti Kata Sandi</h1>
          <p className="mt-1 text-sm text-muted">
            {user.mustChangePassword
              ? "Kata sandi sementara wajib diganti sebelum melanjutkan."
              : "Perbarui kata sandi akun Anda."}
          </p>
        </div>
        <GantiPasswordForm
          nama={user.nama ?? user.email ?? "Pegawai"}
          tujuan={user.peran ? "/admin" : "/beranda"}
        />
      </div>
    </main>
  );
}
