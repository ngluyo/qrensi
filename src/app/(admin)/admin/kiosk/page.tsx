import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { KioskManager } from "./kiosk-manager";

export default async function KioskPage() {
  const user = await requireAdmin();
  const db = createAdminClient();

  const [{ data: kiosks }, { data: units }] = await Promise.all([
    db
      .from("perangkat_kiosk")
      .select("id, nama_perangkat, latitude, longitude, aktif, device_instance_id, unit_kerja(nama)")
      .eq("instansi_id", user.instansiId)
      .order("nama_perangkat"),
    db.from("unit_kerja").select("id, nama").eq("instansi_id", user.instansiId).order("nama"),
  ]);

  return (
    <KioskManager
      kiosks={(kiosks ?? []) as never}
      units={units ?? []}
    />
  );
}
