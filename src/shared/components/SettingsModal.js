import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SwipeableModal } from './SwipeableModal';

export const SettingsModal = ({
  visible, onClose, styles, COLORS, t, theme, changeTheme,
  lang, changeLanguage, currency, changeCurrency, handleResetAllData
}) => {
  return (
    <SwipeableModal visible={visible} onClose={onClose} boxStyle={styles.modalBox} styles={styles}>
      <Text style={styles.modalTitle}>{t('settings')}</Text>
      <Text style={{color: COLORS.textSub, marginBottom: 10, textAlign: 'center', fontWeight: 'bold'}}>{t('theme')}</Text>
      <View style={styles.segmentedControl}>
        <TouchableOpacity style={[styles.segmentBtn, theme === 'light' && styles.segmentBtnActive]} onPress={() => changeTheme('light')}>
          <Text style={[styles.segmentText, theme === 'light' && styles.segmentTextActive]}>☀️ Light</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentBtn, theme === 'dark' && styles.segmentBtnActive]} onPress={() => changeTheme('dark')}>
          <Text style={[styles.segmentText, theme === 'dark' && styles.segmentTextActive]}>🌙 Dark</Text>
        </TouchableOpacity>
      </View>
      <Text style={{color: COLORS.textSub, marginBottom: 10, textAlign: 'center', fontWeight: 'bold', marginTop: 10}}>{t('language')}</Text>
      <View style={styles.segmentedControl}>
        <TouchableOpacity style={[styles.segmentBtn, lang === 'tr' && styles.segmentBtnActive]} onPress={() => changeLanguage('tr')}>
          <Text style={[styles.segmentText, lang === 'tr' && styles.segmentTextActive]}>🇹🇷 TR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentBtn, lang === 'en' && styles.segmentBtnActive]} onPress={() => changeLanguage('en')}>
          <Text style={[styles.segmentText, lang === 'en' && styles.segmentTextActive]}>🇬🇧 EN</Text>
        </TouchableOpacity>
      </View>
      <Text style={{color: COLORS.textSub, marginBottom: 10, textAlign: 'center', fontWeight: 'bold', marginTop: 10}}>{t('currency')}</Text>
      <View style={styles.segmentedControl}>
        {['₺', '$', '€'].map(cur => ( 
          <TouchableOpacity key={cur} style={[styles.segmentBtn, currency === cur && styles.segmentBtnActive]} onPress={() => changeCurrency(cur)}>
            <Text style={[styles.segmentText, currency === cur && styles.segmentTextActive]}>{cur}</Text>
          </TouchableOpacity> 
        ))}
      </View>

      <TouchableOpacity 
        style={{ marginTop: 30, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: COLORS.border }}
        onPress={handleResetAllData}
      >
        <Text style={{ color: COLORS.error, fontSize: 13, fontWeight: 'bold' }}>Tüm Verileri Sıfırla</Text>
      </TouchableOpacity>
    </SwipeableModal>
  );
};
