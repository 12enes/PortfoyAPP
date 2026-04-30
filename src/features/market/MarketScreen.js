import React from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, TouchableWithoutFeedback, LayoutAnimation } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export const MarketScreen = ({
  styles, COLORS, marketTabMode, setMarketTabMode, t,
  isMarketEditMode, setIsMarketEditMode, selectedListId, setSelectedListId,
  setListNameInput, setEditingListId, setListError, setListModalVisible,
  setSettingsVisible, watchlist, renderGridItem, isRefreshing, onRefreshMarket,
  customLists, openListOptions, lang
}) => {
  const currentCustomList = customLists?.find(l => l.id === selectedListId);

  return (
    <View key="1" collapsable={false} style={{ flex: 1 }}>
      <View style={styles.topHeader}>
        <View style={styles.headerTabSwitcher}>
          <TouchableOpacity 
            style={[styles.headerTab, marketTabMode === 'GRID' && styles.headerTabActive]} 
            onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setMarketTabMode('GRID'); setIsMarketEditMode(false); setSelectedListId(null); }}
          >
            <Text style={[styles.headerTabText, marketTabMode === 'GRID' && styles.headerTabTextActive]}>{t('market')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerTab, marketTabMode === 'LISTS' && styles.headerTabActive]} 
            onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setMarketTabMode('LISTS'); setIsMarketEditMode(false); }}
          >
            <Text style={[styles.headerTabText, marketTabMode === 'LISTS' && styles.headerTabTextActive]}>{t('tracking')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerIcons}>
          {isMarketEditMode ? (
            <TouchableOpacity onPress={() => setIsMarketEditMode(false)} style={styles.doneBtn}><Text style={styles.doneBtnText}>{t('done')}</Text></TouchableOpacity>
          ) : (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
               {marketTabMode === 'LISTS' && !selectedListId && (
                 <TouchableOpacity onPress={() => { setListNameInput(''); setEditingListId(null); setListError(''); setListModalVisible(true); }} style={{marginRight: 15}}>
                    <MaterialIcons name="add" size={28} color={COLORS.textMain} />
                 </TouchableOpacity>
               )}
               <TouchableOpacity onPress={() => setSettingsVisible(true)}>
                  <MaterialIcons name="settings" size={26} color={COLORS.textMain} />
               </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      <TouchableWithoutFeedback onPress={() => { if(isMarketEditMode) setIsMarketEditMode(false); }}>
        <View style={{flex: 1}}>
          
          {marketTabMode === 'GRID' && (
            <>
              <View style={{paddingHorizontal: 25, marginBottom: 15}}><Text style={{color: COLORS.textSub, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase'}}>{t('marketPulse')}</Text></View>
              <FlatList
                key="market-grid"
                data={watchlist || []} 
                keyExtractor={item => item.id} 
                numColumns={2} 
                renderItem={renderGridItem} 
                contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefreshMarket} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
                ListEmptyComponent={<View style={styles.emptyMarketContainer}><MaterialIcons name="grid-view" size={64} color={COLORS.border} style={{marginBottom: 20}} /><Text style={styles.emptyMarketText}>{t('emptyMarket')}</Text></View>}
              />
            </>
          )}

          {marketTabMode === 'LISTS' && (
            <>
              {!selectedListId ? (
                <View style={styles.listOverviewContainer}>
                   <FlatList
                     key="custom-lists-overview"
                     data={customLists || []} 
                     keyExtractor={item => item.id} 
                     showsVerticalScrollIndicator={false}
                     contentContainerStyle={{paddingBottom: 120}}
                     ListEmptyComponent={
                       <View style={styles.emptyMarketContainer}>
                          <MaterialIcons name="format-list-bulleted" size={64} color={COLORS.border} style={{marginBottom: 15}} />
                          <Text style={[styles.emptyMarketText, {fontWeight: 'bold', color: COLORS.textMain, marginBottom: 5, fontSize: 16}]}>{t('noListsYet')}</Text>
                          <Text style={styles.emptyMarketText}>{t('emptyListsSub')}</Text>
                          <TouchableOpacity style={styles.ghostBtn} onPress={() => { setListNameInput(''); setEditingListId(null); setListError(''); setListModalVisible(true); }}>
                             <Text style={styles.ghostBtnText}>{t('createList')}</Text>
                          </TouchableOpacity>
                       </View>
                     }
                     renderItem={({item}) => (
                       <TouchableOpacity style={styles.listRow} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedListId(item.id); }} onLongPress={() => openListOptions(item)}>
                         <Text style={styles.listRowName}>{item.name}</Text>
                         <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <View style={styles.listRowPill}><Text style={styles.listRowCount}>{item.assetIds?.length || 0} {t('assets')}</Text></View>
                            <MaterialIcons name="chevron-right" size={20} color={COLORS.border} />
                         </View>
                       </TouchableOpacity>
                     )}
                   />
                </View>
              ) : (
                <View style={{flex: 1}}>
                   <View style={styles.listDetailHeader}>
                      <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedListId(null); setIsMarketEditMode(false); }} style={{padding: 5}}>
                         <MaterialIcons name="arrow-back" size={26} color={COLORS.textMain} />
                      </TouchableOpacity>
                      <Text style={styles.listDetailTitle} numberOfLines={1}>{currentCustomList?.name || ''}</Text>
                   </View>
                   <FlatList
                      key={`custom-list-detail-${selectedListId}`}
                      data={currentCustomList?.assetIds || []} 
                      keyExtractor={item => item} 
                      numColumns={2} 
                      renderItem={renderGridItem} 
                      contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 120 }}
                      ListEmptyComponent={<View style={styles.emptyMarketContainer}><Text style={styles.emptyMarketText}>{t('emptyList')}</Text></View>}
                   />
                </View>
              )}
            </>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};
