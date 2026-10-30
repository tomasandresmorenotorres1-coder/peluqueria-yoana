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
};

export type StaffMember = {
  id?: number;
  name: string;
  role: string;
  exp: string;
  gender: "M" | "F";
  img: string;
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
