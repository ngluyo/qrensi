"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Input kata sandi dengan tombol lihat/sembunyi (ikon mata).
 * Dipakai di semua tempat pengisian kata sandi agar user bisa memastikan
 * ketikannya benar tanpa menebak-nebak.
 */
export function PasswordInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  required,
  id: idProp,
}: {
  label?: string;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  const [tampil, setTampil] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-semibold" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={tampil ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 pr-12 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
        <button
          type="button"
          onClick={() => setTampil((v) => !v)}
          aria-label={tampil ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
          aria-pressed={tampil}
          title={tampil ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
          className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:text-text"
        >
          {tampil ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    </div>
  );
}
