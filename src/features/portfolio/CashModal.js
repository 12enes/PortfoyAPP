import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SwipeableModal } from '../../shared/components/SwipeableModal';

export const CashModal = ({
  visible, onClose, styles, COLORS, lang,
  cashInput, setCashInput, setCashBalance, currency, setCurrency, usdToTryRate
}) => {
  return (
    <SwipeableModal visible={visible} onClose={onClose} boxStyle={styles.detailPageBox} styles={styles}>
      {/* HEADER */}
      <View style={{ alignItems: 'center', marginBottom: 25 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textMain, letterSpacing: 1 }}>
          {lang === 'tr' ? 'NAKİT YÖNETİMİ' : 'CASH MANAGEMENT'}
        </Text>
      </View>

      {/* CURRENCY SWITCHER */}
      <View style={{ 
        flexDirection: 'row', 
        backgroundColor: COLORS.surface, 
        borderRadius: 100, 
        padding: 4, 
        marginBottom: 30,
        marginHorizontal: 40
      }}>
        <TouchableOpacity 
          style={{ 
            flex: 1, 
            paddingVertical: 8, 
            alignItems: 'center', 
            borderRadius: 100, 
            backgroundColor: currency === '₺' ? COLORS.surfaceHigh : 'transparent' 
          }}
          onPress={() => setCurrency('₺')}
        >
          <Text style={{ color: currency === '₺' ? COLORS.textMain : COLORS.textSub, fontWeight: '700', fontSize: 13 }}>
            🇹🇷 TRY
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ 
            flex: 1, 
            paddingVertical: 8, 
            alignItems: 'center', 
            borderRadius: 100, 
            backgroundColor: currency === '$' ? COLORS.surfaceHigh : 'transparent' 
          }}
          onPress={() => setCurrency('$')}
        >
          <Text style={{ color: currency === '$' ? COLORS.textMain : COLORS.textSub, fontWeight: '700', fontSize: 13 }}>
            🇺🇸 USD
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* HERO INPUT */}
      <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color: COLORS.textMain, marginRight: 8 }}>{currency}</Text>
          <TextInput
            style={{ 
              fontSize: 48, 
              fontWeight: '800', 
              color: COLORS.textMain, 
              textAlign: 'center',
              minWidth: 150
            }}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={COLORS.textSub}
            value={cashInput}
            onChangeText={setCashInput}
            autoFocus={true}
          />
        </View>
      </View>

      {/* ACTION BUTTONS */}
      <View style={{ gap: 12 }}>
        <TouchableOpacity 
          style={{ 
            height: 56, 
            backgroundColor: '#FFFFFF', 
            borderRadius: 16, 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}
          onPress={() => {
            const val = parseFloat(cashInput.replace(',', '.'));
            if (!isNaN(val) && val > 0) {
              const amountInTry = currency === '$' ? val * usdToTryRate : val;
              setCashBalance(prev => {
                const next = prev + amountInTry;
                AsyncStorage.setItem('@cash_balance', JSON.stringify(next));
                return next;
              });
              setCashInput('');
              onClose();
            }
          }}
        >
          <Text style={{ color: '#000000', fontSize: 16, fontWeight: '700' }}>
            {lang === 'tr' ? 'Sermaye Ekle' : 'Add Capital'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ 
            height: 56, 
            backgroundColor: COLORS.surface, 
            borderRadius: 16, 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}
          onPress={() => {
            const val = parseFloat(cashInput.replace(',', '.'));
            if (!isNaN(val) && val > 0) {
              const amountInTry = currency === '$' ? val * usdToTryRate : val;
              setCashBalance(prev => {
                const next = Math.max(0, prev - amountInTry);
                AsyncStorage.setItem('@cash_balance', JSON.stringify(next));
                return next;
              });
              setCashInput('');
              onClose();
            }
          }}
        >
          <Text style={{ color: COLORS.textMain, fontSize: 16, fontWeight: '600' }}>
            {lang === 'tr' ? 'Para Çek' : 'Withdraw Cash'}
          </Text>
        </TouchableOpacity>
      </View>
    </SwipeableModal>
  );
};
