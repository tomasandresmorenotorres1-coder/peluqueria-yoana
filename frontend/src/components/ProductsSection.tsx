import type { Product, ProductTab } from "@/types";

type ProductsSectionProps = {
  products: Product[];
  loading?: boolean;
  error?: string | null;
  productTab: ProductTab;
  onTabChange: (tab: ProductTab) => void;
  totalItems: number;
  onCartOpen: () => void;
  onAddToCart: (product: Product) => void;
};

export default function ProductsSection({
  products,
  loading,
  error,
  productTab,
  onTabChange,
  totalItems,
  onCartOpen,
  onAddToCart,
}: ProductsSectionProps) {
  const filteredProducts = products.filter(
    (p) => productTab === "todos" || p.category === productTab
  );

  return (
    <section id="productos" className="section-bone relative">
      <div className="container-app">
        {/* ENCABEZADO Y BOTÓN VER CARRITO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <span className="eyebrow">Cuidado Profesional en Casa</span>
            <h2 className="section-title">Productos Exclusivos</h2>
            <p className="copy max-w-lg mt-3 text-sm">
              Las mejores marcas profesionales utilizadas en nuestro salón: ceras, aceites orgánicos para barba, pomadas y tratamientos intensivos.
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* TABS DE PRODUCTO */}
            <div className="flex gap-2 bg-white/70 p-1.5 rounded-full border border-charcoal/10 shadow-xs">
              {(["todos", "hombre", "mujer"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onTabChange(t)}
                  className={`tab ${productTab === t ? "tab-active" : "tab-idle"}`}
                >
                  {t === "todos" ? "Todos" : t === "hombre" ? "♂ Barbería" : "♀ Damas"}
                </button>
              ))}
            </div>

            {totalItems > 0 && (
              <button
                onClick={onCartOpen}
                className="btn btn-primary btn-md rounded-full shadow-md flex items-center gap-2"
              >
                <span>🛒</span>
                <span>Carrito ({totalItems})</span>
              </button>
            )}
          </div>
        </div>

        {/* ESTADOS DE CARGA (SKELETONS) */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl overflow-hidden border border-gold/30 shadow-soft animate-pulse"
              >
                <div className="h-56 bg-bone/70" />
                <div className="p-6 space-y-3">
                  <div className="h-3 bg-bone/60 rounded w-1/4" />
                  <div className="h-5 bg-bone/80 rounded w-3/4" />
                  <div className="h-6 bg-bone/90 rounded w-1/3 pt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-center max-w-xl mx-auto shadow-sm">
            <span className="text-3xl block mb-2">⚠️</span>
            <p className="font-semibold text-sm">{error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-charcoal/20 max-w-md mx-auto p-8">
            <span className="text-4xl block mb-3">📦</span>
            <p className="font-semibold text-charcoal">No hay productos en esta categoría</p>
          </div>
        ) : (
          /* GRID DE PRODUCTOS */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="group card bg-white rounded-2xl overflow-hidden border border-gold/30 hover:border-rust shadow-soft hover:shadow-soft-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative h-60 overflow-hidden bg-bone/60">
                  <img
                    src={p.img}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  {p.tag && (
                    <span
                      className={`tag absolute top-3 left-3 shadow-md ${
                        p.tag === "Bestseller"
                          ? "bg-amber-500 text-white"
                          : p.tag === "Nuevo"
                          ? "bg-emerald-600 text-white"
                          : p.tag === "Premium"
                          ? "bg-charcoal text-gold-light"
                          : "bg-rust text-white"
                      }`}
                    >
                      {p.tag}
                    </span>
                  )}
                  {p.stock !== undefined && (
                    <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded-full text-charcoal/80 border border-charcoal/10 shadow-xs">
                      Stock: {p.stock}
                    </span>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-rust mb-1">
                      {p.brand}
                    </p>
                    <h3 className="card-title text-lg font-bold mb-2 group-hover:text-rust transition-colors">
                      {p.name}
                    </h3>
                    {p.desc && (
                      <p className="copy text-xs text-charcoal/70 line-clamp-2 mb-4">
                        {p.desc}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-charcoal/10 mt-auto">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal/50 block">Precio</span>
                      <span className="price text-xl font-extrabold text-rust">
                        ${Number(p.price).toLocaleString("es-CO")}
                      </span>
                    </div>
                    <button
                      onClick={() => onAddToCart(p)}
                      className="btn btn-primary btn-sm rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Agregar</span>
                      <span>+</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
