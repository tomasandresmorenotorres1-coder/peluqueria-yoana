import { useEffect, useState } from "react";

import Navbar from "@/components/Navbar";
import MobileMenu from "@/components/MobileMenu";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import BookingSection from "@/components/BookingSection";
import GallerySection from "@/components/GallerySection";
import ProductsSection from "@/components/ProductsSection";
import TeamSection from "@/components/TeamSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import CartDrawer from "@/components/CartDrawer";

import {
  fetchEstadisticas,
  fetchServicios,
  fetchProductos,
  fetchEquipo,
  fetchGaleria,
  fetchResenas,
  publicarResena,
  fetchHorasOcupadas,
  crearReservaTurno,
  crearOrdenCompra,
} from "@/services/api";

import type {
  CartItem,
  Comment,
  GalleryItem,
  HeroStats,
  OrderRequest,
  Product,
  ProductTab,
  Service,
  ServiceTab,
  StaffMember,
} from "@/types";

export default function App() {
  // Datos dinámicos
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState<HeroStats | null>(null);

  // Estados de carga y feedback
  const [loading, setLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reserva de turnos
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([]);
  const [bookingDone, setBookingDone] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<any>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Carrito de compras
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Navegación
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filtros
  const [serviceTab, setServiceTab] = useState<ServiceTab>("todos");
  const [productTab, setProductTab] = useState<ProductTab>("todos");

  // Formulario de reseñas
  const [commentName, setCommentName] = useState("");
  const [commentService, setCommentService] = useState("");
  const [commentRating, setCommentRating] = useState(5);
  const [commentText, setCommentText] = useState("");
  const [commentSent, setCommentSent] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState(0);

  // 1. Cargar datos dinámicos al montar
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      setLoading(true);
      try {
        const [
          statsData,
          serviciosData,
          productosData,
          equipoData,
          galeriaData,
          resenasData,
        ] = await Promise.allSettled([
          fetchEstadisticas(),
          fetchServicios(),
          fetchProductos(),
          fetchEquipo(),
          fetchGaleria(),
          fetchResenas(),
        ]);

        if (!isMounted) return;

        if (statsData.status === "fulfilled") setStats(statsData.value);
        if (serviciosData.status === "fulfilled") {
          setServices(serviciosData.value);
          setServicesError(null);
        } else {
          setServicesError("No se pudieron cargar los servicios.");
        }

        if (productosData.status === "fulfilled") {
          setProducts(productosData.value);
          setProductsError(null);
        } else {
          setProductsError("No se pudieron cargar los productos.");
        }

        if (equipoData.status === "fulfilled") setStaff(equipoData.value);
        if (galeriaData.status === "fulfilled") setGallery(galeriaData.value);
        if (resenasData.status === "fulfilled") setComments(resenasData.value.comments);
      } catch (err) {
        console.error("Error al cargar datos iniciales:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Horarios ocupados en PostgreSQL
  useEffect(() => {
    let active = true;
    if (!selectedDate) {
      return;
    }

    async function loadDisponibilidad() {
      try {
        const ocupadas = await fetchHorasOcupadas(selectedDate, selectedBarber || undefined);
        if (active) setHorasOcupadas(ocupadas);
      } catch {
        if (active) setHorasOcupadas([]);
      }
    }

    loadDisponibilidad();
    return () => {
      active = false;
    };
  }, [selectedDate, selectedBarber]);

  // Carrito de compras
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });

    setToastMessage(`✓ ${product.name} agregado al carrito`);
    setTimeout(() => {
      setToastMessage((cur) => (cur?.includes(product.name) ? null : cur));
    }, 2500);
  }

  function removeFromCart(id: number) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  // Realizar reserva de turno
  async function handleBook(clientData: { nombre: string; telefono: string; email?: string; notas?: string }) {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) return;

    setSubmittingBooking(true);
    setBookingError(null);

    try {
      const staffMember = staff.find((s) => s.name === selectedBarber);
      const res = await crearReservaTurno({
        nombre_completo: clientData.nombre,
        telefono_whatsapp: clientData.telefono,
        email: clientData.email,
        servicio_id: selectedService,
        equipo_id: staffMember?.id,
        barbero_nombre: selectedBarber,
        fecha: selectedDate,
        hora_inicio: selectedTime,
        notas_accesibilidad: clientData.notas,
      });

      setBookingInfo(res.turno);
      setBookingDone(true);
      setHorasOcupadas((prev) => [...prev, selectedTime]);
    } catch (err: any) {
      setBookingError(err.message || "Error al registrar la reserva en la base de datos.");
    } finally {
      setSubmittingBooking(false);
    }
  }

  function handleResetBooking() {
    setBookingDone(false);
    setBookingInfo(null);
    setBookingError(null);
    setSelectedService(null);
    setSelectedBarber("");
    setSelectedDate("");
    setSelectedTime("");
    setHorasOcupadas([]);
  }

  // Finalizar compra de productos
  async function handleCheckout(orderData: OrderRequest): Promise<boolean> {
    setSubmittingOrder(true);
    try {
      await crearOrdenCompra(orderData);
      setCart([]);
      return true;
    } catch (err: any) {
      alert(`Error al procesar la orden: ${err.message}`);
      return false;
    } finally {
      setSubmittingOrder(false);
    }
  }

  // Navegación suave
  function scrollTo(id: string) {
    const cleanId = id.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const targetElement = document.getElementById(cleanId) || document.getElementById(id.toLowerCase());
    targetElement?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  }

  function handleSelectServiceAndScroll(id: number) {
    setSelectedService(id);
    scrollTo("reservar");
  }

  // Publicar reseña
  async function handleSubmitComment() {
    if (!commentName.trim() || !commentService || !commentText.trim()) return;

    setSubmittingComment(true);
    setCommentError(null);

    try {
      const nuevaResena = await publicarResena({
        name: commentName.trim(),
        service: commentService,
        rating: commentRating,
        text: commentText.trim(),
      });

      setComments((prev) => [nuevaResena, ...prev]);
      setCommentName("");
      setCommentService("");
      setCommentRating(5);
      setCommentText("");
      setCommentSent(true);
    } catch (err: any) {
      setCommentError(err.message || "Error al publicar la reseña en la base de datos.");
    } finally {
      setSubmittingComment(false);
    }
  }

  function handleWriteAnother() {
    setCommentSent(false);
  }

  return (
    <div className="min-h-screen bg-cream text-charcoal font-body antialiased selection:bg-gold/30 selection:text-charcoal flex flex-col">
      {/* NOTIFICACIÓN TOAST FLOTANTE */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-charcoal text-white px-5 py-3 rounded-2xl shadow-soft-lg text-xs font-bold border border-gold/40 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/60 hover:text-white text-base leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* NAVBAR SUPERIOR */}
      <Navbar
        totalItems={totalItems}
        onCartClick={() => setCartOpen(true)}
        onToggleMobileMenu={() => setMobileMenuOpen((v) => !v)}
        onNavClick={scrollTo}
      />

      {/* MENÚ MÓVIL DESPLEGABLE */}
      <MobileMenu open={mobileMenuOpen} onNavClick={scrollTo} />

      {/* SECCIÓN HERO / INICIO */}
      <Hero onScrollTo={scrollTo} stats={stats} loading={loading} />

      {/* SECCIÓN CATÁLOGO DE SERVICIOS */}
      <ServicesSection
        services={services}
        loading={loading}
        error={servicesError}
        serviceTab={serviceTab}
        onTabChange={setServiceTab}
        onSelectService={handleSelectServiceAndScroll}
      />

      {/* SECCIÓN DE RESERVAS & CITAS */}
      <BookingSection
        services={services}
        staff={staff}
        selectedService={selectedService}
        selectedBarber={selectedBarber}
        selectedTime={selectedTime}
        selectedDate={selectedDate}
        horasOcupadas={horasOcupadas}
        bookingDone={bookingDone}
        bookingInfo={bookingInfo}
        submitting={submittingBooking}
        errorMessage={bookingError}
        onSelectService={setSelectedService}
        onSelectBarber={setSelectedBarber}
        onSelectDate={setSelectedDate}
        onSelectTime={setSelectedTime}
        onBook={handleBook}
        onReset={handleResetBooking}
      />

      {/* SECCIÓN TIENDA DE PRODUCTOS */}
      <ProductsSection
        products={products}
        loading={loading}
        error={productsError}
        productTab={productTab}
        onTabChange={setProductTab}
        totalItems={totalItems}
        onCartOpen={() => setCartOpen(true)}
        onAddToCart={addToCart}
      />

      {/* SECCIÓN ESPECIALISTAS Y EQUIPO */}
      <TeamSection staff={staff} loading={loading} />

      {/* SECCIÓN PORTAFOLIO Y GALERÍA */}
      <GallerySection gallery={gallery} loading={loading} />

      {/* SECCIÓN TESTIMONIOS Y CALIFICACIONES */}
      <TestimonialsSection
        comments={comments}
        services={services}
        loading={loading}
        submitting={submittingComment}
        commentName={commentName}
        commentService={commentService}
        commentRating={commentRating}
        commentText={commentText}
        commentSent={commentSent}
        errorMessage={commentError}
        hoverRating={hoverRating}
        onNameChange={setCommentName}
        onServiceChange={setCommentService}
        onRatingChange={setCommentRating}
        onTextChange={setCommentText}
        onHoverRatingChange={setHoverRating}
        onSubmit={handleSubmitComment}
        onWriteAnother={handleWriteAnother}
      />

      {/* FOOTER */}
      <Footer />

      {/* BOTÓN FLOTANTE WHATSAPP */}
      <WhatsAppButton />

      {/* DRAWER LATERAL DE CARRITO */}
      <CartDrawer
        open={cartOpen}
        cart={cart}
        totalPrice={totalPrice}
        submitting={submittingOrder}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
}
