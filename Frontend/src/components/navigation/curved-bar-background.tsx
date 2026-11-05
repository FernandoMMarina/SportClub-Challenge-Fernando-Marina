import { CurvedViewExpoComponent } from 'react-native-curved-bottom-bar/lib/module/CurvedBottomBar/components/CurvedView/curvedViewExpo';
import { getPathDown } from 'react-native-curved-bottom-bar/lib/module/CurvedBottomBar/utils/pathDown';
import { scale } from 'react-native-size-scaling';

type Props = { width: number; height: number; circleWidth: number; color: string };

// Reutiliza el dibujo de la librería sin montar su navegador de React Navigation.
export function CurvedBarBackground({ width, height, circleWidth, color }: Props) {
  const factor = scale(1);
  const path = getPathDown(width, height / factor, circleWidth / factor, false, 'CENTER');
  return <CurvedViewExpoComponent width={width} height={height} bgColor={color} path={path} />;
}
