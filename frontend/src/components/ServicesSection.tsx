import type { Service, ServiceTab } from "@/types";

type ServicesSectionProps = {
  services: Service[];
  loading?: boolean;
  error?: string | null;
  serviceTab: ServiceTab;
  onTabChange: (tab: ServiceTab) => void;
  onSelectService: (id: number) => void;
};

export default function ServicesSection({
  services,
  loading,
  error,
  serviceTab,
  onTabChange,
  onSelectService,
}: ServicesSectionProps) {
  const filteredServices = services.filter(
    (s) => serviceTab === "todos" || s.category === serviceTab
  );

  return (
    <section id="servicios" className="section-cream relative">
      <div className="container-app">
        {/* ENCABEZADO Y TÍTULO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <span className="eyebrow">Catálogo Exclusivo</span>
            <h2 className="section-title">Nuestros Servicios</h2>
            <p className="copy max-w-lg mt-3 text-sm">
              Servicios profesionales personalizados para hombres, mujeres y toda la familia con productos de primeras marcas internacionales.
            </p>
          </div>

          {/* TABS DE FILTRO */}
          <div className="flex gap-2 flex-wrap items-center bg-bone/50 p-1.5 rounded-full border border-charcoal/10">
            {(["todos", "hombre", "mujer", "unisex"] as const).map((t) => (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                className={`tab ${serviceTab === t ? "tab-active" : "tab-idle"}`}
              >
                {t === "todos"
                  ? "Todos"
                  : t === "hombre"
                  ? "♂ Caballeros"
                  : t === "mujer"
                  ? "♀ Damas"
                  : "✨ Unisex"}
              </button>
            ))}
          </div>
        </div>

        {/* ESTADOS DE CARGA (SKELETONS VISUALES) */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl overflow-hidden border border-gold/30 shadow-soft animate-pulse"
              >
                <div className="h-48 bg-bone/70" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-bone/80 rounded w-1/3" />
                  <div className="h-6 bg-bone/90 rounded w-3/4" />
                  <div className="h-12 bg-bone/50 rounded w-full" />
                  <div className="h-8 bg-bone/70 rounded w-1/2 pt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-center max-w-xl mx-auto shadow-sm">
            <span className="text-3xl block mb-2">⚠️</span>
            <p className="font-semibold text-sm">{error}</p>
            <p className="text-xs text-amber-700/80 mt-1">
              Verifica que el servidor backend esté encendido en http://localhost:4000
            </p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-charcoal/20 max-w-md mx-auto p-8">
            <span className="text-4xl block mb-3">🔍</span>
            <p className="font-semibold text-charcoal">No se encontraron servicios</p>
            <p className="text-xs text-charcoal/60 mt-1">
              Intenta seleccionando otra categoría en los filtros superiores.
            </p>
          </div>
        ) : (
          /* GRID DE TARJETAS DE SERVICIOS */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map((s) => (
              <div
                key={s.id}
                className="group card bg-white rounded-2xl overflow-hidden border border-gold/30 hover:border-rust shadow-soft hover:shadow-soft-lg transition-all duration-300 flex flex-col"
              >
                {/* IMAGEN DEL SERVICIO */}
                <div className="relative h-52 overflow-hidden bg-bone">
                  <img
                    src={
                      s.img ||
                      "https://images.unsplash.com/photo-1560066984-138daaa70c8f?w=600&h=400&fit=crop&auto=format"
                    }
                    alt={s.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-80" />

                  {/* BADGES SUPERIORES */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span
                      className={`badge ${
                        s.category === "mujer"
                          ? "badge-rose font-bold shadow-sm"
                          : s.category === "hombre"
                          ? "badge-neutral font-bold shadow-sm"
                          : "badge-soft font-bold shadow-sm"
                      }`}
                    >
                      {s.category === "mujer"
                        ? "♀ Damas"
                        : s.category === "hombre"
                        ? "♂ Caballeros"
                        : "✨ Unisex"}
                    </span>

                    {/* VALORACIÓN EN ESTRELLAS DESDE BD */}
                    <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-bold text-charcoal shadow-sm">
                      <span className="text-amber-500">★</span>
                      <span>{s.rating ?? 5.0}</span>
                    </div>
                  </div>

                  {/* ICONO Y DURACIÓN EN EL PIE DE FOTO */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <span className="text-xl filter drop-shadow">{s.icon}</span>
                    <span className="inline-flex items-center gap-1 bg-charcoal/60 backdrop-blur-xs px-2.5 py-1 rounded-full">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {s.duration}
                    </span>
                  </div>
                </div>

                {/* DETALLE DEL SERVICIO */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="card-title text-xl font-bold group-hover:text-rust transition-colors">
                        {s.name}
                      </h3>
                      <span className="price text-xl font-extrabold text-rust ml-2 whitespace-nowrap">
                        ${Number(s.price).toLocaleString("es-CO")}
                      </span>
                    </div>
                    <p className="copy text-xs leading-relaxed text-charcoal/70 line-clamp-3 mb-6">
                      {s.desc}
                    </p>
                  </div>

                  {/* BOTÓN PARA RESERVAR */}
                  <button
                    onClick={() => onSelectService(s.id)}
                    className="btn btn-outline-rust w-full py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 group-hover:bg-rust group-hover:text-white transition-all shadow-xs"
                  >
                    <span>Reservar Cita</span>
                    <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
