# SportClub API

Base del backend del challenge: Node.js + Express, JWT y persistencia local en JSON. Requiere Node.js 22 o superior.

## Ejecutar

```sh
npm install
cp .env.example .env
# Generá un secreto y reemplazá JWT_SECRET en .env:
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm run dev
```

`npm start` inicia sin modo watch. El servidor escucha en el puerto 3000 por defecto y en todas las interfaces para permitir probar desde un teléfono en la misma red.

Usuario de prueba: `demo@sportclub.com` / `SportClub123!`.

## Endpoints

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/health` | Público | Estado del servidor |
| POST | `/api/auth/login` | Público | Email y contraseña; devuelve JWT y usuario |
| POST | `/api/auth/register` | Público | Crea la cuenta y devuelve la sesión iniciada |
| GET | `/api/users/me` | Bearer JWT | Perfil autenticado |
| PATCH | `/api/users/me` | Bearer JWT | Modifica firstName, lastName y phone |
| GET | `/api/venues` | Público | Dos sedes, con dos clases cada una |
| GET | `/api/venues/:id` | Público | Detalle de sede |

Las rutas de sesiones y reservas se documentan en [Endpoints de reservas](#endpoints-de-reservas).

```sh
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Fernando","lastName":"Marina","email":"fernando@sportclub.com","password":"UnaClaveSegura1"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@sportclub.com","password":"SportClub123!"}'

curl http://localhost:3000/api/users/me \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN'

curl -X PATCH http://localhost:3000/api/users/me \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN' \
  -d '{"firstName":"Fernando","phone":"+54 11 1234 5678"}'
```

Login y registro responden `{ token, tokenType, expiresIn, user }`; el registro con 201. Las consultas y actualizaciones responden `{ data }`. Los errores usan `{ error: { code, message } }`: 400 para datos inválidos, 401 para credenciales o token inválidos, 404 para recursos inexistentes, 409 para conflictos como un email ya registrado y 429 para exceso de intentos de login o registro (20 cada 15 minutos por IP).

## Estructura y decisiones

- `app.js`: configuración HTTP, CORS, límite de login y errores JSON.
- `bin/www`: arranque y cierre del servidor.
- `src/routes`: endpoints y validaciones.
- `src/middleware`: verificación de JWT HS256, issuer y audience.
- `src/repositories`: acceso a usuarios y escritura atómica del archivo.
- `src/data/venues.json`: sedes ficticias y clases de demostración, reutilizables por el frontend.
- `src/utils`: hash de contraseña con scrypt y errores.

El archivo `data/users.json` se crea al iniciar por primera vez; las actualizaciones sobreviven a reinicios. Se excluye de Git. Para restablecer el usuario de prueba, detené el servidor y eliminá ese archivo. La persistencia está pensada para un único proceso local; para varias instancias conviene reemplazar el repositorio por una base de datos.

El token dura una hora. El cliente cierra sesión descartándolo; esta base no implementa revocación ni refresh tokens. Solo se editan nombre, apellido y teléfono; email, contraseña e identificador no se pueden cambiar por el endpoint de perfil. El registro crea la cuenta y devuelve la sesión ya iniciada, con la misma forma que login, para que la app no tenga que pedir la contraseña dos veces; el email es único y la contraseña pide al menos 8 caracteres. Tanto login como registro admiten 20 solicitudes cada 15 minutos por IP. No hay cambio de contraseña ni baja de cuenta. Se amplió el backend con sesiones y reservas para demostrar reglas de negocio y control de capacidad; el frontend mantiene su funcionamiento local independiente.

Las sedes son públicas para facilitar su consulta. Se agregó el detalle por ID para la futura pantalla de sede. Los días usan nombres en inglés y las horas `HH:mm`, en horario local de Buenos Aires. Ubicaciones y direcciones son ejemplos.

## Variables de entorno

- `PORT`: puerto HTTP (3000).
- `JWT_SECRET`: obligatorio, mínimo 32 bytes; usar un valor aleatorio.
- `CORS_ORIGIN`: origen web permitido, `*` por defecto para desarrollo. Para Expo Web podés usar, por ejemplo, `http://localhost:8081`. CORS no restringe clientes nativos.
- `DATA_FILE`: ruta opcional del archivo de usuarios; rutas relativas se resuelven desde el directorio de ejecución.

Para conectar Expo desde un teléfono, usar la IP LAN de la computadora en lugar de `localhost`. La app mobile debe conservar su funcionamiento autónomo con datos locales según la entrega.

## Pruebas

```sh
npm test
```

Las pruebas usan un archivo temporal y cubren login, autorización, expiración, validación, persistencia y sedes. No modifican los datos locales.

## Documentación interactiva (Swagger)

Con el backend iniciado, abrí [Swagger UI](http://localhost:3000/api-docs/). La especificación OpenAPI 3.0 está disponible en [JSON](http://localhost:3000/api-docs.json) y se mantiene en `src/docs/openapi.json`.

1. Expandí `POST /api/auth/login`, elegí **Try it out** y ejecutá el ejemplo con el usuario demo.
2. Copiá el valor `token` de la respuesta.
3. Pulsá **Authorize**, pegá el token sin el prefijo `Bearer` y confirmá.
4. Probá `GET /api/users/me` o `PATCH /api/users/me`. Las modificaciones se guardan realmente en el perfil.

La documentación incluye esquemas, ejemplos, validaciones y códigos de error. Usa el servidor desde el que se abre, por lo que también funciona al acceder por la IP LAN o con otro puerto. Swagger UI se sirve localmente, sin depender de un CDN.


## Módulo de reservas (JavaScript)

El módulo reutiliza Express, JWT, el repositorio de usuarios y el formato de errores existente. No agrega dependencias ni migra módulos que ya funcionan. Los contratos están documentados con JSDoc en `src/types/reservations.js`; no se incorpora TypeScript al backend por decisión del proyecto.

### Modelo y arquitectura

- **Branch** es la sede que ya existe en `src/data/venues.json`.
- **Activity** es cada elemento de `classes` dentro de esa sede. No hay un segundo catálogo de sedes ni actividades.
- **Session** referencia `branchId` y `activityId` e incorpora `startsAt`, `endsAt` (timestamps Unix en milisegundos UTC) y `capacity` (entero positivo).
- **Reservation** referencia `userId` y `sessionId`, tiene estado `CONFIRMED` o `CANCELLED`, y timestamps de creación/cancelación. Se conserva el historial.

Flujo: `src/routes/reservations.js` aplica la autenticación; `src/controllers/reservations.js` valida DTOs y responde HTTP; `src/services/reservations.js` aplica las reglas; `src/repositories/reservations.js` lee y confirma el archivo. `src/utils/intervals.js` contiene el algoritmo puro. No se agregaron endpoints para administrar sesiones porque no son necesarios para este alcance.

### Persistencia y sesiones de ejemplo

Sesiones y reservas se guardan juntas en `data/reservations.json`, excluido de Git. La variable opcional `RESERVATIONS_FILE` permite cambiar esa ruta; por defecto se usa el mismo directorio de `DATA_FILE`. El repositorio valida las referencias de sesión, intervalos, capacidad y estados; un archivo inválido falla sin ser sobrescrito.

Al crear el archivo por primera vez, `src/data/session-seed.js` genera las próximas **dos semanas** a partir de los días y horarios de las actividades existentes: cada sesión dura **60 minutos** y tiene **20 cupos**. Estos son valores de demostración, no requisitos originales. Los horarios locales se convierten desde UTC-03:00 de Buenos Aires a timestamps absolutos, independientemente de la zona horaria del servidor.

El calendario queda persistido y no se regenera al reiniciar. Al terminar esas dos semanas, el listado futuro estará vacío: para otra demostración, detener el servidor, respaldar el archivo y crear un calendario nuevo. Eliminar el archivo para regenerarlo también elimina su historial de reservas. No se ejecuta una renovación silenciosa ni se modifican reservas anteriores.

### Reglas de negocio

1. El usuario se obtiene de `req.user.id`, verificado por el JWT existente. El cliente solo envía `sessionId`; enviar `userId` u otros campos se rechaza.
2. Debe existir la sesión y su inicio debe ser estrictamente posterior al reloj del servidor. En el instante exacto de inicio ya no se admite reserva.
3. Un usuario solo puede tener una reserva confirmada por sesión.
4. Solo las reservas confirmadas consumen capacidad.
5. Un usuario no puede tener reservas confirmadas con horarios superpuestos, incluso en distintas sedes. No se contempla tiempo de traslado.
6. Los intervalos consecutivos son válidos: 09:00–10:00 y 10:00–11:00 no generan conflicto.
7. Cancelar una reserva propia libera el cupo. Se puede cancelar hasta antes de comenzar la sesión. Repetir una cancelación ya realizada responde 200 sin alterar su timestamp.
8. Una reserva cancelada no bloquea horario ni cupo. Volver a reservar crea una nueva reserva y conserva la cancelada en el historial.
9. Consultar o cancelar una reserva ajena no expone sus datos: la cancelación responde 404.

Las validaciones siguen el orden usuario → sesión → inicio → duplicado → capacidad → conflicto. Si hay varias causas de rechazo simultáneas, se informa la primera según ese orden.

### Algoritmo y complejidad

`intervalsOverlap(a, b)` valida que cada intervalo tenga timestamps enteros, finitos y representables, y `start < end`. Usa intervalos semiabiertos `[start, end)`:

```js
startA < endB && startB < endA
```

Comparar dos intervalos cuesta **O(1)** en tiempo y espacio. La función rechaza strings o fechas locales ambiguas: el dominio trabaja únicamente con milisegundos UTC. Al mostrar fechas, el cliente debe aplicar la zona horaria correspondiente.

Para reservar, se construye un mapa de sesiones y se recorren las reservas confirmadas. Con S sesiones y R reservas, la operación cuesta **O(S + R)**, incluyendo lectura, validación y escritura del JSON. No hay búsquedas de sesión anidadas por cada reserva. La consulta de sesiones ordenadas cuesta **O(R + S log S)**; listar las U reservas del usuario cuesta **O(S + R + U log U)**. El archivo completo se lee por operación: este almacenamiento está pensado para un conjunto pequeño de datos.

**Sweep Line:** resulta útil para detectar todos los conflictos de un lote de N intervalos: ordenar eventos cuesta O(N log N), más el costo de emitir K conflictos si se enumeran. Para un único candidato frente a U reservas existentes, un recorrido O(U) evita ordenar de nuevo. No se implementa porque no aporta valor aquí.

**Interval Tree:** un árbol balanceado permite consultar solapamientos en O(log N + K) e insertar/eliminar en O(log N), con memoria O(N). Sería útil con muchas consultas dinámicas, particionado por usuario, pero exige mantener el índice sincronizado al cancelar y persistir. En este proyecto la lectura/escritura completa del JSON dominaría el costo. Con una base de datos conviene primero una consulta indexada por usuario, estado y fecha; por ejemplo, PostgreSQL también permite restricciones de exclusión sobre rangos para proteger conflictos. No se agrega un árbol para este volumen.

### Concurrencia y consistencia

`repository.transaction(operation)` ejecuta **lectura → comprobaciones de negocio → modificación → validación → escritura** de manera síncrona, sin `await`, en el único hilo JavaScript del proceso. Dos requests HTTP pueden llegar simultáneamente, pero sus secciones críticas no se intercalan: la segunda lee la reserva que ya confirmó la primera. Esto protege tanto el último cupo como conflictos de un mismo usuario en sesiones distintas.

Existe una guarda por ruta de archivo para impedir reentrada, incluso usando dos objetos repositorio sobre el mismo archivo. La operación debe ser síncrona; devolver una Promise se rechaza. Todos los datos se leen nuevamente por transacción, sin un caché independiente por instancia del repositorio.

Se escribe un archivo temporal y se confirma con `renameSync`. Si una regla falla o la escritura falla antes del rename, no se modifica el estado anterior ni se ocupa un cupo. El temporal se limpia. La respuesta de éxito se envía después de confirmar la escritura. El rename evita archivos parcialmente escritos, pero no equivale a durabilidad garantizada ante pérdida eléctrica (no se hace fsync).

**Límite explícito:** esta estrategia es para **un solo proceso Node**. No es segura con cluster, múltiples workers, múltiples servidores ni escritores externos sobre el archivo. Bloquea el event loop durante operaciones de disco y no escala para grandes volúmenes. Para varias instancias se debe usar una base transaccional: proteger la capacidad de la sesión y la exclusión horaria por usuario, mediante bloqueos/restricciones apropiados dentro de la misma transacción. Bloquear solo la sesión no protege reservas del usuario en dos sesiones diferentes.

### Endpoints de reservas

Todos requieren `Authorization: Bearer TOKEN_DEL_LOGIN` y aparecen en Swagger.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/sessions` | Sesiones futuras y sus cupos; filtros opcionales `branchId` y `activityId` |
| GET | `/api/sessions/:id` | Sesión y capacidad restante, incluyendo sesiones pasadas |
| POST | `/api/reservations` | Crear reserva, responde 201 |
| GET | `/api/reservations/me` | Reservas propias confirmadas y canceladas, con detalle de sesión |
| PATCH | `/api/reservations/:id/cancel` | Cancelar reserva propia, responde 200 |

El listado incluye sesiones futuras completas con `remainingCapacity: 0`. `bookable` indica que la sesión tiene cupo y todavía no comenzó; la elegibilidad concreta del usuario se verifica al reservar. Los filtros desconocidos devuelven una lista vacía; los parámetros no admitidos o repetidos devuelven 400.

```sh
curl 'http://localhost:3000/api/sessions?branchId=palermo' \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN'

# Reemplazar SESSION_ID por un id del listado anterior.
curl -X POST http://localhost:3000/api/reservations \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN' \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"SESSION_ID"}'

curl http://localhost:3000/api/reservations/me \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN'

curl -X PATCH http://localhost:3000/api/reservations/RESERVATION_ID/cancel \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN'
```

Errores: **400** para DTOs/filtros inválidos; **401** para acceso no autorizado; **404** para sesión o reserva inexistente/ajena; **409** para `DUPLICATE_RESERVATION`, `SESSION_FULL`, `SCHEDULE_CONFLICT` o `SESSION_STARTED`; **500** para fallas internas de almacenamiento.

### Verificación

```sh
npm test       # node:test: unitarias, repositorio y HTTP real en puertos temporales
npm run check # node --check de fuentes, scripts y pruebas JavaScript
```

Las pruebas usan reloj fijo y archivos temporales. Cubren solapamientos, intervalos contenidos/consecutivos/inválidos, offsets equivalentes, duplicados, capacidad, cancelaciones, privacidad, fallos de persistencia, rollback y solicitudes HTTP simultáneas al último cupo o a horarios superpuestos del mismo usuario. No modifican datos de desarrollo.

El backend no dispone de lint ni compilación TypeScript. No se agregan esas herramientas solo para este módulo JavaScript. El frontend todavía mantiene su autenticación y datos locales: esta ampliación de la API no implementa por sí sola el flujo de reservas en Zustand ni la sincronización de Home.
