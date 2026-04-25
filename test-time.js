const https = require('https');

https.get('https://timeapi.io/api/Time/current/zone?timeZone=UTC', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const realTime = new Date(parsed.dateTime).getTime();
      const localTime = Date.now();
      const offsetMs = localTime - realTime;
      console.log('Real UTC:', new Date(realTime).toISOString());
      console.log('Local UTC:', new Date(localTime).toISOString());
      console.log('Offset (ms):', offsetMs);
      console.log('Offset (hours):', offsetMs / 3600000);
    } catch(e) {
      console.error(e);
    }
  });
}).on('error', console.error);
