"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Loader2, AlertCircle } from "lucide-react";

export function GantiPasswordForm({ nama, tujuan }: { nama: string; tujuan: string }) {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (p1.length < 8) return setError("Kata sandi minimal 8 karakter.");
    if (p1 !== p2) return setError("Konfirmasi kata sandi tidak sama.");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: p1,
      data: { must_change_password: false },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.replace(tujuan);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted">
        Masuk sebagai <strong>{nama}</strong>
      </p>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold" htmlFor="p1">Kata sandi baru</label>
        <input
          id="p1"
          type="password"
          autoComplete="new-password"
          required
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          placeholder="minimal 8 karakter"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold" htmlFor="p2">Ulangi kata sandi</label>
        <input
          id="p2"
          type="password"
          autoComplete="new-password"
          required
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          placeholder="ketik ulang"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-bold text-brand-fg disabled:opacity-60"
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : <KeyRound className="size-5" />}
        Simpan kata sandi
      </button>
    </form>
  );
}
