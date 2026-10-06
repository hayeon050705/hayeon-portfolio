(function () {
  var LAT = 36.8330;
  var LON = 127.1790;
  var URL = 'https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON +
    '&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FSeoul';

  var CONDITIONS = {
    0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림',
    45: '안개', 48: '짙은 안개',
    51: '약한 이슬비', 53: '이슬비', 55: '강한 이슬비',
    56: '약한 어는 이슬비', 57: '어는 이슬비',
    61: '약한 비', 63: '비', 65: '강한 비',
    66: '약한 어는 비', 67: '어는 비',
    71: '약한 눈', 73: '눈', 75: '강한 눈', 77: '싸락눈',
    80: '약한 소나기', 81: '소나기', 82: '강한 소나기',
    85: '약한 눈 소나기', 86: '눈 소나기',
    95: '뇌우', 96: '우박을 동반한 뇌우', 99: '강한 우박을 동반한 뇌우'
  };

  function $(id) { return document.getElementById(id); }

  function fail() {
    $('weather-condition').textContent = '날씨 정보를 불러오지 못했습니다';
  }

  fetch(URL)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var c = data.current;
      if (!c) throw new Error('no current data');
      var temp = Math.round(c.temperature_2m * 10) / 10;
      $('weather-temp').textContent = temp;
      $('weather-temp-2').textContent = temp;
      $('weather-humidity').textContent = Math.round(c.relative_humidity_2m);
      $('weather-condition').textContent = CONDITIONS[c.weather_code] || '날씨 정보';
      $('weather-time').textContent = c.time.replace('T', ' ') + ' 기준';
    })
    .catch(fail);
})();
