import type { Comment, Service } from "@/types";

type TestimonialsSectionProps = {
  comments: Comment[];
  services: Service[];
  loading?: boolean;
  submitting?: boolean;
  commentName: string;
  commentService: string;
  commentRating: number;
  commentText: string;
  commentSent: boolean;
  errorMessage?: string | null;
  hoverRating: number;
  onNameChange: (value: string) => void;
  onServiceChange: (value: string) => void;
  onRatingChange: (value: number) => void;
  onTextChange: (value: string) => void;
  onHoverRatingChange: (value: number) => void;
  onSubmit: () => void;
  onWriteAnother: () => void;
};

export default function TestimonialsSection({
  comments,
  services,
  loading,
  submitting,
  commentName,
  commentService,
  commentRating,
  commentText,
  commentSent,
  errorMessage,
  hoverRating,
  onNameChange,
  onServiceChange,
  onRatingChange,
  onTextChange,
  onHoverRatingChange,
  onSubmit,
  onWriteAnother,
}: TestimonialsSectionProps) {
  return (
    <section id="comentarios" className="section-bone relative">
      <div className="container-app">
        <div className="mb-14">
          <span className="eyebrow">Opiniones Verificadas</span>
          <h2 className="section-title">Lo que dicen nuestros clientes</h2>
          <p className="copy max-w-xl mt-3 text-sm">
            La confianza de nuestra comunidad es nuestro mayor orgullo. Todas las reseñas provienen de clientes reales que han asistido a nuestro salón.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* LISTA DE COMENTARIOS */}
          <div className="lg:col-span-7 space-y-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white p-6 rounded-2xl border border-gold/30 shadow-soft animate-pulse space-y-3"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-bone/80" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-bone/80 rounded w-1/4" />
                        <div className="h-3 bg-bone/60 rounded w-1/6" />
                      </div>
                    </div>
                    <div className="h-4 bg-bone/50 rounded w-full" />
                    <div className="h-4 bg-bone/50 rounded w-4/5" />
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-dashed border-charcoal/20 text-center">
                <span className="text-4xl block mb-2">💬</span>
                <p className="font-bold text-charcoal">Aún no hay opiniones registradas</p>
                <p className="text-xs text-charcoal/60 mt-1">
                  ¡Sé el primero en compartir tu experiencia en el formulario!
                </p>
              </div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="card-outline bg-white p-6 rounded-2xl border border-gold/30 shadow-soft hover:shadow-soft-lg transition-all"
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="avatar w-11 h-11 rounded-full bg-gold/30 text-rust font-extrabold flex items-center justify-center shrink-0">
                      {c.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-sm text-charcoal">{c.name}</span>
                        <span className="text-charcoal/50 text-xs">{c.date}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {/* ESTRELLAS DORADAS */}
                        <div className="flex gap-0.5 text-amber-500 text-sm">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className={s <= c.rating ? "opacity-100" : "opacity-20 text-charcoal"}>
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="chip text-[11px] font-semibold bg-bone/50 border-gold/40 text-charcoal/80">
                          {c.service}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="copy text-xs leading-relaxed text-charcoal/80 pl-15">
                    "{c.text}"
                  </p>
                </div>
              ))
            )}
          </div>

          {/* FORMULARIO PARA DEJAR RESEÑA */}
          <div className="lg:col-span-5">
            <div className="panel bg-white rounded-3xl p-8 shadow-soft-lg border border-gold/40 sticky top-28">
              {commentSent ? (
                <div className="text-center py-8 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                    ✓
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-2 text-rust">
                    ¡Gracias por tu reseña!
                  </h3>
                  <p className="copy text-xs mb-6 max-w-xs mx-auto">
                    Tu opinión ha sido guardada en nuestra base de datos PostgreSQL y ya está visible para la comunidad.
                  </p>
                  <button
                    onClick={onWriteAnother}
                    className="btn btn-outline-rust btn-sm rounded-xl font-bold"
                  >
                    Escribir otra reseña
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <span className="eyebrow">Comparte tu Experiencia</span>
                    <h3 className="font-display text-2xl font-bold">Dejá tu Reseña</h3>
                  </div>

                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                      {errorMessage}
                    </div>
                  )}

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="field-label">Tu Nombre *</label>
                      <input
                        type="text"
                        value={commentName}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="Ej: Sofía Valencia"
                        className="field text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="field-label">Servicio Recibido *</label>
                      <select
                        value={commentService}
                        onChange={(e) => onServiceChange(e.target.value)}
                        className="field appearance-none cursor-pointer bg-white text-xs"
                        required
                      >
                        <option value="">Selecciona el servicio recibido...</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label">Calificación *</label>
                      <div className="flex gap-1.5 items-center bg-bone/30 p-2.5 rounded-xl border border-charcoal/10">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            type="button"
                            key={s}
                            onMouseEnter={() => onHoverRatingChange(s)}
                            onMouseLeave={() => onHoverRatingChange(0)}
                            onClick={() => onRatingChange(s)}
                            className={`text-2xl transition-transform hover:scale-125 focus:outline-none ${
                              s <= (hoverRating || commentRating)
                                ? "text-amber-500"
                                : "text-charcoal/20"
                            }`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="ml-2 font-bold text-charcoal/70">
                          {hoverRating || commentRating} / 5
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="field-label">Tu Comentario *</label>
                      <textarea
                        value={commentText}
                        onChange={(e) => onTextChange(e.target.value)}
                        rows={3}
                        placeholder="Cuéntanos qué tal te pareció la atención, el resultado y el ambiente..."
                        className="field resize-none text-xs"
                        required
                      />
                    </div>

                    <button
                      type="button"
                      disabled={
                        submitting ||
                        !commentName.trim() ||
                        !commentService ||
                        !commentText.trim()
                      }
                      onClick={onSubmit}
                      className="btn btn-primary w-full py-3.5 text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                      {submitting ? "Guardando en PostgreSQL..." : "Publicar Reseña"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
