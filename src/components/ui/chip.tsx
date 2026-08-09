import { TONE_CLASS } from "@/lib/status-presensi";

export function Chip({
  tone = "muted",
  children,
  className = "",
}: {
  tone?: "success" | "warning" | "info" | "danger" | "muted";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
