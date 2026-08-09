/** Metadata tampilan status presensi & sesi — dipakai lintas komponen UI. */

export type StatusKey =
  | "tepat_waktu"
  | "terlambat"
  | "pulang_cepat"
  | "tidak_hadir"
  | "tidak_ada_di_kantor"
  | "ditolak_lokasi"
  | "ditolak_wajah"
  | "ditolak_di_luar_jendela"
  | "belum";

export const STATUS_META: Record<
  StatusKey,
  { label: string; tone: "success" | "warning" | "info" | "danger" | "muted" }
> = {
  tepat_waktu: { label: "Tepat waktu", tone: "success" },
  terlambat: { label: "Terlambat", tone: "warning" },
  pulang_cepat: { label: "Pulang cepat", tone: "warning" },
  tidak_ada_di_kantor: { label: "Tidak di kantor", tone: "info" },
  tidak_hadir: { label: "Alpa", tone: "danger" },
  ditolak_lokasi: { label: "Ditolak · lokasi", tone: "danger" },
  ditolak_wajah: { label: "Ditolak · wajah", tone: "danger" },
  ditolak_di_luar_jendela: { label: "Di luar jendela", tone: "danger" },
  belum: { label: "Belum absen", tone: "muted" },
};

export const TONE_CLASS: Record<string, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-danger",
  muted: "bg-surface-2 text-muted",
};
