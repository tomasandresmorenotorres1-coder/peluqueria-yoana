import { useEffect, useState } from "react";
import { fetchMisReservas, cancelarMiReserva } from "@/services/api";
import type { TurnoCliente, User } from "@/types";

type ClientHistoryModalProps = {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onNewBookingClick: () => void;
};

export default function ClientHistoryModal({
  isOpen,
  user,
  onClose,
  onNewBookingClick,
}: ClientHistoryModalProps) {
  const [reservas, setReservas] = useState<TurnoCliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadReservas();
    }
  }, [isOpen, user]);

  const loadReservas = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchMisReservas();
      setReservas(data);
    } catch (err: any) {
      setErrorMsg("No se pudieron cargar tus reservas.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas cancelar esta reserva?")) return;
    setCancelingId(id);
    setErrorMsg(null);
    try {
      await cancelarMiReserva(id);
      setFeedbackMsg("Reserva cancelada correctamente.");
      setReservas((prev) =>
        prev.map((r) => (r.id === id ? { ...r, estado: "CANCELADO" } : r))
      );
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cancelar la reserva.");
    } finally {
      setCancelingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gold/40 p-6 md:p-8 overflow-hidden max-h-[90vh] flex flex-col">
        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-charcoal/50 hover:text-charcoal text-2xl leading-none transition-colors"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        {/* ENCABEZADO */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-charcoal/10">
          <div className="w-12 h-12 bg-rust/10 text-rust rounded-2xl flex items-center justify-center text-2xl font-bold">
            👤
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-charcoal">
              Hola, {user?.nombre_completo}
            </h3>
            <p className="text-xs text-charcoal/60">
              {user?.email} · Historial de Reservas & Beneficios
            </p>
          </div>
        </div>

        {/* FEEDBACK */}
        {feedbackMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
            {feedbackMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* BANNER BENEFICIO */}
        <div className="bg-gradient-to-r from-bone to-cream p-4 rounded-2xl border border-gold/30 mb-6 flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-charcoal flex items-center gap-1.5">
              <span>⭐</span> Nivel Cliente Frecuente
            </p>
            <p className="text-charcoal/70 text-[11px] mt-0.5">
              Tienes acumulado un 10% de descuento en tu próximo servicio capilar.
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              onNewBookingClick();
            }}
            className="btn btn-primary btn-sm rounded-xl font-bold text-xs shrink-0"
          >
            Reservar Ahora
          </button>
        </div>

        {/* LISTADO DE CITAS */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <h4 className="font-bold text-xs text-charcoal uppercase tracking-wider mb-2">
            Mis Citas Registradas
          </h4>

          {loading ? (
            <div className="text-center py-10 text-xs text-charcoal/60">
              Cargando historial de citas...
            </div>
          ) : reservas.length === 0 ? (
            <div className="text-center py-12 bg-bone/30 rounded-2xl border border-dashed border-charcoal/20">
              <span className="text-3xl block mb-2">📅</span>
              <p className="font-bold text-sm text-charcoal">Aún no tienes citas registradas</p>
              <p className="text-xs text-charcoal/60 mt-1 mb-4">
                Agenda tu primer turno en Peluquería Yohana en línea.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onNewBookingClick();
                }}
                className="btn btn-primary btn-sm rounded-xl font-bold text-xs"
              >
                Agendar Cita
              </button>
            </div>
          ) : (
            reservas.map((r) => {
              const isCancelable =
                r.estado === "PENDIENTE" || r.estado === "CONFIRMADO";
              const badgeColor =
                r.estado === "CONFIRMADO"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : r.estado === "PENDIENTE"
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : r.estado === "COMPLETADO"
                  ? "bg-blue-100 text-blue-800 border-blue-200"
                  : "bg-gray-100 text-gray-600 border-gray-200";

              return (
                <div
                  key={r.id}
                  className="p-4 bg-white rounded-2xl border border-charcoal/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gold/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-charcoal">
                        {r.servicio}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
                      >
                        {r.estado}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal/70">
                      Con <strong>{r.estilista}</strong> · {r.fecha} a las {r.hora_inicio} hs
                    </p>
                    <p className="text-xs font-bold text-rust">
                      ${Number(r.precio_aplicado).toLocaleString("es-CO")}
                    </p>
                  </div>

                  {isCancelable && (
                    <button
                      onClick={() => handleCancelar(r.id)}
                      disabled={cancelingId === r.id}
                      className="px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors self-start sm:self-center"
                    >
                      {cancelingId === r.id ? "Cancelando..." : "Cancelar cita"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
