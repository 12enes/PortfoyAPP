import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, LayoutAnimation } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SwipeableModal } from '../../shared/components/SwipeableModal';

export const AddAssetModal = ({
  visible, onClose, styles, COLORS, selectedSearchAsset, isAddMoreMode,
  setSelectedSearchAsset, t, activeTab, ASSET_TYPES, assetType,
  handleCategoryChange, theme, searchQuery, handleSearch, searchResults,
  marketTabMode, watchlist, selectedListId, customLists, handleAssetSelect,
  getAssetIcon, getCurrencySymbol, inputMode, setInputMode, primaryInput,
  setPrimaryInput, decimals, calculatedQty, calculatedTotalAmount,
  buyPrice, setBuyPrice, note, setNote, addAsset
}) => {
  return (
    <SwipeableModal visible={visible} onClose={onClose} boxStyle={styles.searchModalBox} styles={styles}>
      <View style={[styles.modalHeaderRow, { justifyContent: 'flex-start', marginBottom: 25 }]}>
          {selectedSearchAsset && !isAddMoreMode && (
            <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedSearchAsset(null); }} style={{ marginRight: 15 }}>
              <MaterialIcons name="arrow-back" size={26} color={COLORS.textMain} />
            </TouchableOpacity>
          )}
          <Text style={[styles.modalTitle, { marginBottom: 0 }]}>
             {isAddMoreMode ? t('addMore') : (activeTab === 'PORTFOLIO' ? t('newTx') : t('addToWatch'))}
          </Text>
      </View>
      
      {!selectedSearchAsset ? (
        <View style={{flex: 1}}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{gap: 10, paddingRight: 20}}>
            {ASSET_TYPES.map(type => (
              <TouchableOpacity key={type} style={[styles.pillBtn, assetType === type && styles.pillBtnActive]} onPress={() => handleCategoryChange(type)}>
                <Text style={[styles.pillBtnText, assetType === type && {color: theme === 'dark' ? '#0A0A0C' : '#FFFFFF'}]}>{t(type)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={22} color={COLORS.textSub} style={{marginRight: 10}} />
            <TextInput style={styles.searchInput} placeholder={t('searchAsset')} placeholderTextColor={COLORS.textSub} value={searchQuery} onChangeText={handleSearch} autoCapitalize="characters" autoCorrect={false} />
            {searchQuery.length > 0 && ( <TouchableOpacity onPress={() => handleSearch('')}><MaterialIcons name="cancel" size={20} color={COLORS.textSub} /></TouchableOpacity> )}
          </View>
          <FlatList 
            data={searchResults} keyExtractor={(item, index) => item.symbol + index} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}} ListEmptyComponent={<Text style={styles.emptyText}>{t('noResults')}</Text>}
            renderItem={({item}) => {
              const isAdded = activeTab === 'MARKET' ? (
                marketTabMode === 'GRID' 
                  ? watchlist.some(a => a.name === item.symbol) 
                  : (selectedListId ? customLists.find(l => l.id === selectedListId)?.assetIds.includes(item.symbol) : false)
              ) : false;

              return (
                <TouchableOpacity 
                  style={[styles.searchResultItem, isAdded && {opacity: 0.4}]} 
                  disabled={isAdded}
                  onPress={() => handleAssetSelect(item)}
                >
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <View style={[styles.compactIconBox, {width: 36, height: 36, marginRight: 12, backgroundColor: item.isCustom ? COLORS.primarySoft : COLORS.surfaceHigh}]}><MaterialIcons name={item.isCustom ? "add" : getAssetIcon(assetType)} size={18} color={COLORS.primary} /></View>
                      <View><Text style={styles.resultSymbol}>{item.symbol}</Text><Text style={styles.resultName}>{item.name}</Text></View>
                    </View>
                    {isAdded ? (
                      <MaterialIcons name="check-circle" size={20} color={COLORS.primary} />
                    ) : (
                      <Text style={{color: COLORS.textSub, fontSize: 13, fontWeight: 'bold'}}>{item.price ? `${getCurrencySymbol(assetType)}${item.price}` : ''}</Text>
                    )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
          <View style={styles.selectedAssetCard}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={[styles.compactIconBox, {width: 40, height: 40, marginRight: 15}]}><MaterialIcons name={getAssetIcon(assetType)} size={20} color={COLORS.primary} /></View>
                <View>
                  <Text style={styles.selectedSymbol}>{selectedSearchAsset.symbol}</Text>
                  <Text style={styles.resultName}>{selectedSearchAsset.name !== selectedSearchAsset.symbol ? selectedSearchAsset.name : t(assetType)}</Text>
                </View>
              </View>
              {!isAddMoreMode && ( <TouchableOpacity style={styles.changeAssetBtn} onPress={() => setSelectedSearchAsset(null)}><MaterialIcons name="edit" size={16} color={COLORS.textMain} /></TouchableOpacity> )}
          </View>

          {activeTab === 'PORTFOLIO' ? (
            <>
              <View style={styles.segmentedControl}>
                <TouchableOpacity style={[styles.segmentBtn, inputMode === 'AMOUNT' && styles.segmentBtnActive]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setInputMode('AMOUNT'); setPrimaryInput(''); }}><Text style={[styles.segmentText, inputMode === 'AMOUNT' && styles.segmentTextActive]}>{t('modeAmount')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.segmentBtn, inputMode === 'QUANTITY' && styles.segmentBtnActive]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setInputMode('QUANTITY'); setPrimaryInput(''); }}><Text style={[styles.segmentText, inputMode === 'QUANTITY' && styles.segmentTextActive]}>{t('modeQuantity')}</Text></TouchableOpacity>
              </View>

              <View style={styles.smartInputContainer}>
                {inputMode === 'AMOUNT' && <Text style={styles.smartInputCurrency}>{getCurrencySymbol(assetType)}</Text>}
                <TextInput style={styles.smartInput} placeholder="0" placeholderTextColor={COLORS.border} value={primaryInput} onChangeText={setPrimaryInput} keyboardType="numeric" autoFocus={true} />
                {inputMode === 'QUANTITY' && <Text style={styles.smartInputCurrency}>{selectedSearchAsset.symbol}</Text>}
              </View>

              <View style={styles.smartFeedbackBox}>
                <MaterialIcons name="auto-awesome" size={16} color={COLORS.primary} style={{marginRight: 6}} />
                <Text style={styles.smartFeedbackText}>
                  {inputMode === 'AMOUNT' ? `${t('approx')} ${calculatedQty > 0 ? calculatedQty.toFixed(decimals) : '0'} ${selectedSearchAsset.symbol} ${t('calcQty')}` : `${t('calcTotal')}: ${getCurrencySymbol(assetType)}${calculatedTotalAmount > 0 ? calculatedTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}`}
                </Text>
              </View>
              <View style={{marginTop: 10}}><Text style={styles.inputLabel}>{t('buyPrice')} ({getCurrencySymbol(assetType)})</Text><TextInput style={styles.modernInput} placeholder="0.00" placeholderTextColor={COLORS.textSub} value={buyPrice} onChangeText={setBuyPrice} keyboardType="numeric" /></View>
              <Text style={[styles.inputLabel, {marginTop: 25}]}>{t('note')}</Text>
              <TextInput style={[styles.modernInput, {height: 80, textAlignVertical: 'top'}]} placeholder="..." placeholderTextColor={COLORS.textSub} value={note} onChangeText={setNote} multiline={true} />
              <TouchableOpacity style={styles.megaSaveBtn} onPress={addAsset}><Text style={styles.megaSaveBtnText}>{t('save')}</Text></TouchableOpacity>
            </>
          ) : (
            <View style={{ marginTop: 20 }}>
               <Text style={[styles.emptyText, { textAlign: 'left', marginBottom: 20 }]}>
                 {t('addToWatchInfo') || 'Bu varlığı izleme listenize eklemek üzeresiniz.'}
               </Text>
               <TouchableOpacity 
                 style={styles.megaSaveBtn} 
                 onPress={addAsset}
               >
                 <Text style={styles.megaSaveBtnText}>{t('addToWatch')}</Text>
               </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SwipeableModal>
  );
};
