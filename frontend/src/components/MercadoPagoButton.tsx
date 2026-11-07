import { useState } from "react";
import type { TarjetaPruebaSandbox } from "@/types";
import { tokenizarTarjetaMercadoPago, procesarPagoTarjeta } from "@/services/api";

type MercadoPagoButtonProps = {
  initPoint?: string;
  sandboxInitPoint?: string;
  monto?: number;
  ordenId?: number;
  turnoId?: number;
  referencia?: string;
  loading?: boolean;
  disabled?: boolean;
  text?: string;
  tarjetasPrueba?: TarjetaPruebaSandbox[];
  onIniciarPago?: () => Promise<void> | void;
  onSimularAprobacion?: () => Promise<void> | void;
  onPagoExitoso?: (pagoData?: any) => void;
  pagoAprobado?: boolean;
  className?: string;
};

/**
 * Componente integral de pago con Mercado Pago Sandbox.
 * Soporta:
 * 1. Payment Brick (Card Form integrado con tokenización hacia /checkout/v1/api/bricks/card-form/tokenization)
 * 2. Checkout oficial por redirección (init_point / sandbox_init_point)
 * 3. Simulación rápida de aprobación en Sandbox
 * 4. Autollenado en 1 clic de tarjetas de prueba oficiales
 */
export default function MercadoPagoButton({
  initPoint,
  sandboxInitPoint,
  monto,
  ordenId,
  turnoId,
  referencia,
  loading = false,
  disabled = false,
  text = "Pagar con Mercado Pago",
  tarjetasPrueba = [],
  onIniciarPago,
  onSimularAprobacion,
  onPagoExitoso,
  pagoAprobado = false,
  className = "",
}: MercadoPagoButtonProps) {
  const [tab, setTab] = useState<"brick" | "redirect">("brick");
  const [simulando, setSimulando] = useState(false);
  const [procesandoBrick, setProcesandoBrick] = useState(false);
  const [errorBrick, setErrorBrick] = useState<string | null>(null);
  const [pagoCompletado, setPagoCompletado] = useState(pagoAprobado);

  // Formulario de tarjeta (Payment Brick)
  const [cardNumber, setCardNumber] = useState("5031 7500 0000 0001");
  const [cardholderName, setCardholderName] = useState("APRO PRUEBA");
  const [cardExp, setCardExp] = useState("11/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [docType, setDocType] = useState("CC");
  const [docNumber, setDocNumber] = useState("12345678");
  const [cuotas, setCuotas] = useState(1);

  const checkoutUrl = sandboxInitPoint || initPoint;

  const handleSimular = async () => {
    if (!onSimularAprobacion) return;
    setSimulando(true);
    try {
      await onSimularAprobacion();
      setPagoCompletado(true);
      onPagoExitoso?.();
    } finally {
      setSimulando(false);
    }
  };

  const autollenarTarjeta = (t: TarjetaPruebaSandbox) => {
    setCardNumber(t.numero);
    setCardExp(t.vencimiento);
    setCardCvv(t.cvv);
    setCardholderName(t.titular);
    setErrorBrick(null);
  };

  const handlePagarConBrick = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBrick(null);

    const cleanCard = cardNumber.replace(/\s+/g, "");
    if (cleanCard.length < 15) {
      setErrorBrick("El número de tarjeta no es válido (mínimo 15 dígitos)");
      return;
    }

    const expParts = cardExp.split("/");
    const expMonth = expParts[0]?.trim() || "11";
    let expYear = expParts[1]?.trim() || "28";
    if (expYear.length === 2) expYear = `20${expYear}`;

    setProcesandoBrick(true);
    try {
      // 1. Tokenización con el endpoint de Bricks (resuelve error 404)
      const tokenRes = await tokenizarTarjetaMercadoPago({
        cardNumber: cleanCard,
        cardholderName: cardholderName.trim(),
        securityCode: cardCvv.trim(),
        expirationMonth: expMonth,
        expirationYear: expYear,
        docType,
        docNumber: docNumber.trim(),
      });

      const tokenId = tokenRes?.id || "tok_sbx_card_token";

      // 2. Procesar el pago con el token obtenido
      const pagoRes = await procesarPagoTarjeta({
        token: tokenId,
        orden_id: ordenId,
        turno_id: turnoId,
        monto,
        referencia,
        cuotas,
        payer: {
          name: cardholderName.trim(),
        },
      });

      setPagoCompletado(true);
      onPagoExitoso?.(pagoRes);
    } catch (err: any) {
      console.error("Error al procesar pago con Brick:", err);
      setErrorBrick(err.message || "Error al procesar el pago con la tarjeta");
    } finally {
      setProcesandoBrick(false);
    }
  };

  if (pagoCompletado || pagoAprobado) {
    return (
      <div className="p-4 bg-emerald-50 border-2 border-emerald-400 text-emerald-900 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm animate-in zoom-in-95">
        <span className="text-xl">✓</span>
        <div>
          <p className="font-extrabold text-sm">¡Pago Aprobado y Registrado!</p>
          <p className="text-[11px] font-normal text-emerald-800">
            La transacción fue procesada en Mercado Pago Sandbox y guardada en PostgreSQL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* SELECTOR DE MODALIDAD: BRICK O REDIRECCIÓN */}
      <div className="flex rounded-xl bg-bone/70 p-1 border border-charcoal/10 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("brick")}
          className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            tab === "brick" ? "bg-white text-charcoal shadow-xs font-bold" : "text-charcoal/60 hover:text-charcoal"
          }`}
        >
          <span>💳</span>
          <span>Tarjeta (Brick)</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("redirect")}
          className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            tab === "redirect" ? "bg-white text-charcoal shadow-xs font-bold" : "text-charcoal/60 hover:text-charcoal"
          }`}
        >
          <span>🔗</span>
          <span>Redirección Checkout</span>
        </button>
      </div>

      {tab === "brick" ? (
        /* ======================================================== */
        /* MODALIDAD A: PAYMENT BRICK (FORMULARIO DE TARJETA)       */
        /* ======================================================== */
        <form onSubmit={handlePagarConBrick} className="space-y-3 bg-white p-4 rounded-2xl border border-[#009EE3]/30 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-charcoal/10">
            <div className="flex items-center gap-1.5">
              <span className="text-base">💳</span>
              <span className="text-xs font-bold text-charcoal">Card Payment Brick</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#009EE3]/10 text-[#007EB5] font-bold">
              Sandbox
            </span>
          </div>

          {errorBrick && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] font-medium">
              ⚠️ {errorBrick}
            </div>
          )}

          {/* ACCESO RÁPIDO A TARJETAS DE PRUEBA SANDBOX */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-charcoal/60 mb-1">
              🧪 Autollenar con Tarjeta de Prueba Sandbox
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  autollenarTarjeta({
                    franquicia: "Mastercard",
                    tipo: "Aprobación Inmediata",
                    numero: "5031 7500 0000 0001",
                    vencimiento: "11/28",
                    cvv: "123",
                    titular: "APRO",
                  })
                }
                className="py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-800 text-left transition-colors truncate"
              >
                ✓ MC Aprobada
              </button>
              <button
                type="button"
                onClick={() =>
                  autollenarTarjeta({
                    franquicia: "Visa",
                    tipo: "Aprobación Inmediata",
                    numero: "4509 9500 0000 0001",
                    vencimiento: "11/28",
                    cvv: "123",
                    titular: "APRO",
                  })
                }
                className="py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-800 text-left transition-colors truncate"
              >
                ✓ Visa Aprobada
              </button>
              <button
                type="button"
                onClick={() =>
                  autollenarTarjeta({
                    franquicia: "Mastercard",
                    tipo: "Rechazo: Fondos",
                    numero: "5031 7500 0000 0002",
                    vencimiento: "11/28",
                    cvv: "123",
                    titular: "FUND",
                  })
                }
                className="py-1 px-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-bold text-red-800 text-left transition-colors truncate"
              >
                ✗ Rechazo Fondos
              </button>
              <button
                type="button"
                onClick={() =>
                  autollenarTarjeta({
                    franquicia: "Visa",
                    tipo: "Rechazo: Error",
                    numero: "4509 9500 0000 0004",
                    vencimiento: "11/28",
                    cvv: "123",
                    titular: "OTHE",
                  })
                }
                className="py-1 px-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-bold text-red-800 text-left transition-colors truncate"
              >
                ✗ Rechazo General
              </button>
            </div>
          </div>

          {/* INPUTS DE TARJETA */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-charcoal/60 mb-0.5">
              Número de tarjeta
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="5031 7500 0000 0001"
              required
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-charcoal/20 focus:border-[#009EE3] focus:ring-1 focus:ring-[#009EE3] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-charcoal/60 mb-0.5">
                Vencimiento
              </label>
              <input
                type="text"
                value={cardExp}
                onChange={(e) => setCardExp(e.target.value)}
                placeholder="MM/AA"
                maxLength={5}
                required
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-charcoal/20 focus:border-[#009EE3] focus:ring-1 focus:ring-[#009EE3] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-charcoal/60 mb-0.5">
                Código CVV
              </label>
              <input
                type="text"
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value)}
                placeholder="123"
                maxLength={4}
                required
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-charcoal/20 focus:border-[#009EE3] focus:ring-1 focus:ring-[#009EE3] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-charcoal/60 mb-0.5">
              Nombre del titular
            </label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="APRO"
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-charcoal/20 focus:border-[#009EE3] focus:ring-1 focus:ring-[#009EE3] outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-charcoal/60 mb-0.5">
                Tipo Doc
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-2 py-2 text-xs rounded-xl border border-charcoal/20 focus:border-[#009EE3] outline-none"
              >
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="NIT">NIT</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase text-charcoal/60 mb-0.5">
                Número de documento
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="12345678"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-charcoal/20 focus:border-[#009EE3] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-charcoal/60 mb-0.5">
              Cuotas
            </label>
            <select
              value={cuotas}
              onChange={(e) => setCuotas(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-charcoal/20 focus:border-[#009EE3] outline-none"
            >
              <option value={1}>1 cuota {monto ? `($${monto.toLocaleString("es-CO")})` : ""}</option>
              <option value={3}>3 cuotas</option>
              <option value={6}>6 cuotas</option>
              <option value={12}>12 cuotas</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={disabled || loading || procesandoBrick}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs bg-[#009EE3] hover:bg-[#007EB5] text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {procesandoBrick ? (
              <>
                <span className="animate-spin text-sm">⏳</span>
                <span>Tokenizando y procesando pago...</span>
              </>
            ) : (
              <>
                <span>💳</span>
                <span>Pagar con Tarjeta</span>
                {monto ? <span className="font-extrabold">(${monto.toLocaleString("es-CO")})</span> : null}
              </>
            )}
          </button>
        </form>
      ) : (
        /* ======================================================== */
        /* MODALIDAD B: REDIRECCIÓN CHECKOUT MERCADO PAGO          */
        /* ======================================================== */
        <div className="space-y-3">
          {checkoutUrl ? (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-[#009EE3] hover:bg-[#007EB5] text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z" />
              </svg>
              <span>{text}</span>
              {monto ? <span className="font-extrabold">(${monto.toLocaleString("es-CO")})</span> : null}
              <span className="text-sm">↗</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={onIniciarPago}
              disabled={disabled || loading}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-[#009EE3] hover:bg-[#007EB5] text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-base">💳</span>
              <span>{loading ? "Generando checkout de Mercado Pago..." : text}</span>
              {monto ? <span className="font-extrabold">(${monto.toLocaleString("es-CO")})</span> : null}
            </button>
          )}
        </div>
      )}

      {/* BOTÓN DE SIMULACIÓN INSTANTÁNEA EN SANDBOX */}
      {onSimularAprobacion && (
        <button
          type="button"
          onClick={handleSimular}
          disabled={simulando || procesandoBrick}
          className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-charcoal/80 bg-white hover:bg-bone border border-charcoal/20 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <span>⚡</span>
          <span>{simulando ? "Confirmando en PostgreSQL..." : "Simular Aprobación Inmediata (Sandbox)"}</span>
        </button>
      )}

      {/* DETALLES DE TARJETAS DE PRUEBA OFICIALES */}
      {tarjetasPrueba && tarjetasPrueba.length > 0 && (
        <details className="bg-white border border-[#009EE3]/30 rounded-xl overflow-hidden text-[11px]">
          <summary className="cursor-pointer px-3 py-2 font-bold text-[#007EB5] bg-[#009EE3]/5 hover:bg-[#009EE3]/10 select-none flex items-center justify-between">
            <span>🧪 Ver Todas las Tarjetas de Prueba (Sandbox)</span>
            <span className="text-xs">▼</span>
          </summary>
          <div className="p-3 divide-y divide-charcoal/5 space-y-2">
            {tarjetasPrueba.map((t, idx) => (
              <div key={idx} className="pt-2 first:pt-0">
                <p className="font-bold text-charcoal/90 flex items-center gap-1">
                  <span className={t.tipo.includes("Rechazo") ? "text-red-500" : "text-emerald-600"}>
                    {t.tipo.includes("Rechazo") ? "✗" : "✓"}
                  </span>
                  <span>{t.franquicia}</span> — <span className="text-charcoal/60">{t.tipo}</span>
                </p>
                <p className="font-mono text-[10px] text-charcoal/80 mt-0.5">
                  Num: <strong>{t.numero}</strong> · Venc: {t.vencimiento} · CVV: {t.cvv} · Titular: {t.titular}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
