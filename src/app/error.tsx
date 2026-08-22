"use client";

import { useEffect } from "react";
import { TriangleAlert, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("QRensi error:", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-danger-soft text-danger">
        <TriangleAlert className="size-8" />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Terjadi kesalahan</h1>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Maaf, ada gangguan saat memuat halaman ini. Coba lagi; bila terus berulang, laporkan ke admin.
      </p>
      {error.digest && (
        <p className="tabular mt-2 text-[11px] text-muted">Kode: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="pressable mt-6 flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-fg"
      >
        <RotateCcw className="size-5" /> Coba lagi
      </button>
    </main>
  );
}
