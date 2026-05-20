export function buildMonotoneCubicPath(
  points: { x: number; y: number }[],
  width: number,
  height: number,
  paddingX: number = 8,
  paddingY: number = 12
): { linePath: string; areaPath: string; xPositions: number[]; yPositions: number[] } {
  if (points.length === 0) {
    return { linePath: '', areaPath: '', xPositions: [], yPositions: [] };
  }

  const n = points.length;
  const xPositions: number[] = new Array(n);
  const yPositions: number[] = new Array(n);

  // 1. Normalize coordinates to canvas space
  const minX = points[0].x;
  const maxX = points[n - 1].x;
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  for (let i = 0; i < n; i++) {
    xPositions[i] = paddingX + ((points[i].x - minX) / rangeX) * innerWidth;
    // Invert Y for SVG (0 is at top)
    yPositions[i] = paddingY + innerHeight - ((points[i].y - minY) / rangeY) * innerHeight;
  }

  if (n === 1) {
    // Single point fallback
    const pX = xPositions[0];
    const pY = yPositions[0];
    const linePath = `M ${pX},${pY} L ${pX},${pY}`;
    const areaPath = `M ${pX},${height} L ${pX},${pY} L ${pX},${height} Z`;
    return { linePath, areaPath, xPositions, yPositions };
  }

  // 2. Calculate monotone cubic tangents (Fritsch-Carlson method)
  const dx = new Array(n - 1);
  const dy = new Array(n - 1);
  const m = new Array(n - 1); // secant slopes

  for (let i = 0; i < n - 1; i++) {
    dx[i] = xPositions[i + 1] - xPositions[i];
    dy[i] = yPositions[i + 1] - yPositions[i];
    m[i] = dy[i] / dx[i];
  }

  const t = new Array(n); // tangents

  t[0] = m[0];
  t[n - 1] = m[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0;
    } else {
      const common = dx[i - 1] + dx[i];
      t[i] = (3 * common) / ((common + dx[i]) / m[i - 1] + (common + dx[i - 1]) / m[i]);
    }
  }

  // 3. Convert to SVG cubic bezier commands
  let linePath = `M ${xPositions[0]},${yPositions[0]}`;

  for (let i = 0; i < n - 1; i++) {
    const cp1x = xPositions[i] + dx[i] / 3;
    const cp1y = yPositions[i] + (t[i] * dx[i]) / 3;
    const cp2x = xPositions[i + 1] - dx[i] / 3;
    const cp2y = yPositions[i + 1] - (t[i + 1] * dx[i]) / 3;

    linePath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${xPositions[i + 1]},${yPositions[i + 1]}`;
  }

  // 4. Close area path with bottom corners
  let areaPath = linePath;
  areaPath += ` L ${xPositions[n - 1]},${height}`;
  areaPath += ` L ${xPositions[0]},${height}`;
  areaPath += ' Z';

  return { linePath, areaPath, xPositions, yPositions };
}
