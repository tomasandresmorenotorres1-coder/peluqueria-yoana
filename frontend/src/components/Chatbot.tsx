import { useState, useRef, useEffect } from "react";
import type { Service } from "@/types";

type Message = {
  id: string;
  sender: "bot" | "user";
  text: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type ChatbotProps = {
  services: Service[];
  onSelectServiceAndBook: (serviceId: number) => void;
  onScrollToBooking: () => void;
};

export default function Chatbot({
  services,
  onSelectServiceAndBook,
  onScrollToBooking,
}: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "¡Hola! 👋 Soy el asistente virtual de Peluquería Yohana. ¿En qué puedo ayudarte hoy?",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");

    // Generar respuesta inteligente
    setTimeout(() => {
      responderPregunta(text.toLowerCase());
    }, 450);
  };

  const responderPregunta = (query: string) => {
    let replyText = "";
    let action: Message["action"] = undefined;

    if (query.includes("horario") || query.includes("hora") || query.includes("abren") || query.includes("cierran")) {
      replyText = "🕒 Atendemos de Lunes a Sábado de 9:00 a 20:00 hs con agenda previa.";
    } else if (query.includes("ubicacion") || query.includes("donde") || query.includes("dirección") || query.includes("direccion") || query.includes("queda")) {
      replyText = "📍 Estamos ubicados en Av. Corrientes 1234, CABA. Fácil acceso y estacionamiento cercano.";
    } else if (query.includes("pago") || query.includes("mercadopago") || query.includes("tarjeta") || query.includes("precio") || query.includes("efectivo")) {
      replyText = "💳 Aceptamos Mercado Pago (tarjetas de crédito, débito), Transferencias bancarias y Efectivo en el local. ¡Incluso puedes abonar o pagar tu turno en línea!";
    } else if (query.includes("agendar") || query.includes("cita") || query.includes("turno") || query.includes("reserva")) {
      replyText = "📅 ¡Con gusto! Puedes seleccionar el servicio y el especialista que prefieras en nuestro calendario en tiempo real.";
      action = {
        label: "Ir al formulario de reservas",
        onClick: () => {
          setIsOpen(false);
          onScrollToBooking();
        },
      };
    } else if (query.includes("corte clasico") || query.includes("corte clásico")) {
      const s = services.find((srv) => srv.id === 1);
      replyText = `✂️ El Corte Clásico cuesta $${Number(s?.price || 25000).toLocaleString("es-CO")} y dura 45 min. ¿Deseas agendarlo ahora?`;
      action = {
        label: "Agendar Corte Clásico",
        onClick: () => {
          setIsOpen(false);
          onSelectServiceAndBook(1);
        },
      };
    } else if (query.includes("barba")) {
      const s = services.find((srv) => srv.id === 2);
      replyText = `🪒 El Arreglo de Barba incluye toalla caliente y navaja recta ($${Number(s?.price || 20000).toLocaleString("es-CO")}).`;
      action = {
        label: "Agendar Arreglo de Barba",
        onClick: () => {
          setIsOpen(false);
          onSelectServiceAndBook(2);
        },
      };
    } else if (query.includes("color") || query.includes("tinte") || query.includes("mechas")) {
      replyText = "🎨 Contamos con Diego Torres y Camila Romero, nuestros especialistas en coloración y mechas.";
      action = {
        label: "Agendar Coloración",
        onClick: () => {
          setIsOpen(false);
          onSelectServiceAndBook(4);
        },
      };
    } else if (query.includes("keratina") || query.includes("alisado")) {
      replyText = "💎 Nuestra Maestra Peluquera Yohana Pérez realiza la Keratina Brasileña de alta nutrición y alisado prolongado.";
      action = {
        label: "Agendar Keratina",
        onClick: () => {
          setIsOpen(false);
          onSelectServiceAndBook(8);
        },
      };
    } else if (query.includes("manicure") || query.includes("pedicure") || query.includes("uñas")) {
      replyText = "💅 Valentina López es nuestra especialista en Manicure y Pedicure Spa con técnicas tradicionales y semipermanentes.";
      action = {
        label: "Agendar Manicure",
        onClick: () => {
          setIsOpen(false);
          onSelectServiceAndBook(9);
        },
      };
    } else if (query.includes("servicio") || query.includes("que hacen") || query.includes("catalogo")) {
      replyText = "Ofrecemos barbería tradicional, estilismo femenino, coloración profesional, tratamientos capilares, keratina, manicure y pedicure.";
      action = {
        label: "Ver Catálogo Completo",
        onClick: () => {
          setIsOpen(false);
          onScrollToBooking();
        },
      };
    } else {
      replyText = "Entiendo tu consulta. Puedes consultarnos por nuestros horarios, ubicación, métodos de pago o directamente agendar un turno.";
      action = {
        label: "📅 Agendar mi cita ahora",
        onClick: () => {
          setIsOpen(false);
          onScrollToBooking();
        },
      };
    }

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: "bot",
      text: replyText,
      action,
    };

    setMessages((prev) => [...prev, botMsg]);
  };

  return (
    <>
      {/* BOTÓN FLOTANTE PARA ABRIR CHATBOT (colocado a la derecha, arriba de WhatsApp) */}
      <div className="fixed bottom-24 right-6 z-40">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-14 h-14 rounded-full bg-charcoal text-white hover:bg-charcoal/90 border-2 border-gold shadow-2xl flex items-center justify-center text-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 group relative"
          aria-label="Abrir asistente virtual"
        >
          {isOpen ? "✕" : "🤖"}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      </div>

      {/* VENTANA FLOTANTE DEL CHATBOT */}
      {isOpen && (
        <div className="fixed bottom-40 right-6 z-50 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gold/40 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 max-h-[500px]">
          {/* HEADER DEL CHAT */}
          <div className="bg-charcoal text-white p-4 flex items-center justify-between border-b border-gold/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-xl border border-gold/40">
                💈
              </div>
              <div>
                <p className="font-bold text-xs tracking-wide">Asistente Yohana</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-white/70">En línea para ayudarte</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* STREAM DE MENSAJES */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#fdfbf7] text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.sender === "user"
                      ? "bg-rust text-white rounded-br-none shadow-sm font-medium"
                      : "bg-white text-charcoal rounded-bl-none shadow-sm border border-gold/20"
                  }`}
                >
                  {m.text}
                </div>

                {m.action && (
                  <button
                    onClick={m.action.onClick}
                    className="mt-2 px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-charcoal border border-gold/40 rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <span>{m.action.label}</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* PREGUNTAS RÁPIDAS (FAQS) */}
          <div className="p-2.5 bg-white border-t border-charcoal/10 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleSend("¿Cuáles son los horarios?")}
              className="px-2.5 py-1 bg-bone hover:bg-bone/80 text-charcoal rounded-full font-semibold whitespace-nowrap border border-charcoal/10"
            >
              🕒 Horarios
            </button>
            <button
              onClick={() => handleSend("¿Dónde están ubicados?")}
              className="px-2.5 py-1 bg-bone hover:bg-bone/80 text-charcoal rounded-full font-semibold whitespace-nowrap border border-charcoal/10"
            >
              📍 Ubicación
            </button>
            <button
              onClick={() => handleSend("¿Qué métodos de pago tienen?")}
              className="px-2.5 py-1 bg-bone hover:bg-bone/80 text-charcoal rounded-full font-semibold whitespace-nowrap border border-charcoal/10"
            >
              💳 Pagos
            </button>
            <button
              onClick={() => handleSend("Quiero agendar una cita")}
              className="px-2.5 py-1 bg-rust/10 text-rust hover:bg-rust/20 rounded-full font-bold whitespace-nowrap border border-rust/30"
            >
              📅 Agendar
            </button>
          </div>

          {/* INPUT DE CHAT */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-charcoal/10 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Escribe tu consulta..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3.5 py-2 border border-charcoal/20 rounded-xl text-xs outline-none focus:border-rust"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-3.5 py-2 bg-rust hover:bg-rust-dark text-white rounded-xl font-bold text-xs transition-colors disabled:opacity-40"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
