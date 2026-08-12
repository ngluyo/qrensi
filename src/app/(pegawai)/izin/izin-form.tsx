"use client";

import { useActionState, useRef } from "react";
import { ajukanIzin, type IzinState } from "./actions";
import { Send, Loader2, CheckCircle2, Paperclip } from "lucide-react";

const init: IzinState = { ok: false };

export function IzinForm() {
  const [state, action, pending] = useActionState(ajukanIzin, init);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form setelah sukses.
  if (state.ok) formRef.current?.reset();

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Jenis</span>
          <select name="jenis" defaultValue="izin" className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25">
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
            <option value="cuti">Cuti</option>
            <option value="dinas_luar">Dinas luar</option>
            <option value="sanggahan">Sanggahan presensi</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Tanggal</span>
          <input name="tanggal" type="date" required className="tabular w-full rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted">Alasan</span>
        <textarea name="alasan" required rows={3} placeholder="Jelaskan alasan…" className="w-full resize-none rounded-xl border border-border bg-bg px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        <Paperclip className="size-4" />
        <input name="lampiran" type="file" accept="image/*,application/pdf" className="text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-semibold" />
      </label>

      {state.ok && (
        <div className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" /> Pengajuan terkirim. Menunggu keputusan admin.
        </div>
      )}
      {!state.ok && state.message && (
        <p className="rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger">{state.message}</p>
      )}

      <button disabled={pending} className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-bold text-brand-fg disabled:opacity-60">
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        Kirim pengajuan
      </button>
    </form>
  );
}
