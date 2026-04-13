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
  // Alohida action uchun: SHERIFF_CHECK va SHERIFF_SHOOT
  nightStory: {
    SHERIFF: "🕵🏻‍♂ Komissar yozuvlarni qidirishga ketdi...",            // tekshirish
    SHERIFF_SHOOT: "🕵🏻‍♂ Komissar katta pistoletini o'qladi...",         // otish
    DON: "🤵🏻 Don qurolini oldi va ko'chaga chiqdi...",
    MAFIA: "🤵🏼 Mafiya qora plashlarida tunni kezmoqda...",
    DOCTOR: "👨🏼‍⚕️ Shifokor qutqaruv to'plamini olib chiqdi...",
    TRAMP: "🧙🏼‍♂️ Daydi qo'shnilarning uyiga bosh urish uchun ketdi...",
    HOOKER: "💃 Kezuvchining bu tun qandaydir mehmoni bor...",
    WARLOCK: "⚡️ Koldun qora kitobini ochib sehr o'qimoqda...",
    SPY: "🦇 Ayg'oqchi tomlardan sakrab soyalar orasida g'oyib bo'ldi...",
    LAWYER: "👨🏼‍💼 Advokat qog'ozlarini to'plab yo'lga chiqdi...",
    LAB: "👨‍🔬 Labarant probirkalari bilan biror narsa aralashtirmoqda...",
    KILLER: "🔪 Qorong'ulikda kimdir pichog'ini charxlayapti...",
    SNIPER: "👨🏻‍🎤 Snayperchi tomga chiqdi va mo'ljalga tushdi...",
    ARCHER: "🏹 Qorong'ulikda kamon ipining tovushi eshitildi...",
    MINER: "☠️ Kimdir eshik oldida bir paket ortib qo'yyapti...",
    SERGEANT: "👮🏻‍♂ Serjant Komissar bilan radio orqali bog'landi...",
    KAMIKAZE: "",
    CIVILIAN: "",
    SANTA: "🎅🏻 Qorbobo sovg'a xaltasini ko'tarib yo'lga chiqdi...",
    SNOWBOY: "⛄️ Qorbola katta qor to'plarini tayyorlayapti...",
    TRAITOR: "🦎 Sotqin kimnidir poylab, jamoasini o'zgartirmoqchi...",
    ROBBER: "👺 Qaroqchi niqob kiyib ko'chaga chiqdi...",
    PROFESSOR: "🎩 Professor sirli qutichalarini tayyorlab yo'lga chiqdi...",
  } as Record<string, string>,

  // O'lim hikoyalari (kim o'ldirdi — guruhda tong natijalarida)
  deathStory: {
    MAFIA_KILL:
      "💀 Tunda <b>{name}</b> vaxshiylarcha o'ldirildi. Aytishlaricha uyiga 🤵🏻 Mafiya kelgan.",
    SHERIFF_KILL:
      "💀 Tunda <b>{name}</b>ga 🕵🏻‍♂ Komissar o'q uzdi. Ehtimol u bekorga o'lmadi...",
    KILLER_KILL:
      "💀 Tunda <b>{name}</b> qorong'u ko'chada 🔪 noma'lum qotil tomonidan pichoqlab o'ldirildi.",
    SNIPER_KILL:
      "💀 Tunda <b>{name}</b> uzoqdan 👨🏻‍🎤 snayper o'qi bilan urildi. Hech qanday himoya uni saqlay olmadi.",
    ARCHER_KILL:
      "💀 Tunda <b>{name}</b>ning ko'kragida 🏹 kamon o'qi topildi. Kim otganini hech kim ko'rmagan.",
    MINER_KILL:
      "💀 Ertalab <b>{name}</b>ning eshigi oldida ☠️ kuchli portlash sodir bo'ldi. Undan hech narsa qolmadi.",
    SNOWBOY_KILL:
      "💀 Tunda <b>{name}</b> ⛄️ dahshatli qor bo'ronida nobud bo'ldi.",
    LAB_KILL:
      "💀 Tunda <b>{name}</b> 👨‍🔬 sirli kimyoviy moddadan zaharlanib vafot etdi.",
    WARLOCK_KILL:
      "💀 Tunda <b>{name}</b>ga ⚡️ Koldunning qorong'u qarg'ishi tushdi.",
    KAMIKAZE_KILL:
      "💣 <b>{name}</b> osilgan Kamikaze portlashi natijasida halok bo'ldi.",
    ROBBER_KILL:
      "💀 Tunda <b>{name}</b> 👺 Qaroqchining hujumida pul uchun o'ldirildi.",
    PROFESSOR_KILL:
      "💀 Tunda <b>{name}</b> 🎩 Professorning sirli qutisidan ⚰️ o'lim chiqargan.",
    VOTED_OUT:
      "⚖️ Aholi qaroriga ko'ra <b>{name}</b> maydonda osildi.",
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
    // ===== PROMPTLAR (rolga PM) =====
    hookerPrompt: "💃 <b>Kimni bloklaysiz?</b>\n\n⚠️ Komissarni uxlatish taqiqlanadi!",
    traitorPrompt: "🦎 <b>Kimni tanlaysiz?</b>\n\nUning jamoasiga qarab rolingiz o'zgaradi.",
    lawyerPrompt: "👨🏼‍💼 <b>Qaysi mafiya a'zosini himoyaga olasiz?</b>\n\nKomissar uni tekshirsa — tinch axoli deb ko'radi.",
    spyPrompt: "🦇 <b>Kimning rolini aniqlaysiz?</b>\n\nNatijani faqat siz bilasiz.",
    mafiaPrompt: "🤵🏼 <b>Mafiya jamoasi:</b>\n{members}\n\n<b>Kimni o'ldiramiz?</b>",
    labPrompt: "👨‍🔬 <b>Kimni tanlaysiz?</b>\n\nAgar u mafiya bo'lsa — davolaysiz.\nAgar mafiya bo'lmasa — zaharlab o'ldirasiz.",
    sheriffPrompt: "🕵🏻‍♂ <b>Kimni tekshirasiz?</b>\n\nTekshirish yoki otish tanlovi keyingi bosqichda.",
    sergeantPrompt: "👮🏻‍♂ <b>Serjant</b>siz. Komissar haqida ma'lumot olyapsiz...",
    doctorPrompt: "👨🏼‍⚕️ <b>Kimni davolaysiz?</b>\n\n⚠️ O'zingizni butun o'yinda faqat 1 marta davolashingiz mumkin!",
    warlockPrompt: "⚡️ <b>Kimni tanlaysiz?</b>\n\nAgar tinch axoli bo'lsa — himoya qilasiz.\nAgar boshqa taraf bo'lsa — qarg'ish bilan o'ldirasiz.",
    trampPrompt: "🧙🏼‍♂️ <b>Kimning uyiga borasiz?</b>\n\nSiz u uyga kelganlarni ko'rasiz.",
    killerPrompt: "🔪 <b>Kimni o'ldirasiz?</b>\n\nYakka rol siz — hammasini tugatishingiz kerak.",
    sniperPrompt: "👨🏻‍🎤 <b>Kimni otib tushirasiz?</b>\n\n⚠️ Snayper o'qi himoyani ham yorib o'tadi!",
    archerPrompt: "🏹 <b>Kimni ovlaysiz?</b>\n\nSizning hujumingizni hech kim sezmaydi.",
    minerPrompt: "☠️ <b>Kimning eshigiga mina qo'yasiz?</b>\n\nO'sha uyga kelganlar ham portlashdan nobud bo'ladi.",
    snowboyPrompt: "⛄️ <b>Kimni qorbo'ron qilasiz?</b>",
    santaPrompt: "🎅🏻 <b>Kimga sovg'a berasiz?</b>",
    robberPrompt: "👺 <b>Kimning uyiga bostirib kirasiz?</b>\n\nUndan pul talab qilasiz — pul bermasa o'ldirasiz.",
    robberTargetPrompt: "⚠️ <b>Uyingizga Qaroqchi bostirib kirdi!</b>\n\nPul berasizmi yoki jon shirinmi?",
    robberTargetPaid: "💰 <b>1000 pul to'ladingiz</b> — tirik qoldingiz.\nErtalab butun qishloq bilasan.",
    robberTargetRefused: "🏃 <b>Bosh tortdingiz.</b>\n\nNatijasi tong otganda ma'lum bo'ladi...",
    robberWaiting: "👺 <b>{name}</b>ning uyiga bostirib kirdingiz.\nJavobini kutmoqdasiz...",
    professorPrompt: "🎩 <b>Kimga 3 ta sirli quti taklif qilasiz?</b>\n\nNishoningiz o'z taqdirini o'zi hal qiladi.",
    professorBoxesPrompt: "🎩 <b>Professor sizga 3 ta sirli quti taklif qildi!</b>\n\nBirini tanlang — taqdiringiz shunda hal bo'ladi:\n⚰️ O'lim\n🥡 Bo'sh\n🥷 Geroy",
    professorResult_death: "⚰️ <b>Qutidan O'LIM chiqdi!</b>\n\nSiz tongda topilmaysiz...",
    professorResult_empty: "🥡 <b>Quti bo'sh chiqdi!</b>\n\nOmadingiz bor ekan.",
    professorResult_hero: "🥷 <b>Qutidan Geroy kuchi chiqdi!</b>\n\nBu sizga keyingi tunda yordam beradi.",

    // ===== NATIJALAR (PMda javob) =====
    sheriffResult_town: "🔍 <b>Tekshiruv natijasi:</b>\n✅ <b>{name}</b> — tinch axoli",
    sheriffResult_mafia: "🔍 <b>Tekshiruv natijasi:</b>\n🔴 <b>{name}</b> — MAFIYA!",
    sheriffShoot_hit: "🔫 <b>{name}</b>ga o'q uzdingiz — o'q tekkan!",
    spyResult: "🦇 <b>{name}</b>ning roli: {role}",
    trampResult: "🧙🏼‍♂️ <b>{name}</b> uyiga kelganlar:\n{visitors}",
    trampNoVisitors: "🧙🏼‍♂️ <b>{name}</b> uyiga hech kim kelmadi — tinch tun edi.",
    trampWitness: "🔴 <b>Diqqat!</b> <b>{name}</b> uyida qotillik sodir bo'ldi!",
    warlockSaved: "⚡️ <b>{name}</b> tinch axoli edi.\nUni osilishdan sehr bilan saqladingiz.",
    warlockKilled: "⚡️ <b>{name}</b> dushman edi.\nQorong'u qarg'ish bilan uni o'ldirdingiz!",
    labHealed: "👨‍🔬 <b>{name}</b> mafiya tarafida edi.\nDavoladingiz.",
    labKilled: "👨‍🔬 <b>{name}</b> mafiya emas edi.\nZaharladingiz!",
    sergeantInfo: "👮🏻‍♂ Komissar tirik va faol. Uning harakatlari haqida ma'lumotingiz bor.",
    sergeantPromoted: "👮🏻‍♂ <b>Komissar vafot etdi!</b>\n\nEndi siz yangi <b>Komissar</b>siz. Shaharni himoya qiling!",
    donPromote: "🤵🏻 <b>Don vafot etdi!</b>\n\nEndi siz yangi <b>Don</b>siz. Mafiyani boshqaring!",
    traitorResult_mafia: "🦎 <b>{name}</b> mafiya tarafida edi.\nEndi siz <b>Mafiya</b>siz!",
    traitorResult_town: "🦎 <b>{name}</b> tinch axoli edi.\nEndi siz <b>Serjant</b>siz!",
    traitorResult_solo: "🦎 <b>{name}</b> yakka rol edi.\nEndi siz <b>Qotil</b>siz!",
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
