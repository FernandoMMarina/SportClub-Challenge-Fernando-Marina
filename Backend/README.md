# SportClub API

API REST del challenge, desarrollada con Node.js y Express. Permite iniciar sesión, consultar y editar el perfil, obtener las sedes y gestionar reservas. Usa JWT para autenticar las operaciones protegidas y archivos JSON para guardar los datos.

El backend funciona de forma independiente de la app. La integración mobile es opcional: la cuenta demo de la aplicación se resuelve localmente.

## Instalación

Necesitás Node.js 22 o superior y npm. Desde esta carpeta:

```sh
npm ci
cp .env.example .env
```

Generá un secreto para firmar los tokens:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copiá el resultado en `JWT_SECRET` dentro de `.env`, reemplazando el valor de ejemplo. Después iniciá el servidor:

```sh
npm run dev
```

`npm run dev` reinicia el proceso cuando cambia el código. `npm start` lo ejecuta sin ese seguimiento. El puerto por defecto es 3000.

Para verificar el arranque:

```sh
curl http://localhost:3000/health
```

La respuesta esperada es `{"status":"ok"}`.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP. Por defecto, 3000. |
| `JWT_SECRET` | Secreto de al menos 32 bytes para firmar los JWT. |
| `CORS_ORIGIN` | Origen web permitido. Por defecto, `*`. |
| `DATA_FILE` | Ruta del archivo de usuarios. Por defecto, `data/users.json`. |
| `RESERVATIONS_FILE` | Ruta de sesiones y reservas. Por defecto, `reservations.json` en el mismo directorio que el archivo de usuarios. |

Las rutas relativas se resuelven desde el directorio donde se inicia el proceso. Los archivos `.env` y `data/` están excluidos de Git. El secreto JWT es exclusivo del backend y no debe ponerse en variables públicas de Expo.

CORS se aplica a navegadores; no reemplaza la autenticación de la API ni limita las solicitudes de una app nativa.

## API desplegada y documentación

- [Estado de la API en Render](https://sportclub-challenge-fernando-marina.onrender.com/health)
- [Swagger en Render](https://sportclub-challenge-fernando-marina.onrender.com/api-docs/)
- [Swagger local](http://localhost:3000/api-docs/)
- [OpenAPI JSON local](http://localhost:3000/api-docs.json)

La especificación está en `src/docs/openapi.json`. En Swagger podés ejecutar el login, copiar el token y pegarlo en Authorize, sin escribir el prefijo Bearer. Las consultas protegidas usan ese token.

## Usuario de prueba y registro

La primera vez que se crea el archivo de usuarios se carga esta cuenta:

```text
demo@sportclub.com
SportClub123!
```

Sus datos se guardan en el archivo del servidor. Si se modifica su correo, el login posterior debe usar el nuevo valor. Esto es independiente de la cuenta demo local del frontend, que siempre usa las credenciales originales.

Para probar Axios desde la app contra Render, está disponible esta cuenta compartida de prueba:

```text
Correo: nuevo-1793942685@sportclub.com
Contraseña: UnaClaveSegura1
```

Corresponde al backend desplegado, no se crea automáticamente en un backend local. Requiere internet y la URL de Render configurada en el frontend. No ingreses datos personales: las modificaciones se guardan en esa cuenta compartida. Si se cambia su correo, cambia también el dato necesario para iniciar sesión.

Para usar otra cuenta o probar un backend local, podés registrarla por API. No hay pantalla de registro en el frontend:

```sh
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Fernando","lastName":"Marina","email":"fernando@example.com","password":"UnaClaveSegura1"}'
```

El registro responde con estado 201 y una sesión iniciada. El correo debe ser único y la contraseña tener entre 8 y 128 caracteres.

## Endpoints

Las rutas protegidas requieren `Authorization: Bearer TOKEN`.

| Método | Ruta | Acceso | Resultado |
| --- | --- | --- | --- |
| GET | `/health` | Público | Estado del servidor |
| POST | `/api/auth/login` | Público | Inicia sesión y devuelve JWT y usuario |
| POST | `/api/auth/register` | Público | Crea una cuenta e inicia sesión |
| GET | `/api/users/me` | JWT | Obtiene el perfil |
| PATCH | `/api/users/me` | JWT | Actualiza nombre, apellido o correo |
| GET | `/api/venues` | Público | Lista las dos sedes con sus actividades |
| GET | `/api/venues/:id` | Público | Obtiene una sede |
| GET | `/api/sessions` | JWT | Lista las sesiones futuras y los cupos |
| GET | `/api/sessions/:id` | JWT | Obtiene una sesión, incluso si ya pasó |
| POST | `/api/reservations` | JWT | Crea una reserva; responde 201 |
| GET | `/api/reservations/me` | JWT | Lista las reservas propias, incluidas las canceladas |
| PATCH | `/api/reservations/:id/cancel` | JWT | Cancela una reserva propia |

El listado de sesiones permite filtrar por `branchId` y `activityId`. Incluye sesiones completas con `remainingCapacity: 0`. El campo `bookable` indica disponibilidad general; los conflictos del usuario se comprueban al reservar.

Login y registro responden `{ token, tokenType, expiresIn, user }`. Las consultas y las operaciones de perfil y reservas usan `{ data }`. Los errores tienen la forma `{ error: { code, message } }`.

Los códigos principales son 400 para datos inválidos, 401 para autenticación incorrecta, 404 para recursos inexistentes o reservas ajenas, 409 para conflictos y 429 para exceso de intentos. Login y registro tienen un límite de 20 solicitudes por IP cada 15 minutos, aplicado por separado.

### Iniciar sesión y editar el perfil

```sh
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@sportclub.com","password":"SportClub123!"}'
```

Con el token de esa respuesta:

```sh
curl http://localhost:3000/api/users/me \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN'

curl -X PATCH http://localhost:3000/api/users/me \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN' \
  -d '{"firstName":"Fernando","lastName":"Marina","email":"fernando@example.com"}'
```

El perfil permite modificar `firstName`, `lastName` y `email`. Recorta espacios, normaliza el correo y rechaza duplicados. El identificador, la contraseña y el teléfono no se editan con este endpoint.

Los tokens duran una hora y se validan con HS256, emisor y audiencia. No se implementaron refresh tokens ni revocación. Las contraseñas se guardan como hashes con scrypt y no aparecen en las respuestas.

### Reservar y cancelar

Primero consultá los horarios disponibles:

```sh
curl 'http://localhost:3000/api/sessions?branchId=palermo' \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN'
```

Usá el identificador de una sesión del listado:

```sh
curl -X POST http://localhost:3000/api/reservations \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN' \
  -d '{"sessionId":"SESSION_ID"}'

curl http://localhost:3000/api/reservations/me \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN'

curl -X PATCH http://localhost:3000/api/reservations/RESERVATION_ID/cancel \
  -H 'Authorization: Bearer TOKEN_DEL_LOGIN'
```

La identidad del usuario se obtiene del JWT. El cliente no elige el dueño de la reserva.

## Organización y modelo de datos

```text
app.js             Configuración de Express, documentación y manejo de errores
bin/www            Inicio y cierre del servidor
src/routes/        Rutas y validaciones de autenticación, perfil y sedes
src/controllers/   Entrada y respuesta HTTP del módulo de reservas
src/services/      Reglas de negocio de reservas
src/repositories/  Lectura y escritura de archivos
src/middleware/    Validación del JWT
src/data/          Sedes y generación inicial de sesiones
src/types/         Contratos de reservas con JSDoc
src/utils/         Contraseñas, intervalos y errores
```

El backend está escrito en JavaScript. Se mantuvo esa elección para resolver el ejercicio con Node.js sin agregar una etapa de compilación; los contratos del módulo de reservas están documentados con JSDoc.

Cada sede tiene dirección, coordenadas, descripción, horarios de apertura y dos actividades. Las actividades incluyen días y horas. El catálogo está en `src/data/venues.json`; las ubicaciones son datos de demostración.

Una sesión representa una actividad en una sede, con inicio, fin y capacidad. Una reserva relaciona al usuario con la sesión y guarda su estado, creación y eventual cancelación. Las fechas de sesiones y reservas son timestamps UTC en milisegundos; los horarios del catálogo se interpretan en Buenos Aires.

## Reglas de reservas

- Solo se reservan sesiones existentes que todavía no comenzaron.
- Un usuario no puede tener dos reservas confirmadas de la misma sesión.
- Solo las reservas confirmadas consumen cupo.
- Se rechazan horarios superpuestos del mismo usuario, incluso entre sedes.
- Dos clases consecutivas se permiten; no se calcula tiempo de traslado.
- Se puede cancelar una reserva propia antes de su inicio. La cancelación libera el cupo y conserva el historial.
- Repetir una cancelación no cambia su fecha ni vuelve a consumir cupo. Es posible reservar nuevamente después de cancelar.
- Consultar o cancelar una reserva ajena no expone sus datos.

Para detectar superposiciones se comparan intervalos semiabiertos:

```js
startA < endB && startB < endA
```

La comparación cuesta O(1). Para una nueva reserva se recorren las reservas existentes, sin ordenar todos los intervalos. Con S sesiones y R reservas, la operación completa cuesta O(S + R), incluida la lectura del JSON. Un árbol de intervalos o un algoritmo de barrido no aportarían una mejora relevante para el volumen de este ejercicio.

## Persistencia y límites

Los usuarios se guardan en `data/users.json`; las sesiones y reservas, en `data/reservations.json`. Se crean cuando no existen y conservan los cambios al reiniciar, siempre que el almacenamiento del servidor mantenga esos archivos. En un despliegue con disco efímero, un redeploy puede perderlos; no se incluye una base de datos externa.

Al crear el archivo de reservas se generan dos semanas de sesiones desde el catálogo, con duración de 60 minutos y 20 cupos por sesión. Son valores de demostración. El calendario no se renueva automáticamente: cuando termine ese período no habrá sesiones futuras. Para preparar otra demostración, detené el servidor y respaldá los datos antes de regenerar el archivo; eliminarlo también elimina el historial de reservas.

La escritura usa un archivo temporal y un rename para evitar dejar un JSON parcial. Las comprobaciones y la modificación de reservas se ejecutan juntas, de forma síncrona, en un único proceso Node. Así dos solicitudes al último cupo no se intercalan dentro de ese proceso.

Esta solución alcanza para el challenge, pero no es segura para varios procesos, instancias o escritores externos. También bloquea el event loop durante el acceso a disco y no garantiza durabilidad ante una pérdida eléctrica. Para escalar habría que usar una base transaccional que proteja capacidad y conflictos horarios en la misma operación.

El registro de usuarios y el módulo de reservas amplían el alcance mínimo para probar cuentas reales y aplicar las mismas reglas en el servidor. No se agregaron endpoints de administración de sesiones, recuperación de contraseña ni baja de cuenta.

## Pruebas

```sh
npm test
npm run check
```

Las pruebas cubren autenticación, perfil, persistencia, sedes, conflictos horarios, capacidad, cancelación, privacidad y solicitudes simultáneas. Usan archivos y servidores temporales; no modifican los datos de desarrollo. `npm run check` verifica la sintaxis de los archivos JavaScript.

La API también incluye una colección de [Postman](postman/collections/sportclub-api.postman_collection.json) y un [entorno local](postman/environments/local.postman_environment.json). Swagger permite revisar los contratos actuales sin instalar otra herramienta.
