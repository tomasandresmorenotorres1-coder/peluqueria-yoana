# Usuarios, roles y horarios

## Puesta en marcha (una sola vez)

1. En `backend/.env` agrega (mira `.env.example`):
   - `JWT_SECRET`: texto largo y secreto. Genéralo con
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `JWT_EXPIRES_IN=8h` (cuánto dura una sesión).
2. Crea las tablas nuevas **sin borrar datos**: `npm run db:auth`
   (`npm run db:setup` también las crea, pero ese comando borra todo y empieza de cero).
3. Crea el primer administrador: `npm run admin:crear -- correo@ejemplo.com "Tu Nombre"`
   (te pide la contraseña por pantalla).
4. Reinicia el servidor: `npm run dev`.

## Cómo se usa desde el frontend

1. `POST /api/auth/login` con `{ "email", "password" }` devuelve `{ token, usuario }`.
2. En cada petición que lo necesite se envía el encabezado `Authorization: Bearer <token>`.
3. Si el servidor responde **401**, la sesión venció o no existe: volver a la pantalla de login.
   Si responde **403**, la persona no tiene permiso para esa acción.
4. `GET /api/auth/me` devuelve quién es (`rol`) para decidir qué panel mostrar.

## Roles

| Rol | Puede |
|---|---|
| **ADMIN** | Todo: usuarios, servicios, productos, equipo, precios, todos los turnos, reseñas, horarios de cualquier estilista |
| **ESTILISTA** | Ver y atender solo sus citas; ajustar sus horarios y bloqueos |
| **CLIENTE** | Reservar, ver y cancelar sus reservas, comprar |
| *(sin cuenta)* | Reservar y comprar escribiendo nombre y teléfono, como antes |

Las contraseñas se guardan con **bcrypt** (hash), nunca en texto. Los estilistas y administradores los crea
el administrador; solo los clientes se registran solos.

## Rutas

### Cuenta (`/api/auth`)
| Método | Ruta | Quién | Para qué |
|---|---|---|---|
| POST | `/registro` | público | Crear cuenta de cliente `{nombre_completo, email, password, telefono_whatsapp}` |
| POST | `/login` | público | Iniciar sesión |
| GET | `/me` | con sesión | Ver mi usuario |
| POST | `/cambiar-password` | con sesión | `{password_actual, password_nueva}` |

Contraseña: mínimo 8 caracteres, con letras y números. Tras 10 intentos fallidos desde la misma IP, el servidor
bloquea el login durante 15 minutos (error 429).

### Reservas (`/api/turnos`)
| Método | Ruta | Quién | Para qué |
|---|---|---|---|
| GET | `/disponibilidad?fecha=&equipo_id=&servicio_id=` | público | Horas libres. Considera la duración del servicio, la jornada del estilista, sus bloqueos y las citas que se cruzan |
| POST | `/` | público o cliente | Reservar. Con sesión de cliente no hace falta enviar nombre ni teléfono |
| GET | `/mis-reservas` | CLIENTE | Mis reservas |
| PATCH | `/:id/cancelar` | CLIENTE | Cancelar una reserva propia que aún no empieza |

`disponibilidad` responde `horas_ocupadas`, `horas_disponibles`, `jornada` y `motivos` (por qué no está libre cada
hora: `OCUPADO`, `BLOQUEADO`, `FUERA_DE_JORNADA`, `NO_TRABAJA`, `PASADO`). Al reservar, un horario no disponible
responde **409** con el mismo `motivo`.

### Estilista (`/api/estilista`, rol ESTILISTA)
| Método | Ruta | Para qué |
|---|---|---|
| GET | `/mis-citas?fecha=&estado=` | Mis citas (por defecto, de hoy en adelante) |
| PATCH | `/mis-citas/:id/estado` | `{estado: CONFIRMADO \| COMPLETADO \| CANCELADO}` |
| GET / PUT | `/mis-horarios` | Ver o cambiar mi horario semanal |
| GET / POST | `/mis-bloqueos` | Ver o crear bloqueos (días u horas en que no atiendo) |
| DELETE | `/mis-bloqueos/:id` | Quitar un bloqueo |

Horario semanal: `{ "dias": [ { "dia_semana": 1, "hora_inicio": "10:00", "hora_fin": "18:00" } ] }`
(`dia_semana`: 0 = domingo … 6 = sábado). Solo atiende los días que aparezcan. Con `"dias": []` vuelve al horario
por defecto del negocio (lunes a sábado, 9:00 a 20:00).
Bloqueo: `{ "fecha": "2026-11-20", "hora_inicio": "14:00", "hora_fin": "16:00", "motivo": "..." }`;
sin horas bloquea todo el día. La respuesta incluye `citas_afectadas` (no las cancela solas).

### Administrador (`/api/admin`, rol ADMIN)
| Método | Ruta | Para qué |
|---|---|---|
| GET / POST | `/usuarios` | Listar (`?rol=`) o crear ADMIN, ESTILISTA (con `equipo_id`) o CLIENTE |
| PATCH | `/usuarios/:id` | `{activo, nombre_completo, nueva_password}`. Desactivar corta el acceso al instante |
| POST / PUT | `/servicios`, `/servicios/:id` | Crear o editar servicios |
| POST / PUT | `/productos`, `/productos/:id` | Crear o editar productos |
| POST / PUT | `/equipo`, `/equipo/:id` | Crear o editar miembros del equipo |
| PATCH | `/servicios/:id/activo`, `/productos/:id/activo`, `/equipo/:id/activo` | `{activo: true \| false}` (no se borra, para conservar el historial) |
| GET | `/turnos?fecha=&estado=&equipo_id=` | Ver todos los turnos |
| PATCH | `/turnos/:id/estado` | Cambiar el estado de cualquier turno |
| GET / PATCH | `/resenas`, `/resenas/:id` | Moderar reseñas `{aprobada: true \| false}` |
| GET / PUT | `/equipo/:id/horarios` | Horario de cualquier estilista |
| GET / POST | `/equipo/:id/bloqueos` | Bloqueos de cualquier estilista |
| DELETE | `/bloqueos/:id` | Quitar un bloqueo |

Los cambios rápidos de precio siguen en `PATCH /api/catalogo/servicios/:id/precio` y
`PATCH /api/catalogo/productos/:id/precio`, ahora **solo para ADMIN con sesión**.

## Limitación conocida
Si alguien reservó sin cuenta y después crea una cuenta, esas reservas anteriores **no** se unen a la cuenta
(para que nadie pueda reclamar reservas ajenas con solo conocer un nombre y un teléfono). Unirlas de forma
segura requiere verificar el teléfono o el correo con un código.
