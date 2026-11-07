import { useState } from "react";
import type { CartItem, OrderRequest, PreferenciaPagoResponse } from "@/types";
import { crearPreferenciaMercadoPago, confirmarPagoSimulado } from "@/services/api";
import MercadoPagoButton from "./MercadoPagoButton";

type CartDrawerProps = {
  open: boolean;
  cart: CartItem[];
  totalPrice: number;
  submitting?: boolean;
  onClose: () => void;
  onRemove: (id: number) => void;
  /** Actualiza la cantidad de un ítem; si qty <= 0 lo elimina */
  onUpdateQty: (id: number, qty: number) => void;
  onCheckout: (data: OrderRequest) => Promise<any>;
  onClearCart?: () => void;
};

export default function CartDrawer({
  open,
  cart,
  totalPrice,
  submitting,
  onClose,
  onRemove,
  onUpdateQty,
  onCheckout,
  onClearCart,
}: CartDrawerProps) {
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "form" | "mp_checkout" | "success">("cart");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [metodoEntrega, setMetodoEntrega] = useState<"RETIRO_LOCAL" | "DOMICILIO">("RETIRO_LOCAL");
  const [metodoPago, setMetodoPago] = useState<"LOCAL" | "MERCADO_PAGO">("MERCADO_PAGO");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado de Mercado Pago
  const [cargandoMP, setCargandoMP] = useState(false);
  const [preferenciaMP, setPreferenciaMP] = useState<PreferenciaPagoResponse | null>(null);
  const [savedOrdenId, setSavedOrdenId] = useState<number | undefined>(undefined);
  const [pagoAprobado, setPagoAprobado] = useState(false);

  if (!open) return null;

  const handleFinishPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) {
      setErrorMsg("Nombre y teléfono de WhatsApp son obligatorios");
      return;
    }
    setErrorMsg(null);

    // Si seleccionó pago en el local
    if (metodoPago === "LOCAL") {
      const res = await onCheckout({
        nombre_completo: nombre.trim(),
        telefono_whatsapp: telefono.trim(),
        email: email.trim() || undefined,
        metodo_entrega: metodoEntrega,
        direccion_entrega: metodoEntrega === "DOMICILIO" ? direccion.trim() : undefined,
        items: cart.map((i) => ({ id: i.id, qty: i.qty })),
      });
      if (res) {
        onClearCart?.();
        setCheckoutStep("success");
      }
      return;
    }

    // Si seleccionó Mercado Pago Sandbox
    setCargandoMP(true);
    try {
      // 1. Guardar primero la orden en PostgreSQL para asociar los productos y descontar stock
      const ordenResult = await onCheckout({
        nombre_completo: nombre.trim(),
        telefono_whatsapp: telefono.trim(),
        email: email.trim() || undefined,
        metodo_entrega: metodoEntrega,
        direccion_entrega: metodoEntrega === "DOMICILIO" ? direccion.trim() : undefined,
        items: cart.map((i) => ({ id: i.id, qty: i.qty })),
      });

      const resolvedId =
        ordenResult?.id ||
        ordenResult?.orden?.id ||
        (typeof ordenResult === "number" ? ordenResult : undefined);

      setSavedOrdenId(resolvedId);

      // 2. Generar la orden / preferencia en Mercado Pago con los ítems del carrito
      const pref = await crearPreferenciaMercadoPago({
        orden_id: resolvedId,
        items: cart.map((i) => ({
          id: i.id,
          title: i.name,
          quantity: i.qty,
          unit_price: i.price,
        })),
        titulo: `Carrito de Productos (${cart.length} artículos)`,
      });

      setPreferenciaMP(pref);
      setCheckoutStep("mp_checkout");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al conectar con la pasarela de Mercado Pago.");
    } finally {
      setCargandoMP(false);
    }
  };

  const handleSimularAprobacionMP = async () => {
    if (!preferenciaMP?.referencia) return;
    try {
      await confirmarPagoSimulado(preferenciaMP.referencia);
      setPagoAprobado(true);
      onClearCart?.();
      setTimeout(() => {
        setCheckoutStep("success");
      }, 1200);
    } catch (err: any) {
      alert("Error al simular pago: " + err.message);
    }
  };

  const handleCloseAndReset = () => {
    setCheckoutStep("cart");
    setErrorMsg(null);
    setPreferenciaMP(null);
    setPagoAprobado(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="drawer-backdrop" onClick={handleCloseAndReset} />
      <div className="drawer">
        <div className="drawer-header">
          <h3 className="font-display text-2xl font-bold">Carrito de Compras</h3>
          <button onClick={handleCloseAndReset} className="close-btn">
            ×
          </button>
        </div>

        {checkoutStep === "success" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm">
              ✓
            </div>
            <h4 className="font-display text-2xl font-bold text-rust mb-2">¡Orden Confirmada!</h4>
            <p className="copy text-sm mb-6">
              Tu orden ha sido registrada exitosamente en PostgreSQL y el stock de los productos ha sido actualizado.
            </p>
            <button onClick={handleCloseAndReset} className="btn btn-primary w-full">
              Volver a la tienda
            </button>
          </div>
        ) : checkoutStep === "mp_checkout" ? (
          /* PASO: CHECKOUT DE MERCADO PAGO SANDBOX */
          <div className="flex-1 flex flex-col p-6 space-y-5 overflow-y-auto animate-in fade-in duration-300">
            <div className="bg-[#009EE3]/10 p-5 rounded-3xl border border-[#009EE3]/30 text-center space-y-3">
              <span className="text-4xl block">💳</span>
              <h4 className="font-display text-xl font-bold text-charcoal">
                Pasarela Mercado Pago
              </h4>
              <p className="text-xs text-charcoal/70">
                Tu orden está lista. Puedes realizar el pago de prueba en el entorno Sandbox o simular la aprobación inmediata.
              </p>
              <div className="bg-white p-3 rounded-2xl border border-charcoal/10 text-xs">
                <span className="text-charcoal/60">Total a Pagar: </span>
                <span className="font-extrabold text-rust text-base">
                  ${totalPrice.toLocaleString("es-CO")}
                </span>
              </div>
            </div>

            {/* BOTÓN Y ACCIONES DE MERCADO PAGO */}
            {preferenciaMP && (
              <MercadoPagoButton
                initPoint={preferenciaMP.init_point}
                sandboxInitPoint={preferenciaMP.sandbox_init_point}
                monto={preferenciaMP.monto_total || totalPrice}
                ordenId={savedOrdenId || preferenciaMP.orden_id}
                referencia={preferenciaMP.referencia}
                text="Abrir Checkout de Mercado Pago"
                tarjetasPrueba={preferenciaMP.tarjetas_prueba}
                onSimularAprobacion={handleSimularAprobacionMP}
                onPagoExitoso={() => {
                  setPagoAprobado(true);
                  onClearCart?.();
                  setTimeout(() => {
                    setCheckoutStep("success");
                  }, 1200);
                }}
                pagoAprobado={pagoAprobado}
              />
            )}

            <button
              type="button"
              onClick={() => setCheckoutStep("form")}
              className="btn btn-outline w-full text-xs py-2.5 mt-auto"
            >
              ← Modificar datos de entrega
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center muted text-center p-8">
            <div>
              <div className="text-4xl mb-3">🛒</div>
              <p>Tu carrito está vacío</p>
            </div>
          </div>
        ) : checkoutStep === "form" ? (
          <form onSubmit={handleFinishPurchase} className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
            <h4 className="font-semibold text-sm border-b border-charcoal/10 pb-2">
              Datos para confirmar tu pedido
            </h4>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="field-label">Nombre Completo *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="field"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Teléfono WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: +57 300 123 4567"
                  className="field"
                />
              </div>
              <div>
                <label className="field-label">Email (opcional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="field"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Método de Entrega</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoEntrega("RETIRO_LOCAL")}
                  className={`choice py-2 text-xs ${metodoEntrega === "RETIRO_LOCAL" ? "choice-on-solid" : "choice-idle"}`}
                >
                  Retiro en local
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoEntrega("DOMICILIO")}
                  className={`choice py-2 text-xs ${metodoEntrega === "DOMICILIO" ? "choice-on-solid" : "choice-idle"}`}
                >
                  Envío a domicilio
                </button>
              </div>
            </div>

            {metodoEntrega === "DOMICILIO" && (
              <div>
                <label className="field-label">Dirección de entrega *</label>
                <input
                  type="text"
                  required
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, número, depto..."
                  className="field"
                />
              </div>
            )}

            {/* SELECCIÓN DE MÉTODO DE PAGO */}
            <div className="border-t border-charcoal/10 pt-3">
              <label className="field-label">Forma de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoPago("MERCADO_PAGO")}
                  className={`choice py-2.5 text-xs flex flex-col items-center gap-1 ${
                    metodoPago === "MERCADO_PAGO"
                      ? "border-[#009EE3] bg-[#009EE3]/10 ring-1 ring-[#009EE3] text-[#007EB5] font-bold"
                      : "choice-idle"
                  }`}
                >
                  <span className="text-base">💳</span>
                  <span>Mercado Pago</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPago("LOCAL")}
                  className={`choice py-2.5 text-xs flex flex-col items-center gap-1 ${
                    metodoPago === "LOCAL" ? "choice-on-solid" : "choice-idle"
                  }`}
                >
                  <span className="text-base">💵</span>
                  <span>En el Local</span>
                </button>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-charcoal/10">
              <div className="flex justify-between mb-4 text-lg font-bold">
                <span>Total a Pagar</span>
                <span className="text-rust">${totalPrice.toLocaleString("es-CO")}</span>
              </div>
              <button
                type="submit"
                disabled={submitting || cargandoMP || !nombre.trim() || !telefono.trim()}
                className={`btn w-full disabled:opacity-50 ${
                  metodoPago === "MERCADO_PAGO" ? "bg-[#009EE3] text-white hover:bg-[#007EB5]" : "btn-primary"
                }`}
              >
                {cargandoMP
                  ? "Conectando con Mercado Pago..."
                  : submitting
                  ? "Guardando orden en PostgreSQL..."
                  : metodoPago === "MERCADO_PAGO"
                  ? "Continuar al Pago con Mercado Pago →"
                  : "Confirmar Orden (Pago Local)"}
              </button>
              <button
                type="button"
                onClick={() => setCheckoutStep("cart")}
                className="btn btn-outline w-full mt-2 text-xs"
              >
                ← Volver al carrito
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {cart.map((item) => {
                const subtotal = item.price * item.qty;
                const atStockLimit = item.stock !== undefined && item.qty >= item.stock;
                const atMinLimit = item.qty <= 1;

                return (
                  <div key={item.id} className="list-item flex-col gap-2">
                    {/* Fila superior: nombre + botón eliminar con icono papelera */}
                    <div className="flex items-start justify-between w-full gap-2">
                      <p className="font-medium text-sm leading-tight flex-1">{item.name}</p>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="text-charcoal/40 hover:text-rust p-1.5 rounded-lg hover:bg-rust/10 transition-colors shrink-0"
                        aria-label={`Eliminar ${item.name} del carrito`}
                        title={`Eliminar ${item.name} del carrito`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Fila inferior: controles de cantidad (+/-) + subtotal */}
                    <div className="flex items-center justify-between w-full gap-3">
                      {/* Selector de cantidad compacto */}
                      <div className="flex items-center gap-1 bg-charcoal/5 rounded-lg p-0.5 border border-charcoal/10">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, item.qty - 1)}
                          disabled={atMinLimit}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-charcoal hover:bg-rust hover:text-white transition-colors font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-charcoal"
                          aria-label={`Disminuir cantidad de ${item.name}`}
                          title={atMinLimit ? "La cantidad mínima es 1 (usa la papelera para eliminar)" : undefined}
                        >
                          −
                        </button>
                        <span
                          className="w-7 text-center text-sm font-semibold tabular-nums select-none"
                          aria-label={`Cantidad: ${item.qty}`}
                        >
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, item.qty + 1)}
                          disabled={atStockLimit}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-charcoal hover:bg-rust hover:text-white transition-colors font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-charcoal"
                          aria-label={`Aumentar cantidad de ${item.name}`}
                          title={atStockLimit ? `Stock máximo alcanzado (${item.stock} disponibles)` : undefined}
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal dinámico de la línea */}
                      <p className="price text-sm font-semibold">
                        ${subtotal.toLocaleString("es-CO")}
                      </p>
                    </div>

                    {/* Precio unitario y aviso de stock */}
                    <p className="text-xs text-charcoal/50 w-full flex items-center justify-between">
                      <span>${item.price.toLocaleString("es-CO")} c/u</span>
                      {atStockLimit && (
                        <span className="text-rust font-medium">Stock máx. alcanzado</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="drawer-footer">
              <div className="flex justify-between mb-4 text-lg font-bold">
                <span>Total</span>
                <span className="text-rust">${totalPrice.toLocaleString("es-CO")}</span>
              </div>
              <button onClick={() => setCheckoutStep("form")} className="btn btn-primary w-full">
                Finalizar Compra
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
