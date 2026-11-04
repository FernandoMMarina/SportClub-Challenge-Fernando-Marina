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
| GET | `/api/users/me` | Bearer JWT | Perfil autenticado |
| PATCH | `/api/users/me` | Bearer JWT | Modifica firstName, lastName y phone |
| GET | `/api/venues` | Público | Dos sedes, con dos clases cada una |
| GET | `/api/venues/:id` | Público | Detalle de sede |

```sh
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

Login responde `{ token, tokenType, expiresIn, user }`. Las consultas y actualizaciones responden `{ data }`. Los errores usan `{ error: { code, message } }`: 400 para datos inválidos, 401 para credenciales o token inválidos, 404 para recursos inexistentes y 429 para exceso de intentos de login (20 cada 15 minutos por IP).

## Estructura y decisiones

- `app.js`: configuración HTTP, CORS, límite de login y errores JSON.
- `bin/www`: arranque y cierre del servidor.
- `src/routes`: endpoints y validaciones.
- `src/middleware`: verificación de JWT HS256, issuer y audience.
- `src/repositories`: acceso a usuarios y escritura atómica del archivo.
- `src/data/venues.json`: sedes ficticias y clases de demostración, reutilizables por el frontend.
- `src/utils`: hash de contraseña con scrypt y errores.

El archivo `data/users.json` se crea al iniciar por primera vez; las actualizaciones sobreviven a reinicios. Se excluye de Git. Para restablecer el usuario de prueba, detené el servidor y eliminá ese archivo. La persistencia está pensada para un único proceso local; para varias instancias conviene reemplazar el repositorio por una base de datos.

El token dura una hora. El cliente cierra sesión descartándolo; esta base no implementa revocación ni refresh tokens. Solo se editan nombre, apellido y teléfono; email, contraseña e identificador no se pueden cambiar por el endpoint de perfil. No se incluye registro ni reservas: las reservas pertenecen al ejercicio mobile.

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
