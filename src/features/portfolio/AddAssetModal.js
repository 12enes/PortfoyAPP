import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, LayoutAnimation, StyleSheet, Animated, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SwipeableModal } from '../../shared/components/SwipeableModal';
import AssetIcon from '../../components/AssetIcon';

const { width } = Dimensions.get('window');

// Premium Tasarım Sistemi Renkleri
const THEME = {
  bg: '#0F1115',
  surface: '#15171C',
  surfaceAlt: '#1E2128',
  border: 'rgba(255, 255, 255, 0.05)',
  accent: '#1DBF73', // Soft Emerald
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F98',
  glass: 'rgba(255, 255, 255, 0.03)',
  innerGlow: 'rgba(255, 255, 255, 0.02)'
};

export const AddAssetModal = ({
  visible, onClose, styles, COLORS, selectedSearchAsset, isAddMoreMode,
  setSelectedSearchAsset, t, activeTab, assetType,
  handleCategoryChange, searchQuery, handleSearch, searchResults,
  marketTabMode, watchlist, selectedListId, customLists, handleAssetSelect,
  getCurrencySymbol, inputMode, setInputMode, primaryInput,
  setPrimaryInput, decimals, calculatedQty, calculatedTotalAmount,
  buyPrice, setBuyPrice, note, setNote, addAsset, lockedCategory
}) => {
  // Animasyon Değerleri
  const tabAnim = useRef(new Animated.Value(0)).current;
  
  // Varlık tiplerini orijinal listeye göre güncelliyoruz
  const displayTabs = [
    { id: 'BIST', label: 'BIST' },
    { id: 'INDEX', label: 'ENDEKS' },
    { id: 'USA', label: 'ABD' },
    { id: 'CRYPTO', label: 'KRİPTO' },
    { id: 'GOLD', label: 'EMTİA' },
    { id: 'TEFAS', label: 'TEFAS' }
  ];

  // Aktif sekme indexini bul (Orijinal assetType ile tam eşleşme)
  const activeTabIndex = useMemo(() => {
    const idx = displayTabs.findIndex(t => t.id === assetType);
    return idx === -1 ? (assetType === 'FOREX' ? 3 : 0) : idx; 
  }, [assetType]);

  useEffect(() => {
    Animated.spring(tabAnim, {
      toValue: activeTabIndex,
      useNativeDriver: false,
      friction: 9,
      tension: 60
    }).start();
  }, [activeTabIndex]);

  const onTabPress = (tabId) => {
    handleCategoryChange(tabId);
  };

  const renderSegmentedControl = () => (
    <View style={localStyles.segmentWrapper}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={localStyles.segmentScroll}
      >
        <Animated.View 
          style={[
            localStyles.segmentIndicator,
            { 
              width: 80, // Sabit genişlik veya dinamik hesaplama
              left: tabAnim.interpolate({
                inputRange: [0, 1, 2, 3, 4, 5],
                outputRange: [5, 95, 185, 275, 365, 455] // Pozisyonlar
              })
            }
          ]} 
        />
        {displayTabs.map((tab, idx) => (
          <TouchableOpacity 
            key={tab.id} 
            style={[localStyles.segmentTab, { width: 90 }]} 
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[
              localStyles.segmentText, 
              activeTabIndex === idx && localStyles.segmentTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SwipeableModal visible={visible} onClose={onClose} boxStyle={localStyles.modalBox} styles={styles}>
      {/* 1. Header Section */}
      <View style={localStyles.header}>
        <View style={localStyles.headerLeft}>
          {selectedSearchAsset && !isAddMoreMode && (
            <TouchableOpacity 
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedSearchAsset(null); }} 
              style={localStyles.backBtn}
            >
              <MaterialIcons name="arrow-back-ios" size={18} color={THEME.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={localStyles.title}>
             {isAddMoreMode ? t('addMore') : (activeTab === 'PORTFOLIO' ? t('newTx') : t('addToWatch'))}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={localStyles.closeBtn}>
          <MaterialIcons name="close" size={20} color={THEME.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {!selectedSearchAsset ? (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 24 }}>
            {/* 2. Premium Segmented Control */}
            {!lockedCategory && renderSegmentedControl()}

            {/* 3. Luxurious Search Bar */}
            <View style={localStyles.searchWrapper}>
               <View style={localStyles.searchInner}>
                  <MaterialIcons name="search" size={20} color={THEME.textSecondary} style={{ marginRight: 14 }} />
                  <TextInput 
                    style={localStyles.searchInput} 
                    placeholder="Varlık ara (Örn: THYAO, AAPL)" 
                    placeholderTextColor={THEME.textSecondary} 
                    value={searchQuery} 
                    onChangeText={handleSearch} 
                    autoCapitalize="characters" 
                    autoCorrect={false} 
                  />
                  {searchQuery.length > 0 && ( 
                    <TouchableOpacity onPress={() => handleSearch('')} style={localStyles.clearBtn}>
                      <MaterialIcons name="cancel" size={18} color={THEME.textSecondary} />
                    </TouchableOpacity> 
                  )}
               </View>
            </View>
          </View>

          {/* 4. Results List with Breathing Room */}
          <FlatList 
            style={{ flex: 1 }}
            data={searchResults} 
            keyExtractor={(item, index) => item.symbol + index} 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 4 }} 
            ListEmptyComponent={
              <View style={localStyles.emptyContainer}>
                <Text style={localStyles.emptyText}>{t('noResults')}</Text>
              </View>
            }
            renderItem={({item}) => {
              const isAdded = activeTab === 'MARKET' ? (
                marketTabMode === 'GRID' 
                  ? watchlist.some(a => a.name === item.symbol) 
                  : (selectedListId ? customLists.find(l => l.id === selectedListId)?.assetIds.includes(item.symbol) : false)
              ) : false;

              return (
                <TouchableOpacity 
                  style={[localStyles.resultItem, isAdded && { opacity: 0.3 }]} 
                  disabled={isAdded}
                  onPress={() => handleAssetSelect(item)}
                  activeOpacity={0.8}
                >
                    <View style={localStyles.resultLeft}>
                      <View style={[localStyles.iconContainer, item.isCustom && { backgroundColor: 'rgba(29, 191, 115, 0.08)' }]}>
                        {item.isCustom ? <MaterialIcons name="add" size={18} color={THEME.accent} /> : <AssetIcon asset={{...item, type: item.type || assetType}} size={38} />}
                      </View>
                      <View>
                        <Text style={localStyles.resultSymbol}>{item.symbol}</Text>
                        <Text style={localStyles.resultName} numberOfLines={1}>{item.name}</Text>
                      </View>
                    </View>
                    {isAdded ? (
                      <MaterialIcons name="check-circle" size={20} color={THEME.accent} />
                    ) : (
                      <MaterialIcons name="chevron-right" size={20} color={THEME.textSecondary} />
                    )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Selected Asset Card */}
          <View style={localStyles.selectedAssetCard}>
              <View style={localStyles.resultLeft}>
                <View style={localStyles.iconContainer}>
                  <AssetIcon asset={{...selectedSearchAsset, type: selectedSearchAsset.type || assetType}} size={44} />
                </View>
                <View>
                  <Text style={localStyles.selectedSymbol}>{selectedSearchAsset.symbol}</Text>
                  <Text style={localStyles.selectedName}>{selectedSearchAsset.name !== selectedSearchAsset.symbol ? selectedSearchAsset.name : t(assetType)}</Text>
                </View>
              </View>
              {!isAddMoreMode && ( 
                <TouchableOpacity style={localStyles.editBtn} onPress={() => setSelectedSearchAsset(null)}>
                  <MaterialIcons name="swap-horiz" size={22} color={THEME.textPrimary} />
                </TouchableOpacity> 
              )}
          </View>

          {activeTab === 'PORTFOLIO' ? (
            <View style={{ marginTop: 24 }}>
              {/* Mode Selector */}
              <View style={localStyles.modeSwitcher}>
                <TouchableOpacity 
                  style={[localStyles.modeBtn, inputMode === 'AMOUNT' && localStyles.modeBtnActive]} 
                  onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setInputMode('AMOUNT'); setPrimaryInput(''); }}
                >
                  <Text style={[localStyles.modeText, inputMode === 'AMOUNT' && localStyles.modeTextActive]}>{t('modeAmount')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[localStyles.modeBtn, inputMode === 'QUANTITY' && localStyles.modeBtnActive]} 
                  onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setInputMode('QUANTITY'); setPrimaryInput(''); }}
                >
                  <Text style={[localStyles.modeText, inputMode === 'QUANTITY' && localStyles.modeTextActive]}>{t('modeQuantity')}</Text>
                </TouchableOpacity>
              </View>

              {/* High-Resolution Input Area */}
              <View style={localStyles.inputArea}>
                <View style={localStyles.smartInputRow}>
                  {inputMode === 'AMOUNT' && <Text style={localStyles.inputPrefix}>{getCurrencySymbol(assetType, selectedSearchAsset.symbol)}</Text>}
                  <TextInput 
                    style={localStyles.smartInput} 
                    placeholder="0" 
                    placeholderTextColor="rgba(255,255,255,0.1)" 
                    value={primaryInput} 
                    onChangeText={setPrimaryInput} 
                    keyboardType="numeric" 
                    autoFocus={true} 
                  />
                  {inputMode === 'QUANTITY' && <Text style={localStyles.inputPrefix}>{selectedSearchAsset.symbol}</Text>}
                </View>
                
                <View style={localStyles.aiFeedbackBox}>
                  <MaterialIcons name="auto-awesome" size={14} color={THEME.accent} />
                  <Text style={localStyles.aiFeedbackText}>
                    {inputMode === 'AMOUNT' ? `${t('approx')} ${calculatedQty > 0 ? calculatedQty.toFixed(decimals) : '0'} ${selectedSearchAsset.symbol}` : `${t('calcTotal')}: ${getCurrencySymbol(assetType, selectedSearchAsset.symbol)}${calculatedTotalAmount > 0 ? calculatedTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}`}
                  </Text>
                </View>
              </View>

              {/* Refined Form Fields */}
              <View style={localStyles.formSection}>
                <Text style={localStyles.label}>{t('buyPrice')} ({getCurrencySymbol(assetType, selectedSearchAsset.symbol)})</Text>
                <TextInput 
                  style={localStyles.modernInput} 
                  placeholder="0.00" 
                  placeholderTextColor={THEME.textSecondary} 
                  value={buyPrice} 
                  onChangeText={setBuyPrice} 
                  keyboardType="numeric" 
                />
              </View>

              <View style={localStyles.formSection}>
                <Text style={localStyles.label}>{t('note')}</Text>
                <TextInput 
                  style={[localStyles.modernInput, { height: 80, paddingTop: 16 }]} 
                  placeholder="..." 
                  placeholderTextColor={THEME.textSecondary} 
                  value={note} 
                  onChangeText={setNote} 
                  multiline={true} 
                />
              </View>

              <TouchableOpacity style={localStyles.saveBtn} onPress={addAsset}>
                <Text style={localStyles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginTop: 32 }}>
               <View style={localStyles.watchInfoBox}>
                 <MaterialIcons name="info-outline" size={22} color={THEME.accent} style={{ marginBottom: 14 }} />
                 <Text style={localStyles.watchInfoText}>
                   {t('addToWatchInfo') || 'Bu varlığı izleme listenize ekleyerek tüm piyasa hareketlerini anlık olarak takip edebilirsiniz.'}
                 </Text>
               </View>
               <TouchableOpacity 
                 style={localStyles.saveBtn} 
                 onPress={addAsset}
               >
                 <Text style={localStyles.saveBtnText}>{t('addToWatch')}</Text>
               </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SwipeableModal>
  );
};

const localStyles = StyleSheet.create({
  modalBox: {
    backgroundColor: THEME.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 8,
    height: '92%'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backBtn: {
    marginRight: 16,
    padding: 6,
    backgroundColor: THEME.surface,
    borderRadius: 12
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.6
  },
  closeBtn: {
    padding: 8,
    backgroundColor: THEME.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border
  },
  // Segmented Control
  segmentWrapper: {
    backgroundColor: THEME.surface,
    borderRadius: 22,
    height: 54,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden'
  },
  segmentScroll: {
    paddingHorizontal: 5,
    alignItems: 'center'
  },
  segmentIndicator: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    backgroundColor: '#1E2128',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  segmentTab: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    height: '100%'
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
    letterSpacing: 0.3
  },
  segmentTextActive: {
    color: THEME.textPrimary,
  },
  // Search Bar
  searchWrapper: {
    marginBottom: 28
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    height: 58,
    borderRadius: 22,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: {
    flex: 1,
    color: THEME.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    height: '100%'
  },
  clearBtn: {
    padding: 6
  },
  // Results
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: THEME.surface,
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#1E2128',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: THEME.border
  },
  resultSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 2
  },
  resultName: {
    fontSize: 13,
    color: THEME.textSecondary,
    maxWidth: 160
  },
  // Selected Step
  selectedAssetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: THEME.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 28
  },
  selectedSymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary
  },
  selectedName: {
    fontSize: 14,
    color: THEME.textSecondary
  },
  editBtn: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14
  },
  // Input Flow
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 5,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: THEME.border
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 14
  },
  modeBtnActive: {
    backgroundColor: '#1E2128',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary
  },
  modeTextActive: {
    color: THEME.textPrimary
  },
  inputArea: {
    marginBottom: 40,
    alignItems: 'center'
  },
  smartInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center'
  },
  smartInput: {
    fontSize: 64,
    fontWeight: '800',
    color: THEME.textPrimary,
    textAlign: 'center',
    minWidth: 120
  },
  inputPrefix: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.textSecondary,
    marginHorizontal: 12
  },
  aiFeedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(29, 191, 115, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20
  },
  aiFeedbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.accent,
    marginLeft: 8
  },
  formSection: {
    marginBottom: 24
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textSecondary,
    marginBottom: 12,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.2
  },
  modernInput: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    paddingHorizontal: 22,
    height: 60,
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: THEME.border
  },
  saveBtn: {
    backgroundColor: THEME.accent,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.6
  },
  watchInfoBox: {
    backgroundColor: 'rgba(29, 191, 115, 0.06)',
    padding: 28,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(29, 191, 115, 0.1)',
    alignItems: 'center'
  },
  watchInfoText: {
    fontSize: 14,
    lineHeight: 22,
    color: THEME.textSecondary,
    textAlign: 'center',
    fontWeight: '500'
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center'
  },
  emptyText: {
    color: THEME.textSecondary,
    fontSize: 15,
    fontWeight: '500'
  }
});
