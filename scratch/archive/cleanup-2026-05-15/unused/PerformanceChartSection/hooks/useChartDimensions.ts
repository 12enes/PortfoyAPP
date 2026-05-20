import { useState, useCallback } from 'react';

export function useChartDimensions() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 220 });

  const onLayout = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0) {
      // Allow passing custom height or adapting to layout. Defaulting to 220.
      setDimensions({ width, height: height > 0 ? height : 220 });
    }
  }, []);

  return { dimensions, onLayout };
}
