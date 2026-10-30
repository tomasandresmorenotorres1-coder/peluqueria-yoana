import { useState } from "react";
import type { CartItem, OrderRequest } from "@/types";

type CartDrawerProps = {
  open: boolean;
  cart: CartItem[];
  totalPrice: number;
  submitting?: boolean;
  onClose: () => void;
  onRemove: (id: number) => void;
  onCheckout: (data: OrderRequest) => Promise<boolean>;
};

export default function CartDrawer({
  open,
  cart,
  totalPrice,
  submitting,
  onClose,
  onRemove,
  onCheckout,
}: CartDrawerProps) {
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "form" | "success">("cart");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [metodoEntrega, setMetodoEntrega] = useState<"RETIRO_LOCAL" | "DOMICILIO">("RETIRO_LOCAL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleFinishPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) {
      setErrorMsg("Nombre y teléfono de WhatsApp son obligatorios");
      return;
    }
    setErrorMsg(null);

    const success = await onCheckout({
      nombre_completo: nombre.trim(),
      telefono_whatsapp: telefono.trim(),
      metodo_entrega: metodoEntrega,
      direccion_entrega: metodoEntrega === "DOMICILIO" ? direccion.trim() : undefined,
      items: cart.map((i) => ({ id: i.id, qty: i.qty })),
    });

    if (success) {
      setCheckoutStep("success");
    }
  };

  const handleCloseAndReset = () => {
    setCheckoutStep("cart");
    setErrorMsg(null);
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h4 className="font-display text-2xl font-bold text-rust mb-2">¡Orden Confirmada!</h4>
            <p className="copy text-sm mb-6">
              Tu orden ha sido registrada exitosamente en PostgreSQL y el stock de los productos ha sido actualizado.
            </p>
            <button onClick={handleCloseAndReset} className="btn btn-primary w-full">
              Volver a la tienda
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
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
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

            <div>
              <label className="field-label">Teléfono WhatsApp *</label>
              <input
                type="tel"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: +54 9 11 1234-5678"
                className="field"
              />
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

            <div className="mt-auto pt-4 border-t border-charcoal/10">
              <div className="flex justify-between mb-4 text-lg font-bold">
                <span>Total a Pagar</span>
                <span className="text-rust">${totalPrice.toLocaleString("es-CO")}</span>
              </div>
              <button
                type="submit"
                disabled={submitting || !nombre.trim() || !telefono.trim()}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {submitting ? "Guardando orden en PostgreSQL..." : "Confirmar Orden"}
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
              {cart.map((item) => (
                <div key={item.id} className="list-item">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="price text-sm font-normal">
                      ${item.price.toLocaleString("es-CO")} × {item.qty}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-charcoal/40 hover:text-rust transition-colors text-lg"
                    title="Eliminar producto"
                  >
                    ×
                  </button>
                </div>
              ))}
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
