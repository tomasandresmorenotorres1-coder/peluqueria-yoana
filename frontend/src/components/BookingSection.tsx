import { useState, useEffect } from "react";
import type { Service, StaffMember, User, PreferenciaPagoResponse } from "@/types";
import { TIMES } from "@/data/constants";
import { crearPreferenciaMercadoPago, confirmarPagoSimulado } from "@/services/api";

type BookingSectionProps = {
  services: Service[];
  staff: StaffMember[];
  currentUser?: User | null;
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
  onOpenPromoRegister?: () => void;
};

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export default function BookingSection({
  services,
  staff,
  currentUser,
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
  onOpenPromoRegister,
}: BookingSectionProps) {
  const [minDate] = useState(getTodayDateString);
  const [nombre, setNombre] = useState(currentUser?.nombre_completo || "");
  const [telefono, setTelefono] = useState(currentUser?.telefono || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [notas, setNotas] = useState("");

  // Opciones de Pago con Mercado Pago
  const [metodoPago, setMetodoPago] = useState<"LOCAL" | "MP_ABONO" | "MP_TOTAL">("LOCAL");
  const [preferenciaMP, setPreferenciaMP] = useState<PreferenciaPagoResponse | null>(null);
  const [cargandoMP, setCargandoMP] = useState(false);
  const [pagoAprobadoSimulado, setPagoAprobadoSimulado] = useState(false);

  // Sincronizar datos de usuario si inicia sesión
  useEffect(() => {
    if (currentUser) {
      if (!nombre) setNombre(currentUser.nombre_completo);
      if (!telefono && currentUser.telefono) setTelefono(currentUser.telefono);
      if (!email) setEmail(currentUser.email);
    }
  }, [currentUser]);

  const currentService = services.find((s) => s.id === selectedService);

  // Filtrado de especialistas autorizados según el servicio seleccionado (Req 4)
  const especialistasAutorizados = staff.filter((b) => {
    if (!selectedService) return true;
    if (!b.servicios_ids || b.servicios_ids.length === 0) return true;
    return b.servicios_ids.includes(selectedService);
  });

  // Si cambia el servicio y el especialista seleccionado no está autorizado, deseleccionarlo
  useEffect(() => {
    if (selectedService && selectedBarber) {
      const autorizado = especialistasAutorizados.some((b) => b.name === selectedBarber);
      if (!autorizado) {
        onSelectBarber("");
      }
    }
  }, [selectedService, especialistasAutorizados, selectedBarber, onSelectBarber]);

  // Si se completa la reserva y se seleccionó Mercado Pago, generar preferencia
  useEffect(() => {
    if (bookingDone && bookingInfo?.id && (metodoPago === "MP_ABONO" || metodoPago === "MP_TOTAL")) {
      const generarMP = async () => {
        setCargandoMP(true);
        try {
          const pref = await crearPreferenciaMercadoPago({
            turno_id: bookingInfo.id,
            es_abono: metodoPago === "MP_ABONO",
          });
          setPreferenciaMP(pref);
        } catch (err) {
          console.error("Error al generar preferencia de Mercado Pago:", err);
        } finally {
          setCargandoMP(false);
        }
      };
      generarMP();
    }
  }, [bookingDone, bookingInfo, metodoPago]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) return;

    // Si no está autenticado y no ha llenado datos, sugerir registro
    if (!currentUser && (!nombre.trim() || !telefono.trim())) {
      onOpenPromoRegister?.();
      return;
    }

    onBook({
      nombre: (nombre || currentUser?.nombre_completo || "").trim(),
      telefono: (telefono || currentUser?.telefono || "").trim(),
      email: (email || currentUser?.email || "").trim() || undefined,
      notas: notas.trim() || undefined,
    });
  };

  const handleNewBooking = () => {
    setNombre(currentUser?.nombre_completo || "");
    setTelefono(currentUser?.telefono || "");
    setEmail(currentUser?.email || "");
    setNotas("");
    setMetodoPago("LOCAL");
    setPreferenciaMP(null);
    setPagoAprobadoSimulado(false);
    onReset();
  };

  const handleSimularAprobacionMP = async () => {
    if (!preferenciaMP?.referencia) return;
    try {
      await confirmarPagoSimulado(preferenciaMP.referencia);
      setPagoAprobadoSimulado(true);
    } catch (err: any) {
      alert("Error al simular pago: " + err.message);
    }
  };

  const precioTotal = currentService?.price || 0;
  const precioAbono = Math.round(precioTotal * 0.5);

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
                Selecciona tu servicio y especialista autorizado. Tu turno se valida en tiempo real en nuestra base de datos para garantizar cero traslapes.
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
              <div className="flex items-center gap-3">
                <span className="text-xl">💳</span>
                <div>
                  <p className="font-bold text-charcoal">Mercado Pago Integrado</p>
                  <p className="text-charcoal/70">Abona el 50% o paga completo tu turno online</p>
                </div>
              </div>
            </div>

            {/* BANNER PROMO INVITACIÓN A REGISTRO (Req 7) */}
            {!currentUser && onOpenPromoRegister && (
              <div className="p-4 bg-rust/10 rounded-2xl border border-rust/30 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-rust flex items-center gap-1">
                    <span>✨</span> ¿Aún no eres miembro?
                  </p>
                  <p className="text-charcoal/70 text-[11px] mt-0.5">
                    Regístrate con PIN seguro y guarda tu historial de citas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenPromoRegister}
                  className="px-3 py-1.5 bg-rust text-white font-bold rounded-xl text-[11px] shadow-sm hover:bg-rust-dark transition-colors shrink-0"
                >
                  Conocer más
                </button>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: FORMULARIO DE RESERVA O TICKET */}
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
                    Te esperamos en Peluquería Yohana. Los datos han quedado asegurados en PostgreSQL con protección contra traslapes.
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
                        <span>Total del servicio:</span>
                        <span>${Number(currentService.price).toLocaleString("es-CO")}</span>
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN PASARELA MERCADO PAGO EN EL TICKET (Req 6) */}
                  {(metodoPago === "MP_ABONO" || metodoPago === "MP_TOTAL") && (
                    <div className="bg-[#009EE3]/10 p-5 rounded-2xl border border-[#009EE3]/30 max-w-md mx-auto mb-6 text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">💳</span>
                        <p className="font-bold text-xs text-[#007EB5] uppercase tracking-wider">
                          Pasarela Mercado Pago
                        </p>
                      </div>

                      {pagoAprobadoSimulado ? (
                        <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-center">
                          ✓ Pago verificado y confirmado exitosamente en el sistema.
                        </div>
                      ) : cargandoMP ? (
                        <p className="text-xs text-charcoal/70 py-2">
                          Generando preferencia de pago segura...
                        </p>
                      ) : preferenciaMP ? (
                        <div className="space-y-3">
                          <p className="text-xs text-charcoal/80">
                            Monto a abonar/pagar: <strong>${Number(preferenciaMP.monto_total).toLocaleString("es-CO")}</strong>
                          </p>
                          <a
                            href={preferenciaMP.init_point}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn bg-[#009EE3] text-white hover:bg-[#007EB5] w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                          >
                            <span>Pagar con Mercado Pago</span>
                            <span>↗</span>
                          </a>

                          <button
                            type="button"
                            onClick={handleSimularAprobacionMP}
                            className="w-full py-2 bg-white text-xs font-bold text-charcoal/80 border border-charcoal/20 hover:bg-gray-50 rounded-xl transition-colors"
                          >
                            ⚡ Simular Aprobación de Pago (Test)
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {bookingInfo?.whatsapp_url && (
                    <a
                      href={bookingInfo.whatsapp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn bg-[#25D366] text-white hover:bg-[#1EBE5D] w-full max-w-md mx-auto py-3.5 mb-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md text-xs"
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
                  {/* FEEDBACK DE ERROR (Incluyendo 409 Conflict) */}
                  {errorMessage && (
                    <div className="p-4 bg-red-50 border-2 border-red-300 text-red-800 rounded-2xl text-xs font-bold flex items-start gap-3 animate-in shake duration-300">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <p>{errorMessage}</p>
                        {errorMessage.includes("disponibilidad") && (
                          <p className="text-[11px] font-normal text-red-700 mt-1">
                            Sugerencia: Elige otro horario disponible en la grilla o selecciona otro especialista autorizado.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* IDENTIFICACIÓN DE USUARIO LOGUEADO */}
                  {currentUser && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>👤</span>
                        <span>Reservando como: <strong>{currentUser.nombre_completo}</strong></span>
                      </div>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full uppercase font-bold">
                        Cuenta Verificada ✓
                      </span>
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
                      className="field appearance-none cursor-pointer bg-white font-medium"
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

                  {/* PASO 2: SELECCIONAR ESPECIALISTA FILTRADO POR SERVICIO (Req 4) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="field-label flex items-center gap-2 mb-0">
                        <span className="w-5 h-5 rounded-full bg-rust text-white text-[10px] flex items-center justify-center font-bold">2</span>
                        <span>Especialista Autorizado *</span>
                      </label>
                      {selectedService && (
                        <span className="text-[10px] font-bold text-rust bg-rust/10 px-2 py-0.5 rounded-full">
                          {especialistasAutorizados.length} especialistas autorizados
                        </span>
                      )}
                    </div>

                    {!selectedService ? (
                      <div className="p-4 bg-bone/50 rounded-2xl border border-dashed border-charcoal/20 text-center text-xs text-charcoal/60">
                        Primero selecciona un servicio en el paso 1 para ver los especialistas autorizados.
                      </div>
                    ) : especialistasAutorizados.length === 0 ? (
                      <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl text-xs">
                        No hay especialistas disponibles temporalmente para este servicio.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {especialistasAutorizados.map((b) => (
                          <button
                            type="button"
                            key={b.name}
                            onClick={() => onSelectBarber(b.name)}
                            className={`choice p-3 text-left flex flex-col justify-between transition-all ${
                              selectedBarber === b.name
                                ? "choice-on ring-2 ring-rust shadow-sm"
                                : "choice-idle hover:border-gold/60"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <img
                                src={b.img}
                                alt={b.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0 border border-gold/30"
                              />
                              <span className="font-bold text-xs truncate">{b.name}</span>
                            </div>
                            <span className="muted text-[10px] line-clamp-1">{b.role}</span>
                          </button>
                        ))}
                      </div>
                    )}
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
                              className={`choice py-2 text-xs text-center font-semibold rounded-lg transition-all ${
                                ocupado
                                  ? "opacity-30 cursor-not-allowed line-through bg-gray-100"
                                  : selectedTime === t
                                  ? "choice-on-solid shadow-sm"
                                  : "choice-idle hover:border-gold/60"
                              }`}
                              title={ocupado ? "Horario no disponible / ocupado" : undefined}
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
                      <span>Datos de Contacto *</span>
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
                        placeholder="WhatsApp (ej. +57 300 123 4567) *"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="field text-xs"
                        required
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        type="email"
                        placeholder="Correo electrónico"
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

                  {/* PASO 5: FORMA DE PAGO (MERCADO PAGO / LOCAL) (Req 6) */}
                  <div className="border-t border-charcoal/10 pt-5 space-y-3">
                    <label className="field-label flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-rust text-white text-[10px] flex items-center justify-center font-bold">6</span>
                      <span>Forma de Pago</span>
                    </label>

                    <div className="grid sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setMetodoPago("LOCAL")}
                        className={`p-3 rounded-2xl border text-left text-xs font-semibold flex flex-col justify-between transition-all ${
                          metodoPago === "LOCAL"
                            ? "border-rust bg-rust/5 ring-1 ring-rust font-bold text-rust"
                            : "border-charcoal/15 bg-white text-charcoal/80 hover:border-gold/60"
                        }`}
                      >
                        <span className="text-base mb-1">💵</span>
                        <span>En el Local</span>
                        <span className="text-[10px] text-charcoal/60 font-normal">Pagas al llegar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMetodoPago("MP_ABONO")}
                        className={`p-3 rounded-2xl border text-left text-xs font-semibold flex flex-col justify-between transition-all ${
                          metodoPago === "MP_ABONO"
                            ? "border-[#009EE3] bg-[#009EE3]/10 ring-1 ring-[#009EE3] font-bold text-[#007EB5]"
                            : "border-charcoal/15 bg-white text-charcoal/80 hover:border-gold/60"
                        }`}
                      >
                        <span className="text-base mb-1">💳</span>
                        <span>Abono 50%</span>
                        <span className="text-[10px] text-charcoal/60 font-normal">
                          ${precioAbono.toLocaleString("es-CO")} con Mercado Pago
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMetodoPago("MP_TOTAL")}
                        className={`p-3 rounded-2xl border text-left text-xs font-semibold flex flex-col justify-between transition-all ${
                          metodoPago === "MP_TOTAL"
                            ? "border-[#009EE3] bg-[#009EE3]/10 ring-1 ring-[#009EE3] font-bold text-[#007EB5]"
                            : "border-charcoal/15 bg-white text-charcoal/80 hover:border-gold/60"
                        }`}
                      >
                        <span className="text-base mb-1">✨</span>
                        <span>Pago Total 100%</span>
                        <span className="text-[10px] text-charcoal/60 font-normal">
                          ${precioTotal.toLocaleString("es-CO")} con Mercado Pago
                        </span>
                      </button>
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
                          ${precioTotal.toLocaleString("es-CO")}
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
                        (!currentUser && (!nombre.trim() || !telefono.trim()))
                      }
                      className="btn btn-primary w-full py-4 text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                      {submitting ? "Validando disponibilidad y agendando..." : "Confirmar Reserva de Cita"}
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
