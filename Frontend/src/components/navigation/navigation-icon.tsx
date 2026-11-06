import Svg, { Path, Circle, Rect } from 'react-native-svg';

export type NavigationIconName = 'home' | 'qr' | 'profile';
type Props = { name: NavigationIconName; color: string; size?: number };

/** Vectores con geometría fija: no dependen de fuentes ni del tamaño de texto del dispositivo. */
export function NavigationIcon({ name, color, size = 28 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {name === 'home' ? <>
        <Path d="M3.5 10.4 12 3.5l8.5 6.9V20a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" />
        <Path d="M9.6 21v-5.4h4.8V21" />
      </> : name === 'profile' ? <>
        <Circle cx={12} cy={7.5} r={4} />
        <Path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2Z" />
      </> : <>
        {/* Marco de escaneo: una esquina por vértice. */}
        <Path d="M3 8.2V4.6A1.6 1.6 0 0 1 4.6 3h3.6M15.8 3h3.6A1.6 1.6 0 0 1 21 4.6v3.6M21 15.8v3.6a1.6 1.6 0 0 1-1.6 1.6h-3.6M8.2 21H4.6A1.6 1.6 0 0 1 3 19.4v-3.6" />
        {/* Módulos macizos: a 30 px un contorno se cerraría y se vería como una mancha. */}
        <Rect x={6.6} y={6.6} width={4} height={4} rx={0.6} fill={color} stroke="none" />
        <Rect x={13.4} y={6.6} width={4} height={4} rx={0.6} fill={color} stroke="none" />
        <Rect x={6.6} y={13.4} width={4} height={4} rx={0.6} fill={color} stroke="none" />
        <Rect x={14.2} y={14.2} width={2.4} height={2.4} rx={0.5} fill={color} stroke="none" />
      </>}
    </Svg>
  );
}
