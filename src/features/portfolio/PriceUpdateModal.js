import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { SwipeableModal } from '../../shared/components/SwipeableModal';

export const PriceUpdateModal = ({
  visible, onClose, styles, COLORS, t, currentDetailAsset,
  getCurrencySymbol, currentPriceInput, setCurrentPriceInput, updateCurrentPrice
}) => {
  return (
    <SwipeableModal visible={visible} onClose={onClose} boxStyle={styles.modalBox} styles={styles}>
      <Text style={styles.modalTitle}>{t('updatePrice')}</Text>
      <TextInput 
        style={styles.input} 
        placeholder={`${t('currentPrice')} (${currentDetailAsset ? getCurrencySymbol(currentDetailAsset.type) : '$'})`} 
        placeholderTextColor={COLORS.textSub} 
        value={currentPriceInput} 
        onChangeText={setCurrentPriceInput} 
        keyboardType="numeric" 
      />
      <TouchableOpacity style={styles.megaSaveBtn} onPress={updateCurrentPrice}>
        <Text style={styles.megaSaveBtnText}>{t('update')}</Text>
      </TouchableOpacity>
    </SwipeableModal>
  );
};
