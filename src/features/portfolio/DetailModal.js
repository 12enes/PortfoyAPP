import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { SwipeableModal } from '../../shared/components/SwipeableModal';
import AssetIcon from '../../components/AssetIcon';

export const DetailModal = ({
  visible, onClose, styles, COLORS, currentDetailAsset, getAssetIcon, t,
  activeTab, currency, getCurrencySymbol, getConvertedValueLocal, decimals,
  setDetailModalVisible, setIsAddMoreMode, setAssetType, handleAssetSelect,
  setModalVisible, setSellModalVisible, theme, deleteAsset
}) => {
  return (
    <SwipeableModal visible={visible} onClose={onClose} boxStyle={styles.detailPageBox} styles={styles}>
      {currentDetailAsset && (
        <View>
          <View style={styles.detailHeader}>
              <View style={styles.detailIconBox}><AssetIcon asset={currentDetailAsset} size={32} /></View>
              <View style={{flex: 1, marginLeft: 15}}><Text style={styles.detailName}>{currentDetailAsset.name}</Text><Text style={styles.detailType}>{t(currentDetailAsset.type)}</Text></View>
          </View>
          
          <View style={[styles.detailChartBox, {padding: 0, justifyContent: 'flex-start'}]}>
            <Text style={[styles.detailCurrentPrice, {padding: 20, paddingBottom: 0}]}>
              {getCurrencySymbol(currentDetailAsset.type, currentDetailAsset.symbol || currentDetailAsset.name)}
              {(currentDetailAsset.currentPrice || currentDetailAsset.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
            <View style={{flex: 1, justifyContent: 'flex-end', overflow: 'hidden'}}>
               <Svg width="100%" height="80" viewBox="0 0 100 80" preserveAspectRatio="none">
                  <Path d="M 0,80 Q 25,20 50,50 T 100,10 L 100,100 L 0,100 Z" fill={COLORS.primarySoft} />
                  <Path d="M 0,80 Q 25,20 50,50 T 100,10" stroke={COLORS.primary} strokeWidth="3" fill="none" />
               </Svg>
            </View>
          </View>

          {activeTab === 'PORTFOLIO' && (
            <>
              <View style={styles.statsGrid}>
                  <View style={styles.statBox}><Text style={styles.statBoxLabel}>{t('quantity')}</Text><Text style={styles.statBoxValue}>{currentDetailAsset.quantity ? currentDetailAsset.quantity.toFixed(decimals) : '-'}</Text></View>
                  <View style={styles.statBox}><Text style={styles.statBoxLabel}>{t('avgCost')}</Text>
                    <Text style={styles.statBoxValue}>{currency}{getConvertedValueLocal(currentDetailAsset.price, currentDetailAsset.type).toFixed(2)}</Text>
                  </View>
                  {(() => {
                    const nativeCost = currentDetailAsset.price * currentDetailAsset.quantity; 
                    const nativeVal = currentDetailAsset.currentPrice * currentDetailAsset.quantity;
                    const gross = nativeVal - nativeCost; 
                    const tax = (currentDetailAsset.type === 'TEFAS' && gross > 0) ? gross * 0.175 : 0; 
                    const net = gross - tax;
                    
                    const displayVal = getConvertedValueLocal(nativeVal, currentDetailAsset.type);
                    const displayNet = getConvertedValueLocal(net, currentDetailAsset.type);
                    const displayTax = getConvertedValueLocal(tax, currentDetailAsset.type);

                    return (
                      <>
                        <View style={styles.statBox}><Text style={styles.statBoxLabel}>{t('totalValue')}</Text><Text style={styles.statBoxValue}>{currency}{displayVal.toFixed(2)}</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxLabel}>{t('netProfit')}</Text><Text style={[styles.statBoxValue, {color: displayNet >= 0 ? COLORS.primary : COLORS.error}]}>{displayNet >= 0 ? '+' : ''}{currency}{displayNet.toFixed(2)}</Text></View>
                        {tax > 0 && (<View style={[styles.statBox, {width: '100%'}]}><Text style={styles.statBoxLabel}>{t('tax')}</Text><Text style={[styles.statBoxValue, {color: COLORS.error}]}>-{currency}{displayTax.toFixed(2)}</Text></View>)}
                      </>
                    );
                  })()}
              </View>
              
              {currentDetailAsset.note && ( <View style={styles.detailNoteArea}><MaterialIcons name="sticky-note-2" size={18} color={COLORS.primary} style={{marginRight: 8}} /><Text style={styles.detailNoteText}>{currentDetailAsset.note}</Text></View> )}
              
              <View style={styles.detailActionRow}>
                  <TouchableOpacity style={styles.detailBtnSecondary} onPress={() => {
                      onClose(); setIsAddMoreMode(true); setAssetType(currentDetailAsset.type);
                      handleAssetSelect({ symbol: currentDetailAsset.name, name: currentDetailAsset.name, price: currentDetailAsset.currentPrice !== undefined ? currentDetailAsset.currentPrice : currentDetailAsset.price });
                      setModalVisible(true);
                  }}>
                    <MaterialIcons name="add-circle-outline" size={18} color={COLORS.textMain} style={{marginRight: 5}} />
                    <Text style={styles.detailBtnSecondaryText}>{t('addMore')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.detailBtnPrimary} onPress={() => setSellModalVisible(true)}>
                    <MaterialIcons name="sell" size={18} color={theme === 'dark' ? '#0A0A0C' : '#FFFFFF'} style={{marginRight: 5}} />
                    <Text style={styles.detailBtnPrimaryText}>{t('executeTrade')}</Text>
                  </TouchableOpacity> 
              </View>
              <TouchableOpacity style={{marginTop: 15, alignSelf: 'center'}} onPress={() => deleteAsset(currentDetailAsset.id)}><Text style={{color: COLORS.error, fontSize: 14, fontWeight: 'bold'}}>{t('delete')}</Text></TouchableOpacity>
            </>
          )}
        </View>
      )}
    </SwipeableModal>
  );
};
