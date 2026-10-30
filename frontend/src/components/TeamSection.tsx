import type { StaffMember } from "@/types";

type TeamSectionProps = {
  staff: StaffMember[];
  loading?: boolean;
  error?: string | null;
};

export default function TeamSection({ staff, loading, error }: TeamSectionProps) {
  const barbers = staff.filter((s) => s.gender === "M");
  const stylists = staff.filter((s) => s.gender === "F");

  return (
    <section id="equipo" className="section-cream relative border-t border-gold/30">
      <div className="container-app">
        <div className="mb-14">
          <span className="eyebrow">Maestros del Oficio</span>
          <h2 className="section-title">Nuestros Especialistas</h2>
          <p className="copy max-w-xl mt-3 text-sm">
            Un equipo multidisciplinario altamente capacitado en las técnicas más avanzadas de estilismo, visagismo, corte clásico a navaja y diseño de imagen.
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl overflow-hidden border border-gold/30 shadow-soft animate-pulse"
              >
                <div className="h-72 bg-bone/70" />
                <div className="p-5 space-y-2">
                  <div className="h-5 bg-bone/80 rounded w-2/3" />
                  <div className="h-4 bg-bone/60 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-center max-w-md mx-auto shadow-sm">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* EQUIPO DE BARBERÍA */}
            {barbers.length > 0 && (
              <div>
                <p className="group-label">♂ Maestros Barberos & Fade Specialist</p>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
                  {barbers.map((b) => (
                    <div
                      key={b.name}
                      className="group card bg-white rounded-2xl overflow-hidden border border-gold/30 hover:border-rust shadow-soft transition-all duration-300"
                    >
                      <div className="relative h-72 overflow-hidden bg-bone">
                        <img
                          src={b.img}
                          alt={b.name}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-70" />
                        <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full text-rust border border-rust/20 shadow-xs">
                          {b.exp} exp
                        </span>
                      </div>
                      <div className="p-6">
                        <h3 className="card-title text-lg font-bold text-charcoal group-hover:text-rust transition-colors mb-1">
                          {b.name}
                        </h3>
                        <p className="text-rust text-xs font-bold uppercase tracking-wider mb-2">
                          {b.role}
                        </p>
                        <p className="text-xs text-charcoal/70 leading-relaxed">
                          Especialista en degradados milimétricos, arreglo de barba tradicional con toalla caliente y perfilado a navaja.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EQUIPO DE PELUQUERÍA & BELLEZA */}
            {stylists.length > 0 && (
              <div>
                <p className="group-label">♀ Estilistas, Coloristas & Nail Care</p>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
                  {stylists.map((b) => (
                    <div
                      key={b.name}
                      className="group card bg-white rounded-2xl overflow-hidden border border-gold/30 hover:border-rust shadow-soft transition-all duration-300"
                    >
                      <div className="relative h-72 overflow-hidden bg-bone">
                        <img
                          src={b.img}
                          alt={b.name}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-70" />
                        <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full text-rust border border-rust/20 shadow-xs">
                          {b.exp} exp
                        </span>
                      </div>
                      <div className="p-6">
                        <h3 className="card-title text-lg font-bold text-charcoal group-hover:text-rust transition-colors mb-1">
                          {b.name}
                        </h3>
                        <p className="text-rust text-xs font-bold uppercase tracking-wider mb-2">
                          {b.role}
                        </p>
                        <p className="text-xs text-charcoal/70 leading-relaxed">
                          Especialista en colorimetría de precisión, balayage, keratinas alisadoras y cuidado profesional de manos y pies.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
