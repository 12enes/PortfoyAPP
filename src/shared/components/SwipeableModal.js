import React, { useRef, useEffect } from 'react';
import { Modal, View, TouchableOpacity, Animated, PanResponder, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

export const SwipeableModal = ({ visible, onClose, children, boxStyle, styles }) => {
  const panY = useRef(new Animated.Value(0)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Aşağı doğru net bir kaydırma varsa (dy > 10) ve yatay hareket azsa yakala
        return gestureState.dy > 10 && Math.abs(gestureState.dx) < 20;
      },
      onPanResponderMove: (_, gestureState) => { 
        if (gestureState.dy > 0) panY.setValue(gestureState.dy); 
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 1.0) {
          Animated.timing(panY, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => onClose());
        } else {
          Animated.spring(panY, { toValue: 0, bounciness: 12, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panY, { toValue: 0, bounciness: 12, useNativeDriver: true }).start();
      }
    })
  ).current;

  // Üstteki tutamaç alanı için ayrı, daha hassas bir yakalayıcı
  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50 || gestureState.vy > 0.8) {
          Animated.timing(panY, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => onClose());
        } else {
          Animated.spring(panY, { toValue: 0, bounciness: 12, useNativeDriver: true }).start();
        }
      }
    })
  ).current;

  useEffect(() => { 
    if (visible) panY.setValue(0); 
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlayFlexEnd} behavior={Platform.OS === "ios" ? "padding" : "padding"}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View {...panResponder.panHandlers} style={[boxStyle, { transform: [{ translateY: panY }] }]}>
          <View {...handlePanResponder.panHandlers} style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
