import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, RefreshControl, TouchableWithoutFeedback, LayoutAnimation, Animated, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AssetIcon from '../../components/AssetIcon';

// Kategori tanımları ve sıralama önceliği
const CATEGORIES = [
  { key: 'ALL', label: 'Tümü', types: [] as string[] },
  { key: 'INDEX', label: 'Endeks', types: ['INDEX'] },
  { key: 'BIST', label: 'BIST', types: ['BIST'] },
  { key: 'GOLD', label: 'Emtia', types: ['GOLD', 'FOREX'] },
  { key: 'USA', label: 'ABD', types: ['USA'] },
  { key: 'CRYPTO', label: 'Kripto', types: ['CRYPTO'] },
  { key: 'TEFAS', label: 'TEFAS', types: ['TEFAS'] },
];

// Sıralama haritası: Varlık tipine göre öncelik (düşük = önce)
const TYPE_ORDER: Record<string, number> = {
  BIST: 0, INDEX: 1, GOLD: 2, FOREX: 2, USA: 3, CRYPTO: 4, TEFAS: 5
};

export const MarketScreen = ({
  styles, COLORS, t, lang,
  marketTabMode, setMarketTabMode,
  isMarketEditMode, setIsMarketEditMode,
  selectedListId, setSelectedListId,
  setListNameInput, setEditingListId, setListError, setListModalVisible,
  onSettingsPress,
  watchlist, renderGridItem, isRefreshing, onRefreshMarket,
  customLists, openListOptions, MOCK_ASSETS, MarketService, setWatchlist,
  selectedCategory, setSelectedCategory,
}: any) => {

  // Filtrelenmiş watchlist
  const filteredWatchlist = useMemo(() => {
    const list = watchlist || [];
    if (selectedCategory === 'ALL') {
      // Tümü: Kategori sırasına göre grupla (BIST → USA → CRYPTO → EMTİA → TEFAS)
      return [...list].sort((a: any, b: any) => {
        const orderA = TYPE_ORDER[a.type] ?? 99;
        const orderB = TYPE_ORDER[b.type] ?? 99;
        // Eğer tipler aynıysa, eklenme sırasını koru (stable sort)
        return orderA - orderB;
      });
    }
    const cat = CATEGORIES.find(c => c.key === selectedCategory);
    if (!cat || cat.types.length === 0) return list;
    return list.filter((item: any) => cat.types.includes(item.type));
  }, [watchlist, selectedCategory]);

  // Liste detayı için enriched data
  const currentCustomList = customLists?.find((l: any) => l.id === selectedListId);
  const enrichedData = useMemo(() => {
    return (currentCustomList?.assetIds || []).map((symbolId: string) => {
      const found = watchlist?.find((w: any) =>
        w.name === symbolId || w.symbol === symbolId || w.id === symbolId
      );
      if (found) return found;

      let foundType = 'BIST';
      Object.entries(MOCK_ASSETS || {}).forEach(([type, arr]) => {
        if ((arr as any[]).find(a => a.symbol === symbolId || a.name === symbolId)) {
          foundType = type;
        }
      });

      return {
        id: symbolId, name: symbolId, symbol: symbolId, type: foundType,
        price: 0, currentPrice: 0, changePercent: 0, isTemporary: true
      };
    });
  }, [currentCustomList, watchlist, MOCK_ASSETS]);

  // Kategori pill stilleri
  const catStyles = useMemo(() => StyleSheet.create({
    container: { 
      marginBottom: 8,
      height: 56, // Görünmez şerit yüksekliği
      justifyContent: 'center',
    },
    scrollContent: { 
      paddingHorizontal: 20,
      paddingVertical: 8, // Üst ve alt "yakalama" alanı
      alignItems: 'center' as const,
    },
    pill: {
      paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14,
      flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
      backgroundColor: '#15151A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
      marginRight: 10,
    },
    pillActive: {
      backgroundColor: 'rgba(0, 232, 122, 0.08)', borderColor: 'rgba(0, 232, 122, 0.4)',
    },
    pillText: { fontSize: 12, fontWeight: '700' as const, color: '#8A8A9A', letterSpacing: 0.3 },
    pillTextActive: { color: '#00E87A' },
    badge: {
      minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center' as const,
      justifyContent: 'center' as const, marginLeft: 6, paddingHorizontal: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    badgeActive: {
      backgroundColor: 'rgba(0, 232, 122, 0.15)',
      borderColor: 'rgba(0, 232, 122, 0.1)',
    },
    badgeText: { fontSize: 9, fontWeight: '800' as const, color: '#6A6A7A' },
    badgeTextActive: { color: '#00E87A' },
  }), []);

  const CategoryPill = ({ cat, isActive, onPress }: any) => {
    const scale = useRef(new Animated.Value(isActive ? 1.12 : 1)).current;
    const count = cat.key === 'ALL'
      ? (watchlist || []).length
      : (watchlist || []).filter((w: any) => cat.types.includes(w.type)).length;

    useEffect(() => {
      Animated.spring(scale, {
        toValue: isActive ? 1.12 : 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 120,
        mass: 0.8,
      }).start();
    }, [isActive]);

    return (
      <Animated.View style={{ transform: [{ scale }], zIndex: isActive ? 10 : 1 }}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={[
            catStyles.pill, 
            isActive && catStyles.pillActive,
            isActive && { borderColor: 'rgba(0, 232, 122, 0.5)', borderWidth: 1.5 }
          ]}
        >
          <Text style={[catStyles.pillText, isActive && catStyles.pillTextActive]}>
            {cat.label}
          </Text>
          {count > 0 && (
            <View style={[catStyles.badge, isActive && catStyles.badgeActive]}>
              <Text style={[catStyles.badgeText, isActive && catStyles.badgeTextActive]}>{count}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCategoryPill = (cat: typeof CATEGORIES[0]) => (
    <CategoryPill 
      key={cat.key} 
      cat={cat} 
      isActive={selectedCategory === cat.key} 
      onPress={() => setSelectedCategory(cat.key)} 
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <TouchableWithoutFeedback>
        <View style={{ flex: 1 }}>

          {marketTabMode === 'GRID' && (
            <FlatList
              key="market-grid-main"
              data={filteredWatchlist}
              keyExtractor={(item: any) => item.id}
              numColumns={2}
              renderItem={renderGridItem}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 120, paddingTop: 5 }}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefreshMarket} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
              ListHeaderComponent={
                <>
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
                    <View style={[styles.headerIcons, { width: 100, justifyContent: 'flex-end' }]}>
                      {isMarketEditMode ? (
                        <TouchableOpacity onPress={() => setIsMarketEditMode(false)} style={styles.doneBtn}><Text style={styles.doneBtnText}>{t('done')}</Text></TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={onSettingsPress}>
                          <MaterialIcons name="settings" size={26} color={COLORS.textMain} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={catStyles.container}>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={catStyles.scrollContent}
                      directionalLockEnabled={true}
                      alwaysBounceHorizontal={false}
                      bounces={false}
                      overScrollMode="never"
                      nestedScrollEnabled={true}
                    >
                      {CATEGORIES.map(renderCategoryPill)}
                    </ScrollView>
                  </View>
                </>
              }
              ListEmptyComponent={<View style={styles.emptyMarketContainer}><MaterialIcons name="grid-view" size={64} color={COLORS.border} style={{ marginBottom: 20 }} /><Text style={styles.emptyMarketText}>{t('emptyMarket')}</Text></View>}
            />
          )}

          {marketTabMode === 'LISTS' && (
            <>
              {!selectedListId ? (
                <View style={styles.listOverviewContainer}>
                  <FlatList
                    key="custom-lists-overview"
                    data={customLists || []}
                    keyExtractor={(item: any) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    ListHeaderComponent={
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
                        <View style={[styles.headerIcons, { width: 100, justifyContent: 'flex-end' }]}>
                          {isMarketEditMode ? (
                            <TouchableOpacity onPress={() => setIsMarketEditMode(false)} style={styles.doneBtn}><Text style={styles.doneBtnText}>{t('done')}</Text></TouchableOpacity>
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <TouchableOpacity onPress={() => { setListNameInput(''); setEditingListId(null); setListError(''); setListModalVisible(true); }} style={{ marginRight: 15 }}>
                                <MaterialIcons name="add" size={28} color={COLORS.textMain} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={onSettingsPress}>
                                <MaterialIcons name="settings" size={26} color={COLORS.textMain} />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    }
                    ListEmptyComponent={
                      <View style={styles.emptyMarketContainer}>
                        <MaterialIcons name="format-list-bulleted" size={64} color={COLORS.border} style={{ marginBottom: 15 }} />
                        <Text style={[styles.emptyMarketText, { fontWeight: 'bold', color: COLORS.textMain, marginBottom: 5, fontSize: 16 }]}>{t('noListsYet')}</Text>
                        <Text style={styles.emptyMarketText}>{t('emptyListsSub')}</Text>
                      </View>
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.listRow} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedListId(item.id); }}>
                        <Text style={styles.listRowName}>{item.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={styles.listRowPill}><Text style={styles.listRowCount}>{item.assetIds?.length || 0} {t('assets')}</Text></View>
                          <MaterialIcons name="chevron-right" size={20} color={COLORS.border} />
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <FlatList
                    key={`custom-list-detail-${selectedListId}`}
                    data={enrichedData}
                    keyExtractor={(item: any) => item.id || item.symbol}
                    numColumns={2}
                    renderItem={renderGridItem}
                    contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
                    ListHeaderComponent={
                      <View style={styles.listDetailHeader}>
                        <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedListId(null); setIsMarketEditMode(false); }} style={{ padding: 5 }}>
                          <MaterialIcons name="arrow-back" size={26} color={COLORS.textMain} />
                        </TouchableOpacity>
                        <Text style={styles.listDetailTitle} numberOfLines={1}>{currentCustomList?.name || ''}</Text>
                      </View>
                    }
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
