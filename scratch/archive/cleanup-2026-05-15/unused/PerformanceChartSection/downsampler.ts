export interface DataPoint {
  date: string;
  value: number;
}

/**
 * Largest-Triangle-Three-Buckets (LTTB) algorithm
 * Downsamples data to a threshold number of points while preserving visual integrity.
 */
export function lttbDownsample(data: DataPoint[], threshold: number): DataPoint[] {
  const dataLength = data.length;
  if (threshold >= dataLength || threshold === 0) {
    return data; // Nothing to do
  }

  const sampled: DataPoint[] = [];
  let sampledIndex = 0;

  // Bucket size. Leave room for start and end data points
  const every = (dataLength - 2) / (threshold - 2);

  let a = 0; // Initially a is the first point in the triangle
  let maxAreaPoint: DataPoint;
  let maxArea: number;
  let area: number;
  let nextA: number;

  sampled[sampledIndex++] = data[a]; // Always add the first point

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (containing c)
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * every) + 1;
    let avgRangeEnd = Math.floor((i + 2) * every) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += new Date(data[avgRangeStart].date).getTime();
      avgY += data[avgRangeStart].value;
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    let rangeOffs = Math.floor((i + 0) * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;

    // Point a
    const pointAX = new Date(data[a].date).getTime();
    const pointAY = data[a].value;

    maxArea = area = -1;

    for (; rangeOffs < rangeTo; rangeOffs++) {
      // Calculate triangle area over three buckets
      area =
        Math.abs(
          (pointAX - avgX) * (data[rangeOffs].value - pointAY) -
            (pointAX - new Date(data[rangeOffs].date).getTime()) * (avgY - pointAY)
        ) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[rangeOffs];
        nextA = rangeOffs;
      }
    }

    if (!maxAreaPoint) {
      maxAreaPoint = data[Math.floor((rangeOffs + rangeTo) / 2)] || data[rangeOffs - 1];
    }

    sampled[sampledIndex++] = maxAreaPoint;
    a = nextA !== undefined ? nextA : Math.floor((rangeOffs + rangeTo) / 2);
  }

  sampled[sampledIndex++] = data[dataLength - 1]; // Always add last

  return sampled;
}
