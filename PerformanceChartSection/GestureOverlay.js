import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';

export default function GestureOverlay({ width, data, onPointSelect }) {
  
  // KRİTİK: data ve width'i ref'te tut ki PanResponder her zaman güncel veriye erişsin.
  // PanResponder useRef ile 1 kez oluşturulduğu için closure'daki değişkenler eskir.
  // Bu ref'ler sayesinde timeframe değiştiğinde lazer doğru veriyi takip eder.
  const dataRef = useRef(data);
  const widthRef = useRef(width);
  const onPointSelectRef = useRef(onPointSelect);
  
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { widthRef.current = width; }, [width]);
  useEffect(() => { onPointSelectRef.current = onPointSelect; }, [onPointSelect]);

  const touchStartX = useRef(0);

  const handleTouch = (x) => {
    const currentData = dataRef.current;
    const currentWidth = widthRef.current;
    if (!currentData || currentData.length === 0 || currentWidth <= 0) return;
    
    const step = currentData.length > 1 ? currentWidth / (currentData.length - 1) : currentWidth;
    let index = Math.round(x / step);
    
    if (isNaN(index)) index = 0;
    const safeIndex = Math.max(0, Math.min(index, currentData.length - 1));
    
    if (onPointSelectRef.current) {
      onPointSelectRef.current(currentData[safeIndex], safeIndex, x);
    }
  };

  const handleEnd = () => {
    if (onPointSelectRef.current) {
      onPointSelectRef.current(null, -1);
    }
  };

  const touchStartXRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: (evt) => {
        touchStartXRef.current = evt.nativeEvent.locationX;
        handleTouch(touchStartXRef.current);
      },
      
      onPanResponderMove: (evt, gestureState) => {
        const currentX = touchStartXRef.current + gestureState.dx;
        handleTouch(currentX);
      },
      
      onPanResponderRelease: () => handleEnd(),
      onPanResponderTerminate: () => handleEnd(),
    })
  ).current;

  return <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />;
}