const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="footer bg-charcoal text-cream pt-16 pb-12 border-t border-gold/30">
      <div className="container-app grid md:grid-cols-4 gap-12 mb-12">
        {/* COLUMNA 1: MARCA */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💈</span>
            <div>
              <span className="font-display text-2xl font-bold tracking-tight text-white block">
                Peluquería Yohana
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-gold-light font-bold">
                Salón & Barbería Tradicional
              </span>
            </div>
          </div>
          <p className="text-cream/70 text-sm leading-relaxed max-w-sm">
            Desde 1987 ofreciendo servicios integrales de barbería, peluquería, colorimetría y estética para toda la familia con los más altos estándares de calidad y calidez.
          </p>
        </div>

        {/* COLUMNA 2: HORARIOS */}
        <div>
          <h4 className="footer-heading">Horarios de Salón</h4>
          <ul className="space-y-2 text-sm text-cream/75">
            <li className="flex justify-between">
              <span>Lunes a Viernes:</span>
              <strong className="text-white">9:00 – 20:00</strong>
            </li>
            <li className="flex justify-between">
              <span>Sábados:</span>
              <strong className="text-white">9:00 – 19:00</strong>
            </li>
            <li className="flex justify-between text-cream/40">
              <span>Domingos y Feriados:</span>
              <span>Cerrado</span>
            </li>
          </ul>
        </div>

        {/* COLUMNA 3: CONTACTO */}
        <div>
          <h4 className="footer-heading">Contacto Directo</h4>
          <ul className="space-y-2.5 text-sm text-cream/75">
            <li className="flex items-center gap-2">
              <span>📍</span>
              <span>Av. Corrientes 1234, CABA</span>
            </li>
            <li className="flex items-center gap-2">
              <span>📞</span>
              <span>+54 11 4567-8901</span>
            </li>
            <li className="flex items-center gap-2">
              <span>✉️</span>
              <span>contacto@peluqueriayohana.com</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-app pt-8 border-t border-cream/10 flex flex-col sm:flex-row items-center justify-between text-xs text-cream/50 gap-4">
        <p>© {CURRENT_YEAR} Peluquería Yohana. Todos los derechos reservados.</p>
        <p className="flex items-center gap-1">
          <span>Diseñado con pasión · Integración en tiempo real con PostgreSQL</span>
        </p>
      </div>
    </footer>
  );
}
