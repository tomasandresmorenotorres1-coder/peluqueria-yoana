import { useState } from "react";
import { loginUsuario, solicitarPinRegistro, verificarPinRegistro } from "@/services/api";
import type { User } from "@/types";

type AuthModalProps = {
  isOpen: boolean;
  initialMode?: "login" | "register";
  onClose: () => void;
  onSuccess: (user: User) => void;
};

export default function AuthModal({
  isOpen,
  initialMode = "login",
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [step, setStep] = useState<"form" | "pin">("form");

  // Campos de formulario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  // Estados de carga y feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setNombre("");
    setEmail("");
    setTelefono("");
    setPassword("");
    setPin("");
    setError(null);
    setSuccessMsg(null);
    setStep("form");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await loginUsuario(email.trim(), password);
      resetForm();
      onSuccess(res.usuario);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión. Revisa tus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !telefono.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await solicitarPinRegistro({
        nombre_completo: nombre.trim(),
        email: email.trim(),
        telefono_whatsapp: telefono.trim(),
        password,
      });

      setSuccessMsg(res.mensaje);
      setStep("pin");
    } catch (err: any) {
      setError(err.message || "Error al solicitar el código PIN de verificación.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificarPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || pin.trim().length !== 6) {
      setError("Por favor ingresa los 6 dígitos del PIN recibido por correo.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verificarPinRegistro(email.trim(), pin.trim());
      resetForm();
      onSuccess(res.usuario);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al verificar el PIN. Revisa el código ingresado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gold/40 p-8 overflow-hidden">
        {/* BOTÓN CERRAR */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-charcoal/50 hover:text-charcoal text-2xl leading-none transition-colors"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        {/* ENCABEZADO */}
        <div className="text-center mb-6">
          <span className="text-3xl block mb-2">💈</span>
          <h2 className="font-display text-2xl font-bold text-charcoal">
            {mode === "login"
              ? "Iniciar Sesión"
              : step === "form"
              ? "Registro de Clientes"
              : "Verifica tu Correo"}
          </h2>
          <p className="text-xs text-charcoal/70 mt-1">
            {mode === "login"
              ? "Accede a tu cuenta de cliente o panel de especialista"
              : step === "form"
              ? "Crea tu cuenta para acumular beneficios y guardar tu historial"
              : `Ingresa el PIN de 6 dígitos enviado a ${email}`}
          </p>
        </div>

        {/* FEEDBACK MENSAJES */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium animate-in shake duration-200">
            {error}
          </div>
        )}

        {successMsg && step === "pin" && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
            {successMsg}
          </div>
        )}

        {/* FORMULARIO LOGIN */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-charcoal mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-charcoal/20 focus:border-rust focus:ring-1 focus:ring-rust text-xs outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal mb-1">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-charcoal/20 focus:border-rust focus:ring-1 focus:ring-rust text-xs outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-rust hover:bg-rust-dark text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-colors shadow-md disabled:opacity-50"
            >
              {loading ? "Iniciando sesión..." : "Ingresar"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-rust hover:underline font-bold"
              >
                ¿No tienes cuenta? Regístrate como cliente
              </button>
            </div>
          </form>
        )}

        {/* FORMULARIO REGISTRO PASO 1: DATOS */}
        {mode === "register" && step === "form" && (
          <form onSubmit={handleSolicitarPin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-charcoal mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                placeholder="Tu Nombre y Apellido"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal/20 focus:border-rust text-xs outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-charcoal mb-1">
                Correo Electrónico (donde llegará el PIN) *
              </label>
              <input
                type="email"
                placeholder="cliente@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal/20 focus:border-rust text-xs outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-charcoal mb-1">
                WhatsApp / Teléfono *
              </label>
              <input
                type="tel"
                placeholder="+57 300 123 4567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal/20 focus:border-rust text-xs outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-charcoal mb-1">
                Contraseña (mínimo 8 caracteres con letras y números) *
              </label>
              <input
                type="password"
                placeholder="Crea una contraseña segura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal/20 focus:border-rust text-xs outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-rust hover:bg-rust-dark text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-colors shadow-md disabled:opacity-50 mt-2"
            >
              {loading ? "Generando PIN..." : "Enviar PIN de 6 dígitos"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-rust hover:underline font-bold"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            </div>
          </form>
        )}

        {/* FORMULARIO REGISTRO PASO 2: VERIFICAR PIN */}
        {mode === "register" && step === "pin" && (
          <form onSubmit={handleVerificarPin} className="space-y-4">
            <div className="text-center py-2">
              <label className="block text-xs font-bold text-charcoal mb-2">
                Código PIN (6 dígitos)
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-48 mx-auto text-center font-mono text-2xl tracking-[0.4em] font-bold py-3 px-4 border-2 border-rust rounded-2xl outline-none focus:ring-2 focus:ring-rust/30"
                autoFocus
                required
              />
              <p className="text-[11px] text-charcoal/60 mt-2">
                Revisa tu bandeja de entrada o spam. El PIN vence en 15 minutos.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || pin.length !== 6}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-colors shadow-md disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Confirmar y Crear Cuenta"}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-charcoal/70 hover:text-charcoal font-semibold"
              >
                ← Cambiar datos
              </button>
              <button
                type="button"
                onClick={handleSolicitarPin}
                disabled={loading}
                className="text-rust hover:underline font-bold"
              >
                Reenviar PIN
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
