import { useEffect, useState } from "react";
import {
  fetchAdminTurnos,
  cambiarEstadoTurnoAdmin,
  fetchAdminUsuarios,
  crearAdminUsuario,
  actualizarAdminUsuario,
  fetchServicios,
  crearAdminServicio,
  cambiarActivoServicio,
  fetchProductos,
  crearAdminProducto,
  cambiarActivoProducto,
  fetchAdminResenas,
  cambiarAprobacionResena,
  fetchEquipo,
} from "@/services/api";
import type {
  AdminResena,
  AdminTurno,
  AdminUsuario,
  Product,
  Service,
  StaffMember,
  User,
} from "@/types";

type AdminDashboardProps = {
  user: User;
  onLogout: () => void;
  onGoHome: () => void;
};

type Tab = "turnos" | "usuarios" | "servicios" | "productos" | "resenas";

export default function AdminDashboard({ user, onLogout, onGoHome }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("turnos");
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Estado de Turnos
  const [turnos, setTurnos] = useState<AdminTurno[]>([]);
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // 2. Estado de Usuarios
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoPassword, setNuevoPassword] = useState("");
  const [nuevoRol, setNuevoRol] = useState<"ADMIN" | "ESTILISTA" | "CLIENTE">("ESTILISTA");
  const [nuevoEquipoId, setNuevoEquipoId] = useState<number | undefined>(undefined);
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  // 3. Estado de Servicios
  const [servicios, setServicios] = useState<Service[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [modalServicioOpen, setModalServicioOpen] = useState(false);
  const [srvNombre, setSrvNombre] = useState("");
  const [srvDesc, setSrvDesc] = useState("");
  const [srvPrecio, setSrvPrecio] = useState(25000);
  const [srvDuracion, setSrvDuracion] = useState(45);
  const [srvCategoria, setSrvCategoria] = useState<"hombre" | "mujer" | "unisex">("unisex");
  const [srvIcono, setSrvIcono] = useState("✂️");
  const [creandoServicio, setCreandoServicio] = useState(false);

  // 4. Estado de Productos
  const [productos, setProductos] = useState<Product[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [modalProductoOpen, setModalProductoOpen] = useState(false);
  const [prodNombre, setProdNombre] = useState("");
  const [prodMarca, setProdMarca] = useState("");
  const [prodPrecio, setProdPrecio] = useState(20000);
  const [prodStock, setProdStock] = useState(20);
  const [prodCategoria, setProdCategoria] = useState<"hombre" | "mujer">("hombre");
  const [prodImg, setProdImg] = useState("https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop&auto=format");
  const [creandoProducto, setCreandoProducto] = useState(false);

  // 5. Estado de Reseñas
  const [resenas, setResenas] = useState<AdminResena[]>([]);
  const [loadingResenas, setLoadingResenas] = useState(false);

  // Equipo para vincular estilistas
  const [equipo, setEquipo] = useState<StaffMember[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Carga inicial
  useEffect(() => {
    loadTurnos();
    loadUsuarios();
    loadServicios();
    loadProductos();
    loadResenas();
    loadEquipo();
  }, []);

  const loadEquipo = async () => {
    try {
      const data = await fetchEquipo();
      setEquipo(data);
    } catch (e) {
      console.warn("No se pudo cargar equipo", e);
    }
  };

  // --- MÉTODOS DE TURNOS ---
  const loadTurnos = async () => {
    setLoadingTurnos(true);
    try {
      const data = await fetchAdminTurnos({
        fecha: filtroFecha || undefined,
        estado: filtroEstado || undefined,
      });
      setTurnos(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cargar turnos");
    } finally {
      setLoadingTurnos(false);
    }
  };

  useEffect(() => {
    loadTurnos();
  }, [filtroFecha, filtroEstado]);

  const handleCambiarEstadoTurno = async (
    id: number,
    estado: "PENDIENTE" | "CONFIRMADO" | "COMPLETADO" | "CANCELADO"
  ) => {
    try {
      await cambiarEstadoTurnoAdmin(id, estado);
      showToast(`Turno #${id} actualizado a ${estado}`);
      setTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, estado } : t)));
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo actualizar el turno");
    }
  };

  // --- MÉTODOS DE USUARIOS ---
  const loadUsuarios = async () => {
    setLoadingUsuarios(true);
    try {
      const data = await fetchAdminUsuarios();
      setUsuarios(data);
    } catch (err: any) {
      console.warn("Error al cargar usuarios", err);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleToggleUsuarioActivo = async (u: AdminUsuario) => {
    try {
      const updated = await actualizarAdminUsuario(u.id, { activo: !u.activo });
      showToast(`Usuario ${u.nombre_completo} ${updated.activo ? "activado" : "desactivado"}`);
      setUsuarios((prev) => prev.map((item) => (item.id === u.id ? { ...item, activo: updated.activo } : item)));
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo actualizar el usuario");
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevoEmail.trim() || !nuevoPassword.trim()) {
      setErrorMsg("Completa los campos obligatorios");
      return;
    }

    setCreandoUsuario(true);
    setErrorMsg(null);
    try {
      await crearAdminUsuario({
        nombre_completo: nuevoNombre.trim(),
        email: nuevoEmail.trim(),
        password: nuevoPassword,
        rol: nuevoRol,
        equipo_id: nuevoRol === "ESTILISTA" ? nuevoEquipoId : undefined,
        telefono_whatsapp: nuevoRol === "CLIENTE" ? nuevoTelefono : undefined,
      });

      showToast(`Usuario ${nuevoNombre} creado con éxito`);
      setModalUsuarioOpen(false);
      setNuevoNombre("");
      setNuevoEmail("");
      setNuevoPassword("");
      setNuevoTelefono("");
      setNuevoEquipoId(undefined);
      loadUsuarios();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear usuario");
    } finally {
      setCreandoUsuario(false);
    }
  };

  // --- MÉTODOS DE SERVICIOS ---
  const loadServicios = async () => {
    setLoadingServicios(true);
    try {
      const data = await fetchServicios();
      setServicios(data);
    } catch (err: any) {
      console.warn("Error al cargar servicios", err);
    } finally {
      setLoadingServicios(false);
    }
  };

  const handleToggleServicioActivo = async (srv: Service) => {
    try {
      await cambiarActivoServicio(srv.id, false);
      showToast(`Servicio "${srv.name}" actualizado`);
      loadServicios();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cambiar estado del servicio");
    }
  };

  const handleCrearServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvNombre.trim() || srvPrecio <= 0) {
      setErrorMsg("Nombre y precio son obligatorios");
      return;
    }

    setCreandoServicio(true);
    setErrorMsg(null);
    try {
      await crearAdminServicio({
        categoria_id: srvCategoria === "hombre" ? 1 : srvCategoria === "mujer" ? 2 : 3,
        nombre: srvNombre.trim(),
        descripcion: srvDesc.trim() || "Servicio profesional de peluquería y barbería.",
        precio_actual: Number(srvPrecio),
        duracion_minutos: Number(srvDuracion),
        texto_alternativo: `Servicio de ${srvNombre.trim()}`,
        icono: srvIcono || "✂️",
        genero: srvCategoria,
      });

      showToast(`Servicio "${srvNombre}" añadido al catálogo`);
      setModalServicioOpen(false);
      setSrvNombre("");
      setSrvDesc("");
      setSrvPrecio(25000);
      loadServicios();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear el servicio");
    } finally {
      setCreandoServicio(false);
    }
  };

  // --- MÉTODOS DE PRODUCTOS ---
  const loadProductos = async () => {
    setLoadingProductos(true);
    try {
      const data = await fetchProductos();
      setProductos(data);
    } catch (err: any) {
      console.warn("Error al cargar productos", err);
    } finally {
      setLoadingProductos(false);
    }
  };

  const handleToggleProductoActivo = async (prod: Product) => {
    try {
      await cambiarActivoProducto(prod.id, false);
      showToast(`Producto "${prod.name}" actualizado`);
      loadProductos();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cambiar estado del producto");
    }
  };

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNombre.trim() || prodPrecio <= 0) {
      setErrorMsg("Nombre y precio son obligatorios");
      return;
    }

    setCreandoProducto(true);
    setErrorMsg(null);
    try {
      await crearAdminProducto({
        categoria_id: prodCategoria === "hombre" ? 1 : 2,
        nombre: prodNombre.trim(),
        marca: prodMarca.trim() || "Peluquería Yohana",
        precio_actual: Number(prodPrecio),
        stock: Number(prodStock),
        imagen_url: prodImg.trim() || "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop&auto=format",
        texto_alternativo: `Producto ${prodNombre.trim()}`,
        genero: prodCategoria,
      });

      showToast(`Producto "${prodNombre}" agregado a la tienda`);
      setModalProductoOpen(false);
      setProdNombre("");
      setProdMarca("");
      setProdPrecio(20000);
      setProdStock(20);
      loadProductos();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear el producto");
    } finally {
      setCreandoProducto(false);
    }
  };

  // --- MÉTODOS DE RESEÑAS ---
  const loadResenas = async () => {
    setLoadingResenas(true);
    try {
      const data = await fetchAdminResenas();
      setResenas(data);
    } catch (err: any) {
      console.warn("Error al cargar reseñas", err);
    } finally {
      setLoadingResenas(false);
    }
  };

  const handleToggleAprobacionResena = async (r: AdminResena) => {
    try {
      const nuevoEstado = !r.aprobada;
      await cambiarAprobacionResena(r.id, nuevoEstado);
      showToast(`Reseña #${r.id} ${nuevoEstado ? "aprobada (visible)" : "oculta"}`);
      setResenas((prev) => prev.map((item) => (item.id === r.id ? { ...item, aprobada: nuevoEstado } : item)));
    } catch (err: any) {
      setErrorMsg(err.message || "Error al moderar reseña");
    }
  };

  return (
    <div className="min-h-screen bg-cream text-charcoal flex flex-col font-body">
      {/* TOAST DE NOTIFICACIÓN */}
      {toast && (
        <div className="fixed top-5 right-6 z-50 bg-charcoal text-white px-5 py-3 rounded-2xl shadow-soft-lg text-xs font-bold border border-gold/40 animate-in slide-in-from-top duration-300">
          {toast}
        </div>
      )}

      {/* HEADER SUPERIOR DEL PANEL ADMIN */}
      <header className="bg-charcoal text-white px-6 py-4 border-b border-gold/30 shadow-md">
        <div className="container-app flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💈</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="brand text-lg font-bold tracking-wide">
                  Panel de Administrador
                </span>
                <span className="px-2.5 py-0.5 bg-gold/20 text-gold-light border border-gold/40 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  👑 {user.rol}
                </span>
              </div>
              <p className="text-xs text-white/70">
                Sesión iniciada como <strong>{user.nombre_completo}</strong> ({user.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoHome}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5"
            >
              <span>🌐</span>
              <span>Ver Web Pública</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rust/80 hover:bg-rust text-white transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* SUB-BARRA DE PESTAÑAS */}
      <div className="bg-white border-b border-charcoal/10 sticky top-0 z-30 shadow-sm">
        <div className="container-app flex items-center gap-2 py-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("turnos")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "turnos"
              ? "bg-rust text-white shadow-sm"
              : "text-charcoal/70 hover:bg-bone hover:text-charcoal"
              }`}
          >
            <span>📅</span>
            <span>Citas & Turnos</span>
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
              {turnos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("usuarios")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "usuarios"
              ? "bg-rust text-white shadow-sm"
              : "text-charcoal/70 hover:bg-bone hover:text-charcoal"
              }`}
          >
            <span>👥</span>
            <span>Usuarios & Cuentas</span>
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
              {usuarios.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("servicios")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "servicios"
              ? "bg-rust text-white shadow-sm"
              : "text-charcoal/70 hover:bg-bone hover:text-charcoal"
              }`}
          >
            <span>✂️</span>
            <span>Servicios</span>
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
              {servicios.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("productos")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "productos"
              ? "bg-rust text-white shadow-sm"
              : "text-charcoal/70 hover:bg-bone hover:text-charcoal"
              }`}
          >
            <span>🛍️</span>
            <span>Productos & Stock</span>
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
              {productos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("resenas")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "resenas"
              ? "bg-rust text-white shadow-sm"
              : "text-charcoal/70 hover:bg-bone hover:text-charcoal"
              }`}
          >
            <span>⭐</span>
            <span>Moderación de Reseñas</span>
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
              {resenas.length}
            </span>
          </button>
        </div>
      </div>

      {/* ALERTA DE ERROR GENERAL */}
      {errorMsg && (
        <div className="container-app mt-4">
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="font-bold text-sm">×</button>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      <main className="container-app py-8 flex-1">
        {/* ======================================================== */}
        {/* PESTAÑA 1: GESTIÓN DE CITAS Y TURNOS                     */}
        {/* ======================================================== */}
        {activeTab === "turnos" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">Control General de Citas</h2>
                <p className="text-xs text-charcoal/60">
                  Visualiza y gestiona las reservas de todos los estilistas en tiempo real.
                </p>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="px-3 py-2 bg-white border border-charcoal/20 rounded-xl text-xs"
                />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="px-3 py-2 bg-white border border-charcoal/20 rounded-xl text-xs"
                >
                  <option value="">Todos los Estados</option>
                  <option value="PENDIENTE">Pendientes</option>
                  <option value="CONFIRMADO">Confirmados</option>
                  <option value="COMPLETADO">Completados</option>
                  <option value="CANCELADO">Cancelados</option>
                </select>
                {(filtroFecha || filtroEstado) && (
                  <button
                    onClick={() => {
                      setFiltroFecha("");
                      setFiltroEstado("");
                    }}
                    className="text-xs text-rust hover:underline font-bold"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>
            </div>

            {loadingTurnos ? (
              <div className="p-12 text-center text-charcoal/50 text-sm">
                Cargando citas del sistema...
              </div>
            ) : turnos.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-charcoal/10 shadow-soft">
                <span className="text-4xl block mb-2">📅</span>
                <h3 className="font-bold text-base mb-1">No hay turnos registrados</h3>
                <p className="text-xs text-charcoal/50">
                  {filtroFecha || filtroEstado ? "No hay citas que coincidan con los filtros seleccionados." : "Aún no se han reservado citas."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {turnos.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-3xl p-5 border border-charcoal/10 shadow-soft flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-charcoal/40 uppercase">
                          Turno #{t.id}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.estado === "CONFIRMADO"
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : t.estado === "COMPLETADO"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : t.estado === "CANCELADO"
                                ? "bg-red-100 text-red-800 border border-red-300"
                                : "bg-amber-100 text-amber-800 border border-amber-300"
                            }`}
                        >
                          {t.estado}
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-charcoal leading-tight mb-1">
                        {t.servicio}
                      </h4>
                      <p className="text-xs text-charcoal/60 mb-2">
                        Estilista: <strong>{t.estilista}</strong>
                      </p>

                      <div className="bg-bone/40 rounded-xl p-3 text-xs space-y-1 text-charcoal/80 mb-2">
                        <p>
                          📅 <strong>{t.fecha}</strong> · ⏰ <strong>{t.hora_inicio} - {t.hora_fin}</strong>
                        </p>
                        <p>
                          👤 Cliente: <strong>{t.cliente}</strong>
                        </p>
                        <p className="flex items-center gap-1">
                          📞 Tel: <a href={`https://wa.me/${t.telefono_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-rust hover:underline font-semibold">{t.telefono_whatsapp}</a>
                        </p>
                        <p className="text-rust font-bold">
                          💵 ${Number(t.precio_aplicado).toLocaleString("es-CO")}
                        </p>
                      </div>

                      {t.requiere_apoyo_accesibilidad && (
                        <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] mb-2">
                          ♿ <strong>Apoyo Accesibilidad:</strong> {t.tipo_apoyo || "General"}
                          {t.notas_accesibilidad && ` (${t.notas_accesibilidad})`}
                        </div>
                      )}
                    </div>

                    {/* Acciones de cambio de estado */}
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-charcoal/10 text-[10px] font-bold">
                      <button
                        onClick={() => handleCambiarEstadoTurno(t.id, "CONFIRMADO")}
                        disabled={t.estado === "CONFIRMADO"}
                        className="py-1.5 px-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg disabled:opacity-40 transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => handleCambiarEstadoTurno(t.id, "COMPLETADO")}
                        disabled={t.estado === "COMPLETADO"}
                        className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg disabled:opacity-40 transition-colors"
                      >
                        Completar
                      </button>
                      <button
                        onClick={() => handleCambiarEstadoTurno(t.id, "CANCELADO")}
                        disabled={t.estado === "CANCELADO"}
                        className="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg disabled:opacity-40 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 2: USUARIOS Y CUENTAS                           */}
        {/* ======================================================== */}
        {activeTab === "usuarios" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">Usuarios del Sistema</h2>
                <p className="text-xs text-charcoal/60">
                  Crea y administra cuentas de Administradores, Estilistas y Clientes.
                </p>
              </div>

              <button
                onClick={() => setModalUsuarioOpen(true)}
                className="btn btn-primary btn-sm rounded-xl font-bold text-xs flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>Crear Nuevo Usuario</span>
              </button>
            </div>

            {loadingUsuarios ? (
              <div className="p-12 text-center text-charcoal/50 text-sm">Cargando usuarios...</div>
            ) : (
              <div className="bg-white rounded-3xl border border-charcoal/10 shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bone/60 border-b border-charcoal/10 text-charcoal/70 uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Rol</th>
                        <th className="py-3 px-4">Estilista Asociado</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal/5">
                      {usuarios.map((u) => (
                        <tr key={u.id} className="hover:bg-bone/20 transition-colors">
                          <td className="py-3 px-4 font-bold">{u.nombre_completo}</td>
                          <td className="py-3 px-4 text-charcoal/70">{u.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.rol === "ADMIN"
                                ? "bg-purple-100 text-purple-800 border border-purple-300"
                                : u.rol === "ESTILISTA" || u.rol === "ESPECIALISTA"
                                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                                  : "bg-bone text-charcoal border border-charcoal/20"
                                }`}
                            >
                              {u.rol}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-charcoal/70">
                            {u.estilista || (u.equipo_id ? `ID #${u.equipo_id}` : "-")}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }`}
                            >
                              {u.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.id !== user.id ? (
                              <button
                                onClick={() => handleToggleUsuarioActivo(u)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${u.activo
                                  ? "text-red-700 border-red-200 hover:bg-red-50"
                                  : "text-green-700 border-green-200 hover:bg-green-50"
                                  }`}
                              >
                                {u.activo ? "Desactivar" : "Activar"}
                              </button>
                            ) : (
                              <span className="text-[10px] text-charcoal/40 italic">Tu cuenta</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 3: SERVICIOS DEL CATÁLOGO                       */}
        {/* ======================================================== */}
        {activeTab === "servicios" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">Catálogo de Servicios</h2>
                <p className="text-xs text-charcoal/60">
                  Agrega nuevos cortes, tratamientos y ajusta los precios en la plataforma.
                </p>
              </div>

              <button
                onClick={() => setModalServicioOpen(true)}
                className="btn btn-primary btn-sm rounded-xl font-bold text-xs flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>Añadir Servicio</span>
              </button>
            </div>

            {loadingServicios ? (
              <div className="p-12 text-center text-charcoal/50 text-sm">Cargando servicios...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {servicios.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-3xl p-5 border border-charcoal/10 shadow-soft flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{s.icon || "✂️"}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-bone text-charcoal/70">
                          {s.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-charcoal mb-1">{s.name}</h4>
                      <p className="text-xs text-charcoal/60 line-clamp-2 mb-2">{s.desc}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-charcoal/50">⏱️ {s.duration}</span>
                        <span className="font-bold text-rust text-base">
                          ${s.price.toLocaleString("es-CO")}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-charcoal/10 flex items-center justify-between">
                      <span className="text-[11px] text-green-700 font-bold">✓ Activo en web</span>
                      <button
                        onClick={() => handleToggleServicioActivo(s)}
                        className="text-[11px] text-red-600 hover:underline font-semibold"
                      >
                        Desactivar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 4: PRODUCTOS & STOCK                            */}
        {/* ======================================================== */}
        {activeTab === "productos" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">Inventario & Tienda</h2>
                <p className="text-xs text-charcoal/60">
                  Controla el stock disponible, precios y productos ofrecidos en el e-commerce.
                </p>
              </div>

              <button
                onClick={() => setModalProductoOpen(true)}
                className="btn btn-primary btn-sm rounded-xl font-bold text-xs flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>Añadir Producto</span>
              </button>
            </div>

            {loadingProductos ? (
              <div className="p-12 text-center text-charcoal/50 text-sm">Cargando inventario...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {productos.map((p) => {
                  const stock = p.stock ?? 0;
                  const stockBajo = stock < 10;
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-3xl p-4 border border-charcoal/10 shadow-soft flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="w-full h-32 rounded-2xl overflow-hidden bg-bone/50 mb-3">
                          <img
                            src={p.img}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).src =
                                "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop&auto=format";
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold uppercase text-charcoal/40 block mb-0.5">
                          {p.brand}
                        </span>
                        <h4 className="font-bold text-sm text-charcoal leading-tight mb-2">
                          {p.name}
                        </h4>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-rust font-bold text-sm">
                            ${p.price.toLocaleString("es-CO")}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stockBajo
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "bg-green-100 text-green-800"
                              }`}
                          >
                            Stock: {stock}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-charcoal/10 flex items-center justify-between text-[11px]">
                        <span className="text-charcoal/50 uppercase text-[9px] font-bold">
                          {p.category}
                        </span>
                        <button
                          onClick={() => handleToggleProductoActivo(p)}
                          className="text-red-600 hover:underline font-semibold"
                        >
                          Desactivar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 5: MODERACIÓN DE RESEÑAS                        */}
        {/* ======================================================== */}
        {activeTab === "resenas" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold">Moderación de Reseñas</h2>
              <p className="text-xs text-charcoal/60">
                Revisa los comentarios de los clientes antes o después de ser publicados.
              </p>
            </div>

            {loadingResenas ? (
              <div className="p-12 text-center text-charcoal/50 text-sm">Cargando reseñas...</div>
            ) : resenas.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-charcoal/10 shadow-soft">
                <span className="text-4xl block mb-2">⭐</span>
                <p className="text-xs text-charcoal/50">No hay reseñas registradas aún.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resenas.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white rounded-3xl p-5 border border-charcoal/10 shadow-soft flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-charcoal">{r.cliente_nombre}</span>
                        <span className="text-amber-500 font-bold text-xs">
                          {"★".repeat(r.calificacion)}
                          {"☆".repeat(5 - r.calificacion)}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal/80 italic mb-2">"{r.comentario}"</p>
                      <span className="text-[10px] text-charcoal/40 block">
                        Registrado: {new Date(r.creado_en).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-charcoal/10 flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.aprobada ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                          }`}
                      >
                        {r.aprobada ? "Visible en Web" : "Oculta"}
                      </span>

                      <button
                        onClick={() => handleToggleAprobacionResena(r)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${r.aprobada
                          ? "text-red-700 border-red-200 hover:bg-red-50"
                          : "text-green-700 border-green-200 hover:bg-green-50"
                          }`}
                      >
                        {r.aprobada ? "Ocultar" : "Aprobar & Publicar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL PARA CREAR USUARIO */}
      {modalUsuarioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={() => setModalUsuarioOpen(false)} />
          <div className="bg-white rounded-3xl p-6 w-full max-w-md relative z-10 shadow-soft-lg space-y-4">
            <div className="flex justify-between items-center border-b border-charcoal/10 pb-3">
              <h3 className="font-bold text-lg">Crear Nuevo Usuario</h3>
              <button onClick={() => setModalUsuarioOpen(false)} className="text-xl">×</button>
            </div>

            <form onSubmit={handleCrearUsuario} className="space-y-3 text-xs">
              <div>
                <label className="field-label">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej: Daniel Gómez"
                  className="field"
                />
              </div>

              <div>
                <label className="field-label">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="field"
                />
              </div>

              <div>
                <label className="field-label">Contraseña *</label>
                <input
                  type="password"
                  required
                  value={nuevoPassword}
                  onChange={(e) => setNuevoPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="field"
                />
              </div>

              <div>
                <label className="field-label">Rol del Usuario</label>
                <select
                  value={nuevoRol}
                  onChange={(e: any) => setNuevoRol(e.target.value)}
                  className="field"
                >
                  <option value="ESTILISTA">Estilista / Especialista</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="CLIENTE">Cliente</option>
                </select>
              </div>

              {nuevoRol === "ESTILISTA" && (
                <div>
                  <label className="field-label">Vincular a Perfil de Equipo *</label>
                  <select
                    value={nuevoEquipoId || ""}
                    onChange={(e) => setNuevoEquipoId(Number(e.target.value) || undefined)}
                    className="field"
                    required
                  >
                    <option value="">Selecciona el estilista...</option>
                    {equipo.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({eq.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {nuevoRol === "CLIENTE" && (
                <div>
                  <label className="field-label">Teléfono WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="+54 9 11 1234-5678"
                    className="field"
                  />
                </div>
              )}

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalUsuarioOpen(false)}
                  className="btn btn-outline flex-1 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoUsuario}
                  className="btn btn-primary flex-1 text-xs disabled:opacity-50"
                >
                  {creandoUsuario ? "Guardando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR SERVICIO */}
      {modalServicioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={() => setModalServicioOpen(false)} />
          <div className="bg-white rounded-3xl p-6 w-full max-w-md relative z-10 shadow-soft-lg space-y-4">
            <div className="flex justify-between items-center border-b border-charcoal/10 pb-3">
              <h3 className="font-bold text-lg">Añadir Nuevo Servicio</h3>
              <button onClick={() => setModalServicioOpen(false)} className="text-xl">×</button>
            </div>

            <form onSubmit={handleCrearServicio} className="space-y-3 text-xs">
              <div>
                <label className="field-label">Nombre del Servicio *</label>
                <input
                  type="text"
                  required
                  value={srvNombre}
                  onChange={(e) => setSrvNombre(e.target.value)}
                  placeholder="Ej: Corte Degradado & Barba"
                  className="field"
                />
              </div>

              <div>
                <label className="field-label">Descripción</label>
                <textarea
                  value={srvDesc}
                  onChange={(e) => setSrvDesc(e.target.value)}
                  placeholder="Detalles del servicio..."
                  className="field h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="field-label">Precio ($ COP) *</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={srvPrecio}
                    onChange={(e) => setSrvPrecio(Number(e.target.value))}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">Duración (min) *</label>
                  <input
                    type="number"
                    required
                    min={15}
                    step={15}
                    value={srvDuracion}
                    onChange={(e) => setSrvDuracion(Number(e.target.value))}
                    className="field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="field-label">Categoría</label>
                  <select
                    value={srvCategoria}
                    onChange={(e: any) => setSrvCategoria(e.target.value)}
                    className="field"
                  >
                    <option value="hombre">Hombre</option>
                    <option value="mujer">Mujer</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Ícono Emoji</label>
                  <input
                    type="text"
                    value={srvIcono}
                    onChange={(e) => setSrvIcono(e.target.value)}
                    placeholder="✂️"
                    className="field text-center"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalServicioOpen(false)}
                  className="btn btn-outline flex-1 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoServicio}
                  className="btn btn-primary flex-1 text-xs disabled:opacity-50"
                >
                  {creandoServicio ? "Guardando..." : "Guardar Servicio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR PRODUCTO */}
      {modalProductoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={() => setModalProductoOpen(false)} />
          <div className="bg-white rounded-3xl p-6 w-full max-w-md relative z-10 shadow-soft-lg space-y-4">
            <div className="flex justify-between items-center border-b border-charcoal/10 pb-3">
              <h3 className="font-bold text-lg">Añadir Nuevo Producto</h3>
              <button onClick={() => setModalProductoOpen(false)} className="text-xl">×</button>
            </div>

            <form onSubmit={handleCrearProducto} className="space-y-3 text-xs">
              <div>
                <label className="field-label">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={prodNombre}
                  onChange={(e) => setProdNombre(e.target.value)}
                  placeholder="Ej: Cera Mate Modeladora"
                  className="field"
                />
              </div>

              <div>
                <label className="field-label">Marca</label>
                <input
                  type="text"
                  value={prodMarca}
                  onChange={(e) => setProdMarca(e.target.value)}
                  placeholder="Ej: Reuzel"
                  className="field"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="field-label">Precio ($ COP) *</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={prodPrecio}
                    onChange={(e) => setProdPrecio(Number(e.target.value))}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="field"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Categoría</label>
                <select
                  value={prodCategoria}
                  onChange={(e: any) => setProdCategoria(e.target.value)}
                  className="field"
                >
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                </select>
              </div>

              <div>
                <label className="field-label">URL de Imagen</label>
                <input
                  type="url"
                  value={prodImg}
                  onChange={(e) => setProdImg(e.target.value)}
                  className="field"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalProductoOpen(false)}
                  className="btn btn-outline flex-1 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoProducto}
                  className="btn btn-primary flex-1 text-xs disabled:opacity-50"
                >
                  {creandoProducto ? "Guardando..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

