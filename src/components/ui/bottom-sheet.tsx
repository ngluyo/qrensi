"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

/**
 * Bottom sheet ala native: muncul dari bawah, bisa ditarik untuk menutup,
 * backdrop gelap, menghormati safe-area. (docs/DESIGN.md §3)
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  // Kunci scroll latar saat sheet terbuka.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] bg-surface pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-[var(--shadow-lg)]"
          >
            {/* Pegangan tarik */}
            <div className="sticky top-0 z-10 flex flex-col items-center bg-surface pt-2.5">
              <span className="h-1.5 w-10 rounded-full bg-border" />
              {title && <h2 className="w-full px-5 pb-3 pt-3 text-base font-extrabold">{title}</h2>}
            </div>
            <div className="px-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
