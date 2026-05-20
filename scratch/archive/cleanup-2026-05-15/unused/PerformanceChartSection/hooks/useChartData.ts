import { useState, useCallback, useRef, useEffect } from 'react';
import { DataPoint, lttbDownsample } from '../utils/downsampler';
import { config } from '../constants/config';

export function useChartData(rawData: DataPoint[], isGestureActiveValue: boolean, chartWidth: number) {
  const [chartData, setChartData] = useState<{ x: number; y: number; raw: DataPoint }[]>([]);
  const pendingDataRef = useRef<DataPoint[] | null>(null);

  const processData = useCallback((data: DataPoint[]) => {
    if (!data || data.length === 0) return [];
    
    // Downsample based on available screen width. Approx 1 point per 2 pixels.
    const threshold = Math.max(10, Math.floor(chartWidth / 2));
    const downsampled = lttbDownsample(data, threshold);

    return downsampled.map(d => ({
      x: new Date(d.date).getTime(),
      y: d.value,
      raw: d,
    }));
  }, [chartWidth]);

  // Main data update logic
  useEffect(() => {
    if (!rawData) return;
    
    if (isGestureActiveValue) {
      pendingDataRef.current = rawData;
    } else {
      setChartData(processData(rawData));
      pendingDataRef.current = null;
    }
  }, [rawData, isGestureActiveValue, processData]);

  return chartData;
}
