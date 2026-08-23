import { requireSuperAdmin } from "@/lib/auth";
import { getPengaturan, getLogoUrl } from "@/lib/pengaturan";
import { PengaturanForm } from "./pengaturan-form";

export default async function PengaturanPage() {
  await requireSuperAdmin();
  const p = await getPengaturan();
  const logoUrl = await getLogoUrl(p.logoPath);

  return <PengaturanForm awal={p} logoUrl={logoUrl} />;
}
