const https = require('https');
https.get('https://api.quran.com/api/v4/search?q=mercy&size=2', (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => console.log('quran.com', data));
});
