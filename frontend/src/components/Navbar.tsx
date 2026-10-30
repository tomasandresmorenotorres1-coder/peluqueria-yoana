import { useState, useEffect } from "react";
import { NAV_LINKS } from "@/data/constants";

type NavbarProps = {
  totalItems: number;
  activeSection?: string;
  onCartClick: () => void;
  onToggleMobileMenu: () => void;
  onNavClick: (id: string) => void;
};

export default function Navbar({
  totalItems,
  onCartClick,
  onToggleMobileMenu,
  onNavClick,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 flex items-center justify-between ${
        scrolled
          ? "bg-cream/95 backdrop-blur-md shadow-md border-b border-gold/40 py-3"
          : "bg-cream/80 backdrop-blur-sm border-b border-gold/20"
      }`}
    >
      {/* LOGO */}
      <div
        onClick={() => onNavClick("nosotros")}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <span className="text-2xl transform group-hover:rotate-12 transition-transform duration-300">
          💈
        </span>
        <div>
          <span className="brand text-xl font-bold tracking-tight block leading-none">
            Peluquería Yohana
          </span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-rust font-bold">
            Estilismo & Barbería
          </span>
        </div>
      </div>

      {/* ENLACES DESKTOP */}
      <ul className="hidden lg:flex items-center gap-8">
        {NAV_LINKS.map((link) => {
          const targetId = link.toLowerCase();
          return (
            <li key={link}>
              <button
                onClick={() => onNavClick(targetId)}
                className="nav-link text-sm font-semibold hover:text-rust transition-colors"
              >
                {link}
              </button>
            </li>
          );
        })}
      </ul>

      {/* ACCIONES (CARRITO & BOTÓN RESERVA) */}
      <div className="flex items-center gap-4">
        {/* BOTÓN RESERVAR DIRECTO */}
        <button
          onClick={() => onNavClick("reservar")}
          className="hidden sm:inline-flex btn btn-primary btn-sm rounded-full font-bold shadow-sm"
        >
          Pedir Cita
        </button>

        {/* BOTÓN CARRITO */}
        <button
          onClick={onCartClick}
          className="icon-btn p-2.5 rounded-full hover:bg-gold/20 transition-colors"
          aria-label="Abrir Carrito"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {totalItems > 0 && (
            <span className="cart-badge animate-pulse">{totalItems}</span>
          )}
        </button>

        {/* BOTÓN HAMBURGUESA MÓVIL */}
        <button
          className="lg:hidden p-2 text-charcoal focus:outline-none"
          onClick={onToggleMobileMenu}
          aria-label="Menú móvil"
        >
          <div className="w-6 flex flex-col gap-1.5">
            <span className="burger-line w-6" />
            <span className="burger-line w-4 self-end" />
            <span className="burger-line w-6" />
          </div>
        </button>
      </div>
    </nav>
  );
}
