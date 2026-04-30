import React, { useRef, useEffect } from 'react';
import { Modal, View, TouchableOpacity, Animated, PanResponder, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

export const SwipeableModal = ({ visible, onClose, children, boxStyle, styles }) => {
  const panY = useRef(new Animated.Value(0)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true, 
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => { 
        if (gestureState.dy > 0) panY.setValue(gestureState.dy); 
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.2) {
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
      <KeyboardAvoidingView style={styles.modalOverlayFlexEnd} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[boxStyle, { transform: [{ translateY: panY }] }]}>
          <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
