import { requireUser } from "@/lib/auth";
import { BerandaClient } from "./beranda-client";

export default async function BerandaPage() {
  const user = await requireUser();
  return <BerandaClient nama={user.nama ?? user.email ?? "Pegawai"} />;
}
