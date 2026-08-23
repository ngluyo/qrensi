import { getPengaturan } from "@/lib/pengaturan";
import KioskView from "./kiosk-view";

export default async function KioskTampilanPage() {
  const p = await getPengaturan();
  return <KioskView namaAplikasi={p.namaAplikasi} namaOrganisasi={p.namaOrganisasi} />;
}
