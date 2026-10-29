import type { HeroStats } from "@/types";

type HeroProps = {
  onScrollTo: (id: string) => void;
  stats?: HeroStats | null;
  loading?: boolean;
};

export default function Hero({ onScrollTo, stats, loading }: HeroProps) {
  return (
    <section id="nosotros" className="relative min-h-[92vh] flex items-center overflow-hidden pt-20">
      {/* IMAGEN DE FONDO */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1920&h=1200&fit=crop&auto=format)",
        }}
      />
      {/* OVERLAY CON GRADIENTE EDITORIAL */}
      <div className="hero-overlay" />

      {/* CONTENIDO PRINCIPAL */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-12 items-center w-full">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/25 border border-rust/30 text-rust text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-xs">
            <span>✨</span> Salón & Barbería Exclusiva · Desde 1987
          </div>

          <h1 className="hero-title">
            El Arte del
            <br />
            <em className="text-rust not-italic underline decoration-gold/60 decoration-wavy decoration-2">
              Buen Corte
            </em>
          </h1>

          <p className="copy text-lg max-w-xl mb-10 text-charcoal/85 font-normal leading-relaxed">
            Fusionamos la maestría de la barbería tradicional con técnicas de vanguardia en colorimetría, keratina y tratamientos capilares. Cada visita está diseñada para resaltar tu mejor versión.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => onScrollTo("reservar")}
              className="btn btn-primary px-8 py-4 text-sm font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              Reservar Turno
            </button>
            <button
              onClick={() => onScrollTo("servicios")}
              className="btn btn-outline px-8 py-4 text-sm font-bold bg-white/60 backdrop-blur-xs hover:bg-white"
            >
              Explorar Servicios
            </button>
          </div>
        </div>

        {/* MÉTRICAS VIVAS DE POSTGRESQL */}
        <div className="lg:col-span-5 flex flex-col gap-4 items-start lg:items-end">
          {/* TARJETA 1 */}
          <div className="stat-card stat-cream w-full sm:w-72 border border-gold/40 shadow-soft">
            <div className="flex items-center justify-between mb-1">
              <p className="stat-value text-3xl font-extrabold text-rust">
                {loading ? "..." : (stats?.clientesSatisfechos ?? "+2500")}
              </p>
              <span className="text-xl">👥</span>
            </div>
            <p className="stat-label text-xs font-semibold text-charcoal/70 uppercase tracking-wider">
              Clientes Satisfechos
            </p>
          </div>

          {/* TARJETA 2 */}
          <div className="stat-card stat-bone w-full sm:w-72 border border-gold/40 shadow-soft">
            <div className="flex items-center justify-between mb-1">
              <p className="stat-value text-3xl font-extrabold text-rust">
                {loading ? "..." : (stats?.aniosExperiencia ?? "37")}
              </p>
              <span className="text-xl">🏆</span>
            </div>
            <p className="stat-label text-xs font-semibold text-charcoal/70 uppercase tracking-wider">
              Años de Experiencia
            </p>
          </div>

          {/* TARJETA 3 */}
          <div className="stat-card stat-cream w-full sm:w-72 border border-gold/40 shadow-soft">
            <div className="flex items-center justify-between mb-1">
              <p className="stat-value text-3xl font-extrabold text-rust">
                {loading ? "..." : (stats?.valoracionPromedio ?? "5.0 ★")}
              </p>
              <span className="text-xl">⭐</span>
            </div>
            <p className="stat-label text-xs font-semibold text-charcoal/70 uppercase tracking-wider">
              Valoración en Reseñas
            </p>
          </div>
        </div>
      </div>

      {/* INDICADOR DE SCROLL */}
      <div
        onClick={() => onScrollTo("servicios")}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-charcoal/50 hover:text-rust transition-colors cursor-pointer animate-bounce flex flex-col items-center gap-1"
      >
        <span className="text-[10px] uppercase font-bold tracking-widest">Explorar</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  );
}
