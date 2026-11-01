export const NAV_LINKS = ["Servicios", "Reservar", "Productos", "Equipo", "Galería", "Comentarios"];

// Número de WhatsApp de la peluquería (con indicativo y sin +, ej: 573001234567).
// Se configura en frontend/.env con VITE_WHATSAPP_NUMBER. Si falta, el botón de WhatsApp no se muestra.
export const WHATSAPP_NUMBER: string = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || "";

export const TIMES = ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"];
