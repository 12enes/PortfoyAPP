import { useSharedValue } from 'react-native-reanimated';

export function useGestureState() {
  const activeX = useSharedValue(-1);
  const activeIndex = useSharedValue(-1);
  const isGestureActive = useSharedValue(false);
  const crosshairOpacity = useSharedValue(0);
  const tooltipSide = useSharedValue<'left' | 'right'>('right');

  return {
    activeX,
    activeIndex,
    isGestureActive,
    crosshairOpacity,
    tooltipSide,
  };
}
