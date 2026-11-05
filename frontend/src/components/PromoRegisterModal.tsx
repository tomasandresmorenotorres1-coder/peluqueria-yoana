type PromoRegisterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onContinueAsGuest: () => void;
};

export default function PromoRegisterModal({
  isOpen,
  onClose,
  onOpenRegister,
  onOpenLogin,
  onContinueAsGuest,
}: PromoRegisterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gold/40 p-8 overflow-hidden text-center">
        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-charcoal/50 hover:text-charcoal text-2xl leading-none transition-colors"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        {/* INSIGNIA PROMO */}
        <div className="w-16 h-16 bg-rust/10 text-rust rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-rust/20">
          ✨
        </div>

        <span className="badge badge-rose text-xs font-bold tracking-widest uppercase mb-2 inline-block">
          Club Peluquería Yohana
        </span>

        <h3 className="font-display text-2xl md:text-3xl font-bold text-charcoal mb-3">
          ¡Aprovecha al máximo tu visita!
        </h3>

        <p className="copy text-xs leading-relaxed max-w-sm mx-auto mb-6">
          Regístrate en menos de 1 minuto para disfrutar de una experiencia exclusiva:
        </p>

        {/* BENEFICIOS DESTACADOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-6">
          <div className="p-3 bg-bone/40 rounded-2xl border border-gold/30 flex items-start gap-3">
            <span className="text-lg">📜</span>
            <div>
              <p className="font-bold text-xs text-charcoal">Historial de Citas</p>
              <p className="text-[11px] text-charcoal/70">Consulta y gestiona todos tus turnos pasados y futuros.</p>
            </div>
          </div>

          <div className="p-3 bg-bone/40 rounded-2xl border border-gold/30 flex items-start gap-3">
            <span className="text-lg">🎁</span>
            <div>
              <p className="font-bold text-xs text-charcoal">Beneficios & Descuentos</p>
              <p className="text-[11px] text-charcoal/70">Acumula visitas para obtener promociones especiales.</p>
            </div>
          </div>

          <div className="p-3 bg-bone/40 rounded-2xl border border-gold/30 flex items-start gap-3">
            <span className="text-lg">⚡</span>
            <div>
              <p className="font-bold text-xs text-charcoal">Agendamiento Rápido</p>
              <p className="text-[11px] text-charcoal/70">Reserva con 1 clic sin tener que reescribir tus datos.</p>
            </div>
          </div>

          <div className="p-3 bg-bone/40 rounded-2xl border border-gold/30 flex items-start gap-3">
            <span className="text-lg">🔔</span>
            <div>
              <p className="font-bold text-xs text-charcoal">Recordatorios</p>
              <p className="text-[11px] text-charcoal/70">Alertas directas y confirmaciones automáticas.</p>
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="space-y-2.5">
          <button
            onClick={() => {
              onClose();
              onOpenRegister();
            }}
            className="w-full py-3.5 bg-rust hover:bg-rust-dark text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <span>Crear mi cuenta con PIN seguro</span>
            <span>✉️</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenLogin();
            }}
            className="w-full py-3 border border-rust text-rust hover:bg-rust/5 rounded-xl font-bold text-xs transition-colors"
          >
            Ya tengo cuenta · Iniciar sesión
          </button>

          <button
            onClick={() => {
              onClose();
              onContinueAsGuest();
            }}
            className="w-full py-2 text-xs text-charcoal/60 hover:text-charcoal font-medium underline"
          >
            Continuar como invitado sin registrarme
          </button>
        </div>
      </div>
    </div>
  );
}
