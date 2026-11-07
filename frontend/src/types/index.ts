export type Product = {
  id: number;
  name: string;
  brand: string;
  price: number;
  img: string;
  tag: string | null;
  category: "hombre" | "mujer";
  stock?: number;
  desc?: string;
  activo?: boolean;
};

export type Service = {
  id: number;
  name: string;
  desc: string;
  duration: string;
  price: number;
  icon: string;
  category: "hombre" | "mujer" | "unisex";
  img?: string;
  rating?: number;
  especialistas_ids?: number[];
  activo?: boolean;
};

export type ServiceTab = "todos" | "hombre" | "mujer" | "unisex";
export type ProductTab = "todos" | "hombre" | "mujer";

export type Comment = {
  id: number;
  name: string;
  service: string;
  rating: number;
  text: string;
  date: string;
  avatar: string;
};

export type CartItem = {
  id: number;
  name: string;
  price: number;
  qty: number;
  /** Stock disponible del producto (para limitar el botón +) */
  stock?: number;
};

export type StaffMember = {
  id: number;
  name: string;
  role: string;
  exp: string;
  gender: "M" | "F";
  img: string;
  servicios_ids?: number[];
  telefono?: string;
};

export type GalleryItem = {
  id?: number;
  img: string;
  alt: string;
  span: string;
};

export type HeroStats = {
  clientesSatisfechos: string;
  aniosExperiencia: string;
  valoracionPromedio: string;
  totalResenas?: number;
};

export type BookingRequest = {
  nombre_completo: string;
  telefono_whatsapp: string;
  email?: string;
  servicio_id: number;
  equipo_id?: number;
  barbero_nombre?: string;
  fecha: string;
  hora_inicio: string;
  notas_accesibilidad?: string;
};

export type OrderRequest = {
  nombre_completo: string;
  telefono_whatsapp: string;
  email?: string;
  metodo_entrega?: "RETIRO_LOCAL" | "DOMICILIO";
  direccion_entrega?: string;
  items: { id: number; qty: number }[];
};

export type Rol = "CLIENTE" | "ESPECIALISTA" | "ESTILISTA" | "ADMIN";

export type User = {
  id: number;
  email: string;
  nombre_completo: string;
  rol: Rol;
  equipo_id?: number | null;
  cliente_id?: number | null;
  telefono?: string | null;
};

export type TurnoCliente = {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "COMPLETADO" | "CANCELADO";
  precio_aplicado: number;
  servicio: string;
  estilista: string;
};

export type DiaHorario = {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  descanso_inicio?: string | null;
  descanso_fin?: string | null;
};

export type CitaEspecialista = {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "COMPLETADO" | "CANCELADO";
  precio_aplicado: number;
  servicio: string;
  cliente: string;
  telefono_whatsapp: string;
  requiere_apoyo_accesibilidad?: boolean;
  tipo_apoyo?: string;
  notas_accesibilidad?: string;
};

export type TarjetaPruebaSandbox = {
  franquicia: string;
  tipo: string;
  numero: string;
  vencimiento: string;
  cvv: string;
  titular: string;
};

export type PreferenciaPagoResponse = {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
  monto_total: number;
  referencia: string;
  sandbox_mode?: boolean;
  tarjetas_prueba?: TarjetaPruebaSandbox[];
  orden_id?: number;
  turno_id?: number;
};

export type AdminUsuario = {
  id: number;
  email: string;
  nombre_completo: string;
  rol: Rol;
  activo: boolean;
  equipo_id?: number | null;
  estilista?: string | null;
  cliente_id?: number | null;
  ultimo_acceso?: string | null;
  creado_en?: string;
};

export type AdminTurno = {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: "PENDIENTE" | "CONFIRMADO" | "COMPLETADO" | "CANCELADO";
  precio_aplicado: number;
  servicio: string;
  estilista: string;
  cliente: string;
  telefono_whatsapp: string;
  requiere_apoyo_accesibilidad?: boolean;
  tipo_apoyo?: string;
  notas_accesibilidad?: string;
};

export type AdminResena = {
  id: number;
  cliente_nombre: string;
  servicio_id?: number;
  calificacion: number;
  comentario: string;
  aprobada: boolean;
  creado_en: string;
};
