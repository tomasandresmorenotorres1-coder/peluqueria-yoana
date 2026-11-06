import type {
  AdminResena,
  AdminTurno,
  AdminUsuario,
  BookingRequest,
  CitaEspecialista,
  Comment,
  DiaHorario,
  GalleryItem,
  HeroStats,
  OrderRequest,
  PreferenciaPagoResponse,
  Product,
  Service,
  StaffMember,
  TarjetaPruebaSandbox,
  TurnoCliente,
  User,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'py_auth_token';

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeStoredToken = () => localStorage.removeItem(TOKEN_KEY);

// Datos semilla de resiliencia (para garantizar que NUNCA haya una pantalla en blanco si el servidor está iniciando)
const FALLBACK_STATS: HeroStats = {
  clientesSatisfechos: '+2500',
  aniosExperiencia: '37',
  valoracionPromedio: '4.9 ★',
  totalResenas: 5,
};

const FALLBACK_SERVICES: Service[] = [
  { id: 1, name: "Corte Clásico", desc: "Corte tradicional con tijera y máquina, finalizado con detalles de navaja.", duration: "45 min", price: 25000, icon: "✂️", category: "hombre", img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&h=400&fit=crop&auto=format", rating: 5.0, especialistas_ids: [1, 3, 4] },
  { id: 2, name: "Arreglo de Barba", desc: "Perfilado, recorte y afeitado con navaja recta, toalla caliente incluida.", duration: "30 min", price: 20000, icon: "🪒", category: "hombre", img: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=400&fit=crop&auto=format", rating: 4.8, especialistas_ids: [1, 3] },
  { id: 3, name: "Corte + Barba", desc: "El combo completo: corte a medida más tratamiento completo de barba.", duration: "75 min", price: 50000, icon: "💈", category: "hombre", img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=400&fit=crop&auto=format", rating: 5.0, especialistas_ids: [1, 3] },
  { id: 4, name: "Coloración", desc: "Tinte profesional para cabello o barba con productos de primera calidad.", duration: "90 min", price: 100000, icon: "🎨", category: "unisex", img: "https://images.unsplash.com/photo-1560066984-138daaa70c8f?w=600&h=400&fit=crop&auto=format", rating: 4.9, especialistas_ids: [2, 6] },
  { id: 5, name: "Tratamiento Capilar", desc: "Hidratación profunda, masaje capilar y acondicionamiento con keratina.", duration: "60 min", price: 350000, icon: "🌿", category: "unisex", img: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&h=400&fit=crop&auto=format", rating: 5.0, especialistas_ids: [4, 6] },
  { id: 6, name: "Afeitado con Navaja", desc: "Experiencia completa de afeitado clásico con navaja, espuma caliente y toalla.", duration: "40 min", price: 30000, icon: "⚔️", category: "hombre", img: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=400&fit=crop&auto=format", rating: 4.8, especialistas_ids: [1, 3] },
  { id: 7, name: "Corte Femenino", desc: "Corte personalizado para mujer con técnica en capas, degradados y puntas.", duration: "60 min", price: 80000, icon: "✂️", category: "mujer", img: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&h=400&fit=crop&auto=format", rating: 5.0, especialistas_ids: [3, 4, 6] },
  { id: 8, name: "Keratina Brasileña", desc: "Alisado y nutrición profunda con keratina de alta calidad, elimina el frizz por meses.", duration: "120 min", price: 450000, icon: "💎", category: "mujer", img: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=400&fit=crop&auto=format", rating: 5.0, especialistas_ids: [4] },
  { id: 9, name: "Manicure Completo", desc: "Limado, cutículas, hidratación y esmaltado con esmalte tradicional o semipermanente.", duration: "45 min", price: 45000, icon: "💅", category: "mujer", img: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&h=400&fit=crop&auto=format", rating: 4.9, especialistas_ids: [5] },
  { id: 10, name: "Pedicure Spa", desc: "Baño de pies, exfoliación, masaje relajante y esmaltado con acabado profesional.", duration: "60 min", price: 80000, icon: "🦶", category: "mujer", img: "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=600&h=400&fit=crop&auto=format", rating: 4.8, especialistas_ids: [5] },
  { id: 11, name: "Manicure + Pedicure", desc: "El combo completo de manos y pies, con masaje y esmaltado a elección.", duration: "105 min", price: 120000, icon: "✨", category: "mujer", img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=400&fit=crop&auto=format", rating: 5.0, especialistas_ids: [5] },
  { id: 12, name: "Tinte & Mechas", desc: "Coloración femenina completa: raíces, mechas, babylights o balayage artesanal.", duration: "150 min", price: 750000, icon: "🌈", category: "mujer", img: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&h=400&fit=crop&auto=format", rating: 5.0, especialistas_ids: [2, 6] },
];

const FALLBACK_PRODUCTS: Product[] = [
  { id: 1, name: "Pomada Brillante", brand: "Reuzel", price: 20000, img: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop&auto=format", tag: "Bestseller", category: "hombre", stock: 40 },
  { id: 2, name: "Aceite de Barba", brand: "Apothecary 87", price: 24000, img: "https://images.unsplash.com/photo-1587909209111-5097ee578ec3?w=400&h=400&fit=crop&auto=format", tag: "Nuevo", category: "hombre", stock: 25 },
  { id: 3, name: "Cera Mate", brand: "American Crew", price: 15000, img: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop&auto=format", tag: null, category: "hombre", stock: 30 },
  { id: 4, name: "Bálsamo Hidratante", brand: "Bulldog", price: 30000, img: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop&auto=format", tag: "Oferta", category: "hombre", stock: 20 },
  { id: 5, name: "Espuma de Afeitar", brand: "Proraso", price: 10000, img: "https://images.unsplash.com/photo-1587909209111-5097ee578ec3?w=400&h=400&fit=crop&auto=format", tag: null, category: "hombre", stock: 50 },
  { id: 6, name: "Shampoo Premium", brand: "Jack Black", price: 35000, img: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop&auto=format", tag: "Bestseller", category: "hombre", stock: 15 },
  { id: 7, name: "Keratina Líquida", brand: "Cadiveu", price: 95000, img: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop&auto=format", tag: "Bestseller", category: "mujer", stock: 18 },
  { id: 8, name: "Shampoo Hidratante", brand: "Wella Professionals", price: 30000, img: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop&auto=format", tag: "Nuevo", category: "mujer", stock: 22 },
  { id: 9, name: "Mascarilla Nutritiva", brand: "Kérastase", price: 10000, img: "https://images.unsplash.com/photo-1587909209111-5097ee578ec3?w=400&h=400&fit=crop&auto=format", tag: "Premium", category: "mujer", stock: 12 },
  { id: 10, name: "Aceite de Argán", brand: "Moroccanoil", price: 10000, img: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop&auto=format", tag: "Bestseller", category: "mujer", stock: 35 },
  { id: 11, name: "Acondicionador Sin Sal", brand: "Lola Cosmetics", price: 20000, img: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop&auto=format", tag: null, category: "mujer", stock: 28 },
  { id: 12, name: "Sérum Reparador", brand: "Redken", price: 15000, img: "https://images.unsplash.com/photo-1587909209111-5097ee578ec3?w=400&h=400&fit=crop&auto=format", tag: "Oferta", category: "mujer", stock: 19 },
];

const FALLBACK_STAFF: StaffMember[] = [
  { id: 1, name: "Marco Ríos", role: "Maestro Barbero", exp: "12 años", gender: "M", img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=500&fit=crop&auto=format", servicios_ids: [1, 2, 3, 6] },
  { id: 2, name: "Diego Torres", role: "Especialista en Color", exp: "8 años", gender: "M", img: "https://images.unsplash.com/photo-1647140655214-e4a2d914971f?w=400&h=500&fit=crop&auto=format", servicios_ids: [4, 12] },
  { id: 3, name: "Sebastián Cruz", role: "Estilista Senior", exp: "6 años", gender: "M", img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=500&fit=crop&auto=format", servicios_ids: [1, 7, 2, 3, 6] },
  { id: 4, name: "Yohana Pérez", role: "Maestra Peluquera & Keratinas", exp: "15 años", gender: "F", img: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=500&fit=crop&auto=format", servicios_ids: [5, 8, 7, 1] },
  { id: 5, name: "Valentina López", role: "Manicurista & Nail Art", exp: "7 años", gender: "F", img: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=500&fit=crop&auto=format", servicios_ids: [9, 10, 11] },
  { id: 6, name: "Camila Romero", role: "Colorista & Estilista", exp: "9 años", gender: "F", img: "https://images.unsplash.com/photo-1560066984-138daaa70c8f?w=400&h=500&fit=crop&auto=format", servicios_ids: [4, 5, 7, 12] },
];

const FALLBACK_GALLERY: GalleryItem[] = [
  { id: 1, img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=700&fit=crop&auto=format", alt: "Hombre en silla de barbero", span: "row-span-2" },
  { id: 2, img: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=400&fit=crop&auto=format", alt: "Silla de barbero clásica", span: "" },
  { id: 3, img: "https://images.unsplash.com/photo-1647140655214-e4a2d914971f?w=600&h=400&fit=crop&auto=format", alt: "Barbero cortando cabello", span: "" },
  { id: 4, img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&h=400&fit=crop&auto=format", alt: "Barbero con navaja", span: "" },
];

const FALLBACK_COMMENTS: Comment[] = [
  { id: 1, name: "Martina G.", service: "Keratina Brasileña", rating: 5, text: "Increíble resultado! Mi cabello quedó súper liso y brillante. Yohana es una genia, me explicó todo el proceso y el resultado duró meses. 100% recomendable.", date: "15 ago 2026", avatar: "M" },
  { id: 2, name: "Carlos R.", service: "Corte + Barba", rating: 5, text: "Marco me dejó exactamente el corte que quería. Ya probé muchas barberías y esta es sin dudas la mejor del barrio. El ambiente es increíble.", date: "10 ago 2026", avatar: "C" },
  { id: 3, name: "Sofía V.", service: "Manicure + Pedicure", rating: 5, text: "Valentina es un amor, muy prolija y detallista. El salón está impecable y los precios son muy accesibles para la calidad que ofrecen.", date: "5 ago 2026", avatar: "S" },
  { id: 4, name: "Rodrigo M.", service: "Afeitado con Navaja", rating: 4, text: "Primera vez que me hacen un afeitado con navaja y fue una experiencia relajante. La toalla caliente y la espuma artesanal hicieron la diferencia.", date: "28 jul 2026", avatar: "R" },
  { id: 5, name: "Luciana B.", service: "Tinte & Mechas", rating: 5, text: "Camila me hizo el balayage que tenía en mente hace tiempo. No solo quedó perfecto sino que el cabello quedó super sano. ¡Gracias!", date: "20 jul 2026", avatar: "L" },
];

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Error HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------
// 1. Estadísticas y Métricas del Hero
// ---------------------------------------------------------------------
export async function fetchEstadisticas(): Promise<HeroStats> {
  try {
    const res = await request<{ ok: boolean; data: HeroStats }>('/estadisticas');
    return res.data;
  } catch {
    console.warn('Conectando con datos cacheados de estadísticas...');
    return FALLBACK_STATS;
  }
}

// ---------------------------------------------------------------------
// 2. Servicios del Catálogo (con matriz de especialistas)
// ---------------------------------------------------------------------
export async function fetchServicios(categoria?: string): Promise<Service[]> {
  try {
    const query = categoria && categoria !== 'todos' ? `?categoria=${encodeURIComponent(categoria)}` : '';
    const res = await request<{ ok: boolean; data: Service[] }>(`/catalogo/servicios${query}`);
    return res.data;
  } catch {
    console.warn('Conectando con datos cacheados de servicios...');
    return FALLBACK_SERVICES;
  }
}

// ---------------------------------------------------------------------
// 3. Productos de la Tienda
// ---------------------------------------------------------------------
export async function fetchProductos(categoria?: string): Promise<Product[]> {
  try {
    const query = categoria && categoria !== 'todos' ? `?genero=${encodeURIComponent(categoria)}` : '';
    const res = await request<{ ok: boolean; data: Product[] }>(`/catalogo/productos${query}`);
    return res.data;
  } catch {
    console.warn('Conectando con datos cacheados de productos...');
    return FALLBACK_PRODUCTS;
  }
}

// ---------------------------------------------------------------------
// 4. Equipo de Especialistas (con lista de servicios autorizados)
// ---------------------------------------------------------------------
export async function fetchEquipo(servicioId?: number): Promise<StaffMember[]> {
  try {
    const query = servicioId ? `?servicio_id=${servicioId}` : '';
    const res = await request<{ ok: boolean; data: StaffMember[] }>(`/catalogo/equipo${query}`);
    return res.data;
  } catch {
    console.warn('Conectando con datos cacheados de equipo...');
    if (servicioId) {
      return FALLBACK_STAFF.filter((s) => s.servicios_ids?.includes(servicioId));
    }
    return FALLBACK_STAFF;
  }
}

// ---------------------------------------------------------------------
// 5. Galería de Trabajos
// ---------------------------------------------------------------------
export async function fetchGaleria(): Promise<GalleryItem[]> {
  try {
    const res = await request<{ ok: boolean; data: GalleryItem[] }>('/catalogo/galeria');
    return res.data;
  } catch {
    console.warn('Conectando con datos cacheados de galería...');
    return FALLBACK_GALLERY;
  }
}

// ---------------------------------------------------------------------
// 6. Reseñas y Testimonios
// ---------------------------------------------------------------------
export async function fetchResenas(): Promise<{ comments: Comment[]; promedio: number; total: number }> {
  try {
    const res = await request<{
      ok: boolean;
      data: Comment[];
      estadisticas: { promedio_calificacion: number; total_resenas: number };
    }>('/resenas');

    return {
      comments: res.data,
      promedio: Number(res.estadisticas?.promedio_calificacion || 5),
      total: Number(res.estadisticas?.total_resenas || res.data.length),
    };
  } catch {
    console.warn('Conectando con datos cacheados de reseñas...');
    return {
      comments: FALLBACK_COMMENTS,
      promedio: 4.9,
      total: 5,
    };
  }
}

export async function publicarResena(data: {
  name: string;
  service: string;
  rating: number;
  text: string;
}): Promise<Comment> {
  const res = await request<{ ok: boolean; data: Comment }>('/resenas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

// ---------------------------------------------------------------------
// 7. Disponibilidad y Reserva de Turnos
// ---------------------------------------------------------------------
export async function fetchHorasOcupadas(fecha: string, barberoNombre?: string, servicioId?: number): Promise<string[]> {
  try {
    const params = new URLSearchParams({ fecha });
    if (barberoNombre) params.append('barbero_nombre', barberoNombre);
    if (servicioId) params.append('servicio_id', String(servicioId));

    const res = await request<{ ok: boolean; horas_ocupadas: string[] }>(`/turnos/disponibilidad?${params.toString()}`);
    return res.horas_ocupadas || [];
  } catch {
    return [];
  }
}

export async function crearReservaTurno(data: BookingRequest): Promise<{ turno: any; whatsapp_url: string }> {
  const res = await request<{ ok: boolean; data: any; whatsapp_url: string }>('/turnos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return { turno: res.data, whatsapp_url: res.whatsapp_url };
}

// ---------------------------------------------------------------------
// 8. Crear Orden de Productos desde el Carrito
// ---------------------------------------------------------------------
export async function crearOrdenCompra(data: OrderRequest): Promise<{ orden: any }> {
  const res = await request<{ ok: boolean; data: any }>('/pagos/ordenes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return { orden: res.data };
}

// ---------------------------------------------------------------------
// 9. AUTENTICACIÓN: LOGIN Y REGISTRO CON PIN
// ---------------------------------------------------------------------
export async function loginUsuario(email: string, password: string): Promise<{ token: string; usuario: User }> {
  const res = await request<{ ok: boolean; token: string; usuario: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.token) {
    setStoredToken(res.token);
  }
  return { token: res.token, usuario: res.usuario };
}

export async function solicitarPinRegistro(data: {
  nombre_completo: string;
  telefono_whatsapp: string;
  email: string;
  password: string;
}): Promise<{ ok: boolean; mensaje: string; email: string }> {
  return request<{ ok: boolean; mensaje: string; email: string }>('/auth/solicitar-pin-registro', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function verificarPinRegistro(email: string, pin: string): Promise<{ token: string; usuario: User }> {
  const res = await request<{ ok: boolean; token: string; usuario: User }>('/auth/verificar-pin', {
    method: 'POST',
    body: JSON.stringify({ email, pin }),
  });
  if (res.token) {
    setStoredToken(res.token);
  }
  return { token: res.token, usuario: res.usuario };
}

export async function fetchMiPerfil(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await request<{ ok: boolean; usuario: User }>('/auth/me');
    return res.usuario;
  } catch {
    removeStoredToken();
    return null;
  }
}

export function cerrarSesion(): void {
  removeStoredToken();
}

// ---------------------------------------------------------------------
// 10. CLIENTE: MIS RESERVAS
// ---------------------------------------------------------------------
export async function fetchMisReservas(): Promise<TurnoCliente[]> {
  const res = await request<{ ok: boolean; data: TurnoCliente[] }>('/turnos/mis-reservas');
  return res.data;
}

export async function cancelarMiReserva(id: number): Promise<void> {
  await request<{ ok: boolean }>(`/turnos/${id}/cancelar`, {
    method: 'PATCH',
  });
}

// ---------------------------------------------------------------------
// 11. ESPECIALISTA: PANEL DE GESTIÓN DE CITAS Y HORARIOS
// ---------------------------------------------------------------------
export async function fetchMisCitasEspecialista(params?: { fecha?: string; estado?: string }): Promise<CitaEspecialista[]> {
  const q = new URLSearchParams();
  if (params?.fecha) q.append('fecha', params.fecha);
  if (params?.estado) q.append('estado', params.estado);
  const query = q.toString() ? `?${q.toString()}` : '';
  const res = await request<{ ok: boolean; data: CitaEspecialista[] }>(`/especialista/mis-citas${query}`);
  return res.data;
}

export async function cambiarEstadoCitaEspecialista(id: number, estado: 'CONFIRMADO' | 'COMPLETADO' | 'CANCELADO'): Promise<void> {
  await request<{ ok: boolean }>(`/especialista/mis-citas/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

export async function fetchMisHorariosEspecialista(): Promise<{ personalizado: boolean; dias: DiaHorario[] }> {
  const res = await request<{ ok: boolean; data: { personalizado: boolean; dias: DiaHorario[] } }>('/especialista/mis-horarios');
  return res.data;
}

export async function guardarMisHorariosEspecialista(dias: DiaHorario[]): Promise<{ personalizado: boolean; dias: DiaHorario[] }> {
  const res = await request<{ ok: boolean; data: { personalizado: boolean; dias: DiaHorario[] } }>('/especialista/mis-horarios', {
    method: 'PUT',
    body: JSON.stringify({ dias }),
  });
  return res.data;
}

export async function fetchMisBloqueosEspecialista(): Promise<any[]> {
  const res = await request<{ ok: boolean; data: any[] }>('/especialista/mis-bloqueos');
  return res.data;
}

export async function crearBloqueoEspecialista(datos: {
  fecha: string;
  hora_inicio?: string;
  hora_fin?: string;
  motivo?: string;
}): Promise<any> {
  const res = await request<{ ok: boolean; data: any }>('/especialista/mis-bloqueos', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  return res.data;
}

export async function eliminarBloqueoEspecialista(id: number): Promise<void> {
  await request<{ ok: boolean }>(`/especialista/mis-bloqueos/${id}`, {
    method: 'DELETE',
  });
}

// Re-export para que los componentes lo importen desde un único lugar
export type { TarjetaPruebaSandbox };

// ---------------------------------------------------------------------
// 12. PASARELA DE PAGO MERCADO PAGO
// ---------------------------------------------------------------------
export async function crearPreferenciaMercadoPago(data: {
  turno_id?: number;
  orden_id?: number;
  monto?: number;
  titulo?: string;
  es_abono?: boolean;
}): Promise<PreferenciaPagoResponse> {
  // Intentar primero el endpoint principal (crear-orden); en caso de fallo
  // hacer fallback al alias crear-preferencia para compatibilidad hacia atrás.
  const res = await request<{ ok: boolean; data: PreferenciaPagoResponse }>('/pagos/crear-orden', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function confirmarPagoSimulado(referencia: string): Promise<void> {
  await request<{ ok: boolean }>('/pagos/confirmar-pago', {
    method: 'POST',
    body: JSON.stringify({ referencia_transaccion: referencia, estado: 'APROBADO' }),
  });
}

// ---------------------------------------------------------------------
// 13. MÓDULO ADMINISTRADOR (/api/admin)
// ---------------------------------------------------------------------

export async function fetchAdminTurnos(filtros?: {
  fecha?: string;
  estado?: string;
  equipo_id?: number;
}): Promise<AdminTurno[]> {
  const params = new URLSearchParams();
  if (filtros?.fecha) params.append('fecha', filtros.fecha);
  if (filtros?.estado) params.append('estado', filtros.estado);
  if (filtros?.equipo_id) params.append('equipo_id', filtros.equipo_id.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await request<{ ok: boolean; data: AdminTurno[] }>(`/admin/turnos${query}`);
  return res.data;
}

export async function cambiarEstadoTurnoAdmin(
  id: number,
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'COMPLETADO' | 'CANCELADO'
): Promise<void> {
  await request<{ ok: boolean }>(`/admin/turnos/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

export async function fetchAdminUsuarios(rol?: string): Promise<AdminUsuario[]> {
  const query = rol ? `?rol=${encodeURIComponent(rol)}` : '';
  const res = await request<{ ok: boolean; data: AdminUsuario[] }>(`/admin/usuarios${query}`);
  return res.data;
}

export async function crearAdminUsuario(datos: {
  nombre_completo: string;
  email: string;
  password: string;
  rol: 'ADMIN' | 'ESTILISTA' | 'CLIENTE';
  equipo_id?: number;
  telefono_whatsapp?: string;
}): Promise<AdminUsuario> {
  const res = await request<{ ok: boolean; data: AdminUsuario }>('/admin/usuarios', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  return res.data;
}

export async function actualizarAdminUsuario(
  id: number,
  datos: { activo?: boolean; nombre_completo?: string; nueva_password?: string }
): Promise<AdminUsuario> {
  const res = await request<{ ok: boolean; data: AdminUsuario }>(`/admin/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  });
  return res.data;
}

export async function crearAdminServicio(datos: {
  categoria_id: number;
  nombre: string;
  descripcion: string;
  precio_actual: number;
  duracion_minutos: number;
  texto_alternativo: string;
  icono?: string;
  genero?: string;
}): Promise<any> {
  const res = await request<{ ok: boolean; data: any }>('/admin/servicios', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  return res.data;
}

export async function editarAdminServicio(id: number, datos: Record<string, any>): Promise<any> {
  const res = await request<{ ok: boolean; data: any }>(`/admin/servicios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
  return res.data;
}

export async function cambiarActivoServicio(id: number, activo: boolean): Promise<any> {
  const res = await request<{ ok: boolean; data: any }>(`/admin/servicios/${id}/activo`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  });
  return res.data;
}

export async function crearAdminProducto(datos: {
  categoria_id: number;
  nombre: string;
  precio_actual: number;
  imagen_url: string;
  texto_alternativo: string;
  marca?: string;
  descripcion?: string;
  stock?: number;
  etiqueta?: string;
  genero?: string;
}): Promise<any> {
  const res = await request<{ ok: boolean; data: any }>('/admin/productos', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  return res.data;
}

export async function editarAdminProducto(id: number, datos: Record<string, any>): Promise<any> {
  const res = await request<{ ok: boolean; data: any }>(`/admin/productos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
  return res.data;
}

export async function cambiarActivoProducto(id: number, activo: boolean): Promise<any> {
  const res = await request<{ ok: boolean; data: any }>(`/admin/productos/${id}/activo`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  });
  return res.data;
}

export async function fetchAdminResenas(): Promise<AdminResena[]> {
  const res = await request<{ ok: boolean; data: AdminResena[] }>('/admin/resenas');
  return res.data;
}

export async function cambiarAprobacionResena(id: number, aprobada: boolean): Promise<any> {
  const res = await request<{ ok: boolean; data: any }>(`/admin/resenas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ aprobada }),
  });
  return res.data;
}
