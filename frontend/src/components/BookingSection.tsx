import { useState } from "react";
import type { Service, StaffMember } from "@/types";
import { TIMES } from "@/data/constants";

type BookingSectionProps = {
  services: Service[];
  staff: StaffMember[];
  selectedService: number | null;
  selectedBarber: string;
  selectedTime: string;
  selectedDate: string;
  horasOcupadas?: string[];
  bookingDone: boolean;
  bookingInfo?: any;
  submitting?: boolean;
  errorMessage?: string | null;
  onSelectService: (id: number) => void;
  onSelectBarber: (name: string) => void;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onBook: (clientData: { nombre: string; telefono: string; email?: string; notas?: string }) => void;
  onReset: () => void;
};

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export default function BookingSection({
  services,
  staff,
  selectedService,
  selectedBarber,
  selectedTime,
  selectedDate,
  horasOcupadas = [],
  bookingDone,
  bookingInfo,
  submitting,
  errorMessage,
  onSelectService,
  onSelectBarber,
  onSelectDate,
  onSelectTime,
  onBook,
  onReset,
}: BookingSectionProps) {
  const [minDate] = useState(getTodayDateString);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState("");

  const currentService = services.find((s) => s.id === selectedService);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) return;
    if (!nombre.trim() || !telefono.trim()) return;

    onBook({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim() || undefined,
      notas: notas.trim() || undefined,
    });
  };

  const handleNewBooking = () => {
    setNombre("");
    setTelefono("");
    setEmail("");
    setNotas("");
    onReset();
  };

  return (
    <section id="reservar" className="section-bone relative">
      <div className="container-app">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* COLUMNA IZQUIERDA: INFORMACIÓN Y AMBIENTE */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <span className="eyebrow">Agenda en Línea</span>
              <h2 className="section-title mb-4">Reserva tu Cita</h2>
              <p className="copy text-sm leading-relaxed">
                Selecciona tu servicio y especialista de preferencia. Tu turno queda registrado inmediatamente en nuestro sistema en tiempo real.
              </p>
            </div>

            {/* TARJETA VISUAL CON FOTO */}
            <div className="relative rounded-2xl overflow-hidden shadow-soft-lg h-72 border border-gold/30">
              <img
                src="https://images.unsplash.com/photo-1621645582931-d1d3e6564943?w=800&h=600&fit=crop&auto=format"
                alt="Silla y espejo de peluquería Yohana"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="font-display text-2xl font-bold italic mb-1 text-gold-light">
                  "Atención de excelencia y puntualidad garantizada"
                </p>
                <p className="text-xs text-white/80">
                  Reserva confirmada al instante sin filas de espera.
                </p>
              </div>
            </div>

            {/* DETALLES DE UBICACIÓN Y HORARIOS */}
            <div className="bg-white p-6 rounded-2xl border border-gold/30 shadow-soft space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <p className="font-bold text-charcoal">Ubicación</p>
                  <p className="text-charcoal/70">Av. Corrientes 1234, CABA</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🕒</span>
                <div>
                  <p className="font-bold text-charcoal">Horarios de Atención</p>
                  <p className="text-charcoal/70">Lunes a Sábado: 9:00 a 20:00 hs</p>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: FORMULARIO DE RESERVA O CONFIRMACIÓN */}
          <div className="lg:col-span-7">
            <div className="panel bg-white rounded-3xl p-8 md:p-10 shadow-soft-lg border border-gold/40">
              {bookingDone ? (
                /* TICKET DE CONFIRMACIÓN */
                <div className="text-center py-6 animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
                    ✓
                  </div>
                  <span className="badge badge-rose text-xs font-bold uppercase tracking-widest mb-2 inline-block">
                    Reserva #{bookingInfo?.id ?? "PY-REG"} Confirmada
                  </span>
                  <h3 className="font-display text-3xl font-bold mb-3 text-rust">
                    ¡Tu cita está agendada!
                  </h3>
                  <p className="copy text-sm max-w-md mx-auto mb-6">
                    Te esperamos en Peluquería Yohana. Hemos guardado los datos de tu reserva de manera segura en PostgreSQL.
                  </p>

                  {/* RESUMEN DEL TICKET */}
                  <div className="bg-bone/40 p-6 rounded-2xl border border-gold/30 max-w-md mx-auto text-left space-y-3 mb-6 text-sm">
                    <div className="flex justify-between border-b border-charcoal/10 pb-2">
                      <span className="text-charcoal/60">Servicio:</span>
                      <span className="font-bold text-charcoal">
                        {currentService?.name ?? bookingInfo?.nombre_servicio}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-charcoal/10 pb-2">
                      <span className="text-charcoal/60">Especialista:</span>
                      <span className="font-bold text-charcoal">{selectedBarber}</span>
                    </div>
                    <div className="flex justify-between border-b border-charcoal/10 pb-2">
                      <span className="text-charcoal/60">Fecha y Hora:</span>
                      <span className="font-bold text-charcoal">
                        {selectedDate} · {selectedTime} hs
                      </span>
                    </div>
                    {currentService && (
                      <div className="flex justify-between pt-1 text-base font-extrabold text-rust">
                        <span>Total a pagar:</span>
                        <span>${Number(currentService.price).toLocaleString("es-CO")}</span>
                      </div>
                    )}
                  </div>

                  {bookingInfo?.whatsapp_url && (
                    <a
                      href={bookingInfo.whatsapp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn bg-[#25D366] text-white hover:bg-[#1EBE5D] w-full max-w-md mx-auto py-3.5 mb-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
                    >
                      <span>Abrir confirmación en WhatsApp</span>
                      <span>💬</span>
                    </a>
                  )}

                  <button
                    onClick={handleNewBooking}
                    className="btn btn-outline-rust w-full max-w-md mx-auto py-3 text-xs font-bold rounded-xl"
                  >
                    Agendar otra cita
                  </button>
                </div>
              ) : (
                /* FORMULARIO DE RESERVA PASO A PASO */
                <form onSubmit={handleSubmit} className="space-y-6">
                  {errorMessage && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                      {errorMessage}
                    </div>
                  )}

                  {/* PASO 1: SELECCIONAR SERVICIO */}
                  <div>
                    <label className="field-label flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-rust text-white text-[10px] flex items-center justify-center font-bold">1</span>
                      <span>Servicio Solicitado *</span>
                    </label>
                    <select
                      value={selectedService ?? ""}
                      onChange={(e) => onSelectService(Number(e.target.value))}
                      className="field appearance-none cursor-pointer bg-white"
                      required
                    >
                      <option value="">Selecciona un servicio del catálogo...</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — ${Number(s.price).toLocaleString("es-CO")} ({s.duration})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PASO 2: SELECCIONAR ESPECIALISTA */}
                  <div>
                    <label className="field-label flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-rust text-white text-[10px] flex items-center justify-center font-bold">2</span>
                      <span>Especialista / Estilista *</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {staff.map((b) => (
                        <button
                          type="button"
                          key={b.name}
                          onClick={() => onSelectBarber(b.name)}
                          className={`choice p-3 text-left flex flex-col justify-between ${
                            selectedBarber === b.name ? "choice-on ring-2 ring-rust" : "choice-idle"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <img
                              src={b.img}
                              alt={b.name}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                            <span className="font-bold text-xs truncate">{b.name}</span>
                          </div>
                          <span className="muted text-[10px] line-clamp-1">{b.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PASO 3: FECHA Y HORA */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="field-label flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rust text-white text-[10px] flex items-center justify-center font-bold">3</span>
                        <span>Fecha del Turno *</span>
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onSelectDate(e.target.value)}
                        min={minDate}
                        className="field cursor-pointer"
                        required
                      />
                    </div>

                    <div>
                      <label className="field-label flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rust text-white text-[10px] flex items-center justify-center font-bold">4</span>
                        <span>Horario Disponible *</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {TIMES.map((t) => {
                          const ocupado = horasOcupadas.includes(t);
                          return (
                            <button
                              type="button"
                              key={t}
                              disabled={ocupado}
                              onClick={() => onSelectTime(t)}
                              className={`choice py-2 text-xs text-center font-semibold rounded-lg ${
                                ocupado
                                  ? "opacity-30 cursor-not-allowed line-through bg-gray-100"
                                  : selectedTime === t
                                  ? "choice-on-solid"
                                  : "choice-idle"
                              }`}
                              title={ocupado ? "Horario ocupado" : undefined}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* PASO 4: DATOS DEL CLIENTE */}
                  <div className="border-t border-charcoal/10 pt-5 space-y-3">
                    <label className="field-label flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-rust text-white text-[10px] flex items-center justify-center font-bold">5</span>
                      <span>Tus Datos de Contacto *</span>
                    </label>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nombre y Apellido *"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="field text-xs"
                        required
                      />
                      <input
                        type="tel"
                        placeholder="WhatsApp (ej. +54 9 11 ... ) *"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="field text-xs"
                        required
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        type="email"
                        placeholder="Correo electrónico (opcional)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="field text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Notas o accesibilidad (opcional)"
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        className="field text-xs"
                      />
                    </div>
                  </div>

                  {/* RESUMEN Y BOTÓN CONFIRMAR */}
                  <div className="pt-2">
                    {currentService && (
                      <div className="flex items-center justify-between text-xs mb-4 bg-bone/40 p-3 rounded-xl border border-gold/30">
                        <span className="text-charcoal/70">
                          Servicio: <strong className="text-charcoal">{currentService.name}</strong> ({currentService.duration})
                        </span>
                        <span className="font-extrabold text-rust text-base">
                          ${Number(currentService.price).toLocaleString("es-CO")}
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        !selectedService ||
                        !selectedBarber ||
                        !selectedDate ||
                        !selectedTime ||
                        !nombre.trim() ||
                        !telefono.trim()
                      }
                      className="btn btn-primary w-full py-4 text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                      {submitting ? "Guardando reserva en PostgreSQL..." : "Confirmar Reserva"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
