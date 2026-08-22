/**
 * Avatar pegawai: foto profil bila ada, jika tidak pakai inisial nama.
 * `src` adalah signed URL (bucket privat) — boleh null.
 */
export function Avatar({
  nama,
  src,
  size = 40,
  className = "",
}: {
  nama: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const inisial = nama?.trim()?.charAt(0)?.toUpperCase() || "?";
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-soft font-bold text-brand ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Foto ${nama}`} className="size-full object-cover" />
      ) : (
        inisial
      )}
    </span>
  );
}
