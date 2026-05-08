import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

const TefasScraper = ({ fonKodu, onDataReceived }) => {
  if (!fonKodu) return null;

  const injectedJS = `
    setTimeout(function() {
      try {
        var tokenMatch = document.documentElement.innerHTML.match(/ST-[a-zA-Z0-9\\-]+/);
        var token = tokenMatch ? tokenMatch[0] : null;
        var pageTitle = document.title;
        
        if(token) {
          fetch('https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir', {
            method: 'POST',
            headers: {
              'accept': '*/*',
              'authorization': 'Bearer ' + token,
              'content-type': 'application/json',
              'referer': window.location.href
            },
            body: JSON.stringify({fonKodu: '${fonKodu}', dil: 'TR', periyod: 12})
          })
          .then(res => res.json())
          .then(data => window.ReactNativeWebView.postMessage(JSON.stringify({status: 'success', data: data})))
          .catch(err => window.ReactNativeWebView.postMessage(JSON.stringify({status: 'error', error: err.message})));
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            status: 'error', 
            error: 'Token bulunamadı. Sayfa Başlığı: ' + pageTitle,
            htmlPreview: document.documentElement.innerHTML.substring(0, 500)
          }));
        }
      } catch(e) {
         window.ReactNativeWebView.postMessage(JSON.stringify({status: 'error', error: e.message}));
      }
    }, 4000); // Bekleme süresini 4 saniyeye çıkardık
    true;
  `;

  const handleMessage = (event) => {
    try {
      const result = JSON.parse(event.nativeEvent.data);
      if (result.status === 'success') {
        if (onDataReceived) {
          onDataReceived(result.data);
        }
      } else {
        console.error('TEFAS Scraper Hatası (Fon: ' + fonKodu + '):', result.error);
      }
    } catch (error) {
      console.error('TEFAS Scraper Parse Hatası:', error);
    }
  };

  return (
    <View style={{ position: 'absolute', top: -1000, left: -1000, height: 1, width: 1, opacity: 0, overflow: 'hidden' }} pointerEvents="none">
      <WebView
        source={{ 
          uri: 'https://www.tefas.gov.tr/tr/fon-detayli-analiz/' + fonKodu,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          }
        }}
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        injectedJavaScript={injectedJS}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
      />
    </View>
  );
};

export default TefasScraper;
