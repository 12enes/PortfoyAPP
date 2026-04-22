import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';

export default function GestureOverlay({ width, data, onPointSelect }) {
  
  // ŞERİT METRENİN UCU: Parmağın ekrana ilk değdiği yeri hafızada tutarız
  const touchStartX = useRef(0);

  // YENİ SENSÖR MANTIĞI
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      // 1. Parmağın ekrana İLK dokunduğu an (Sadece 1 kez çalışır)
      onPanResponderGrant: (evt) => {
        // Şerit metreyi parmağın ilk dokunduğu yere çiviliyoruz
        touchStartX.current = evt.nativeEvent.locationX;
        handleTouch(touchStartX.current);
      },
      
      // 2. Parmağın ekranda sürüklendiği anlar (Sürekli çalışır)
      onPanResponderMove: (evt, gestureState) => {
        // MÜKEMMEL STABİLİTE: İlk dokunulan noktaya, parmağın ne kadar kaydırıldığını (dx) ekliyoruz.
        // dx (delta X) doğrudan telefonun ekranından gelir, sensör camından değil.
        // Bu yüzden parmak grafiğin dışına, ekranın en altına gitse bile ASLA sapma yapmaz.
        const currentX = touchStartX.current + gestureState.dx;
        handleTouch(currentX);
      },
      
      onPanResponderRelease: () => handleEnd(),
      onPanResponderTerminate: () => handleEnd(),
    })
  ).current;

  const handleTouch = (x) => {
    if (!data || data.length === 0 || width <= 0) return;
    
    const step = data.length > 1 ? width / (data.length - 1) : width;
    let index = Math.round(x / step);
    
    if (isNaN(index)) index = 0;
    const safeIndex = Math.max(0, Math.min(index, data.length - 1));
    
    if (onPointSelect) {
      // Hem tahmini gün index'ini hem de kusursuz parmak pikselini (x) beyne gönderiyoruz
      onPointSelect(data[safeIndex], safeIndex, x);
    }
  };

  const handleEnd = () => {
    if (onPointSelect) {
      onPointSelect(null, -1);
    }
  };

  return <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />;
}