import { NAV_LINKS } from "@/data/constants";

type MobileMenuProps = {
  open: boolean;
  onNavClick: (id: string) => void;
};

export default function MobileMenu({ open, onNavClick }: MobileMenuProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-cream/98 backdrop-blur-xl flex flex-col justify-between p-8 pt-28 lg:hidden animate-in fade-in duration-200">
      <div className="flex flex-col gap-6 text-center">
        {NAV_LINKS.map((l) => (
          <button
            key={l}
            onClick={() => onNavClick(l.toLowerCase())}
            className="mobile-link text-2xl font-bold tracking-tight hover:text-rust transition-colors py-2 border-b border-gold/20"
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-4 text-center">
        <button
          onClick={() => onNavClick("reservar")}
          className="btn btn-primary w-full py-4 text-sm font-bold shadow-md"
        >
          Reservar Turno Ahora
        </button>
        <p className="text-xs text-charcoal/60">
          Av. Corrientes 1234 · Abierto Lun a Sáb 9:00 a 20:00
        </p>
      </div>
    </div>
  );
}
