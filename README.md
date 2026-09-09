# Bot Maker Jubio — Host

Bu proje, tek HTML panelinin gerçek Jubbio botlarını bir Node.js host üzerinden çalıştırması için hazırlanmıştır.

## Dosyalar

- `index.html` — telefon uyumlu Bot Maker Jubio paneli
- `server.js` — gerçek host/API ve @jubbio/core bot bağlantısı
- `package.json` — bağımlılıklar

## Kurulum

Node.js 18 veya daha yeni sürüm gerekir.

```bash
npm install
npm start
```

Sonra tarayıcıdan:

```text
http://localhost:3000
```

aç.

## Önemli

Bot tokeni HTML localStorage'a kaydedilmez. Host başlatılırken sunucuya gönderilir ve bu örnekte yalnızca çalışan Node.js işleminin belleğinde tutulur.

Bu örnek 90 dakikalık host süresi uygular. Sunucu yeniden başlatılırsa bellekteki hostlar kaybolur.

Paneldeki BMJ yorumlayıcı şu temel fonksiyonları içerir:

$noMentionMessage
$username
$nickname
$channelID
$channelName
$sum[]
$sub[]
$multi[]
$divide[]
$description[]
$title[]
$footer[]
$author[]
$image[]

Örnek:

Tetikleyici:
!ping

Kod:
$description[Pong! 🏓]
$footer[Bot Maker Jubio]
