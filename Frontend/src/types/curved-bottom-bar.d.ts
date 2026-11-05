// La librería no declara sus subrutas JS. Reutilizamos sus tipos publicados.
// Estos imports quedan aislados y se verificaron con la versión fija 3.5.1.
declare module 'react-native-curved-bottom-bar/lib/module/CurvedBottomBar/utils/pathDown' {
  export { getPathDown } from 'react-native-curved-bottom-bar/lib/typescript/CurvedBottomBar/utils/pathDown';
}

declare module 'react-native-curved-bottom-bar/lib/module/CurvedBottomBar/components/CurvedView/curvedViewExpo' {
  export { CurvedViewExpoComponent } from 'react-native-curved-bottom-bar/lib/typescript/CurvedBottomBar/components/CurvedView/curvedViewExpo';
}
