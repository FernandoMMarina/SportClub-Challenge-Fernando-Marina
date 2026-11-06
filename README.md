# SportClub Challenge

Aplicación mobile para consultar sedes deportivas, reservar clases y administrar el perfil del usuario. El proyecto resuelve los dos ejercicios del challenge: una API con Node.js y una app con React Native, Expo, TypeScript y Zustand.

La app se puede probar con una cuenta demo sin conexión ni backend. También tiene integración con Axios para iniciar sesión y gestionar datos de cuentas reales en la API.

## Contenido del repositorio

- [Frontend](Frontend/README.md): aplicación mobile, configuración, pruebas y generación de la APK.
- [Backend](Backend/README.md): API, autenticación, persistencia y documentación de endpoints.

Ambos proyectos se instalan y ejecutan por separado. Para trabajar con el código necesitás Node.js 22 LTS actualizado y npm. Para compilar Android localmente también necesitás Android Studio, el SDK de Android y Java configurados.

## Probar la aplicación

### Cuenta demo

| Campo | Valor |
| --- | --- |
| Correo | `demo@sportclub.com` |
| Contraseña | `SportClub123!` |

Con estas credenciales podés consultar las sedes, reservar y cancelar clases, editar el perfil y probar el escáner QR. La app utiliza los datos locales y no hace solicitudes de autenticación, perfil o reservas al backend.

El perfil y las reservas se mantienen en los stores de Zustand mientras dura la sesión. Al cerrar sesión o reiniciar la app se restablecen los datos de demostración. Cambiar el correo del perfil demo no modifica las credenciales de ingreso.

### Ejecutar el frontend en desarrollo

Desde la raíz del repositorio:

```sh
cd Frontend
npm ci
npm start
```

Podés abrirlo con Expo Go en un teléfono compatible con el SDK del proyecto. Para una compilación nativa en un dispositivo Android conectado por USB:

```sh
npm run android -- --device
```

Las compilaciones de desarrollo necesitan Metro en ejecución. Para probar sin Metro, generá una release como se explica a continuación.

### Generar e instalar la APK

Desde `Frontend/`, con el teléfono conectado y la depuración USB habilitada:

```sh
npx expo run:android --variant release --device
```

La compilación release incluye el JavaScript y permite usar la app sin Expo Go ni Metro. En este proyecto queda en `Frontend/android/app/build/outputs/apk/release/app-release.apk`. Las carpetas nativas se generan localmente y no se incluyen en Git.

La configuración nativa actual usa la firma de desarrollo para la release local de prueba. Para publicar en una tienda corresponde configurar una firma de distribución.

La APK es un archivo de entrega separado del código fuente. La ruta anterior indica dónde se genera; no es un enlace de descarga de una APK publicada.

## Integración con el backend

La API desplegada está disponible en [Render](https://sportclub-challenge-fernando-marina.onrender.com/health), con [documentación Swagger](https://sportclub-challenge-fernando-marina.onrender.com/api-docs/).

Para usarla desde el frontend, creá `Frontend/.env` con:

```dotenv
EXPO_PUBLIC_API_URL=https://sportclub-challenge-fernando-marina.onrender.com/api
```

Cualquier combinación válida de correo y contraseña distinta de la cuenta demo se autentica con Axios contra esa API. Para probar la integración con Render podés usar esta cuenta de prueba:

| Campo | Valor |
| --- | --- |
| Correo | `nuevo-1793942685@sportclub.com` |
| Contraseña | `UnaClaveSegura1` |

Esta cuenta requiere conexión a internet y la URL de Render configurada en la app. Sus cambios de perfil y reservas se envían al servidor. Es una cuenta compartida de demostración; no ingreses datos personales.

También podés crear otra cuenta con `POST /api/auth/register`, desde Swagger o una herramienta HTTP; la app no tiene pantalla de registro.

La combinación demo siempre ingresa localmente, aunque también exista un usuario con esas credenciales en el backend. Para probar la integración desde la app, usá otra cuenta.

Al cambiar una variable de entorno, reiniciá Expo y recargá la app. Si estás usando una APK release, necesitás generar e instalar otra compilación.

Para ejecutar la API en tu computadora, seguí el [README del backend](Backend/README.md). La configuración para emulador, teléfono físico y conexión por USB está en el [README del frontend](Frontend/README.md#configurar-la-api).

## Recorrido de prueba

1. Iniciá sesión con la cuenta demo.
2. Desde Inicio, abrí Ver sedes y reservar y seleccioná una sede.
3. Elegí actividad, fecha y horario; revisá los datos y confirmá.
4. Usá Ver mis reservas en la confirmación o volvé a Inicio para consultar la clase.
5. Cancelá una reserva y comprobá que la app pida confirmación y actualice el listado.
6. Desde Perfil, editá nombre, apellido o correo y verificá los cambios.
7. Abrí el escáner QR y apuntá a uno de los [códigos de ejemplo](Frontend/README.md#qr-y-deep-links).
8. Cerrá sesión y comprobá que vuelva al login.

Para verificar el funcionamiento autónomo, repetí el recorrido con una APK release, sin Metro y sin conexión. La carga del avatar remoto de Perfil requiere internet, pero no interviene en el ingreso ni en las operaciones locales.

## Decisiones principales

Zustand mantiene la sesión y las reservas compartidas entre pantallas. Los campos de formularios y las selecciones temporales se manejan con estado local de React. Las sedes y actividades se leen de JSON, como permite la consigna.

En la demo, las operaciones se resuelven en memoria para permitir una evaluación autónoma. En cuentas API, el frontend espera la respuesta del servidor antes de confirmar los cambios. No reemplaza errores de red con datos demo.

El backend usa archivos JSON para una persistencia sencilla y agrega validaciones de cupos, duplicados y horarios superpuestos. Las decisiones y limitaciones se explican en los README de cada proyecto.

## Verificaciones

En el frontend:

```sh
cd Frontend
npm run typecheck
npm run test:auth
npm run lint
```

En el backend:

```sh
cd Backend
npm test
npm run check
```

Las pruebas automatizadas cubren autenticación, edición de perfil, reservas y reglas de negocio. El lint completo del frontend tiene incidencias conocidas en algunos archivos de prueba; el detalle está en su README. Las comprobaciones automáticas no reemplazan la prueba de la APK y de la cámara en un dispositivo real.
