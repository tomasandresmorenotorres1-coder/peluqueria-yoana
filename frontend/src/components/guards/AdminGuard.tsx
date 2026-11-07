import React from "react";
import type { User } from "@/types";

type AdminGuardProps = {
  user: User | null;
  loading?: boolean;
  onOpenLogin: () => void;
  onGoHome: () => void;
  children: React.ReactNode;
};

/**
 * Guard de Seguridad RBAC (Role-Based Access Control) para el Dashboard de Administrador.
 * Protege contra accesos no autorizados y evita bucles infinitos de redirección.
 */
export default function AdminGuard({
  user,
  loading = false,
  onOpenLogin,
  onGoHome,
  children,
}: AdminGuardProps) {
  // 1. Estado de carga de sesión inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-charcoal">
        <div className="w-12 h-12 border-4 border-gold border-t-rust rounded-full animate-spin mb-4" />
        <h3 className="font-display text-xl font-bold">Verificando permisos de Administrador...</h3>
        <p className="text-xs text-charcoal/60 mt-1">Consultando sesión y rol en el servidor.</p>
      </div>
    );
  }

  // 2. Usuario no autenticado
  if (!user) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-charcoal animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-soft-lg border border-charcoal/10 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm">
            🔒
          </div>
          <h2 className="font-display text-2xl font-bold text-charcoal">Acceso Restringido</h2>
          <p className="text-xs text-charcoal/70 leading-relaxed">
            El <strong>Panel de Control Administrativo</strong> está reservado para el personal con rol de Administrador. Por favor, inicia sesión con tus credenciales autorizadas.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onOpenLogin}
              className="btn btn-primary flex-1 py-3 text-xs font-bold rounded-xl"
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={onGoHome}
              className="btn btn-outline flex-1 py-3 text-xs font-bold rounded-xl"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Usuario autenticado pero sin rol ADMIN (RBAC 403 Forbidden)
  if (user.rol !== "ADMIN") {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-charcoal animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-soft-lg border border-red-200 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm">
            🚫
          </div>
          <h2 className="font-display text-2xl font-bold text-red-700">Permisos Insuficientes</h2>
          <p className="text-xs text-charcoal/70 leading-relaxed">
            Has iniciado sesión como <strong>{user.nombre_completo}</strong> con rol{" "}
            <span className="px-2 py-0.5 rounded bg-charcoal/10 font-bold uppercase text-[10px]">
              {user.rol}
            </span>
            . Tu cuenta no posee privilegios de <strong>ADMIN</strong> para acceder a este panel.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onGoHome}
              className="btn btn-primary flex-1 py-3 text-xs font-bold rounded-xl"
            >
              Ir a la Web Pública
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Usuario autenticado con rol ADMIN: renderizar layout y rutas hijas
  return <>{children}</>;
}
