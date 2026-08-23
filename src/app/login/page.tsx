import { redirect } from "next/navigation";
import { getPengaturan } from "@/lib/pengaturan";
import { butuhSetup } from "@/lib/setup";
import { LoginView } from "./login-view";

export default async function LoginPage() {
  // Instalasi baru (belum ada admin) → arahkan ke wizard setup.
  if (await butuhSetup()) redirect("/setup");

  const p = await getPengaturan();
  return <LoginView namaAplikasi={p.namaAplikasi} namaOrganisasi={p.namaOrganisasi} />;
}
