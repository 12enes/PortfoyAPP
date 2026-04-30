import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { SwipeableModal } from '../../shared/components/SwipeableModal';

export const SellModal = ({
  visible, onClose, styles, COLORS, t,
  sellQuantityInput, setSellQuantityInput, sellAsset
}) => {
  return (
    <SwipeableModal visible={visible} onClose={onClose} boxStyle={styles.modalBox} styles={styles}>
      <Text style={styles.modalTitle}>{t('sellTitle')}</Text>
      <TextInput 
        style={styles.input} 
        placeholder={t('sellQty')} 
        placeholderTextColor={COLORS.textSub} 
        value={sellQuantityInput} 
        onChangeText={setSellQuantityInput} 
        keyboardType="numeric" 
      />
      <TouchableOpacity 
        style={[styles.megaSaveBtn, {backgroundColor: COLORS.error}]} 
        onPress={sellAsset}
      >
        <Text style={styles.megaSaveBtnText}>{t('confirm')}</Text>
      </TouchableOpacity>
    </SwipeableModal>
  );
};
