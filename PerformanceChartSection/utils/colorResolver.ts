import { theme } from '../constants/theme';

export function resolveChartColor(isPositive: boolean) {
  return isPositive ? theme.colors.linePrimary : theme.colors.lineNegative;
}

export function resolveGlowColor(isPositive: boolean) {
  return isPositive ? theme.colors.lineGlow : 'rgba(255,91,91,0.35)';
}

export function resolveActiveDotColor(isPositive: boolean) {
  return {
    inner: isPositive ? theme.colors.activeDotInner : theme.colors.lineNegative,
    outer: isPositive ? theme.colors.activeDotOuter : 'rgba(255,91,91,0.25)',
  };
}
