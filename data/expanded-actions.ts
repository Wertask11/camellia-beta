import type { ActionDefinition } from '@/types';
export const EXPANDED_ACTIONS: ActionDefinition[] = [
  {
    "id": "window-pause",
    "title": "窓辺で空を見る",
    "category": "REST",
    "discoverCategory": "休む",
    "minutes": 2,
    "description": "窓の近くで、空の色や雲をただ眺める時間。",
    "tags": [
      "home",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/rest.webp",
    "steps": [
      "窓の近くに座る",
      "目に入る色をひとつ見つける",
      "2分ほど、予定を考えず眺める"
    ]
  },
  {
    "id": "eyes-break",
    "title": "画面から目を離す",
    "category": "REST",
    "discoverCategory": "休む",
    "minutes": 2,
    "description": "端末を置いて、少し遠くの景色へ視線を移します。",
    "tags": [
      "home",
      "work",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/rest.webp",
    "steps": [
      "画面を伏せる",
      "遠くを無理なく眺める",
      "続けるか休むか選ぶ"
    ]
  },
  {
    "id": "quiet-drink",
    "title": "温かい飲み物をゆっくり",
    "category": "REST",
    "discoverCategory": "休む",
    "minutes": 5,
    "description": "飲み慣れた飲み物を、熱さに気をつけて味わう時間。",
    "tags": [
      "home",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/rest.webp",
    "steps": [
      "飲み慣れた飲み物を用意する",
      "安全な温度を確かめる",
      "一口ずつ、自分の速さで飲む"
    ]
  },
  {
    "id": "one-less-plan",
    "title": "今日の予定を一つ減らす",
    "category": "REST",
    "discoverCategory": "休む",
    "minutes": 5,
    "description": "急がない用事を一つ選び、別の日へ移せるか考えます。",
    "tags": [
      "home",
      "work",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/rest.webp",
    "steps": [
      "予定を見渡す",
      "今日でなくてもよい用事を選ぶ",
      "移すか、そのままにするか決める"
    ]
  },
  {
    "id": "notifications-off",
    "title": "通知を10分閉じる",
    "category": "REST",
    "discoverCategory": "休む",
    "minutes": 10,
    "description": "必要な連絡を確かめてから、端末と少し距離を置きます。",
    "tags": [
      "home",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/rest.webp"
  },
  {
    "id": "rest-chair",
    "title": "椅子にもたれて一息",
    "category": "REST",
    "discoverCategory": "休む",
    "minutes": 2,
    "description": "姿勢を決めすぎず、楽だと感じる座り方を探します。",
    "tags": [
      "home",
      "work",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/rest.webp",
    "steps": [
      "安定した椅子に座る",
      "楽な位置に手を置く",
      "目を開けたままでも、少し休む"
    ]
  },
  {
    "id": "evening-buffer",
    "title": "帰宅後に10分の余白",
    "category": "REST",
    "discoverCategory": "休む",
    "minutes": 10,
    "description": "次の家事に入る前に、予定を詰めない時間をつくります。",
    "tags": [
      "home",
      "free",
      "alone",
      "night"
    ],
    "image": "/actions/illustrations/rest.webp"
  },
  {
    "id": "slow-morning",
    "title": "朝の支度に余白をつくる",
    "category": "REST",
    "discoverCategory": "休む",
    "minutes": 15,
    "description": "明朝に使う物を一か所に置き、急がない準備をします。",
    "tags": [
      "home",
      "free",
      "alone",
      "morning"
    ],
    "image": "/actions/illustrations/rest.webp"
  },
  {
    "id": "park-bench",
    "title": "公園のベンチで休む",
    "category": "REST",
    "discoverCategory": "休む",
    "minutes": 30,
    "description": "近くの安全な場所を選び、歩く距離も自分で決めます。",
    "tags": [
      "outdoor",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/rest.webp"
  },
  {
    "id": "unplanned-hour",
    "title": "予定を足さない1時間",
    "category": "REST",
    "discoverCategory": "休む",
    "minutes": 60,
    "description": "今日は何をしないかを決め、空いた時間を残します。",
    "tags": [
      "home",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/rest.webp"
  },
  {
    "id": "shoulder-circle",
    "title": "肩をゆっくり回す",
    "category": "BODY",
    "discoverCategory": "整える",
    "minutes": 2,
    "description": "痛みのない範囲で、小さく動かしてみる2分。",
    "tags": [
      "home",
      "work",
      "free",
      "alone",
      "body"
    ],
    "image": "/actions/illustrations/body.webp",
    "steps": [
      "楽な姿勢になる",
      "肩を小さくゆっくり回す",
      "違和感があればやめて休む"
    ]
  },
  {
    "id": "desk-reset",
    "title": "机の上を一角だけ整える",
    "category": "BODY",
    "discoverCategory": "整える",
    "minutes": 5,
    "description": "全部ではなく、手の届く一角だけ空けます。",
    "tags": [
      "home",
      "work",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/body.webp",
    "steps": [
      "片づける一角を決める",
      "不要な物を元の場所へ戻す",
      "空いた場所をそのまま残す"
    ]
  },
  {
    "id": "water-break",
    "title": "水分を一口とる",
    "category": "BODY",
    "discoverCategory": "整える",
    "minutes": 2,
    "description": "いつもの飲み物を、飲みたい分だけ。",
    "tags": [
      "home",
      "work",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/body.webp",
    "steps": [
      "飲み慣れた飲み物を用意する",
      "楽に座る",
      "一口飲み、続ける量は自分で決める"
    ]
  },
  {
    "id": "bag-reset",
    "title": "かばんの中を5分整える",
    "category": "BODY",
    "discoverCategory": "整える",
    "minutes": 5,
    "description": "明日使う物だけを確かめる、小さな準備。",
    "tags": [
      "home",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/body.webp",
    "steps": [
      "中身を見渡す",
      "不要な紙を一つ出す",
      "鍵などの置き場所を確かめる"
    ]
  },
  {
    "id": "laundry-one",
    "title": "洗濯物を一つだけたたむ",
    "category": "BODY",
    "discoverCategory": "整える",
    "minutes": 2,
    "description": "全部終えることを目指さず、一つだけ手を動かします。",
    "tags": [
      "home",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/body.webp",
    "steps": [
      "一つ選ぶ",
      "自分のやり方でたたむ",
      "続けるか終えるか決める"
    ]
  },
  {
    "id": "simple-meal",
    "title": "食べたいものを一品考える",
    "category": "BODY",
    "discoverCategory": "整える",
    "minutes": 10,
    "description": "栄養を点数にせず、今食べたいものから一品を選びます。",
    "tags": [
      "home",
      "low-cost",
      "alone"
    ],
    "image": "/actions/illustrations/body.webp"
  },
  {
    "id": "short-errand",
    "title": "近くへ小さな用事に出る",
    "category": "BODY",
    "discoverCategory": "整える",
    "minutes": 15,
    "description": "無理のない距離で、買い物やポストまでの用事を一つ。",
    "tags": [
      "outdoor",
      "low-cost",
      "alone"
    ],
    "image": "/actions/illustrations/body.webp"
  },
  {
    "id": "room-air",
    "title": "部屋の空気を入れ替える",
    "category": "BODY",
    "discoverCategory": "整える",
    "minutes": 2,
    "description": "天気と安全を確かめて、短い換気をします。",
    "tags": [
      "home",
      "free",
      "alone"
    ],
    "image": "/actions/illustrations/body.webp",
    "steps": [
      "窓の周りの安全を確かめる",
      "開けられる範囲で窓を開ける",
      "寒さや暑さに合わせて閉める"
    ]
  },
  {
    "id": "week-food",
    "title": "明日の食事を一つ準備する",
    "category": "BODY",
    "discoverCategory": "整える",
    "minutes": 30,
    "description": "簡単な一品や買う物のメモなど、できる準備だけ。",
    "tags": [
      "home",
      "low-cost",
      "alone"
    ],
    "image": "/actions/illustrations/body.webp"
  },
  {
    "id": "neighborhood-route",
    "title": "いつもと違う道を歩く",
    "category": "BODY",
    "discoverCategory": "整える",
    "minutes": 30,
    "description": "明るく安全な道を選び、途中で戻ってもよい散歩。",
    "tags": [
      "outdoor",
      "free",
      "alone",
      "body"
    ],
    "image": "/actions/illustrations/body.webp"
  },
  {
    "id": "hand-care",
    "title": "手に保湿をする",
    "category": "BEAUTY",
    "discoverCategory": "美容",
    "minutes": 2,
    "description": "普段使っている物で、手のケアだけをします。",
    "tags": [
      "home",
      "free",
      "alone",
      "beauty"
    ],
    "image": "/actions/illustrations/beauty.webp",
    "steps": [
      "手を清潔にする",
      "使い慣れた保湿剤を少量とる",
      "違和感がなければなじませる"
    ]
  },
  {
    "id": "lip-care",
    "title": "いつものリップでケア",
    "category": "BEAUTY",
    "discoverCategory": "美容",
    "minutes": 2,
    "description": "新しい物を増やさず、いつものケアを一つ。",
    "tags": [
      "home",
      "free",
      "alone",
      "beauty"
    ],
    "image": "/actions/illustrations/beauty.webp",
    "steps": [
      "使い慣れた物を選ぶ",
      "少量でケアする",
      "違和感があれば使用をやめる"
    ]
  },
  {
    "id": "outfit-one",
    "title": "明日の服を一組選ぶ",
    "category": "BEAUTY",
    "discoverCategory": "美容",
    "minutes": 5,
    "description": "見せ方よりも、明日楽に過ごせそうな組み合わせを。",
    "tags": [
      "home",
      "free",
      "alone",
      "beauty"
    ],
    "image": "/actions/illustrations/beauty.webp",
    "steps": [
      "明日の予定と天気を確かめる",
      "着たい一組を選ぶ",
      "手に取りやすい場所に置く"
    ]
  },
  {
    "id": "brush-wash",
    "title": "メイク道具を一つ洗う",
    "category": "BEAUTY",
    "discoverCategory": "美容",
    "minutes": 10,
    "description": "道具の説明を確かめ、一つだけ手入れします。",
    "tags": [
      "home",
      "free",
      "alone",
      "beauty"
    ],
    "image": "/actions/illustrations/beauty.webp"
  },
  {
    "id": "closet-three",
    "title": "好きな服を3着見直す",
    "category": "BEAUTY",
    "discoverCategory": "美容",
    "minutes": 15,
    "description": "今も着たいと思う服を、3着だけ手に取ります。",
    "tags": [
      "home",
      "free",
      "alone",
      "beauty"
    ],
    "image": "/actions/illustrations/beauty.webp"
  },
  {
    "id": "hair-comb",
    "title": "髪をゆっくりとかす",
    "category": "BEAUTY",
    "discoverCategory": "美容",
    "minutes": 2,
    "description": "強く引っ張らず、いつもの道具で整えます。",
    "tags": [
      "home",
      "free",
      "alone",
      "beauty"
    ],
    "image": "/actions/illustrations/beauty.webp",
    "steps": [
      "使い慣れた道具を用意する",
      "無理に引っ張らずとかす",
      "自分がよいと感じるところで終える"
    ]
  },
  {
    "id": "color-note",
    "title": "好きな色を一つ選ぶ",
    "category": "BEAUTY",
    "discoverCategory": "美容",
    "minutes": 5,
    "description": "服や小物から、今日気になる色を見つけます。",
    "tags": [
      "home",
      "free",
      "alone",
      "beauty"
    ],
    "image": "/actions/illustrations/beauty.webp",
    "steps": [
      "身の回りの色を眺める",
      "気になる色を一つ選ぶ",
      "選んだ理由を一言だけメモする"
    ]
  },
  {
    "id": "nail-file",
    "title": "爪を一つだけ整える",
    "category": "BEAUTY",
    "discoverCategory": "美容",
    "minutes": 5,
    "description": "いつもの道具で、気になるところだけ手入れします。",
    "tags": [
      "home",
      "free",
      "alone",
      "beauty"
    ],
    "image": "/actions/illustrations/beauty.webp",
    "steps": [
      "道具を清潔にする",
      "無理のない範囲で一つ整える",
      "引っかかりがないか確かめる"
    ]
  },
  {
    "id": "accessory-pick",
    "title": "小物を一つ組み合わせる",
    "category": "BEAUTY",
    "discoverCategory": "美容",
    "minutes": 10,
    "description": "新しく買わず、持っている小物の組み合わせを楽しみます。",
    "tags": [
      "home",
      "free",
      "alone",
      "beauty"
    ],
    "image": "/actions/illustrations/beauty.webp"
  },
  {
    "id": "beauty-budget",
    "title": "買い足す前に手持ちを確認",
    "category": "BEAUTY",
    "discoverCategory": "美容",
    "minutes": 30,
    "description": "必要な物と今ある物を見て、買うかどうかは後で決めます。",
    "tags": [
      "home",
      "free",
      "alone",
      "beauty"
    ],
    "image": "/actions/illustrations/beauty.webp"
  },
  {
    "id": "photo-light",
    "title": "光の写真を一枚撮る",
    "category": "PLAY",
    "discoverCategory": "楽しむ",
    "minutes": 5,
    "description": "窓辺や外で、人物や住所が写らない一枚を。",
    "tags": [
      "home",
      "outdoor",
      "free",
      "alone",
      "play"
    ],
    "image": "/actions/illustrations/play.webp",
    "steps": [
      "身の回りの光を探す",
      "人物や住所が写らないか確認する",
      "一枚だけ撮って自分で眺める"
    ]
  },
  {
    "id": "doodle",
    "title": "紙に自由な線を描く",
    "category": "PLAY",
    "discoverCategory": "楽しむ",
    "minutes": 5,
    "description": "上手さを気にせず、色や線を選ぶ時間。",
    "tags": [
      "home",
      "free",
      "alone",
      "play"
    ],
    "image": "/actions/illustrations/play.webp",
    "steps": [
      "紙とペンを用意する",
      "好きな線をいくつか描く",
      "途中でも、そのまま終えてよい"
    ]
  },
  {
    "id": "one-comic",
    "title": "漫画を一話だけ読む",
    "category": "PLAY",
    "discoverCategory": "楽しむ",
    "minutes": 10,
    "description": "区切りのよい一話を、ほかの作業をせず楽しみます。",
    "tags": [
      "home",
      "free",
      "alone",
      "play"
    ],
    "image": "/actions/illustrations/play.webp"
  },
  {
    "id": "old-photo",
    "title": "好きな写真を3枚眺める",
    "category": "PLAY",
    "discoverCategory": "楽しむ",
    "minutes": 5,
    "description": "公開せず、自分にとって好きな写真を選びます。",
    "tags": [
      "home",
      "free",
      "alone",
      "play"
    ],
    "image": "/actions/illustrations/play.webp",
    "steps": [
      "写真を3枚選ぶ",
      "好きなところを一つ見つける",
      "共有せず、自分の時間として閉じる"
    ]
  },
  {
    "id": "playlist-three",
    "title": "気分に合う3曲を選ぶ",
    "category": "PLAY",
    "discoverCategory": "楽しむ",
    "minutes": 10,
    "description": "今の気分に近い曲も、少し違う曲も自由に。",
    "tags": [
      "home",
      "free",
      "alone",
      "play"
    ],
    "image": "/actions/illustrations/play.webp"
  },
  {
    "id": "snack-taste",
    "title": "おやつをゆっくり味わう",
    "category": "PLAY",
    "discoverCategory": "楽しむ",
    "minutes": 10,
    "description": "食べ慣れた物を、食べたい量だけ楽しみます。",
    "tags": [
      "home",
      "low-cost",
      "alone",
      "play"
    ],
    "image": "/actions/illustrations/play.webp"
  },
  {
    "id": "library-visit",
    "title": "図書館をのぞく",
    "category": "PLAY",
    "discoverCategory": "楽しむ",
    "minutes": 30,
    "description": "借りる本を決めず、気になる棚を眺めます。",
    "tags": [
      "outdoor",
      "free",
      "alone",
      "play"
    ],
    "image": "/actions/illustrations/play.webp"
  },
  {
    "id": "movie-hour",
    "title": "映画や番組を途中まで楽しむ",
    "category": "PLAY",
    "discoverCategory": "楽しむ",
    "minutes": 60,
    "description": "最後まで見なくてもよい、自分のための鑑賞時間。",
    "tags": [
      "home",
      "free",
      "alone",
      "play"
    ],
    "image": "/actions/illustrations/play.webp"
  },
  {
    "id": "season-find",
    "title": "季節の変化を一つ探す",
    "category": "PLAY",
    "discoverCategory": "楽しむ",
    "minutes": 15,
    "description": "安全な道で、植物や空などの小さな変化を見つけます。",
    "tags": [
      "outdoor",
      "free",
      "alone",
      "play"
    ],
    "image": "/actions/illustrations/play.webp"
  },
  {
    "id": "small-craft",
    "title": "手持ちの材料で小さく作る",
    "category": "PLAY",
    "discoverCategory": "楽しむ",
    "minutes": 30,
    "description": "紙や糸など、今ある材料で短い手仕事を。",
    "tags": [
      "home",
      "free",
      "alone",
      "play"
    ],
    "image": "/actions/illustrations/play.webp"
  },
  {
    "id": "word-one",
    "title": "気になる言葉を一つ調べる",
    "category": "LEARN",
    "discoverCategory": "学ぶ",
    "minutes": 5,
    "description": "答えを集めすぎず、意味を一つだけ確かめます。",
    "tags": [
      "home",
      "free",
      "alone",
      "learn"
    ],
    "image": "/actions/illustrations/learn.webp",
    "steps": [
      "言葉を一つ選ぶ",
      "信頼できる辞書などで調べる",
      "分かったことを一言残す"
    ]
  },
  {
    "id": "question-note",
    "title": "知りたいことを一つメモ",
    "category": "LEARN",
    "discoverCategory": "学ぶ",
    "minutes": 2,
    "description": "今すぐ調べなくてもよい、小さな問いを残します。",
    "tags": [
      "home",
      "free",
      "alone",
      "learn"
    ],
    "image": "/actions/illustrations/learn.webp",
    "steps": [
      "紙かメモを開く",
      "気になる問いを一つ書く",
      "今日は答えを出さず閉じてもよい"
    ]
  },
  {
    "id": "page-read",
    "title": "本を2ページ読む",
    "category": "LEARN",
    "discoverCategory": "学ぶ",
    "minutes": 5,
    "description": "区切りの途中でも、自分の速さで終えられます。",
    "tags": [
      "home",
      "free",
      "alone",
      "learn"
    ],
    "image": "/actions/illustrations/learn.webp",
    "steps": [
      "本を開く",
      "2ページだけ読む",
      "気になった一文を心に留める"
    ]
  },
  {
    "id": "audio-learn",
    "title": "短い音声を10分聴く",
    "category": "LEARN",
    "discoverCategory": "学ぶ",
    "minutes": 10,
    "description": "関心のある話題を一つ選び、ながらでなく聴きます。",
    "tags": [
      "home",
      "free",
      "alone",
      "learn"
    ],
    "image": "/actions/illustrations/learn.webp"
  },
  {
    "id": "language-three",
    "title": "外国語を3語だけ楽しむ",
    "category": "LEARN",
    "discoverCategory": "学ぶ",
    "minutes": 5,
    "description": "覚えきるより、気になる表現に触れる時間。",
    "tags": [
      "home",
      "free",
      "alone",
      "learn"
    ],
    "image": "/actions/illustrations/learn.webp",
    "steps": [
      "言語と話題を選ぶ",
      "3語の意味や音を確かめる",
      "好きな一語をメモする"
    ]
  },
  {
    "id": "recipe-read",
    "title": "作ってみたい料理を一つ探す",
    "category": "LEARN",
    "discoverCategory": "学ぶ",
    "minutes": 15,
    "description": "材料や予算を見て、作るかどうかは後で選びます。",
    "tags": [
      "home",
      "free",
      "alone",
      "learn"
    ],
    "image": "/actions/illustrations/learn.webp"
  },
  {
    "id": "library-skill",
    "title": "図書館で新しい分野の棚へ",
    "category": "LEARN",
    "discoverCategory": "学ぶ",
    "minutes": 30,
    "description": "いつもと違う分野の本を、一冊手に取ります。",
    "tags": [
      "outdoor",
      "free",
      "alone",
      "learn"
    ],
    "image": "/actions/illustrations/learn.webp"
  },
  {
    "id": "money-note",
    "title": "今日使ったお金をメモ",
    "category": "LEARN",
    "discoverCategory": "学ぶ",
    "minutes": 5,
    "description": "良い悪いをつけず、覚えている支出を記録します。",
    "tags": [
      "home",
      "free",
      "alone",
      "learn"
    ],
    "image": "/actions/illustrations/learn.webp",
    "steps": [
      "メモを開く",
      "覚えている支出だけ書く",
      "自分を責めずに閉じる"
    ]
  },
  {
    "id": "course-preview",
    "title": "学びたい講座を一つ比較",
    "category": "LEARN",
    "discoverCategory": "学ぶ",
    "minutes": 30,
    "description": "すぐ申し込まず、時間・費用・内容を確かめます。",
    "tags": [
      "home",
      "free",
      "alone",
      "learn"
    ],
    "image": "/actions/illustrations/learn.webp"
  },
  {
    "id": "deep-read",
    "title": "興味のあるテーマをじっくり読む",
    "category": "LEARN",
    "discoverCategory": "学ぶ",
    "minutes": 60,
    "description": "途中で休みながら、信頼できる資料を読む時間。",
    "tags": [
      "home",
      "free",
      "alone",
      "learn"
    ],
    "image": "/actions/illustrations/learn.webp"
  },
  {
    "id": "thanks-one",
    "title": "ありがとうを一言伝える",
    "category": "CONNECT",
    "discoverCategory": "つながる",
    "minutes": 2,
    "description": "伝えたい相手がいれば、短く一言だけ。",
    "tags": [
      "home",
      "free",
      "social",
      "connect"
    ],
    "image": "/actions/illustrations/connect.webp",
    "steps": [
      "相手と伝えたいことを考える",
      "返信を求めない一言にする",
      "送るかどうか最後に自分で選ぶ"
    ]
  },
  {
    "id": "draft-message",
    "title": "送らなくてもよい手紙を書く",
    "category": "CONNECT",
    "discoverCategory": "つながる",
    "minutes": 5,
    "description": "言いたいことを、自分だけの下書きにします。",
    "tags": [
      "home",
      "free",
      "alone",
      "connect"
    ],
    "image": "/actions/illustrations/connect.webp",
    "steps": [
      "紙やメモを開く",
      "今伝えたいことを書く",
      "送らずに置いてもよい"
    ]
  },
  {
    "id": "greet",
    "title": "身近な人に短い挨拶",
    "category": "CONNECT",
    "discoverCategory": "つながる",
    "minutes": 2,
    "description": "相手の都合を尊重して、挨拶だけでも。",
    "tags": [
      "home",
      "work",
      "free",
      "social",
      "connect"
    ],
    "image": "/actions/illustrations/connect.webp",
    "steps": [
      "挨拶したい人がいるか考える",
      "短い言葉を選ぶ",
      "相手の反応を決めつけず終える"
    ]
  },
  {
    "id": "invite-walk",
    "title": "短い散歩に誘ってみる",
    "category": "CONNECT",
    "discoverCategory": "つながる",
    "minutes": 5,
    "description": "断られてもよい、小さな誘い方を考えます。",
    "tags": [
      "home",
      "free",
      "social",
      "connect"
    ],
    "image": "/actions/illustrations/connect.webp",
    "steps": [
      "誘いたい人と無理のない時間を考える",
      "断りやすい言葉で誘う",
      "返事は急かさず待つ"
    ]
  },
  {
    "id": "listen-ten",
    "title": "誰かの話を10分聴く",
    "category": "CONNECT",
    "discoverCategory": "つながる",
    "minutes": 10,
    "description": "話してよいかを先に確かめ、答えを急がず聴きます。",
    "tags": [
      "home",
      "free",
      "social",
      "connect"
    ],
    "image": "/actions/illustrations/connect.webp"
  },
  {
    "id": "shared-tea",
    "title": "誰かとお茶の時間",
    "category": "CONNECT",
    "discoverCategory": "つながる",
    "minutes": 30,
    "description": "話題を用意しすぎず、会える範囲で短い時間を。",
    "tags": [
      "home",
      "outdoor",
      "low-cost",
      "social",
      "connect"
    ],
    "image": "/actions/illustrations/connect.webp"
  },
  {
    "id": "call-friend",
    "title": "都合を聞いて短く電話",
    "category": "CONNECT",
    "discoverCategory": "つながる",
    "minutes": 15,
    "description": "相手も自分も話せるときに、終わる時間も決めて。",
    "tags": [
      "home",
      "free",
      "social",
      "connect"
    ],
    "image": "/actions/illustrations/connect.webp"
  },
  {
    "id": "boundary-note",
    "title": "頼まれごとの返し方を考える",
    "category": "CONNECT",
    "discoverCategory": "つながる",
    "minutes": 5,
    "description": "引き受ける前に、できる範囲を一言にします。",
    "tags": [
      "home",
      "work",
      "free",
      "alone",
      "connect"
    ],
    "image": "/actions/illustrations/connect.webp",
    "steps": [
      "頼まれたことをメモする",
      "今できる範囲を考える",
      "返答を下書きし、送るかは自分で決める"
    ]
  },
  {
    "id": "event-look",
    "title": "地域の催しを調べる",
    "category": "CONNECT",
    "discoverCategory": "つながる",
    "minutes": 30,
    "description": "参加を決めず、公式案内の日時と費用を確かめます。",
    "tags": [
      "home",
      "free",
      "alone",
      "connect"
    ],
    "image": "/actions/illustrations/connect.webp"
  },
  {
    "id": "shared-hobby",
    "title": "好きなことを一緒に楽しむ",
    "category": "CONNECT",
    "discoverCategory": "つながる",
    "minutes": 60,
    "description": "相手と相談し、無理のない時間や予算で楽しみます。",
    "tags": [
      "home",
      "outdoor",
      "low-cost",
      "social",
      "connect"
    ],
    "image": "/actions/illustrations/connect.webp"
  }
];
