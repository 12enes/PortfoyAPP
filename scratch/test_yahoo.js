async function testYahoo() {
  try {
    const res = await fetch('https://query2.finance.yahoo.com/v8/finance/chart/THYAO.IS?interval=5m&range=1d', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    console.log('Status:', res.status);
    if (!res.ok) {
       const text = await res.text();
       console.log('Error Body:', text);
       return;
    }
    const data = await res.json();
    if (data.chart && data.chart.result && data.chart.result[0]) {
      const result = data.chart.result[0];
      const timestamps = result.timestamp || [];
      const closes = result.indicators.quote[0].close || [];
      console.log('Success!');
      console.log('Timestamps count:', timestamps.length);
      console.log('Closes count:', closes.length);
      console.log('First timestamp:', timestamps[0] ? new Date(timestamps[0] * 1000).toLocaleString('tr-TR') : 'N/A');
      console.log('Last timestamp:', timestamps[timestamps.length-1] ? new Date(timestamps[timestamps.length-1] * 1000).toLocaleString('tr-TR') : 'N/A');
      console.log('First close:', closes[0]);
      console.log('Last close:', closes[closes.length-1]);
    } else {
      console.log('Invalid data structure:', JSON.stringify(data).substring(0, 500));
    }
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

testYahoo();
