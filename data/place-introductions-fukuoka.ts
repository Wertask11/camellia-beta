/**
 * Camellia Place "introduction" listings, Fukuoka batch 1. Owner approved all 26 on 2026-11-25.
 * ready: facts (address, hours, fee, official site) were checked against the Fukuoka Prefecture tourism
 * board (crossroadfukuoka.jp) and the place's official site on 2026-11-25, so they are published.
 * Not ready: saved as drafts until the operator confirms them on the official site.
 * check is a note for the operator and is never stored.
 */
import type {IntroductionDraftInput} from '../lib/place/introduction-drafts';
export const PLACE_INTRODUCTION_BATCH = 'fukuoka-2026-11';
export const PLACE_INTRODUCTIONS_FUKUOKA: IntroductionDraftInput[] = [
 {
  "slug": "ohori-park",
  "name": "大濠公園",
  "category": "公園 / 自然",
  "area": "中央区",
  "recommendedFor": [
   "move",
   "rest"
  ],
  "tags": [
   "散歩",
   "池",
   "ひとりでも"
  ],
  "shortDescription": "池のまわりを1周歩くだけで気分が変わる、街なかの大きな公園。",
  "description": "大きな池を囲む周回路があり、自分のペースで歩けます。ベンチも多く、途中で座って水面を眺めるだけでも気持ちが落ち着きます。ひとりで来ている人も多い場所です。",
  "check": "周回路の距離",
  "officialUrl": "https://www.ohorikouen.jp/",
  "address": "福岡県福岡市中央区大濠公園1-2",
  "openingHours": "公園は散策自由です。園内の施設ごとの時間は公式サイトでご確認ください。",
  "priceRange": "無料（施設により有料）",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/12492 と公式サイト https://www.ohorikouen.jp/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "ohori-park-japanese-garden",
  "name": "大濠公園 日本庭園",
  "category": "公園 / 自然",
  "area": "中央区",
  "recommendedFor": [
   "quiet"
  ],
  "tags": [
   "庭園",
   "静か",
   "有料"
  ],
  "shortDescription": "人が少なめで、座って何もしない時間がとれる日本庭園。",
  "description": "大濠公園の一角にある日本庭園です。池や石組みを眺めながら、静かに過ごせます。",
  "check": "入園料・休園日",
  "officialUrl": "https://www.ohoriteien.jp/",
  "address": "福岡県福岡市中央区大濠公園1-7",
  "openingHours": "10月〜4月 9:00〜17:00／5月〜9月 9:00〜18:00（入園は閉園15分前まで）。休園日：月曜（祝日の場合は翌日）、12月29日〜1月3日",
  "priceRange": "一般250円、児童120円、6歳未満無料",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/12303 と公式サイト https://www.ohoriteien.jp/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "maizuru-park",
  "name": "舞鶴公園（福岡城跡）",
  "category": "公園 / 自然",
  "area": "中央区",
  "recommendedFor": [
   "move"
  ],
  "tags": [
   "散歩",
   "季節の花",
   "石垣"
  ],
  "shortDescription": "石垣と季節の花を見ながら歩ける城跡の公園。",
  "description": "福岡城の跡に広がる公園です。石垣のあいだを歩きながら、季節の花を楽しめます。大濠公園とあわせて歩くこともできます。",
  "check": "花の時期の行事・有料エリア",
  "officialUrl": "https://www.midorimachi.jp/maiduru/",
  "address": "福岡県福岡市中央区城内1-4",
  "openingHours": "公園は散策自由です。園内の施設ごとの時間は公式サイトでご確認ください。",
  "priceRange": "無料（施設により有料）",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/12435 と公式サイト https://www.midorimachi.jp/maiduru/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "fukuoka-city-botanical-garden",
  "name": "福岡市動植物園（植物園）",
  "category": "公園 / 自然",
  "area": "中央区",
  "recommendedFor": [
   "rest"
  ],
  "tags": [
   "植物",
   "温室",
   "雨の日も"
  ],
  "shortDescription": "温室と季節の花をゆっくり見て回れる植物園。",
  "description": "屋外の花壇に加えて温室もあり、天気が悪い日にも過ごせます。花の名前を眺めながら、自分のペースで回れます。",
  "check": "入園料・休園日",
  "officialUrl": "https://botanical-garden.city.fukuoka.lg.jp/",
  "address": "福岡県福岡市中央区南公園1-1",
  "openingHours": "9:00〜17:00（入園は16:30まで）。休園日：月曜（祝日の場合は翌日）",
  "priceRange": "大人600円、高校生300円、中学生以下無料",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/13642 と公式サイト https://botanical-garden.city.fukuoka.lg.jp/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "nishi-park-fukuoka",
  "name": "西公園",
  "category": "公園 / 自然",
  "area": "中央区",
  "recommendedFor": [
   "move"
  ],
  "tags": [
   "展望台",
   "海が見える",
   "坂道"
  ],
  "shortDescription": "展望台から博多湾が見える、少し坂のある公園。",
  "description": "坂道を上った先の展望台から、博多湾を見渡せます。短い距離で軽く体を動かしたい日に向いています。",
  "check": "展望台の場所",
  "officialUrl": "https://nishikouen.jp/",
  "address": "福岡県福岡市中央区西公園",
  "openingHours": "公園は散策自由です。園内の施設ごとの時間は公式サイトでご確認ください。",
  "priceRange": "無料",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/12498 と公式サイト https://nishikouen.jp/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "nokonoshima-island-park",
  "name": "のこのしまアイランドパーク",
  "category": "公園 / 自然",
  "area": "西区（能古島）",
  "recommendedFor": [
   "rest",
   "try"
  ],
  "tags": [
   "島",
   "花畑",
   "船で行く"
  ],
  "shortDescription": "船に乗るだけで小旅行。花畑と海で一日を過ごせる島の公園。",
  "description": "能古島にある公園です。渡船で島へ渡るところから小さな旅になります。季節の花畑と海の景色の中で、ゆっくり過ごせます。",
  "check": "正式名称の表記・入園料・渡船とバスの時刻",
  "officialUrl": "https://nokonoshima.com/",
  "address": "福岡県福岡市西区能古島",
  "openingHours": "月〜土 9:00〜17:30／日・祝 9:00〜18:30（冬季は平日と同じ）。無休",
  "priceRange": "大人1,500円、小・中学生800円、3歳以上500円",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/12340 と公式サイト https://nokonoshima.com/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "uminonakamichi-seaside-park",
  "name": "海の中道海浜公園",
  "category": "公園 / 自然",
  "area": "東区",
  "recommendedFor": [
   "move",
   "together"
  ],
  "tags": [
   "広い",
   "季節の花",
   "サイクリング"
  ],
  "shortDescription": "広い敷地に季節の花。誰かと一緒に一日過ごせる海辺の公園。",
  "description": "とても広い公園で、季節ごとに花の見どころがあります。歩くほか、自転車で回ることもできます。",
  "check": "入園料・休園日・レンタサイクル",
  "officialUrl": "https://uminaka-park.jp/",
  "address": "福岡県福岡市東区西戸崎18-25",
  "openingHours": "3月〜10月 9:30〜17:30／11月〜2月 9:30〜17:00（入園は閉園1時間前まで）。休園日は時期により異なります（公式サイトでご確認ください）",
  "priceRange": "大人450円、65歳以上210円、中学生以下無料",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/12408 と公式サイト https://uminaka-park.jp/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "aburayama-citizens-forest",
  "name": "油山市民の森",
  "category": "公園 / 自然",
  "area": "南区",
  "recommendedFor": [
   "move",
   "quiet"
  ],
  "tags": [
   "森",
   "散策",
   "静か"
  ],
  "shortDescription": "市内から近い森で、静かに歩ける場所。",
  "description": "市街地から近い山の森です。散策路を歩きながら、木々の中で静かに過ごせます。歩きやすい靴で出かけるのがおすすめです。",
  "check": "2023年に「ABURAYAMA FUKUOKA」としてリニューアル。名称と内容を公式サイトで確認してから公開／散策路の状況・アクセス",
  "ready": false
 },
 {
  "slug": "fukuoka-art-museum",
  "name": "福岡市美術館",
  "category": "文化施設",
  "area": "中央区（大濠公園内）",
  "recommendedFor": [
   "quiet",
   "try"
  ],
  "tags": [
   "美術館",
   "大濠公園",
   "散歩と一緒に"
  ],
  "shortDescription": "大濠公園の中にある美術館。散歩と組み合わせやすい。",
  "description": "大濠公園の中にあり、作品を見たあとにそのまま公園を歩けます。ひとりで静かに過ごしたい日に向いています。",
  "check": "休館日・観覧料・館内カフェの営業",
  "officialUrl": "https://www.fukuoka-art-museum.jp/",
  "address": "福岡県福岡市中央区大濠公園1-6",
  "openingHours": "9:30〜17:30（7月〜10月の金・土は20:00まで、入館は閉館30分前まで）。休館日：月曜（祝日の場合は翌平日）、12月28日〜1月4日",
  "priceRange": "コレクション展 一般200円、高大生150円、中学生以下無料（特別展は別料金）",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/12243 と公式サイト https://www.fukuoka-art-museum.jp/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "fukuoka-asian-art-museum",
  "name": "福岡アジア美術館",
  "category": "文化施設",
  "area": "博多区",
  "recommendedFor": [
   "try"
  ],
  "tags": [
   "美術館",
   "アジアの美術",
   "現代美術"
  ],
  "shortDescription": "アジアの近現代美術に出会える美術館。",
  "description": "アジア各地の近現代美術を紹介している美術館です。ふだん見ることの少ない作品に触れられます。",
  "check": "休館日・観覧料・入居ビルの営業時間",
  "officialUrl": "https://faam.city.fukuoka.lg.jp/",
  "address": "福岡県福岡市博多区下川端町3-1 リバレインセンタービル7・8F",
  "openingHours": "9:30〜18:00（金・土は20:00まで）。休館日：水曜（祝日の場合は翌日）、12月26日〜1月1日",
  "priceRange": "入館無料（アジアギャラリー 一般200円、高大生150円、中学生以下無料）",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/12674 と公式サイト https://faam.city.fukuoka.lg.jp/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "fukuoka-city-museum",
  "name": "福岡市博物館",
  "category": "文化施設",
  "area": "早良区",
  "recommendedFor": [
   "try"
  ],
  "tags": [
   "博物館",
   "歴史",
   "海辺の散歩"
  ],
  "shortDescription": "福岡の歴史に触れられる博物館。百道浜の散歩とセットに。",
  "description": "福岡の歴史や文化を紹介する博物館です。近くの百道浜まで歩いて、海を見て帰ることもできます。",
  "check": "休館日・観覧料・展示中の内容",
  "officialUrl": "https://museum.city.fukuoka.jp/",
  "address": "福岡県福岡市早良区百道浜3-1-1",
  "openingHours": "9:30〜17:30（入館は17:00まで）。休館日：月曜（祝休日の場合は翌平日）、12月28日〜1月4日",
  "priceRange": "",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/12245 と公式サイト https://museum.city.fukuoka.jp/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "fukuoka-prefectural-museum-of-art",
  "name": "福岡県立美術館",
  "category": "文化施設",
  "area": "中央区",
  "recommendedFor": [
   "quiet"
  ],
  "tags": [
   "美術館",
   "公園の中",
   "落ち着いて"
  ],
  "shortDescription": "須崎公園の中にある、落ち着いて作品を見られる美術館。",
  "description": "公園の中にある美術館で、比較的落ち着いて作品を見られます。",
  "check": "休館日・観覧料・改修による休館の有無",
  "officialUrl": "https://fukuoka-kenbi.jp/",
  "address": "福岡県福岡市中央区天神5-2-1",
  "openingHours": "展覧会 10:00〜18:00（入場は17:30まで）。休館日：月曜（祝日の場合は翌日）、12月28日〜1月4日",
  "priceRange": "展覧会ごとに異なります",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/12249 と公式サイト https://fukuoka-kenbi.jp/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "fukuoka-city-public-library",
  "name": "福岡市総合図書館",
  "category": "学び",
  "area": "早良区",
  "recommendedFor": [
   "quiet"
  ],
  "tags": [
   "図書館",
   "無料",
   "長くいられる"
  ],
  "shortDescription": "無料で、好きなだけ本と過ごせる大きな図書館。",
  "description": "多くの本があり、無料で利用できます。何も決めずに本棚のあいだを歩いて、気になった本を手に取る時間がとれます。",
  "check": "休館日・開館時間",
  "officialUrl": "https://toshokan.city.fukuoka.lg.jp/",
  "address": "福岡県福岡市早良区百道浜3-7-1",
  "openingHours": "平日・土曜 10:00〜20:00／日曜・祝日 10:00〜19:00。休館日：月曜（祝日の場合は翌日）、月末、12月28日〜1月4日、特別整理期間",
  "priceRange": "無料（映像ホールは有料）",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/12248 と公式サイト https://toshokan.city.fukuoka.lg.jp/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "kyushu-national-museum",
  "name": "九州国立博物館",
  "category": "文化施設",
  "area": "太宰府市",
  "recommendedFor": [
   "try",
   "together"
  ],
  "tags": [
   "博物館",
   "建物",
   "太宰府"
  ],
  "shortDescription": "建物そのものも見どころ。太宰府天満宮と一緒に回れる博物館。",
  "description": "大きな建物が印象的な博物館です。太宰府天満宮から歩いて行けるので、参拝とあわせて一日の外出にできます。",
  "check": "休館日・観覧料・特別展の内容",
  "officialUrl": "https://www.kyuhaku.jp/",
  "address": "福岡県太宰府市石坂4-7-2",
  "openingHours": "9:30〜17:00（入館は16:30まで、特別展期間の金・土は19:00まで）。休館日：月曜（祝日の場合は翌日）、年末",
  "priceRange": "文化交流展 一般700円、大学生350円（特別展は別料金）",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/13214 と公式サイト https://www.kyuhaku.jp/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "dazaifu-tenmangu",
  "name": "太宰府天満宮",
  "category": "その他",
  "area": "太宰府市",
  "recommendedFor": [
   "rest",
   "together"
  ],
  "tags": [
   "神社",
   "参道",
   "季節の花"
  ],
  "shortDescription": "参道を歩いてお茶を楽しめる、季節の花が美しい神社。",
  "description": "参道を歩いて参拝し、途中でお茶をいただくなど、ゆっくり過ごせます。梅など季節の花も楽しめます。",
  "check": "住所・参拝時間を公式サイトで確認してから公開／参拝時間・行事による混雑",
  "ready": false
 },
 {
  "slug": "kushida-shrine",
  "name": "櫛田神社",
  "category": "その他",
  "area": "博多区",
  "recommendedFor": [
   "quiet"
  ],
  "tags": [
   "神社",
   "街なか",
   "立ち寄り"
  ],
  "shortDescription": "街なかで少し立ち寄って、気持ちを落ち着けられる神社。",
  "description": "博多の街なかにある神社です。用事の合間に立ち寄って、少し静かな時間を持てます。",
  "check": "公式サイトのURLを確認してから公開／参拝時間",
  "ready": false
 },
 {
  "slug": "hakata-machiya-folk-museum",
  "name": "「博多町家」ふるさと館",
  "category": "ワークショップ",
  "area": "博多区",
  "recommendedFor": [
   "try"
  ],
  "tags": [
   "伝統工芸",
   "博多の暮らし",
   "実演"
  ],
  "shortDescription": "博多の暮らしと伝統工芸に触れられる場所。",
  "description": "昔の博多の町家や暮らしを紹介する施設です。伝統工芸の実演が見られる日もあります。",
  "check": "休館日・入館料・実演や体験の有無",
  "officialUrl": "https://www.hakatamachiya.com/",
  "address": "福岡県福岡市博多区冷泉町6-10",
  "openingHours": "10:00〜18:00。休館日：12月29日〜31日",
  "priceRange": "",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/traditional-crafts/13864 と公式サイト https://www.hakatamachiya.com/ で確認（2026-11-25）",
  "ready": true
 },
 {
  "slug": "rakusuien",
  "name": "楽水園",
  "category": "公園 / 自然",
  "area": "博多区",
  "recommendedFor": [
   "quiet"
  ],
  "tags": [
   "日本庭園",
   "抹茶",
   "博多駅近く"
  ],
  "shortDescription": "博多駅の近くで、静かな日本庭園と抹茶を楽しめる場所。",
  "description": "街の中にある小さな日本庭園です。庭を眺めながら、抹茶をいただいて静かに過ごせます。",
  "check": "公式サイトがhttpsに対応しておらず、公式URLを入れられないため保留／休園日・入園料・抹茶の提供",
  "officialUrl": "",
  "address": "福岡県福岡市博多区住吉2-10-7",
  "openingHours": "9:00〜17:00。休園日：火曜（祝日の場合は翌日）、12月29日〜1月1日",
  "priceRange": "大人100円、小・中学生50円（抹茶セット300円）",
  "sourceEvidence": "福岡県観光連盟「クロスロードふくおか」https://www.crossroadfukuoka.jp/spot/10009 で確認（2026-11-25）",
  "ready": false
 },
 {
  "slug": "bunkitsu-fukuoka-tenjin",
  "name": "文喫 福岡天神",
  "category": "本屋",
  "area": "中央区（天神）",
  "recommendedFor": [
   "quiet"
  ],
  "tags": [
   "本屋",
   "入場料制",
   "喫茶"
  ],
  "shortDescription": "落ち着いた空間で、喫茶を楽しみながら本をゆっくり選べる本屋。",
  "description": "本を選びながらゆっくり過ごせる本屋です。飲み物を片手に、時間を気にせず本と向き合えます。",
  "check": "公式サイトで営業中か・住所・営業時間を確認してから公開／入場料・営業時間・営業中か",
  "ready": false
 },
 {
  "slug": "bookskubrick-hakozaki",
  "name": "ブックスキューブリック 箱崎店",
  "category": "本屋",
  "area": "東区",
  "recommendedFor": [
   "quiet",
   "try"
  ],
  "tags": [
   "本屋",
   "カフェ",
   "イベント"
  ],
  "shortDescription": "選び抜かれた本とカフェのある、地元の本屋。",
  "description": "店主が選んだ本が並ぶ本屋です。カフェもあり、本を手にひと休みできます。イベントが開かれることもあります。",
  "check": "公式サイトで営業中か・住所・営業時間を確認してから公開／カフェの営業・定休日",
  "ready": false
 },
 {
  "slug": "bookskubrick-keyaki",
  "name": "ブックスキューブリック けやき通り店",
  "category": "本屋",
  "area": "中央区",
  "recommendedFor": [
   "quiet"
  ],
  "tags": [
   "本屋",
   "けやき通り",
   "小さな店"
  ],
  "shortDescription": "けやき通りの散歩の途中に寄れる、小さな本屋。",
  "description": "並木道沿いにある小さな本屋です。散歩の途中に立ち寄って、思いがけない一冊に出会えます。",
  "check": "公式サイトで営業中か・住所・営業時間を確認してから公開／定休日・営業時間",
  "ready": false
 },
 {
  "slug": "junkudo-fukuoka",
  "name": "ジュンク堂書店 福岡店",
  "category": "本屋",
  "area": "中央区（天神）",
  "recommendedFor": [
   "quiet"
  ],
  "tags": [
   "大型書店",
   "天神",
   "ゆっくり"
  ],
  "shortDescription": "何も決めずに、ゆっくり見て回れる大きな本屋。",
  "description": "幅広い本がそろう大きな本屋です。目的がなくても、棚を眺めて歩くだけで気分転換になります。",
  "check": "公式サイトで営業中か・住所・営業時間を確認してから公開／営業時間・入居ビル",
  "ready": false
 },
 {
  "slug": "ajiro-books",
  "name": "本のあるところ ajiro",
  "category": "本屋",
  "area": "中央区（天神）",
  "recommendedFor": [
   "try"
  ],
  "tags": [
   "本屋",
   "韓国文学",
   "アジアの本"
  ],
  "shortDescription": "韓国文学やアジアの本に出会える本屋。",
  "description": "韓国文学をはじめ、アジアの本を中心に扱う本屋です。読書会などのイベントが開かれることもあります。",
  "check": "公式サイトで営業中か・住所・営業時間を確認してから公開／営業日（不定期の可能性）・場所",
  "ready": false
 },
 {
  "slug": "coffee-bimi",
  "name": "珈琲美美",
  "category": "カフェ",
  "area": "中央区（赤坂）",
  "recommendedFor": [
   "quiet"
  ],
  "tags": [
   "喫茶店",
   "コーヒー",
   "ひとりで"
  ],
  "shortDescription": "ひとりで丁寧な一杯を味わえる喫茶店。",
  "description": "落ち着いた店内で、丁寧にいれたコーヒーを味わえます。ひとりで静かに過ごしたい日に。",
  "check": "公式サイトで営業中か・住所・営業時間を確認してから公開／営業日・営業時間",
  "ready": false
 },
 {
  "slug": "manu-coffee",
  "name": "manu coffee",
  "category": "カフェ",
  "area": "中央区",
  "recommendedFor": [
   "rest"
  ],
  "tags": [
   "コーヒー",
   "地元のお店",
   "気軽に"
  ],
  "shortDescription": "気軽に入れる、地元のコーヒー店。",
  "description": "福岡で親しまれているコーヒー店です。気負わずに入って、ひと休みできます。",
  "check": "公式サイトで営業中か・住所・営業時間を確認してから公開／紹介する店舗（複数店舗あり）・営業時間",
  "ready": false
 },
 {
  "slug": "rec-coffee",
  "name": "REC COFFEE",
  "category": "カフェ",
  "area": "中央区",
  "recommendedFor": [
   "rest"
  ],
  "tags": [
   "コーヒー",
   "明るい店内",
   "ひとりでも"
  ],
  "shortDescription": "明るい店内で、ひとりでも過ごしやすいコーヒー店。",
  "description": "明るく入りやすいコーヒー店です。ひとりでもゆっくり過ごせます。",
  "check": "公式サイトで営業中か・住所・営業時間を確認してから公開／紹介する店舗（複数店舗あり）・営業時間",
  "ready": false
 }
];
