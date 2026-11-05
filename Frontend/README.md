# SportClub Mobile

Base limpia con Expo SDK 58, TypeScript y Expo Router.

## Ejecutar

Desde `Frontend/`:

```sh
npm install
npm start
```

`npm run android`, `npm run ios` y `npm run web` abren cada plataforma. Para comprobar el código: `npm run typecheck` y `npm run lint`.

## Organización

- `src/app/`: rutas y layouts. Login separado de las pestañas Inicio, Sedes y Perfil.
- `src/features/auth/`: acceso y futura autenticación.
- `src/features/reservations/`: Home y futuras reservas.
- `src/features/venues/`: listado y detalle de sedes.
- `src/features/profile/`: perfil del usuario.
- `src/components/`: componentes compartidos.
- `src/hooks/`: hooks compartidos.
- `src/stores/`: futuros stores de Zustand para sesión y reservas.
- `src/services/`: futuros adaptadores HTTP y almacenamiento.
- `src/data/`: futuros datos locales para la APK autónoma.
- `src/theme/`: colores y espaciado compartidos.
- `src/types/`: tipos compartidos entre funcionalidades.
- `src/utils/`: utilidades generales.
- `assets/`: iconos y recursos estáticos.

Las carpetas todavía vacías incluyen `.gitkeep` para conservarlas en Git. Las rutas delegan en pantallas de cada funcionalidad. El login valida las credenciales demo localmente y guarda el usuario en Zustand. Las pestañas están protegidas con Stack.Protected; cerrar sesión desde Perfil vuelve al login. Las reservas y la edición de perfil todavía están pendientes.

Se quitaron la pantalla Explore, los componentes de tutorial, la animación de bienvenida y el script de reset de la plantilla. Se mantienen los iconos configurados y las dependencias existentes, incluyendo Zustand y la barra curva agregada previamente.

La variable opcional `EXPO_PUBLIC_API_URL` está documentada en `.env.example`; todavía no la consume ningún servicio. No guardar secretos en variables `EXPO_PUBLIC_*`.

## Login local

Usuario: `demo@sportclub.com`. Contraseña: `SportClub123!`.

Funciona sin backend ni conexión. El email se normaliza a minúsculas y se recortan sus espacios externos; la contraseña se compara exactamente. Se muestran errores para email inválido, contraseña vacía y credenciales incorrectas.

La sesión se mantiene en memoria mientras la app está abierta; al reiniciar se vuelve a pedir login. No se guarda la contraseña ingresada ni se genera un JWT ficticio. Las credenciales incluidas son públicas y exclusivas de la demostración. Las demás credenciales se autentican contra el backend y su JWT se mantiene en memoria.

## Barra de navegación curva

La barra muestra Inicio a la izquierda, Escanear QR como acción central y Perfil a la derecha. Mantiene los eventos de pestañas, el historial y las rutas protegidas de Expo Router.

Se reutilizan el generador de curva y el componente SVG de `react-native-curved-bottom-bar` 3.5.1. Su navegador completo utiliza paquetes externos de React Navigation, incompatibles con el contexto de Expo Router de SDK 58. Por eso la navegación sigue a cargo de Expo Router y los imports internos de la librería están aislados en `src/components/navigation/curved-bar-background.tsx`. La versión se fija porque esas subrutas no son API pública; revisar este adaptador antes de actualizarla.

La barra reserva su espacio bajo el contenido y contempla el área segura inferior. No aparece en el login.

## QR de sedes

El botón circular central es una acción de escaneo, como en RI Monitoreo: abre la cámara en una pantalla modal, sin seleccionar una pestaña. Se piden permisos al tocar Permitir cámara. Un QR válido cierra el escáner y abre la sede; uno inválido muestra un error y permite reintentar. La cámara se desmonta al salir, perder foco o pasar la app a segundo plano.

Contenidos admitidos: `sportclubchallenge://venues/palermo`, `sportclubchallenge://venues/belgrano`, o los identificadores `palermo` y `belgrano`. El formato se valida contra las sedes locales; no abre URLs arbitrarias. El listado también está disponible desde Inicio y desde Ver sedes sin escanear.

La cámara requiere un dispositivo físico; el simulador muestra una explicación y permite consultar las sedes. Expo Go incluye expo-camera. Si usás una compilación propia, es necesario reconstruirla tras incorporar este módulo y su configuración de permisos.

QR de ejemplo para escanear desde otro dispositivo: `assets/qr/palermo.png` y `assets/qr/belgrano.png`.

## Errores del login

La sesión y el usuario se comparten con Zustand; campos, validaciones y estado de envío permanecen locales al formulario. `AuthError` distingue validaciones de credenciales incorrectas, sin comparar textos de excepciones.

- Campos vacíos, correo inválido o contraseña de más de 128 caracteres: errores específicos junto al campo, foco en el primero inválido y anuncio de accesibilidad.
- Credenciales incorrectas: alerta nativa con acción Revisar datos; nunca indica si el email existe. En web se presenta un mensaje accesible dentro del formulario.
- Errores inesperados: mensaje genérico; no se muestra la excepción técnica ni se descartan los datos ingresados.
- Envíos repetidos: guarda síncrona y controles bloqueados durante el intento. El login local no introduce demoras artificiales; al tener éxito la navegación protegida muestra Inicio.

Al consultar la API también se clasifican fallos de red, timeout de 10 segundos, credenciales inválidas, límite de intentos (429), errores 5xx, sesión vencida y respuestas malformadas. No se muestran mensajes técnicos devueltos por Axios o por el servidor. No se usa una alerta de éxito, ya que el cambio de pantalla confirma el ingreso.

Pruebas de validación y clasificación de errores: `npm run test:auth` (Node.js 22.6 o superior con soporte para strip-types).

En Cuenta de prueba, cada dato tiene a su derecha un botón con el ícono Feather/copy. Copia únicamente el email o la contraseña correspondiente para pegarlo en su campo; muestra confirmación o error y no autocompleta el formulario. Las credenciales se definen en un único lugar del servicio de autenticación.


## Integración local con Axios

En dos terminales, desde la raíz del repositorio:

```sh
cd Backend
npm install
# Configurar .env según Backend/.env.example si todavía no existe.
npm start
```

```sh
cd Frontend
npm install
cp .env.example .env
npm start -- --clear
```

El archivo `.env` del frontend está excluido de Git. Para usar el backend:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

- iOS Simulator y navegador en la Mac: `http://localhost:3000/api`.
- Android Emulator: `http://10.0.2.2:3000/api`.
- Teléfono físico: `http://IP_LAN_DE_LA_MAC:3000/api`, conectado a la misma red. `localhost` en el teléfono apunta al propio teléfono.

Reiniciar Expo y recargar completamente la app al cambiar el entorno. No poner el secreto JWT del backend en el frontend.

### Flujo y estado

1. El formulario valida email y contraseña y espera `await signIn(...)`; permanece bloqueado hasta que termina.
2. `api-auth-service.ts` envía `POST /auth/login` con Axios.
3. Con el JWT recibido, consulta `GET /users/me` usando `Authorization: Bearer ...`. No confirma el ingreso si este paso falla.
4. `auth-store.ts` publica la sesión completa en Zustand, de forma que Inicio y Perfil usan el usuario persistido del servidor.
5. Cerrar sesión elimina usuario y JWT de memoria. Al vencer el plazo informado por el servidor se cierra la sesión; también se comprueba al volver del segundo plano. Una respuesta de login que llegue después de cerrar sesión no vuelve a autenticar al usuario.

El cliente Axios tiene timeout de 10 segundos y no reintenta automáticamente el login. El token se pasa explícitamente a la solicitud protegida, sin guardarlo en headers globales ni persistirlo en disco. Reiniciar la aplicación pide login nuevamente. No se agrega refresh token ni revocación; al cerrar sesión se descarta la copia del cliente.

### APK autónoma

La cuenta demo permite ingresar sin servidor ni conexión, sin configuración adicional y sin JWT ficticio. Cualquier otra combinación de credenciales requiere la API; un fallo de red no concede acceso local.


La autenticación y el perfil se integran con la API. El flujo de reservas usa Zustand, con funcionamiento local para demo y servicios HTTP para cuentas API; ver Reservas compartidas con Zustand.

### Pruebas

`npm run test:auth` ejecuta pruebas de validaciones, transporte HTTP con Axios, timeout, respuestas inválidas, JWT en solicitudes protegidas y consistencia de Zustand. Los tests HTTP usan servidores locales temporales y no cambian los datos del backend de desarrollo.


## Contraseña y acceso demo autónomo

El ojo junto a la contraseña alterna entre mostrarla y ocultarla; no cambia su valor. La contraseña se oculta inicialmente y al volver al login tras cerrar sesión.




### Selección automática del acceso

El formulario no tiene selector de modo. Al ingresar `demo@sportclub.com` con `SportClub123!`, autentica localmente y no hace solicitudes HTTP. El email se normaliza (minúsculas y espacios externos), pero la contraseña debe coincidir exactamente. Con cualquier otra combinación válida se usa Axios y el backend, incluso si el email es el de demo pero la contraseña no coincide. Campos inválidos se rechazan antes de consultar el servidor.

El ojo para mostrar y ocultar la contraseña y los íconos de copia permanecen disponibles. No se genera una APK con este cambio.


## Editar información personal

Perfil → Editar información personal permite cambiar nombre, apellido y correo. `PATCH /api/users/me` requiere JWT, recorta espacios, normaliza el email y rechaza correos duplicados (409). La respuesta confirmada actualiza únicamente `user` en Zustand; conserva token y vencimiento. Cancelar antes de guardar descarta el formulario. Salir durante una solicitud no revierte una escritura ya enviada; una respuesta tardía nunca restaura una sesión cerrada.

La cuenta demo local no tiene JWT y muestra un aviso con el guardado deshabilitado. Para probar persistencia real, ingresar con una cuenta del backend (distinta de la combinación demo local). No se simulan actualizaciones. En Android configurar `EXPO_PUBLIC_API_URL` con una dirección accesible desde el dispositivo; por ejemplo `http://10.0.2.2:3000/api` para el emulador estándar, o la IP LAN del equipo para un dispositivo físico.

Verificaciones: `npm run test:auth`, `npm run typecheck`, `npm run lint` en Frontend; `npm test` en Backend. Prueba manual Android: ingresar con JWT, editar cada campo, guardar y comprobar Perfil; repetir ingreso usando el nuevo correo; probar cancelar, correo duplicado, error de red, botón Atrás y cerrar sesión. La sesión permanece en memoria, como antes.


## Reservas compartidas con Zustand

`useReservationsStore` centraliza sesiones, reservas, carga, errores y operaciones pendientes. Sedes permite reservar un horario; Home muestra las reservas confirmadas que no finalizaron; Perfil → Mis reservas incluye el historial y permite cancelar. Todas las pantallas observan el mismo estado.

La cuenta demo carga ejemplos una sola vez por sesión y permite crear/cancelar reservas locales sin HTTP. Los horarios se generan para los próximos 14 días con el catálogo local (Buenos Aires); la validación rechaza duplicados, clases comenzadas y solapamientos usando `inicioA < finB && inicioB < finA`. Las clases consecutivas se permiten. El estado es en memoria: se limpia al salir o reiniciar, igual que la autenticación; los ejemplos se inicializan al volver a entrar.

Con una sesión API, el store consulta sesiones y reservas, y solo publica altas/cancelaciones confirmadas por el backend, que sigue siendo la autoridad para cupos y conflictos. Las respuestas tardías después de cerrar sesión se descartan. No se usan datos demo como reemplazo ante errores del servidor. No se requiere instalar dependencias nuevas.
