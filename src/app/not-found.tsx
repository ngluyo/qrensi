import Link from "next/link";
import { MapPinOff, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-surface-2 text-muted">
        <MapPinOff className="size-8" />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Halaman tidak ditemukan</h1>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Alamat yang Anda buka tidak ada atau Anda tidak punya akses ke sana.
      </p>
      <Link
        href="/beranda"
        className="pressable mt-6 flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-fg"
      >
        <Home className="size-5" /> Kembali ke beranda
      </Link>
    </main>
  );
}
