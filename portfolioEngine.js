// portfolioEngine.js

// 1. Yardımcı Fonksiyonlar: Varlığın fiyat para birimi
const getAssetSymbol = (assetOrType, symbolOrName) => {
    if (typeof assetOrType === 'object' && assetOrType !== null) {
        return (assetOrType.symbol || assetOrType.name || '').toString().toUpperCase();
    }
    return (symbolOrName || '').toString().toUpperCase();
};

const getAssetType = (assetOrType) => {
    if (typeof assetOrType === 'object' && assetOrType !== null) {
        return assetOrType.type;
    }
    return assetOrType;
};

export const getAssetCurrencySymbol = (assetOrType, symbolOrName) => {
    const type = getAssetType(assetOrType);
    const symbol = getAssetSymbol(assetOrType, symbolOrName);

    if (symbol.includes('/TL') || symbol.includes('/TRY') || symbol.includes('GRAM/TL') || symbol.includes('DOLAR/TL') || symbol.includes('EURO/TL')) {
        return '₺';
    }
    if (symbol.includes('XAU/USD') || symbol.includes('XAG/USD') || symbol.includes('BRENT') || symbol.includes('SILVER') || symbol.includes('PLATINUM') || symbol.includes('ONS')) {
        return '$';
    }
    if (type === 'CRYPTO' || type === 'USA') return '$';
    return '₺';
};

export const isUsdType = (assetOrType, symbolOrName) => getAssetCurrencySymbol(assetOrType, symbolOrName) === '$';

export const getAssetRateToTry = (assetOrType, usdToTryRate = 1, symbolOrName) => {
    return isUsdType(assetOrType, symbolOrName) ? (usdToTryRate || 1) : 1;
};

// 2. Tek Bir Varlığın Kar/Zarar Hesabı (Vergi ve Kur dahil)
export const calculateAssetPnL = (asset, livePrice, usdToTryRate = 1) => {
    const rate = getAssetRateToTry(asset, usdToTryRate);
    const cPrice = (livePrice !== undefined && livePrice !== null && livePrice > 0) ? livePrice : (asset.price || 0);

    const cost = (asset.price || 0) * (asset.quantity || 0) * rate;
    const grossValue = cPrice * (asset.quantity || 0) * rate;
    const grossProfit = grossValue - cost;

    let tax = 0;
    if (asset.type === 'TEFAS' && grossProfit > 0) {
        tax = grossProfit * 0.175;
    }

    const netProfit = grossProfit - tax;
    const netValue = grossValue - tax;
    const changePercent = cost > 0 ? (netProfit / cost) * 100 : 0;

    return { cost, netValue, netProfit, changePercent, tax };
};

// 2.b. ZAMAN DİLİMLİ VARLIK HESAPLAYICI (PRO)
export const calculateAssetPnLForTimeframe = (asset, timeFilter, usdToTryRate = 1, priceHistory = null, chartHistory = []) => {
    const cPrice = (asset.currentPrice && asset.currentPrice > 0) ? asset.currentPrice : (asset.price || 0);
    const avgPrice = asset.price || 0;
    const qty = asset.quantity || 0;
    const rate = getAssetRateToTry(asset, usdToTryRate);

    if (timeFilter === 'ALL') {
        const pnl = calculateAssetPnL(asset, cPrice, usdToTryRate);
        return { amount: pnl.netProfit, percentage: pnl.changePercent };
    }

    // Zaman dilimi başlangıcını hesapla
    const now = Date.now();
    const addedTs = Number(asset.addedDate) || 0;
    
    // Zaman dilimi eşiğini hesapla
    let cutoff = 0;
    switch (timeFilter) {
        case '1D': {
            const todayStr = new Date().toLocaleDateString('tr-TR');
            const firstTodaySnap = chartHistory
                .filter(s => new Date(s.timestamp).toLocaleDateString('tr-TR') === todayStr)
                .sort((a,b) => a.timestamp - b.timestamp)[0];
            
            if (firstTodaySnap) {
                cutoff = firstTodaySnap.timestamp;
            } else {
                const midnight = new Date();
                midnight.setHours(0, 0, 0, 0);
                cutoff = midnight.getTime();
            }
            break;
        }
        case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
        case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
        case '3M': cutoff = now - 90 * 24 * 60 * 60 * 1000; break;
        case '6M': cutoff = now - 180 * 24 * 60 * 60 * 1000; break;
        case 'YTD': cutoff = new Date(new Date().getFullYear(), 0, 1).getTime(); break;
        case '1Y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break;
        case 'ALL': default: cutoff = 0;
    }

    // Eğer varlık bu zaman dilimi içinde alındıysa, referans alış fiyatıdır.
    const isRecentlyAdded = timeFilter === 'ALL' || (addedTs > (cutoff - 30 * 60 * 1000)); // 30 dk tolerans

    let refPrice = 0;
    if (isRecentlyAdded) {
        refPrice = avgPrice;
    } else {
        // Geçmişten gelen varlık için dönem başı fiyatını bul
        refPrice = getReferencePrice(asset, priceHistory, timeFilter, chartHistory);
    }

    // 1D özel durumu: Eğer varlık eski ama 1D bakıyorsak dünkü kapanışı bulmaya çalış (Hisse performansını görmek için)
    if (timeFilter === '1D' && !isRecentlyAdded) {
        const stockChangePct = asset.changePercent || 0;
        refPrice = asset.previousClose || (cPrice / (1 + (stockChangePct / 100)));
    }

    // Eğer refPrice hala 0 ise (veri yoksa), alım fiyatına güven
    if (!refPrice || refPrice <= 0) refPrice = avgPrice;

    const amountTL = (cPrice - refPrice) * qty * rate;
    const percentage = refPrice > 0 ? ((cPrice - refPrice) / refPrice) * 100 : 0;

    return { 
        amount: amountTL, 
        percentage: percentage,
        isRecentlyAdded
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
export const getReferencePrice = (asset, assetPriceHistory, timeframe, chartHistory = []) => {
    if (timeframe === 'ALL' || !assetPriceHistory) {
        return asset.price;
    }

    const now = Date.now();
    let cutoff = 0;
    switch(timeframe) {
        case '1D': {
            const todayStr = new Date().toLocaleDateString('tr-TR');
            const firstTodaySnap = chartHistory
                .filter(s => new Date(s.timestamp).toLocaleDateString('tr-TR') === todayStr)
                .sort((a,b) => a.timestamp - b.timestamp)[0];
            
            if (firstTodaySnap) {
                cutoff = firstTodaySnap.timestamp;
            } else {
                const midnight = new Date();
                midnight.setHours(0, 0, 0, 0);
                cutoff = midnight.getTime();
            }
            break;
        }
        case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
        case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
        case '3M': cutoff = now - 90 * 24 * 60 * 60 * 1000; break;
        case '6M': cutoff = now - 180 * 24 * 60 * 60 * 1000; break;
        case 'YTD': cutoff = new Date(new Date().getFullYear(), 0, 1).getTime(); break;
        case '1Y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break;
        default: return asset.price;
    }

    // KRİTİK: Eğer varlık bu zaman dilimi içinde alındıysa, referans fiyat alış fiyatıdır.
    const addedTs = Number(asset.addedDate);
    if (addedTs && (addedTs > cutoff || (Date.now() - addedTs) < 8 * 60 * 60 * 1000)) {
        return asset.price;
    }

    const timestamps = Object.keys(assetPriceHistory)
        .map(Number)
        .filter(ts => Number.isFinite(ts) && Number(assetPriceHistory[ts]) > 0)
        .sort((a, b) => a - b);

    if (timestamps.length === 0) {
        return asset.price; 
    }

    const timestampsAtOrBeforeCutoff = timestamps.filter(ts => ts <= cutoff);
    if (timestampsAtOrBeforeCutoff.length === 0) {
        return asset.price;
    }

    const referenceTimestamp = timestampsAtOrBeforeCutoff[timestampsAtOrBeforeCutoff.length - 1];
    return assetPriceHistory[referenceTimestamp];
};

// 5. DÖNEMSEL KÂR/ZARAR HESAPLAYICI
export const calculatePeriodPnL = (asset, livePrice, assetPriceHistory, timeframe, usdToTryRate = 1) => {
    const rate = getAssetRateToTry(asset, usdToTryRate);
    const cPrice = livePrice !== undefined && livePrice !== null ? livePrice : (asset.price || 0);

    const refPrice = getReferencePrice(asset, assetPriceHistory, timeframe);

    const amountNative = (cPrice - refPrice) * asset.quantity;
    let amountTRY = amountNative * rate; 
    let percentage = refPrice > 0 ? ((cPrice - refPrice) / refPrice) * 100 : 0;

    // Gürültü temizleme (0.01 altındaki değerleri sıfırla)
    if (Math.abs(amountTRY) < 0.01) amountTRY = 0;
    if (Math.abs(percentage) < 0.01) percentage = 0;

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

const PIE_COLORS = [
  '#00E87A', '#3A86FF', '#8338EC', '#FFBE0B', '#FF4757', '#FF006E', 
  '#FB5607', '#3A0CA3', '#4CC9F0', '#F72585', '#7209B7', '#4895EF', 
  '#B5179E', '#560BAD', '#2EC4B6', '#FF9F1C', '#E71D36', '#011627', 
  '#FFD166', '#06D6A0', '#EF476F', '#118AB2', '#073B4C', '#8A8A9A'
];

// 6. Pasta Grafik Dağılım Hesabı
export const getPieChartDistribution = (portfolio, usdToTryRate, totalNetCurrentValue, textOthers) => {
    let rawData = portfolio.map(a => {
        const livePrice = a.currentPrice !== undefined ? a.currentPrice : a.price;
        const pnl = calculateAssetPnL(a, livePrice, usdToTryRate);
        return { ...a, value: pnl.netValue };
    }).filter(a => a.value > 0);

    rawData.sort((a, b) => b.value - a.value);
    let chartData = rawData;

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
        case '1D': {
            const todayStr = new Date().toLocaleDateString('tr-TR');
            const firstTodaySnap = chartHistory
                .filter(s => new Date(s.timestamp).toLocaleDateString('tr-TR') === todayStr)
                .sort((a,b) => a.timestamp - b.timestamp)[0];
            
            if (firstTodaySnap) {
                cutoff = firstTodaySnap.timestamp;
            } else {
                const midnight = new Date();
                midnight.setHours(0, 0, 0, 0);
                cutoff = midnight.getTime();
            }
            break;
        }
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

// 8. PROFESYONEL ZAMAN SERİSİ MOTORU (RECONSTRUCTION ENGINE v4)
export const calculateAdvancedChartData = (chartHistory, timeFilter, totalNetCurrentValue, totalUnrealizedPnL, unrealizedPnLPct, portfolio = [], usdToTryRate = 1) => {
    // 1. ZAMAN DİLİMİ AYARLARI
    const now = Date.now();
    let cutoff = 0;
    switch (timeFilter) {
        case '1D': {
            const todayStr = new Date().toLocaleDateString('tr-TR');
            const firstTodaySnap = chartHistory
                .filter(s => new Date(s.timestamp).toLocaleDateString('tr-TR') === todayStr)
                .sort((a,b) => a.timestamp - b.timestamp)[0];
            
            if (firstTodaySnap) {
                cutoff = firstTodaySnap.timestamp;
            } else {
                const midnight = new Date();
                midnight.setHours(0, 0, 0, 0);
                cutoff = midnight.getTime();
            }
            break;
        }
        case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
        case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
        case '3M': cutoff = now - 90 * 24 * 60 * 60 * 1000; break;
        case '6M': cutoff = now - 180 * 24 * 60 * 60 * 1000; break;
        case 'YTD': cutoff = new Date(new Date().getFullYear(), 0, 1).getTime(); break;
        case '1Y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break;
        case 'ALL': default: cutoff = 0; break;
    }

    // 2. ANA VERİ KAYNAKLARI (Snapshotlar + Canlı Durum)
    // Eğer snapshot yoksa, sıfırdan bugüne bir "Basamak" (Step-up) oluştur
    let baseHistory = (chartHistory && chartHistory.length > 0) ? [...chartHistory] : [];
    
    // Eğer veri yoksa veya filtrelenen alan çok boşsa, yapay noktalar ekleyerek grafiğin "çizilmesini" sağla
    if (baseHistory.length === 0) {
        // Geçmiş yok: 0 -> Bugüne sıçrama
        baseHistory = [
            { timestamp: cutoff || (now - 24*60*60*1000), value: 0, cost: 0 },
            { timestamp: now, value: totalNetCurrentValue, cost: totalNetCurrentValue - totalUnrealizedPnL }
        ];
    } else {
        // Canlı noktayı sona ekle (De-clustering: Çok yakın noktaları temizle)
        const lastSnapshot = baseHistory[baseHistory.length - 1];
        if (now - lastSnapshot.timestamp > 15 * 60 * 1000) { // 15 dk'dan eskiyse ekle
            baseHistory.push({
                timestamp: now,
                value: totalNetCurrentValue,
                cost: Math.max(0, totalNetCurrentValue - totalUnrealizedPnL),
                prices: portfolio.reduce((acc, a) => ({ ...acc, [a.name]: a.currentPrice || a.price }), {})
            });
        }
    }

    // 3. RECONSTRUCTION (YENİDEN İNŞA) MANTIĞI
    // Pro App'lerdeki gibi her noktayı "O andaki miktar * O andaki fiyat" şeklinde doğrula
    const processedPoints = baseHistory
        .filter(d => d.timestamp >= cutoff)
        .map(snap => {
            const t = snap.timestamp;
            let reconstructedValue = 0;
            let reconstructedCost = 0;

            portfolio.forEach(asset => {
                const addedTs = Number(asset.addedDate) || 0;
                // KRİTİK: Eğer bu tarih (t), varlığın eklenme tarihinden (addedTs) önceyse miktarı 0 kabul et!
                // 8 saatlik esneklik payı (gece yarısı ve işlem gecikmeleri için)
                const isOwnedAtT = t >= (addedTs - 8 * 60 * 60 * 1000);
                
                if (isOwnedAtT) {
                    const rate = getAssetRateToTry(asset, usdToTryRate);
                    const qty = asset.quantity || 0;
                    
                    // Fiyat tespiti: O andaki snapshot fiyatı, yoksa alış fiyatı
                    let priceAtT = (snap.prices && snap.prices[asset.name]) || asset.price || 0;
                    
                    reconstructedValue += (priceAtT * qty * rate);
                    reconstructedCost += (asset.price * qty * rate);
                }
            });

            // Nakit parayı da ekle (Snapshot'ta varsa oradan, yoksa basitçe ekle)
            const cash = (typeof snap.cashBalance === 'number') ? snap.cashBalance : 0;
            reconstructedValue += cash;
            reconstructedCost += cash;

            const profit = reconstructedValue - reconstructedCost;
            const profitPct = reconstructedCost > 0 ? (profit / reconstructedCost) * 100 : 0;

            return {
                date: t,
                value: reconstructedValue, // Varlık Akışı için (TL)
                assetValue: reconstructedValue,
                cost: reconstructedCost,
                netProfit: profit,
                netProfitPercent: profitPct,
                performanceValue: profitPct // Performans Grafiği için (%)
            };
        });

    // 4. SONUÇLARI AYRIŞTIR
    const assetFlowData = processedPoints.map(p => ({
        date: p.date,
        value: p.value,
        cost: p.cost,
        assetValue: p.assetValue
    }));

    const performanceData = processedPoints.map(p => ({
        date: p.date,
        value: p.performanceValue,
        assetValue: p.assetValue,
        netProfit: p.netProfit,
        netProfitPercent: p.netProfitPercent
    }));

    // 5. HEADER (PNL) VERİSİ
    let finalAmount = 0;
    let finalPct = 0;

    if (timeFilter === '1D') {
        const daily = _calculateDailyPulse(portfolio, usdToTryRate);
        finalAmount = daily.amount;
        finalPct = daily.pct;
    } else if (timeFilter === 'ALL') {
        finalAmount = totalUnrealizedPnL;
        finalPct = unrealizedPnLPct;
    } else {
        // Diğer zaman dilimleri için (1W, 1M vb.): Listedeki varlıkların kârlarını topla
        // Bu yöntem, reconstruciton ile tam uyumlu ve tutarlıdır.
        portfolio.forEach(asset => {
            const pnl = calculateAssetPnLForTimeframe(asset, timeFilter, usdToTryRate, null); // History null çünkü yeni varlık odaklıyız
            finalAmount += pnl.amount;
        });
        
        // Yüzdeyi dönem başı maliyetine göre hesapla
        const first = processedPoints[0];
        const last = processedPoints[processedPoints.length - 1];
        if (first && last && first.cost > 0) {
            finalPct = (finalAmount / first.cost) * 100;
        } else if (last && last.cost > 0) {
            finalPct = (finalAmount / last.cost) * 100;
        }
    }

    // 6. SENKRONİZASYON (FINAL SYNC): Grafiğin son noktasını Header ile mühürle
    // Bu adım, dokunmatik crosshair'in her zaman canlı veriyi göstermesini sağlar.
    if (processedPoints.length > 0) {
        const lastIdx = processedPoints.length - 1;
        
        // Varlık Akışı Senkronizasyonu
        assetFlowData[lastIdx].value = totalNetCurrentValue;
        assetFlowData[lastIdx].assetValue = totalNetCurrentValue;
        
        // Performans Senkronizasyonu
        performanceData[lastIdx].value = finalPct;
        performanceData[lastIdx].netProfit = finalAmount;
        performanceData[lastIdx].netProfitPercent = finalPct;
        performanceData[lastIdx].assetValue = totalNetCurrentValue;
    }

    return { assetFlowData, performanceData, pnl: { amount: finalAmount, pct: finalPct } };
};

// YARDIMCI: Günlük Nabız (1D) Hesaplayıcı
const _calculateDailyPulse = (portfolio, usdToTryRate) => {
    let amount = 0;
    let referenceTotalValue = 0;

    portfolio.forEach(asset => {
        const cPrice = (asset.currentPrice && asset.currentPrice > 0) ? asset.currentPrice : (asset.price || 0);
        const addedTs = Number(asset.addedDate);
        const isAddedToday = addedTs && (
            new Date(addedTs).toDateString() === new Date().toDateString() || 
            (Date.now() - addedTs) < 8 * 60 * 60 * 1000
        );

        let refPrice = asset.price || 0;
        if (!isAddedToday) {
            const changePercent = asset.changePercent || 0;
            refPrice = asset.previousClose || (cPrice / (1 + (changePercent / 100)));
        }

        const rate = getAssetRateToTry(asset, usdToTryRate);
        const qty = asset.quantity || 0;
        
        amount += (cPrice - refPrice) * qty * rate;
        referenceTotalValue += (refPrice * qty * rate);
    });

    // Yüzde hesabı: Toplam kazanç / Gün başındaki toplam değer
    const pct = referenceTotalValue > 0 ? (amount / referenceTotalValue) * 100 : 0;
    return { amount, pct };
};
