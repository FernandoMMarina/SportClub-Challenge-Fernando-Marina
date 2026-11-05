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

La sesión se mantiene en memoria mientras la app está abierta; al reiniciar se vuelve a pedir login. No se guarda la contraseña ingresada ni se genera un JWT ficticio. Las credenciales incluidas son públicas y exclusivas de la demostración. Para autenticación real se debe conectar el servicio al backend y gestionar el token correspondiente.

## Barra de navegación curva

La barra muestra Inicio a la izquierda, Escanear QR como acción central y Perfil a la derecha. Mantiene los eventos de pestañas, el historial y las rutas protegidas de Expo Router.

Se reutilizan el generador de curva y el componente SVG de `react-native-curved-bottom-bar` 3.5.1. Su navegador completo utiliza paquetes externos de React Navigation, incompatibles con el contexto de Expo Router de SDK 58. Por eso la navegación sigue a cargo de Expo Router y los imports internos de la librería están aislados en `src/components/navigation/curved-bar-background.tsx`. La versión se fija porque esas subrutas no son API pública; revisar este adaptador antes de actualizarla.

La barra reserva su espacio bajo el contenido y contempla el área segura inferior. No aparece en el login.

## QR de sedes

El botón circular central es una acción de escaneo, como en RI Monitoreo: abre la cámara en una pantalla modal, sin seleccionar una pestaña. Se piden permisos al tocar Permitir cámara. Un QR válido cierra el escáner y abre la sede; uno inválido muestra un error y permite reintentar. La cámara se desmonta al salir, perder foco o pasar la app a segundo plano.

Contenidos admitidos: `sportclubchallenge://venues/palermo`, `sportclubchallenge://venues/belgrano`, o los identificadores `palermo` y `belgrano`. El formato se valida contra las sedes locales; no abre URLs arbitrarias. El listado también está disponible desde Inicio y desde Ver sedes sin escanear.

La cámara requiere un dispositivo físico; el simulador muestra una explicación y permite consultar las sedes. Expo Go incluye expo-camera. Si usás una compilación propia, es necesario reconstruirla tras incorporar este módulo y su configuración de permisos.

QR de ejemplo para escanear desde otro dispositivo: `assets/qr/palermo.png` y `assets/qr/belgrano.png`.
