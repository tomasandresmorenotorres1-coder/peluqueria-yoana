import type { GalleryItem } from "@/types";

type GallerySectionProps = {
  gallery?: GalleryItem[];
  loading?: boolean;
};

export default function GallerySection({ gallery = [], loading }: GallerySectionProps) {
  if (loading) {
    return (
      <section id="galería" className="section-cream">
        <div className="container-app py-16 text-center muted">
          <div className="inline-block animate-spin text-3xl mb-3">🖼️</div>
          <p className="text-sm font-semibold">Cargando portafolio de trabajos desde la base de datos...</p>
        </div>
      </section>
    );
  }

  if (gallery.length === 0) {
    return null;
  }

  const firstItem = gallery[0];
  const otherItems = gallery.slice(1);

  return (
    <section id="galeria" className="section-cream relative">
      <div className="container-app">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="eyebrow">Portafolio & Resultados</span>
            <h2 className="section-title">Galería de Trabajos</h2>
            <p className="copy max-w-lg mt-3 text-sm">
              Una muestra de la dedicación, precisión y técnica que aplicamos en cada corte, afeitado y peinado.
            </p>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-rust">
            📸 Trabajos 100% Reales
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ gridTemplateRows: "280px 280px" }}>
          {firstItem && (
            <div className={`media-frame rounded-2xl relative overflow-hidden group shadow-soft ${firstItem.span || "row-span-2"}`}>
              <img
                src={firstItem.img}
                alt={firstItem.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                <span className="text-white text-xs font-bold">{firstItem.alt}</span>
              </div>
            </div>
          )}
          {otherItems.map((g, i) => (
            <div
              key={g.id ?? i}
              className={`media-frame rounded-2xl relative overflow-hidden group shadow-soft ${g.span || ""}`}
            >
              <img
                src={g.img}
                alt={g.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                <span className="text-white text-xs font-bold">{g.alt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
