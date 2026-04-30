import React from 'react';
import { StyleSheet, Animated, View, Text } from 'react-native';

export default function CrosshairLayer({ xAnim, yAnim, opacityAnim, height, color = '#00FFA3', dateText }) {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]} pointerEvents="none">
      
      {/* 1. LAZER ÇİZGİSİ VE TEPESİNDEKİ PANKART (TARİH) */}
      <Animated.View
        style={[
          styles.verticalLineContainer,
          // Sadece X ekseninde (sağa-sola) uçar
          { transform: [{ translateX: xAnim }] } 
        ]}
      >
        {/* Drone'un taşıdığı Tarih Yazısı */}
        <Text style={styles.dateText}>{dateText}</Text>
        
        {/* Lazer Çizgisi */}
        <View style={[styles.verticalLine, { height: height, backgroundColor: color }]} />
      </Animated.View>

      {/* 2. LAZER NOKTASI (Fiyatın üstünde kayan top) */}
      <Animated.View
        style={[
          styles.dotOuter,
          { borderColor: color },
          // Hem X (sağ-sol) hem Y (aşağı-yukarı) ekseninde uçar
          { transform: [{ translateX: xAnim }, { translateY: yAnim }] }
        ]}
      >
        <View style={[styles.dotInner, { backgroundColor: color }]} />
      </Animated.View>
    </Animated.View>
  );
}

const DOT_SIZE = 14;

const styles = StyleSheet.create({
  verticalLineContainer: {
    position: 'absolute',
    top: -20, // Çizgiyi ve yazıyı grafiğin biraz üstünden başlatırız (Midas tarzı)
    bottom: 0,
    width: 140, // Yazı sığsın diye geniş bir görünmez alan
    marginLeft: -70, // 140'ın yarısı kadar sola çekip lazeri tam merkeze sabitleriz
    alignItems: 'center', // İçindeki çizgiyi ve yazıyı ortalar
  },
  dateText: {
    color: '#8A919E', // Soluk gri renk
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6, // Yazı ile çizgi arasında çok hafif bir boşluk
  },
  verticalLine: {
    flex: 1, // Kalan tüm uzunluğu kaplar
    width: 1.5,
    opacity: 0.5,
  },
  dotOuter: {
    position: 'absolute',
    top: -DOT_SIZE / 2, 
    left: -DOT_SIZE / 2, 
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2.5,
    backgroundColor: '#0A0A0C', 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 5,
  },
  dotInner: {
    width: DOT_SIZE / 2.5,
    height: DOT_SIZE / 2.5,
    borderRadius: DOT_SIZE / 5,
  }
});