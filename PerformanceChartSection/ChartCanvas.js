import React, { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

const ChartCanvas = ({ data, width, height, lineColor = '#00FFA3' }) => {
  
  // KURAL 1: Grafiğin (Path) çizgisini donduruyoruz.
  // useMemo sayesinde bu matematiksel hesaplama SADECE veri veya ekran boyutu değişirse tekrar çalışır.
  // Parmak hareketleri bu fonksiyonu asla tetikleyemez!
  const pathData = useMemo(() => {
    if (!data || data.length < 2 || width === 0 || height === 0) return null;
    
    // Gerçek en yüksek ve en düşük değerler
    const maxVal = Math.max(...data.map(d => d.value));
    const minVal = Math.min(...data.map(d => d.value));
    const range = maxVal - minVal || 1; 

    // BÜYÜ BURADA: Nefes Alma Boşluğu (Padding) yaratıyoruz
    // Tepeye %20, Alta %10 oranında boşluk ekliyoruz
    const padding = range * 0.20; 
    const paddedMax = maxVal + padding;
    const paddedMin = minVal - (padding / 2);
    const paddedRange = paddedMax - paddedMin || 1;

    // Çizgiyi bu "Genişletilmiş" ve ferah tavan/tabana göre çiziyoruz
    let path = `M 0,${height - ((data[0].value - paddedMin) / paddedRange) * height}`;
    data.forEach((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.value - paddedMin) / paddedRange) * height;
      path += ` L ${x},${y}`;
    });

    return path;
  }, [data, width, height]); // <- Sadece bu 3 değişken değişirse baştan hesapla

  // Eğer veri yoksa boş ekran dön (Sessiz çökmeleri engeller)
  if (!pathData) return null;

  return (
    <Svg width={width} height={height}>
      <Path d={pathData} stroke={lineColor} strokeWidth={2.5} fill="none" />
    </Svg>
  );
};

// KURAL 6: React.memo ile bileşeni koruma altına alıyoruz.
// Bu özel karşılaştırma fonksiyonu sayesinde geliştirme ortamındaki titremeler de tamamen önlenir.
export default React.memo(ChartCanvas, (prevProps, nextProps) => {
  return (
    prevProps.data === nextProps.data && 
    prevProps.width === nextProps.width && 
    prevProps.height === nextProps.height &&
    prevProps.lineColor === nextProps.lineColor
  );
});