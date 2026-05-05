// portfolioEngine.js

// 1. Yardımcı Fonksiyon: Varlık Dolar bazlı mı?
export const isUsdType = (type) => type === 'CRYPTO' || type === 'USA' || type === 'GOLD';

// 2. Tek Bir Varlığın Kar/Zarar Hesabı (Vergi ve Kur dahil)
export const calculateAssetPnL = (asset, livePrice, usdToTryRate = 1) => {
    const rate = isUsdType(asset.type) ? usdToTryRate : 1;
    // Eğer canlı fiyat yoksa (API hatası vs.), varlığın kendi maliyetini geçici fiyat kabul et
    const cPrice = livePrice !== undefined && livePrice !== null ? livePrice : (asset.price || 0);

    const cost = asset.price * asset.quantity * rate;
    const grossValue = cPrice * asset.quantity * rate;
    const grossProfit = grossValue - cost;

    // Tefas fonları için %17.5 Stopaj Vergisi
    let tax = 0;
    if (asset.type === 'TEFAS' && grossProfit > 0) {
        tax = grossProfit * 0.175;
    }

    const netProfit = grossProfit - tax;
    const netValue = grossValue - tax;
    // Yüzdesel değişim (Maliyet 0'dan büyükse hesapla, yoksa 0 dön)
    const changePercent = cost > 0 ? (netProfit / cost) * 100 : 0;

    return {
        cost,
        netValue,
        netProfit,
        changePercent,
        tax
    };
};

// 3. Tüm Portföyün Toplam Değer ve Kar/Zarar Hesabı
export const calculateTotalPortfolio = (portfolio, usdToTryRate, cashBalance = 0) => {
    let totalCost = 0;
    let totalNetCurrentValue = 0;
    let totalUnrealizedPnL = 0;

    portfolio.forEach(asset => {
        const livePrice = asset.currentPrice !== undefined ? asset.currentPrice : asset.price;
        const pnl = calculateAssetPnL(asset, livePrice, usdToTryRate);

        totalCost += pnl.cost;
        totalNetCurrentValue += pnl.netValue;
        totalUnrealizedPnL += pnl.netProfit;
    });

    // Kasadaki nakit parayı da toplam varlığa dahil et
    totalNetCurrentValue += cashBalance;

    const unrealizedPnLPct = totalCost > 0 ? (totalUnrealizedPnL / totalCost) * 100 : 0;

    return {
        totalCost,
        totalNetCurrentValue,
        totalUnrealizedPnL,
        unrealizedPnLPct
    };
};

// 4. REFERANS FİYAT HESAPLAYICI (ZAMAN MAKİNESİ YENİ VERSİYON)
export const getReferencePrice = (asset, assetPriceHistory, timeframe) => {
    if (timeframe === 'ALL' || !assetPriceHistory) {
        return asset.price;
    }

    const now = Date.now();
    let cutoff = 0;
    switch(timeframe) {
        case '1D': cutoff = now - 24 * 60 * 60 * 1000; break;
        case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
        case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
        case '3M': cutoff = now - 90 * 24 * 60 * 60 * 1000; break;
        case '6M': cutoff = now - 180 * 24 * 60 * 60 * 1000; break;
        case 'YTD': cutoff = new Date(new Date().getFullYear(), 0, 1).getTime(); break;
        case '1Y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break;
        default: return asset.price;
    }

    const timestamps = Object.keys(assetPriceHistory).map(Number).sort((a, b) => a - b);
    const validTimestamps = timestamps.filter(ts => ts >= cutoff);

    if (validTimestamps.length === 0) {
        return asset.price; 
    }

    const referenceTimestamp = validTimestamps[0];
    return assetPriceHistory[referenceTimestamp];
};

// 5. DÖNEMSEL KÂR/ZARAR HESAPLAYICI
export const calculatePeriodPnL = (asset, livePrice, assetPriceHistory, timeframe, usdToTryRate = 1) => {
    const rate = isUsdType(asset.type) ? usdToTryRate : 1;
    const cPrice = livePrice !== undefined && livePrice !== null ? livePrice : (asset.price || 0);

    const refPrice = getReferencePrice(asset, assetPriceHistory, timeframe);

    const amountNative = (cPrice - refPrice) * asset.quantity;
    const amountTRY = amountNative * rate; 
    
    const percentage = refPrice > 0 ? ((cPrice - refPrice) / refPrice) * 100 : 0;

    return { amount: amountTRY, percentage };
};

// 6. EN ÇOK KAZANDIRANLAR (ÖZEL GEÇMİŞ VERİ İLE GÜNCELLENDİ)
export const getTopGainersAndLosers = (portfolio, usdToTryRate, timeFilter = 'ALL', fullPriceHistory = {}) => {
    const activeAssets = portfolio.filter(a => a.quantity > 0).map(asset => {
        const livePrice = asset.currentPrice !== undefined ? asset.currentPrice : asset.price;
        const assetHistory = fullPriceHistory[asset.name] || null;
        
        const pnl = calculatePeriodPnL(asset, livePrice, assetHistory, timeFilter, usdToTryRate);

        return { ...asset, pct: pnl.percentage, netProfit: pnl.amount };
    });

    const topPerformers = [...activeAssets].filter(a => a.pct >= 0).sort((a, b) => b.pct - a.pct).slice(0, 5);
    const worstPerformers = [...activeAssets].filter(a => a.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 5);

    return { topPerformers, worstPerformers };
};

// --- FAZ 4 EKLENTİLERİ ---

const PIE_COLORS = ['#00FFA3', '#3A86FF', '#8338EC', '#FFBE0B', '#FF4D4D', '#8A919E'];

// 6. Pasta Grafik Dağılım Hesabı
export const getPieChartDistribution = (portfolio, usdToTryRate, totalNetCurrentValue, textOthers) => {
    let rawData = portfolio.map(a => {
        const livePrice = a.currentPrice !== undefined ? a.currentPrice : a.price;
        const pnl = calculateAssetPnL(a, livePrice, usdToTryRate);
        return { ...a, value: pnl.netValue };
    }).filter(a => a.value > 0);

    rawData.sort((a, b) => b.value - a.value);
    let chartData = [];

    if (rawData.length > 5) {
        chartData = rawData.slice(0, 4);
        const othersValue = rawData.slice(4).reduce((sum, item) => sum + item.value, 0);
        chartData.push({ id: 'others', name: textOthers, symbol: textOthers, type: 'OTHER', value: othersValue });
    } else {
        chartData = rawData;
    }

    return chartData.map((item, index) => ({
        ...item,
        percentage: totalNetCurrentValue > 0 ? (item.value / totalNetCurrentValue) * 100 : 0,
        color: PIE_COLORS[index % PIE_COLORS.length]
    }));
};

// 7. Ana Ekran Zaman Dilimi Performansı (Kâr/Zarar Kutucuğu İçin)
export const getPortfolioPerformanceByTimeframe = (totalNetCurrentValue, chartHistory, timeframe, totalUnrealizedPnL, unrealizedPnLPct) => {
    // Eğer grafik hafızası yoksa sıfır dön
    if (totalNetCurrentValue <= 0 || !chartHistory || chartHistory.length === 0) {
        return { amount: 0, pct: 0 };
    }

    // Tüm Zamanlar seçiliyse, standart portföy karını dön
    if (timeframe === 'ALL') {
         return { amount: totalUnrealizedPnL, pct: unrealizedPnLPct };
    }

    const now = Date.now();
    let cutoff = 0;
    
    switch (timeframe) {
        case '1D': cutoff = now - 24 * 60 * 60 * 1000; break;
        case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
        case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
        case '3M': cutoff = now - 90 * 24 * 60 * 60 * 1000; break;
        case '6M': cutoff = now - 180 * 24 * 60 * 60 * 1000; break;
        case 'YTD': cutoff = new Date(new Date().getFullYear(), 0, 1).getTime(); break;
        case '1Y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break;
    }

    const validHistory = chartHistory.filter(d => d.timestamp >= cutoff);
    if (validHistory.length === 0) return { amount: 0, pct: 0 };

    // Filtrelenen tarihteki en eski noktayı (Örn: 1 ay önceki değer) bul
    const oldestPoint = validHistory[0];
    const historicalValue = oldestPoint.value;

    if (historicalValue <= 0) return { amount: totalNetCurrentValue, pct: 0 };

    // Şimdiki Paradan - 1 Ay önceki Parayı çıkararak Kar/Zararı bul
    const amount = totalNetCurrentValue - historicalValue;
    const pct = (amount / historicalValue) * 100;

    return { amount, pct };
};

// 8. TWR (Zaman Ağırlıklı Getiri) ve Varlık Akışı Hesaplayıcısı (MIDAS ALGORİTMASI v2)
export const calculateAdvancedChartData = (chartHistory, timeFilter, totalNetCurrentValue, totalUnrealizedPnL, unrealizedPnLPct) => {
    // Boş portföy → düz çizgi veya sıfır dön
    if (!chartHistory || chartHistory.length === 0) {
        // Portföy değeri varsa tek noktalı düz çizgi oluştur
        if (totalNetCurrentValue > 0) {
            const now = Date.now();
            const flatLine = [
                { date: now - 3600000, value: totalNetCurrentValue, cost: totalNetCurrentValue - (totalUnrealizedPnL || 0) },
                { date: now, value: totalNetCurrentValue, cost: totalNetCurrentValue - (totalUnrealizedPnL || 0) }
            ];
            return { 
                assetFlowData: flatLine, 
                performanceData: [{ date: flatLine[0].date, value: 0 }, { date: flatLine[1].date, value: 0 }], 
                pnl: { amount: totalUnrealizedPnL || 0, pct: unrealizedPnLPct || 0 } 
            };
        }
        return { 
            assetFlowData: [], 
            performanceData: [], 
            pnl: { amount: 0, pct: 0 } 
        };
    }

    // DÜZ ÇİZGİ DESTEĞİ: Tek veri noktası → 2 noktaya çoğalt
    let workingHistory = [...chartHistory];
    if (workingHistory.length === 1) {
        const single = workingHistory[0];
        workingHistory.unshift({
            date: single.date,
            timestamp: (single.timestamp || Date.now()) - 3600000, // 1 saat önce
            value: single.value,
            cost: single.cost,
            prices: single.prices
        });
    }

    // ALL seçiliyken direkt tüm geçmişi kullan, karmaşık filtreleme yapma
    if (timeFilter === 'ALL') {
        const assetFlowData = workingHistory.map(d => ({
            date: d.timestamp || Date.now(),
            value: (typeof d.value === 'number' && !isNaN(d.value)) ? Math.max(0, d.value) : 0,
            cost: (typeof d.cost === 'number' && !isNaN(d.cost)) ? Math.max(0, d.cost) : 0
        }));

        const performanceData = _calculateTWR(assetFlowData);

        return { 
            assetFlowData, 
            performanceData, 
            pnl: { amount: totalUnrealizedPnL, pct: unrealizedPnLPct } 
        };
    }

    // Timeframe cutoff hesabı
    const now = Date.now();
    let cutoff = 0;
    switch (timeFilter) {
        case '1D': cutoff = now - 24 * 60 * 60 * 1000; break;
        case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
        case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
        case '3M': cutoff = now - 90 * 24 * 60 * 60 * 1000; break;
        case '6M': cutoff = now - 180 * 24 * 60 * 60 * 1000; break;
        case 'YTD': cutoff = new Date(new Date().getFullYear(), 0, 1).getTime(); break;
        case '1Y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break;
        default: cutoff = 0; break;
    }

    // FALLBACK MANTIĞI: Portföyün en eski kaydı cutoff'tan sonra mı?
    // Yani seçilen timeframe için yeterli geçmiş veri var mı?
    const oldestRecord = workingHistory[0];
    const hasEnoughHistory = oldestRecord && oldestRecord.timestamp <= cutoff;

    if (!hasEnoughHistory) {
        // Yeterli geçmiş yok → ALL ile aynı değerleri kullan
        const assetFlowData = workingHistory.map(d => ({
            date: d.timestamp || Date.now(),
            value: (typeof d.value === 'number' && !isNaN(d.value)) ? Math.max(0, d.value) : 0,
            cost: (typeof d.cost === 'number' && !isNaN(d.cost)) ? Math.max(0, d.cost) : 0
        }));

        const performanceData = _calculateTWR(assetFlowData);

        return { 
            assetFlowData, 
            performanceData, 
            pnl: { amount: totalUnrealizedPnL, pct: unrealizedPnLPct } 
        };
    }

    // Yeterli geçmiş var → Normal timeframe hesabı
    let filtered = workingHistory.filter(d => d.timestamp >= cutoff);

    // TWR KORUMASI: En az 2 veri noktası gerekli
    if (filtered.length < 2) {
        return { 
            assetFlowData: filtered.map(d => ({
                date: d.timestamp || Date.now(),
                value: (typeof d.value === 'number' && !isNaN(d.value)) ? Math.max(0, d.value) : 0,
                cost: (typeof d.cost === 'number' && !isNaN(d.cost)) ? Math.max(0, d.cost) : 0
            })), 
            performanceData: [], 
            pnl: { amount: totalUnrealizedPnL, pct: unrealizedPnLPct } 
        };
    }

    // 1. VARLIK AKIŞI DATASI (Klasik Para Grafiği)
    const assetFlowData = filtered.map(d => ({
        date: d.timestamp || Date.now(),
        value: (typeof d.value === 'number' && !isNaN(d.value)) ? Math.max(0, d.value) : 0,
        cost: (typeof d.cost === 'number' && !isNaN(d.cost)) ? Math.max(0, d.cost) : 0
    }));

    // 2. PERFORMANS DATASI (TWR)
    const performanceData = _calculateTWR(assetFlowData);

    // 3. Kâr / Zarar Hesaplaması — Dönemsel
    const historicalValue = assetFlowData[0]?.value || 0;
    const historicalCost = assetFlowData[0]?.cost || 0;

    let amount = 0;
    let pct = 0;

    if (historicalValue <= 0) {
        amount = totalUnrealizedPnL;
        pct = unrealizedPnLPct;
    } else {
        // Şimdiki değer - dönem başındaki değer = dönemsel kazanç
        amount = totalNetCurrentValue - historicalValue;
        // TWR yüzdesini kullan (para giriş/çıkışından arındırılmış)
        pct = performanceData.length > 0 ? performanceData[performanceData.length - 1]?.value || 0 : 0;
    }

    return { assetFlowData, performanceData, pnl: { amount, pct } };
};

// YENİ: TWR Hesaplama Yardımcı Fonksiyonu (DRY prensibi)
const _calculateTWR = (assetFlowData) => {
    if (!assetFlowData || assetFlowData.length < 2) return [];

    let performanceData = [];
    let cumulativeReturn = 1;

    for (let i = 0; i < assetFlowData.length; i++) {
        if (i === 0) {
            performanceData.push({ date: assetFlowData[i].date, value: 0 });
            continue;
        }

        const prev = assetFlowData[i - 1];
        const curr = assetFlowData[i];

        // O gün kasaya yeni para girdi mi/çıktı mı? (Maliyet değişimi)
        const cashFlow = curr.cost - prev.cost;
        
        // TWR Formülü: Getiriyi hesaplarken kasaya o gün giren parayı hesaptan düşeriz
        const adjustedPrevValue = prev.value + cashFlow; 
        
        let dailyReturn = 0;
        if (adjustedPrevValue > 0) {
            dailyReturn = (curr.value - adjustedPrevValue) / adjustedPrevValue;
        }

        cumulativeReturn = cumulativeReturn * (1 + dailyReturn);
        
        const percentageValue = (cumulativeReturn - 1) * 100;
        performanceData.push({ 
            date: curr.date, 
            value: parseFloat(percentageValue.toFixed(2)) 
        });
    }

    return performanceData;
};