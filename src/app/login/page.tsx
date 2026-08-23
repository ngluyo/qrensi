import { getPengaturan } from "@/lib/pengaturan";
import { LoginView } from "./login-view";

export default async function LoginPage() {
  const p = await getPengaturan();
  return <LoginView namaAplikasi={p.namaAplikasi} namaOrganisasi={p.namaOrganisasi} />;
}
