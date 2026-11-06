# SportClub Mobile

Aplicación para consultar las sedes de SportClub, reservar clases, revisar las próximas reservas y editar el perfil. Está desarrollada con Expo SDK 58, React Native, TypeScript, Expo Router y Zustand.

## Instalación y desarrollo

Usá Node.js 22 LTS actualizado y npm. Desde esta carpeta:

```sh
npm ci
npm start
```

Para abrir una compilación nativa en Android:

```sh
npm run android -- --device
```

Este comando necesita Android Studio y el SDK configurados, además de un emulador o un teléfono con depuración USB. `npm run ios` compila la app en iOS y requiere macOS y Xcode. `npm run web` inicia la versión web.

También podés usar Expo Go si su versión es compatible con el SDK del proyecto. Las compilaciones de desarrollo cargan el JavaScript desde Metro, que debe permanecer en ejecución.

## Acceso demo y acceso por API

La cuenta demo es:

```text
demo@sportclub.com
SportClub123!
```

Solo esa combinación ingresa de forma local. El correo se normaliza a minúsculas y se recortan sus espacios externos; la contraseña se compara exactamente. No hay un selector de modo.

La demo permite reservar, cancelar y editar el perfil sin backend. Los stores conservan esos cambios durante la sesión. Al cerrar sesión o reiniciar la app, el usuario y los ejemplos de reservas vuelven a su estado inicial. Editar el correo demo no cambia las credenciales originales.

Cualquier otra combinación válida se envía a la API con Axios. El ingreso realiza `POST /auth/login` y luego `GET /users/me` con el token recibido. La sesión se confirma solo si ambos pasos son correctos. Si el servidor falla, se informa el error y no se concede acceso demo.

Para probar este flujo con la API de Render, usá:

```text
Correo: nuevo-1793942685@sportclub.com
Contraseña: UnaClaveSegura1
```

Configurá `EXPO_PUBLIC_API_URL=https://sportclub-challenge-fernando-marina.onrender.com/api` como se explica en la siguiente sección. Esta cuenta requiere internet y guarda los cambios en el backend. Es una cuenta compartida de prueba; no ingreses datos personales. Si se modifica su correo desde Perfil, el siguiente ingreso debe usar el nuevo correo.

También podés crear otra cuenta en la API con `POST /api/auth/register`. La app no incluye una pantalla de registro. La cuenta demo del servidor puede probarse directamente por HTTP, pero esas mismas credenciales dentro de la app activan el modo local.

## Configurar la API

Copiá el archivo de ejemplo y ajustá la dirección según tu entorno:

```sh
cp .env.example .env
```

Para usar el backend desplegado:

```dotenv
EXPO_PUBLIC_API_URL=https://sportclub-challenge-fernando-marina.onrender.com/api
```

Para usar un backend local en el puerto 3000:

| Entorno | URL |
| --- | --- |
| Web o simulador iOS en la misma computadora | `http://localhost:3000/api` |
| Emulador estándar de Android Studio | `http://10.0.2.2:3000/api` |
| Teléfono en la misma red | `http://IP_LAN_DE_TU_COMPUTADORA:3000/api` |
| Android por USB con `adb reverse tcp:3000 tcp:3000` | `http://localhost:3000/api` |

Sin esta variable, los servicios usan `http://localhost:3000/api`. En un teléfono, localhost apunta al teléfono, salvo que configures el reenvío por USB.

Reiniciá Expo y recargá completamente la app después de modificar `.env`. Para una release, generá otra APK: las variables públicas se incorporan al JavaScript durante la compilación. El archivo `.env` no se sube a Git y nunca debe contener el secreto JWT del backend. Los valores `EXPO_PUBLIC_*` son visibles en la aplicación compilada.

## Pantallas y flujo

- **Login:** valida correo y contraseña, permite mostrar u ocultar la clave e informa errores sin borrar lo ingresado.
- **Inicio:** muestra el nombre del usuario, la próxima clase, el acceso a Sedes y las demás reservas próximas. En demo incluye un aviso compacto.
- **Sedes:** muestra las dos sedes del JSON local. Cada tarjeta abre su información y el selector de clases.
- **Reserva:** permite elegir actividad, fecha y horario, revisar los datos y confirmar. La alerta de éxito ofrece ir a Mis reservas o seguir explorando.
- **Mis reservas:** muestra reservas confirmadas y canceladas. La cancelación requiere confirmación y actualiza las pantallas que usan el mismo store.
- **Perfil:** muestra los datos del usuario, permite editarlos, consultar las reservas y cerrar sesión.
- **Escáner QR:** abre la cámara y lleva al detalle de la sede identificada. Incluye manejo de permisos, QR inválidos y reintentos.

Los horarios se muestran en la zona de Buenos Aires. Inicio incluye las reservas confirmadas que todavía no terminaron, por lo que también puede mostrar una clase en curso.

## Estado y organización del código

```text
src/
  app/          Rutas y layouts de Expo Router
  features/     Pantallas, componentes y lógica de cada funcionalidad
  components/   Componentes compartidos
  stores/       Sesión y reservas en Zustand
  services/     Clientes Axios, validación y servicios
  data/         Sedes y actividades locales
  theme/        Colores, espaciado y tema de navegación
  types/        Tipos compartidos
```

`auth-store` conserva usuario, token, origen de la sesión y vencimiento. `reservations-store` conserva horarios, reservas, errores y operaciones pendientes. Los formularios, la fecha elegida y la revisión previa a reservar usan estado local de React.

El perfil demo se valida y normaliza antes de actualizar el usuario en Zustand. Se conserva su identificador, por lo que editarlo no borra sus reservas. Para cuentas API, el perfil se actualiza con `PATCH /users/me` y se publica en el store después de la confirmación del servidor.

La sesión y las reservas demo no se persisten en disco. En las cuentas API, las reservas y el perfil quedan guardados en el backend, pero el token solo vive en memoria: reiniciar la app requiere ingresar nuevamente. El vencimiento del token se comprueba durante la sesión y al volver del segundo plano.

## Gestión de reservas

Las sedes y actividades salen de `src/data/venues.json`. Para la demo se generan horarios para los próximos 14 días y se cargan reservas de ejemplo al inicializar la sesión.

El store impide reservar una clase ya comenzada, duplicar una reserva confirmada o elegir un horario que se superponga con otra reserva. Dos clases consecutivas son válidas. Una reserva cancelada deja de bloquear el horario y puede volver a reservarse si sigue disponible.

Para cuentas API se consultan las sesiones y las reservas del usuario. Las altas y cancelaciones se publican después de la respuesta del backend, que decide la disponibilidad y los conflictos. Las respuestas tardías de una sesión cerrada no restauran datos de ese usuario.

La barra inferior usa Expo Router para navegar. El botón central abre el escáner como una acción, sin seleccionar la sección Sedes. El listado de sedes se abre desde Inicio o desde la alternativa del escáner.

Para dibujar la barra se reutiliza el SVG de `react-native-curved-bottom-bar`, sin usar su navegador. El adaptador está aislado en `src/components/navigation/curved-bar-background.tsx`; usa subrutas internas de la librería, por lo que hay que revisarlo antes de actualizar su versión.

## APK Android sin Metro

Con Android Studio, Java y el SDK configurados, conectá un teléfono por USB y habilitá la depuración. Desde esta carpeta:

```sh
npx expo run:android --variant release --device
```

El comando genera la carpeta nativa si no existe, compila e instala la app. La APK queda en `android/app/build/outputs/apk/release/app-release.apk` e incluye el JavaScript: después de instalarla podés cerrar Metro y desconectar el cable.

Si ya tenés la APK, podés instalarla con:

```sh
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

La release local actual usa la firma de desarrollo y sirve para probar y entregar el challenge. Para una publicación en tiendas hay que configurar una firma de distribución. La configuración de EAS está en `eas.json`; las carpetas `android/` e `ios/` son generadas y están excluidas de Git.

Verificá la demo con modo avión: ingreso, reservas, cancelación y edición de perfil. El avatar se obtiene de un servicio remoto y puede no cargar sin conexión; las operaciones locales no dependen de él.

## QR y deep links

Abrí alguno de estos códigos en otra pantalla y escanealo desde el botón central:

- [QR de Palermo](assets/qr/palermo.png)
- [QR de Belgrano](assets/qr/belgrano.png)

El lector admite los identificadores `palermo` y `belgrano`, y las URLs `sportclubchallenge://venues/palermo` y `sportclubchallenge://venues/belgrano`. Un código de una sede desconocida o de otro contenido muestra un error y permite volver a intentar. No abre URLs arbitrarias.

Para probar un deep link por USB, con la app instalada y la sesión iniciada:

```sh
adb shell am start -W \
  -a android.intent.action.VIEW \
  -d "sportclubchallenge://venues/palermo" \
  com.fernandommarina.SportClubChallenge
```

Debe abrir el detalle de Palermo. Si Android indica que entregó el intent a la instancia actual, la app ya estaba abierta; eso no es un error. Confirmá también que la pantalla haya cambiado.

Las rutas están protegidas por el login. Si reiniciás por completo la app, la sesión se pierde y el enlace puede llevar al ingreso; no se implementó la recuperación del destino original después de autenticarse. Los permisos de cámara y los deep links deben verificarse en una compilación nativa. El escaneo se prueba en un teléfono con cámara.

## Pruebas y comprobaciones

```sh
npm run typecheck
npm run test:auth
npm run lint
```

Aunque se llama `test:auth`, el comando ejecuta todos los archivos de `test/`: autenticación, edición local y por API, reservas y reglas de horarios. Usa servidores HTTP temporales y no modifica datos del backend de desarrollo ni de Render.

El lint completo tiene incidencias conocidas en los tests: referencias a `Buffer` sin declarar y el parseo de un import con atributos. Se pueden revisar las fuentes por separado con `npx eslint src --no-cache`. Esto no reemplaza la corrección pendiente del lint de los tests.

Para una revisión manual, probá errores de credenciales, permisos de cámara denegados, un QR inválido, reservas duplicadas o superpuestas, cancelación y edición de perfil sin conexión. Para cuentas API, comprobá también la respuesta ante pérdida de conexión y sesión vencida.
