import { useEffect, useState } from "react";
import {
  fetchMisCitasEspecialista,
  cambiarEstadoCitaEspecialista,
  fetchMisHorariosEspecialista,
  guardarMisHorariosEspecialista,
  fetchMisBloqueosEspecialista,
  crearBloqueoEspecialista,
  eliminarBloqueoEspecialista,
} from "@/services/api";
import type { CitaEspecialista, DiaHorario, User } from "@/types";

const DIAS_SEMANA_NOMBRES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

type SpecialistDashboardProps = {
  user: User;
  onLogout: () => void;
  onGoHome: () => void;
};

export default function SpecialistDashboard({
  user,
  onLogout,
  onGoHome,
}: SpecialistDashboardProps) {
  const [activeTab, setActiveTab] = useState<"agenda" | "horarios" | "bloqueos">("agenda");

  // Estado de citas
  const [citas, setCitas] = useState<CitaEspecialista[]>([]);
  const [loadingCitas, setLoadingCitas] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // Estado de horarios semanales
  const [horarios, setHorarios] = useState<DiaHorario[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [savingHorarios, setSavingHorarios] = useState(false);

  // Estado de bloqueos puntuales
  const [bloqueos, setBloqueos] = useState<any[]>([]);
  const [loadingBloqueos, setLoadingBloqueos] = useState(false);
  const [nuevoBloqueoFecha, setNuevoBloqueoFecha] = useState("");
  const [nuevoBloqueoInicio, setNuevoBloqueoInicio] = useState("");
  const [nuevoBloqueoFin, setNuevoBloqueoFin] = useState("");
  const [nuevoBloqueoMotivo, setNuevoBloqueoMotivo] = useState("");
  const [creandoBloqueo, setCreandoBloqueo] = useState(false);

  // Feedback general
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadCitas();
    loadHorarios();
    loadBloqueos();
  }, []);

  // 1. Cargar citas
  const loadCitas = async () => {
    setLoadingCitas(true);
    try {
      const data = await fetchMisCitasEspecialista({
        fecha: filtroFecha || undefined,
        estado: filtroEstado || undefined,
      });
      setCitas(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingCitas(false);
    }
  };

  useEffect(() => {
    loadCitas();
  }, [filtroFecha, filtroEstado]);

  const handleCambiarEstado = async (id: number, estado: "CONFIRMADO" | "COMPLETADO" | "CANCELADO") => {
    try {
      await cambiarEstadoCitaEspecialista(id, estado);
      showToast(`Cita #${id} actualizada a ${estado}`);
      setCitas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, estado } : c))
      );
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo actualizar el estado de la cita");
      setTimeout(() => setErrorMsg(null), 3500);
    }
  };

  // 2. Cargar y guardar horarios semanales
  const loadHorarios = async () => {
    setLoadingHorarios(true);
    try {
      const res = await fetchMisHorariosEspecialista();
      // Inicializar estructura para los 7 días
      const diasMap = new Map<number, DiaHorario>();
      res.dias.forEach((d) => diasMap.set(d.dia_semana, d));

      const listaCompleta: DiaHorario[] = [];
      for (let i = 1; i <= 6; i++) {
        // Lunes (1) a Sábado (6) por defecto
        listaCompleta.push(
          diasMap.get(i) || {
            dia_semana: i,
            hora_inicio: "09:00",
            hora_fin: "19:00",
            descanso_inicio: "13:00",
            descanso_fin: "14:00",
          }
        );
      }
      // Domingo (0)
      listaCompleta.push(
        diasMap.get(0) || {
          dia_semana: 0,
          hora_inicio: "10:00",
          hora_fin: "15:00",
          descanso_inicio: "",
          descanso_fin: "",
        }
      );

      setHorarios(listaCompleta);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingHorarios(false);
    }
  };

  const handleUpdateHorarioDia = (
    diaSemana: number,
    campo: keyof DiaHorario,
    valor: any
  ) => {
    setHorarios((prev) =>
      prev.map((h) => (h.dia_semana === diaSemana ? { ...h, [campo]: valor } : h))
    );
  };

  const handleGuardarHorarios = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHorarios(true);
    setErrorMsg(null);
    try {
      // Filtrar días válidos
      const diasAEnviar = horarios.filter(
        (h) => h.hora_inicio && h.hora_fin
      );
      await guardarMisHorariosEspecialista(diasAEnviar);
      showToast("✓ Configuración de horarios y descansos guardada exitosamente");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar horarios");
    } finally {
      setSavingHorarios(false);
    }
  };

  // 3. Bloqueos
  const loadBloqueos = async () => {
    setLoadingBloqueos(true);
    try {
      const data = await fetchMisBloqueosEspecialista();
      setBloqueos(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingBloqueos(false);
    }
  };

  const handleCrearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoBloqueoFecha) return;
    setCreandoBloqueo(true);
    setErrorMsg(null);
    try {
      await crearBloqueoEspecialista({
        fecha: nuevoBloqueoFecha,
        hora_inicio: nuevoBloqueoInicio || undefined,
        hora_fin: nuevoBloqueoFin || undefined,
        motivo: nuevoBloqueoMotivo || undefined,
      });

      showToast("✓ Bloqueo registrado correctamente");
      setNuevoBloqueoFecha("");
      setNuevoBloqueoInicio("");
      setNuevoBloqueoFin("");
      setNuevoBloqueoMotivo("");
      loadBloqueos();
      loadCitas();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar el bloqueo");
    } finally {
      setCreandoBloqueo(false);
    }
  };

  const handleEliminarBloqueo = async (id: number) => {
    if (!confirm("¿Deseas eliminar este bloqueo?")) return;
    try {
      await eliminarBloqueoEspecialista(id);
      showToast("Bloqueo eliminado");
      setBloqueos((prev) => prev.filter((b) => b.id !== id));
      loadCitas();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al eliminar el bloqueo");
    }
  };

  return (
    <div className="min-h-screen bg-cream text-charcoal flex flex-col font-body">
      {/* TOAST DE NOTIFICACIÓN */}
      {toast && (
        <div className="fixed top-5 right-6 z-50 bg-charcoal text-white px-5 py-3 rounded-2xl shadow-soft-lg text-xs font-bold border border-gold/40 animate-in slide-in-from-top duration-300">
          {toast}
        </div>
      )}

      {/* HEADER SUPERIOR DEL PANEL */}
      <header className="bg-charcoal text-white px-6 py-4 border-b border-gold/30 shadow-md">
        <div className="container-app flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💈</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="brand text-lg font-bold tracking-wide">
                  Panel de Especialista
                </span>
                <span className="px-2 py-0.5 bg-gold/20 text-gold-light border border-gold/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {user.rol}
                </span>
              </div>
              <p className="text-xs text-white/70">
                Bienvenido, <strong>{user.nombre_completo}</strong> {user.telefono ? `(${user.telefono})` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoHome}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5"
            >
              <span>🌐</span>
              <span>Ver Tienda / Web</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rust/80 hover:bg-rust text-white transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* SUB-BARRA DE NAVEGACIÓN DE PESTAÑAS */}
      <div className="bg-white border-b border-charcoal/10 sticky top-0 z-30 shadow-sm">
        <div className="container-app flex items-center gap-2 py-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("agenda")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "agenda"
                ? "bg-rust text-white shadow-sm"
                : "text-charcoal/70 hover:bg-bone hover:text-charcoal"
            }`}
          >
            <span>📅</span>
            <span>Mi Agenda de Citas</span>
            <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
              {citas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("horarios")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "horarios"
                ? "bg-rust text-white shadow-sm"
                : "text-charcoal/70 hover:bg-bone hover:text-charcoal"
            }`}
          >
            <span>⏰</span>
            <span>Configuración de Horarios & Descansos</span>
          </button>

          <button
            onClick={() => setActiveTab("bloqueos")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "bloqueos"
                ? "bg-rust text-white shadow-sm"
                : "text-charcoal/70 hover:bg-bone hover:text-charcoal"
            }`}
          >
            <span>🚫</span>
            <span>Bloqueos & Vacaciones</span>
            {bloqueos.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                {bloqueos.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* MENSAJE DE ERROR GLOBAL */}
      {errorMsg && (
        <div className="container-app mt-4">
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold">
            {errorMsg}
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      <main className="container-app py-8 flex-1">
        {/* ============================================================== */}
        {/* PESTAÑA 1: AGENDA DE CITAS */}
        {/* ============================================================== */}
        {activeTab === "agenda" && (
          <div className="space-y-6">
            {/* BARRA DE FILTROS */}
            <div className="bg-white p-4 rounded-2xl border border-charcoal/10 shadow-soft flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-charcoal/60 uppercase">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="px-3 py-1.5 border border-charcoal/20 rounded-xl text-xs outline-none focus:border-rust"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-charcoal/60 uppercase">
                    Estado
                  </label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="px-3 py-1.5 border border-charcoal/20 rounded-xl text-xs outline-none focus:border-rust bg-white"
                  >
                    <option value="">Todos los estados</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="CONFIRMADO">CONFIRMADO</option>
                    <option value="COMPLETADO">COMPLETADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </div>

                {(filtroFecha || filtroEstado) && (
                  <button
                    onClick={() => {
                      setFiltroFecha("");
                      setFiltroEstado("");
                    }}
                    className="self-end px-3 py-1.5 text-xs text-rust font-bold hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              <button
                onClick={loadCitas}
                className="px-3 py-1.5 bg-bone hover:bg-bone/80 text-charcoal text-xs font-bold rounded-xl border border-charcoal/10 flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>Refrescar</span>
              </button>
            </div>

            {/* LISTA DE CITAS */}
            {loadingCitas ? (
              <div className="p-12 text-center text-xs text-charcoal/60 bg-white rounded-3xl border border-charcoal/10">
                Cargando tus citas agendadas...
              </div>
            ) : citas.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-charcoal/20">
                <span className="text-4xl block mb-2">📅</span>
                <h3 className="font-display text-lg font-bold text-charcoal">
                  No hay citas agendadas con los filtros actuales
                </h3>
                <p className="text-xs text-charcoal/60 mt-1">
                  Tus próximas reservas aparecerán aquí cuando los clientes las soliciten en tiempo real.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {citas.map((cita) => {
                  const badgeColor =
                    cita.estado === "CONFIRMADO"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : cita.estado === "PENDIENTE"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : cita.estado === "COMPLETADO"
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : "bg-gray-100 text-gray-600 border-gray-300";

                  return (
                    <div
                      key={cita.id}
                      className="bg-white p-5 rounded-2xl border border-charcoal/10 shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-gold/50 transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-base text-charcoal">
                            {cita.servicio}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeColor}`}
                          >
                            {cita.estado}
                          </span>
                          <span className="text-xs text-rust font-extrabold">
                            ${Number(cita.precio_aplicado).toLocaleString("es-CO")}
                          </span>
                        </div>

                        <div className="text-xs text-charcoal/80 flex flex-wrap items-center gap-3">
                          <span className="font-bold flex items-center gap-1">
                            <span>🕒</span>
                            <span>{cita.fecha} · {cita.hora_inicio} a {cita.hora_fin} hs</span>
                          </span>
                          <span className="text-charcoal/30">|</span>
                          <span className="flex items-center gap-1">
                            <span>👤</span>
                            <span>{cita.cliente}</span>
                          </span>
                          <span className="text-charcoal/30">|</span>
                          <a
                            href={`https://wa.me/${cita.telefono_whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                          >
                            <span>💬</span>
                            <span>{cita.telefono_whatsapp}</span>
                          </a>
                        </div>

                        {cita.notas_accesibilidad && (
                          <div className="text-[11px] bg-bone/50 p-2 rounded-xl text-charcoal/80 border border-gold/20 inline-block mt-1">
                            <strong>Notas cliente:</strong> {cita.notas_accesibilidad}
                          </div>
                        )}
                      </div>

                      {/* BOTONES DE CAMBIO DE ESTADO */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {cita.estado === "PENDIENTE" && (
                          <button
                            onClick={() => handleCambiarEstado(cita.id, "CONFIRMADO")}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                          >
                            ✓ Confirmar
                          </button>
                        )}
                        {cita.estado !== "COMPLETADO" && cita.estado !== "CANCELADO" && (
                          <button
                            onClick={() => handleCambiarEstado(cita.id, "COMPLETADO")}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                          >
                            ⭐ Marcar Atendido
                          </button>
                        )}
                        {cita.estado !== "CANCELADO" && cita.estado !== "COMPLETADO" && (
                          <button
                            onClick={() => handleCambiarEstado(cita.id, "CANCELADO")}
                            className="px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors"
                          >
                            ✕ Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: CONFIGURACIÓN DE HORARIOS & DESCANSOS */}
        {/* ============================================================== */}
        {activeTab === "horarios" && (
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-charcoal/10 shadow-soft max-w-4xl mx-auto">
            <div className="mb-6 pb-4 border-b border-charcoal/10">
              <h3 className="font-display text-xl font-bold text-charcoal">
                Gestión de Horarios y Bloques de Descanso
              </h3>
              <p className="text-xs text-charcoal/70 mt-1">
                Define las horas de inicio, fin y tus descansos para cada día de la semana.
                La disponibilidad que verán los clientes en la reserva se ajustará automáticamente a esta configuración.
              </p>
            </div>

            {loadingHorarios ? (
              <div className="py-12 text-center text-xs text-charcoal/60">
                Cargando configuración semanal...
              </div>
            ) : (
              <form onSubmit={handleGuardarHorarios} className="space-y-4">
                <div className="divide-y divide-charcoal/10">
                  {horarios.map((dia) => {
                    const nombreDia = DIAS_SEMANA_NOMBRES[dia.dia_semana];
                    return (
                      <div
                        key={dia.dia_semana}
                        className="py-4 grid sm:grid-cols-12 gap-3 items-center"
                      >
                        <div className="sm:col-span-3">
                          <span className="font-bold text-xs text-charcoal block">
                            {nombreDia}
                          </span>
                          <span className="text-[10px] text-charcoal/60">
                            {dia.dia_semana === 0 ? "Fin de semana" : "Día laboral"}
                          </span>
                        </div>

                        {/* JORNADA LABORAL */}
                        <div className="sm:col-span-4 flex items-center gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] text-charcoal/60 font-semibold mb-0.5">
                              Inicio
                            </label>
                            <input
                              type="time"
                              value={dia.hora_inicio || ""}
                              onChange={(e) =>
                                handleUpdateHorarioDia(dia.dia_semana, "hora_inicio", e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 border border-charcoal/20 rounded-xl text-xs outline-none focus:border-rust"
                            />
                          </div>
                          <span className="text-charcoal/40 pt-4">-</span>
                          <div className="flex-1">
                            <label className="block text-[10px] text-charcoal/60 font-semibold mb-0.5">
                              Fin
                            </label>
                            <input
                              type="time"
                              value={dia.hora_fin || ""}
                              onChange={(e) =>
                                handleUpdateHorarioDia(dia.dia_semana, "hora_fin", e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 border border-charcoal/20 rounded-xl text-xs outline-none focus:border-rust"
                            />
                          </div>
                        </div>

                        {/* BLOQUE DE DESCANSO / ALMUERZO */}
                        <div className="sm:col-span-5 bg-bone/40 p-2.5 rounded-xl border border-gold/20 flex items-center gap-2">
                          <span className="text-sm">🥪</span>
                          <div className="flex-1">
                            <label className="block text-[10px] text-charcoal/70 font-semibold mb-0.5">
                              Descanso Desde
                            </label>
                            <input
                              type="time"
                              value={dia.descanso_inicio || ""}
                              onChange={(e) =>
                                handleUpdateHorarioDia(dia.dia_semana, "descanso_inicio", e.target.value)
                              }
                              className="w-full px-2 py-1 border border-charcoal/20 rounded-lg text-xs outline-none focus:border-rust bg-white"
                            />
                          </div>
                          <span className="text-charcoal/40 pt-3">-</span>
                          <div className="flex-1">
                            <label className="block text-[10px] text-charcoal/70 font-semibold mb-0.5">
                              Hasta
                            </label>
                            <input
                              type="time"
                              value={dia.descanso_fin || ""}
                              onChange={(e) =>
                                handleUpdateHorarioDia(dia.dia_semana, "descanso_fin", e.target.value)
                              }
                              className="w-full px-2 py-1 border border-charcoal/20 rounded-lg text-xs outline-none focus:border-rust bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-charcoal/10 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingHorarios}
                    className="px-6 py-3.5 bg-rust hover:bg-rust-dark text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>💾</span>
                    <span>{savingHorarios ? "Guardando en PostgreSQL..." : "Guardar Configuración de Horarios"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 3: BLOQUEOS PUNTUALES & VACACIONES */}
        {/* ============================================================== */}
        {activeTab === "bloqueos" && (
          <div className="grid lg:grid-cols-12 gap-8 max-w-5xl mx-auto">
            {/* FORMULARIO CREAR BLOQUEO */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-charcoal/10 shadow-soft">
              <h3 className="font-display text-lg font-bold text-charcoal mb-2">
                Crear Nuevo Bloqueo
              </h3>
              <p className="text-xs text-charcoal/60 mb-5">
                Bloquea un día entero o un rango de horas por citas médicas, capacitaciones o vacaciones.
              </p>

              <form onSubmit={handleCrearBloqueo} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    Fecha del Bloqueo *
                  </label>
                  <input
                    type="date"
                    value={nuevoBloqueoFecha}
                    onChange={(e) => setNuevoBloqueoFecha(e.target.value)}
                    className="w-full px-3 py-2 border border-charcoal/20 rounded-xl text-xs outline-none focus:border-rust"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-charcoal/60 mb-1">
                      Hora Inicio (opcional)
                    </label>
                    <input
                      type="time"
                      value={nuevoBloqueoInicio}
                      onChange={(e) => setNuevoBloqueoInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-charcoal/20 rounded-xl text-xs outline-none focus:border-rust"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-charcoal/60 mb-1">
                      Hora Fin (opcional)
                    </label>
                    <input
                      type="time"
                      value={nuevoBloqueoFin}
                      onChange={(e) => setNuevoBloqueoFin(e.target.value)}
                      className="w-full px-3 py-2 border border-charcoal/20 rounded-xl text-xs outline-none focus:border-rust"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-charcoal/50 italic">
                  * Deja las horas vacías si deseas bloquear el día completo.
                </p>

                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1">
                    Motivo (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Trámite personal, descanso especial..."
                    value={nuevoBloqueoMotivo}
                    onChange={(e) => setNuevoBloqueoMotivo(e.target.value)}
                    className="w-full px-3 py-2 border border-charcoal/20 rounded-xl text-xs outline-none focus:border-rust"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creandoBloqueo || !nuevoBloqueoFecha}
                  className="w-full py-3 bg-rust hover:bg-rust-dark text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
                >
                  {creandoBloqueo ? "Registrando..." : "Guardar Bloqueo"}
                </button>
              </form>
            </div>

            {/* LISTA DE BLOQUEOS EXISTENTES */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-charcoal/10 shadow-soft">
                <h3 className="font-display text-lg font-bold text-charcoal mb-4">
                  Tus Bloqueos Activos
                </h3>

                {loadingBloqueos ? (
                  <div className="text-center py-8 text-xs text-charcoal/60">
                    Cargando bloqueos...
                  </div>
                ) : bloqueos.length === 0 ? (
                  <div className="text-center py-10 bg-bone/30 rounded-2xl border border-dashed border-charcoal/20">
                    <p className="text-xs text-charcoal/60">No tienes bloqueos programados actualmente.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-charcoal/10">
                    {bloqueos.map((b) => (
                      <div
                        key={b.id}
                        className="py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-charcoal">
                            {b.fecha}
                            {b.hora_inicio && b.hora_fin
                              ? ` · ${b.hora_inicio} a ${b.hora_fin} hs`
                              : " · Todo el día"}
                          </p>
                          {b.motivo && (
                            <p className="text-[11px] text-charcoal/70">{b.motivo}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleEliminarBloqueo(b.id)}
                          className="px-2.5 py-1 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg font-bold text-[11px] transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
