export const uz = {
  start: {
    welcome:
      "🎭 <b>Mafia O'yini Botiga xush kelibsiz!</b>\n\n" +
      "Guruhga qo'shing va /startgame buyrug'i bilan o'yinni boshlang!\n\n" +
      "📖 /help — Yordam\n" +
      "📊 /stats — Statistika",
    botStartedInGroup: "✅ Bot tayyor! /startgame bilan o'yinni boshlang.",
  },

  help: {
    text:
      "🎭 <b>Mafia Bot — Yordam</b>\n\n" +
      "<b>O'yin buyruqlari:</b>\n" +
      "/startgame — Yangi o'yin boshlash\n" +
      "/begingame — O'yinni boshlash\n" +
      "/stopgame — O'yinni to'xtatish\n" +
      "/extend — Vaqtni uzaytirish (+30s)\n\n" +
      "<b>Umumiy:</b>\n" +
      "/stats — Statistika\n" +
      "/top — Reyting\n" +
      "/rules — Qoidalar\n" +
      "/settings — Sozlamalar",
  },

  game: {
    started:
      "🎭 <b>Mafia o'yini boshlanmoqda!</b>\n\n" +
      "Qo'shilish uchun tugmani bosing.\n" +
      "⏱ Vaqt: <b>{time} soniya</b>",
    playerJoined: "✅ <b>{name}</b> qo'shildi! ({count}/{max})",
    playerLeft: "❌ <b>{name}</b> chiqdi! ({count}/{max})",
    playerList: "\n👥 <b>O'yinchilar ({count}):</b>\n{list}",
    notEnoughPlayers: "❌ Yetarli o'yinchi yo'q! (min: {min})",
    alreadyInGame: "⚠️ Siz allaqachon o'yindasiz!",
    gameInProgress: "⚠️ Bu guruhda o'yin davom etmoqda!",
    noActiveGame: "⚠️ Hozir aktiv o'yin yo'q!",
    gameStarting: "🎭 O'yin boshlanmoqda! Rollar tarqatilmoqda...",
    gameStopped: "🛑 O'yin to'xtatildi!",
    startBotFirst: "⚠️ Avval botga shaxsiy xabar yuboring: @{botUsername}",
    extended: "⏱ Vaqt 30 soniyaga uzaytirildi!",
    gameFinished: "🏁 <b>O'yin tugadi!</b>",

    // Kecha
    nightStarts: "🌙 <b>Shahar uxlaydi... Kecha #{round}</b>",
    nightNoAction: "Siz hech narsa qilmadingiz.",
    nightTimeout: "⏰ Vaqt tugadi! Harakat o'tkazib yuborildi.",

    // Kunduz
    dayStarts: "☀️ <b>Shahar uyg'ondi! Kunduz #{round}</b>",
    noOneDied: "✨ Bugun kechasi hech kim o'lmadi!",
    playerDied: "💀 <b>{name}</b> o'lik topildi!",
    playerDiedRole: "💀 <b>{name}</b> o'lik topildi! Roli: {emoji} <b>{role}</b>",
    discussion: "💬 Muhokama vaqti! (<b>{time} soniya</b>)",

    // Ovoz berish
    votingStarts: "🗳 <b>Ovoz berish vaqti!</b>\nKimni chiqaramiz?",
    votedOut: "👋 <b>{name}</b> chiqarildi!",
    votedOutRole: "👋 <b>{name}</b> chiqarildi! Roli: {emoji} <b>{role}</b>",
    noOneVotedOut: "🤷 Ovozlar teng — hech kim chiqarilmadi!",
    alreadyVoted: "Siz allaqachon ovoz berdingiz!",

    // Kamikaze
    kamikazeActivated: "💣 <b>{name}</b> Kamikaze edi! <b>{target}</b>ni o'zi bilan olib ketdi!",

    // G'olib
    townWins: "🏆 <b>Shahar yutdi!</b> Barcha mafiya va yakka rollar yo'q qilindi!",
    mafiaWins: "🏆 <b>Mafiya yutdi!</b> Shahar qo'lga olindi!",
    soloWins: "🏆 <b>{role} yutdi!</b> Yolg'iz qoldi!",

    // Rollar ro'yxati
    finalRoles: "\n📋 <b>Rollar:</b>\n{list}",
  },

  // Tundagi atmosfera matnlari (guruhda ko'rinadi)
  nightStory: {
    SHERIFF: "🕵🏻‍♂ Komissar yovuzlarni qidirishga ketdi...",
    DON: "🤵🏻 Don navbatdagi o'ljasini tanladi...",
    MAFIA: "🤵🏼 Mafiya qorong'u ko'chalarda yurmoqda...",
    DOCTOR: "👨🏼‍⚕️ Shifokor tungi navbatchilikga ketdi...",
    TRAMP: "🧙🏼‍♂️ Daydi kimnikigadir ichkilik butilka olish uchun ketdi...",
    HOOKER: "💃 Kezuvchining qandaydir mehmoni bor ekan...",
    WARLOCK: "⚡️ Koldun sirli kuchlari bilan tunni kezmoqda...",
    SPY: "🦇 Ayg'oqchi soyalar orasida g'oyib bo'ldi...",
    LAWYER: "👨🏼‍💼 Advokat kimnidir himoyaga oldi...",
    LAB: "👨‍🔬 Labarant laboratoriyasida ishlayotir...",
    KILLER: "🔪 Qorong'ulikda kimdir pichoq charxlayapti...",
    SNIPER: "👨🏻‍🎤 Snayperchi tomdan nishon oldi...",
    ARCHER: "🏹 Qorong'ulikda kamon ipining tovushi eshitildi...",
    MINER: "☠️ Kimdir eshik oldida nimadir o'rnatyapti...",
    SERGEANT: "👮🏻‍♂ Serjant Komissar bilan aloqaga chiqdi...",
    KAMIKAZE: "",
    CIVILIAN: "",
    SANTA: "🎅🏻 Qorbobo sovg'a xaltasini ko'tarib ketdi...",
    SNOWBOY: "⛄️ Qorbola qor to'plarini tayyorlayapti...",
    TRAITOR: "🦎 Sotqin kimgadir yaqinlashmoqda...",
    ROBBER: "👺 Qaroqchi qorong'u ko'chada poylab turibdi...",
    PROFESSOR: "🎩 Professor sirli qutilari bilan ketdi...",
  } as Record<string, string>,

  // O'lim hikoyalari (kim o'ldirdi — guruhda kechasi natijalarda)
  deathStory: {
    MAFIA_KILL:
      "Tunda <b>{name}</b> vaxshiylarcha o'ldirildi. Aytishlaricha unikiga 🤵🏻 Mafiya kelgan.",
    SHERIFF_KILL:
      "Tunda <b>{name}</b>ga 🕵🏻‍♂ Komissar tomonidan o'q uzildi.",
    KILLER_KILL:
      "Tunda <b>{name}</b> qorong'u ko'chada 🔪 noma'lum shaxs tomonidan o'ldirildi.",
    SNIPER_KILL:
      "Tunda <b>{name}</b> uzoqdan 👨🏻‍🎤 snayper o'qi bilan urildi.",
    ARCHER_KILL:
      "Tunda <b>{name}</b>ning ko'kragidan 🏹 kamon o'qi topildi.",
    MINER_KILL:
      "Ertalab <b>{name}</b>ning eshigi oldida ☠️ portlash sodir bo'ldi.",
    SNOWBOY_KILL:
      "Tunda <b>{name}</b> ⛄️ dahshatli qor bo'ronida nobud bo'ldi.",
    LAB_KILL:
      "Tunda <b>{name}</b> 👨‍🔬 sirli laboratoriyada zaharlanib o'ldi.",
    WARLOCK_KILL:
      "Tunda <b>{name}</b>ga ⚡️ Koldunning qarg'ishi tushdi.",
    KAMIKAZE_KILL:
      "💣 <b>{name}</b> portlashda halok bo'ldi.",
    ROBBER_KILL:
      "Tunda <b>{name}</b> 👺 Qaroqchi tomonidan o'ldirildi.",
    PROFESSOR_KILL:
      "Tunda <b>{name}</b> 🎩 Professorning o'lim qutisini ochdi.",
    VOTED_OUT:
      "Aholi qaroriga ko'ra <b>{name}</b> osildi.",
  } as Record<string, string>,

  roles: {
    CIVILIAN: "👨🏼 Tinch axoli",
    DOCTOR: "👨🏼‍⚕️ Shifokor",
    TRAMP: "🧙🏼‍♂️ Daydi",
    SHERIFF: "🕵🏻‍♂ Komissar",
    KAMIKAZE: "💣 Kamikaze",
    HOOKER: "💃 Kezuvchi",
    SERGEANT: "👮🏻‍♂ Serjant",
    WARLOCK: "⚡️ Koldun",
    SANTA: "🎅🏻 Qorbobo",
    SNOWBOY: "⛄️ Qorbola",
    DON: "🤵🏻 Don",
    MAFIA: "🤵🏼 Mafiya",
    LAWYER: "👨🏼‍💼 Advokat",
    SPY: "🦇 Ayg'oqchi",
    LAB: "👨‍🔬 Labarant",
    KILLER: "🔪 Qotil",
    MINER: "☠️ Minior",
    SNIPER: "👨🏻‍🎤 Snayperchi",
    ARCHER: "🏹 Kamonchi",
    TRAITOR: "🦎 Sotqin",
    ROBBER: "👺 Qaroqchi",
    PROFESSOR: "🎩 Professor",
  } as Record<string, string>,

  roleAssigned: {
    CIVILIAN:
      "👨🏼 Siz <b>Tinch axoli</b>siz!\n" +
      "Vazifangiz: mafiyalarni va yakka rollarni kun davomida osishda faol ishtirok eting.",
    DOCTOR:
      "👨🏼‍⚕️ Siz <b>Shifokor</b>siz!\n" +
      "Tunda tanlagan odamingizni otishgan bo'lsa o'limdan qutqarasiz.\n" +
      "⚠️ O'zingizni faqat 1 marta davolay olasiz!",
    TRAMP:
      "🧙🏼‍♂️ Siz <b>Daydi</b>siz!\n" +
      "Tunda tanlagan odamingizning uyiga borasiz va kimlar kelganini ko'rasiz.\n" +
      "Qotillikka guvoh bo'lasiz!",
    SHERIFF:
      "🕵🏻‍♂ Siz <b>Komissar</b>siz!\n" +
      "Shaharning asosiy himoyachisi. Mafiyani toping!\n" +
      "⚠️ Birinchi tundan tekshirmasdan o'tish taqiqlanadi!",
    KAMIKAZE:
      "💣 Siz <b>Kamikaze</b>siz!\n" +
      "Tun va kunda tinch axolisiz, ammo osishganda xohlagan o'yinchini o'zingiz bilan qabrga olib ketishingiz mumkin!",
    HOOKER:
      "💃 Siz <b>Kezuvchi</b>siz!\n" +
      "Tunda bir kishini zararsizlantiring (bloklang).\n" +
      "⚠️ Komissarni uxlatish taqiqlanadi!",
    SERGEANT:
      "👮🏻‍♂ Siz <b>Serjant</b>siz!\n" +
      "Komissarga yordam bering. Voqealar haqida xabar olasiz.\n" +
      "⚠️ Komissar o'lsa — uning o'rnini egallaysiz!",
    WARLOCK:
      "⚡️ Siz <b>Koldun</b>siz!\n" +
      "Tunda tanlagan odam tinch axoli bo'lsa — tongda osilishdan saqlaysiz.\n" +
      "Boshqa taraf bo'lsa — o'ldirasiz!",
    SANTA:
      "🎅🏻 Siz <b>Qorbobo</b>siz!\n" +
      "Tunda istagan ishtirokchiga sovg'a ulashishingiz mumkin.",
    SNOWBOY:
      "⛄️ Siz <b>Qorbola</b>siz!\n" +
      "Tunda istagan ishtirokchini qorbo'ron qilib nobud qilishingiz mumkin!",
    DON:
      "🤵🏻 Siz <b>Don</b>siz!\n" +
      "Mafialar sardori! Tunda ovozingiz ko'proq ahamiyatga ega.\n" +
      "O'ldirish uchun ko'chaga chiqasiz!",
    MAFIA:
      "🤵🏼 Siz <b>Mafiya</b>siz!\n" +
      "Donga bo'ysunasiz va qarshilik qilganlarni o'ldirasiz.\n" +
      "Don o'lsa — yangi Don bo'lishingiz mumkin!",
    LAWYER:
      "👨🏼‍💼 Siz <b>Advokat</b>siz!\n" +
      "Tanlagan mafiyangizni Komissar taniy olmaydi — unga tinch axoli bo'lib ko'rinadi.",
    SPY:
      "🦇 Siz <b>Ayg'oqchi</b>siz!\n" +
      "Tunda xohlagan bitta o'yinchining rolini bilishingiz va mafialar uchun oshkor qilishingiz mumkin.",
    LAB:
      "👨‍🔬 Siz <b>Labarant</b>siz!\n" +
      "Tanlagan odamingiz mafiya tarafida bo'lsa — davolaysiz.\n" +
      "Mafiya bo'lmasa — o'ldirasiz!",
    KILLER:
      "🔪 Siz <b>Qotil</b>siz!\n" +
      "Shahardagi hamma o'lishi kerak, qotildan tashqari!\n" +
      "Yakka rolsiz — yolg'iz o'ynaysiz.",
    MINER:
      "☠️ Siz <b>Minior</b>siz!\n" +
      "Tunda tanlagan odamingizning eshigi oldiga mina qo'yasiz.\n" +
      "O'sha uyga kelgan sizdan boshqa hamma o'ladi!",
    SNIPER:
      "👨🏻‍🎤 Siz <b>Snayperchi</b>siz!\n" +
      "Tanlagan odamingizda himoya bo'lsa ham o'ladi!\n" +
      "Daydi sizi ko'ra olmaydi. Eng kuchli rollardan biri!",
    ARCHER:
      "🏹 Siz <b>Kamonchi</b>siz!\n" +
      "Maxfiy qotil — Daydi sizning harakatingizni sezmaydi!",
    TRAITOR:
      "🦎 Siz <b>Sotqin</b>siz!\n" +
      "Tunda tanlagan odamingiz mafiyadan bo'lsa — mafiyaga aylanasiz.\n" +
      "Tinch axolidan bo'lsa — serjant bo'lasiz.\n" +
      "Yakka tarafdan bo'lsa — qotilga aylanasiz!",
    ROBBER:
      "👺 Siz <b>Qaroqchi</b>siz!\n" +
      "Tunda birovning uyiga borib pul undirasiz.\n" +
      "Agar bosh tortsa — o'ldirasiz!",
    PROFESSOR:
      "🎩 Siz <b>Professor</b>siz!\n" +
      "Tunda tanlagan ishtirokchiga 3 ta sirli quti taklif qilasiz:\n" +
      "⚰️ O'lim, 🥡 Bo'sh quti, 🥷 Geroy — u o'z taqdirini o'zi hal qiladi!",
  } as Record<string, string>,

  night: {
    hookerPrompt: "💃 Kimni bloklaysiz?\n⚠️ Komissarni uxlatish taqiqlanadi!",
    traitorPrompt: "🦎 Kimni tanlaysiz?\n(Uning jamoasiga qarab rolingiz o'zgaradi)",
    lawyerPrompt: "👨🏼‍💼 Qaysi mafiyani himoya qilasiz?",
    spyPrompt: "🦇 Kimning rolini bilmoqchisiz?",
    mafiaPrompt: "🤵🏼 Mafiya jamoasi: {members}\nKimni o'ldiramiz?",
    labPrompt: "👨‍🔬 Kimni tanlaysiz?\n(Mafiya bo'lsa davolaysiz, bo'lmasa o'ldirasiz)",
    sheriffPrompt: "🕵🏻‍♂ Kimni tekshirasiz?",
    sergeantPrompt: "👮🏻‍♂ Komissar haqida ma'lumot olasiz...",
    doctorPrompt: "👨🏼‍⚕️ Kimni davolaysiz?\n⚠️ O'zingizni faqat 1 marta!",
    warlockPrompt: "⚡️ Kimni tanlaysiz?\n(Tinch axoli bo'lsa himoya, boshqa bo'lsa o'ldiradi)",
    trampPrompt: "🧙🏼‍♂️ Kimning uyiga borasiz?",
    killerPrompt: "🔪 Kimni o'ldirasiz?",
    sniperPrompt: "👨🏻‍🎤 Kimni o'ldirasiz?\n(Himoyani ham o'tadi!)",
    archerPrompt: "🏹 Kimni o'ldirasiz?\n(Maxfiy — daydi sezmaydi)",
    minerPrompt: "☠️ Kimning eshigiga mina qo'yasiz?",
    snowboyPrompt: "⛄️ Kimni qorbo'ron qilasiz?",
    santaPrompt: "🎅🏻 Kimga sovg'a berasiz?",
    robberPrompt: "👺 Kimning uyiga borasiz?\n(Pul undirasiz yoki o'ldirasiz)",
    robberTargetPrompt: "👺 Uyingizga Qaroqchi bostirib kirdi!\nNima qilasiz?",
    robberTargetPaid: "💰 1000 pul berdingiz — tirik qoldingiz.",
    robberTargetRefused: "🏃 Bosh tortdingiz — natijasi tongda ma'lum bo'ladi.",
    robberWaiting: "👺 <b>{name}</b>ning uyiga bostirib kirdingiz. Javobini kuting...",
    professorPrompt: "🎩 Kimga 3 ta sirli quti taklif qilasiz?",
    professorBoxesPrompt: "🎩 Professor sizga 3 ta sirli quti taklif qildi. Birini tanlang — taqdiringiz shunda!",
    professorResult_death: "🎩 Siz tanlagan qutidan... ⚰️ <b>O'lim</b> chiqdi!",
    professorResult_empty: "🎩 Siz tanlagan quti... 🥡 <b>Bo'sh</b> chiqdi.",
    professorResult_hero: "🎩 Siz tanlagan qutidan... 🥷 <b>Geroy</b> kuchi chiqdi!",

    // Natijalar
    sheriffResult_town: "✅ <b>{name}</b> — tinch axoli",
    sheriffResult_mafia: "🔴 <b>{name}</b> — mafiya!",
    spyResult: "🦇 <b>{name}</b> — roli: {role}",
    trampResult: "🧙🏼‍♂️ <b>{name}</b> uyiga kelganlar:\n{visitors}",
    trampNoVisitors: "🧙🏼‍♂️ <b>{name}</b> uyiga hech kim kelmadi.",
    trampWitness: "🔴 <b>{name}</b> uyida qotillik sodir bo'ldi!",
    warlockSaved: "⚡️ <b>{name}</b> — tinch axoli, osilishdan saqladingiz!",
    warlockKilled: "⚡️ <b>{name}</b> — dushman, o'ldirdingiz!",
    labHealed: "👨‍🔬 <b>{name}</b> — mafiya tarafida, davoladingiz!",
    labKilled: "👨‍🔬 <b>{name}</b> — mafiya emas, o'ldirdingiz!",
    sergeantInfo: "👮🏻‍♂ Komissar tirik va faol.",
    sergeantPromoted: "👮🏻‍♂ Komissar vafot etdi! Endi siz <b>Komissar</b>siz!",
    donPromote: "🤵🏻 Don vafot etdi! Endi siz yangi <b>Don</b>siz!",
    traitorResult_mafia: "🦎 <b>{name}</b> mafiya tarafida! Endi siz <b>Mafiya</b>siz!",
    traitorResult_town: "🦎 <b>{name}</b> tinch axoli! Endi siz <b>Serjant</b>siz!",
    traitorResult_solo: "🦎 <b>{name}</b> yakka rol! Endi siz <b>Qotil</b>siz!",
    skip: "🚫 O'tkazish",
  },

  errors: {
    notAdmin: "⚠️ Bu buyruq faqat adminlar uchun!",
    notInGame: "⚠️ Siz o'yinda emassiz!",
    notYourTurn: "⚠️ Hozir sizning navbatingiz emas!",
    playerDead: "⚠️ Siz allaqachon o'lik ekansiz!",
    invalidTarget: "⚠️ Noto'g'ri nishon!",
    onlyInGroup: "⚠️ Bu buyruq faqat guruhda ishlaydi!",
    onlyInPrivate: "⚠️ Bu buyruq faqat shaxsiy chatda ishlaydi!",
    cantTargetSelf: "⚠️ O'zingizni tanlash mumkin emas!",
    cantTargetMafia: "⚠️ Mafiya a'zosini tanlash mumkin emas!",
  },

  stats: {
    header: "📊 <b>{name}</b> statistikasi:",
    gamesPlayed: "🎮 O'yinlar: <b>{count}</b>",
    wins: "🏆 Yutganlar: <b>{count}</b>",
    losses: "💀 Yutqazganlar: <b>{count}</b>",
    rating: "⭐️ Reyting: <b>{rating}</b> ({rank})",
    killCount: "🔪 O'ldirganlar: <b>{count}</b>",
    savedCount: "💊 Saqlab qolganlar: <b>{count}</b>",
    noStats: "📊 Hali statistika yo'q. O'yin o'ynang!",
  },

  top: {
    header: "🏆 <b>Top o'yinchilar:</b>\n",
    row: "{pos}. {emoji} <b>{name}</b> — {rating} ⭐️ ({wins}W/{games}G)",
    empty: "Hali hech kim o'ynamagan!",
  },

  buttons: {
    join: "✅ Qo'shilish",
    leave: "❌ Chiqish",
    noVote: "🚫 Hech kimga",
    skip: "🚫 O'tkazish",
  },

  settings: {
    title: "⚙️ <b>O'yin sozlamalari</b>",
    registrationTimeout: "⏱ Ro'yxatdan o'tish: <b>{value}s</b>",
    nightTimeout: "🌙 Tun vaqti: <b>{value}s</b>",
    dayDiscussionTimeout: "☀️ Kun muhokama: <b>{value}s</b>",
    votingTimeout: "🗳 Ovoz berish: <b>{value}s</b>",
    minPlayers: "👥 Min o'yinchilar: <b>{value}</b>",
    maxPlayers: "👥 Max o'yinchilar: <b>{value}</b>",
    muteOnNight: "🔇 Tunda mute: <b>{value}</b>",
    updated: "✅ Sozlama yangilandi!",
    back: "🔙 Orqaga",
    btn: {
      registrationTimeout: "⏱ Ro'yxatdan o'tish",
      nightTimeout: "🌙 Tun",
      dayDiscussionTimeout: "☀️ Kun muhokama",
      votingTimeout: "🗳 Ovoz berish",
      minPlayers: "👥 Min o'yinchilar",
      maxPlayers: "👥 Max o'yinchilar",
      muteOnNight: "🔇 Tunda mute",
    },
  },

  ranks: [
    "Yangi fuqaro",
    "Oddiy fuqaro",
    "Tajribali fuqaro",
    "Katta aka",
    "Avtoritet",
    "Don",
    "Krestnyy otets",
  ],
};

export type Locale = typeof uz;
