import { useDerivedValue } from 'react-native-reanimated';
import { SharedValue } from 'react-native-reanimated';

export function useActivePoint(
  activeIndex: SharedValue<number>,
  chartData: { x: number; y: number; raw: any }[]
) {
  // We can derive values if needed, but activeIndex gives us direct access to the chartData array.
  // We use this in the HeaderSection via runOnJS, or direct worklet read.
  const activePoint = useDerivedValue(() => {
    if (activeIndex.value >= 0 && activeIndex.value < chartData.length) {
      return chartData[activeIndex.value];
    }
    return null;
  }, [chartData]);

  return activePoint;
}
