// Flat matn default'lari — admin DB orqali o'zgartira oladi
// Kalit formati: "category.key" — uz.ts ichidan yassilangan

export const TEXT_DEFAULTS: Record<string, string> = {
  // ===== START =====
  "start.welcome":
    "🎭 <b>Mafia O'yini Botiga xush kelibsiz!</b>\n\n" +
    "Guruhga qo'shing va /startgame buyrug'i bilan o'yinni boshlang!\n\n" +
    "📖 /help — Yordam\n" +
    "📊 /stats — Statistika",
  "start.botStartedInGroup": "✅ Bot tayyor! /startgame bilan o'yinni boshlang.",

  // ===== HELP =====
  "help.text":
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

  // ===== GAME =====
  "game.started":
    "🎭 <b>Mafia o'yini boshlanmoqda!</b>\n\n" +
    "Qo'shilish uchun tugmani bosing.\n" +
    "⏱ Vaqt: <b>{time} soniya</b>",
  "game.playerJoined": "✅ <b>{name}</b> qo'shildi! ({count}/{max})",
  "game.playerLeft": "❌ <b>{name}</b> chiqdi! ({count}/{max})",
  "game.playerList": "\n👥 <b>O'yinchilar ({count}):</b>\n{list}",
  "game.notEnoughPlayers": "❌ Yetarli o'yinchi yo'q! (min: {min})",
  "game.alreadyInGame": "⚠️ Siz allaqachon o'yindasiz!",
  "game.gameInProgress": "⚠️ Bu guruhda o'yin davom etmoqda!",
  "game.noActiveGame": "⚠️ Hozir aktiv o'yin yo'q!",
  "game.gameStarting": "🎭 O'yin boshlanmoqda! Rollar tarqatilmoqda...",
  "game.gameStopped": "🛑 O'yin to'xtatildi!",
  "game.startBotFirst": "⚠️ Avval botga shaxsiy xabar yuboring: @{botUsername}",
  "game.extended": "⏱ Vaqt 30 soniyaga uzaytirildi!",
  "game.gameFinished": "🏁 <b>O'yin tugadi!</b>",
  "game.nightStarts": "🌙 <b>Shahar uxlaydi... Kecha #{round}</b>",
  "game.nightNoAction": "Siz hech narsa qilmadingiz.",
  "game.nightTimeout": "⏰ Vaqt tugadi! Harakat o'tkazib yuborildi.",
  "game.dayStarts": "Xayrli tong 🙂\n\n📻 <b>Kun:</b> {round}\nShamollar tundagi mish-mishlarni butun shaharga yetkazmoqda..",
  "game.noOneDied": "✨ Bugun kechasi hech kim o'lmadi!",
  "game.playerDied": "💀 <b>{name}</b>{roleInline} o'lik topildi!",
  "game.playerDiedRole": "💀 <b>{name}</b> o'lik topildi! Roli: {emoji} <b>{role}</b>",
  "game.discussion": "Endi kechaning natijalarini muhokama qilish, sabablari va oqibatlarini tushunish vaqti keldi ...",
  "game.votingStarts": "🗳 <b>Ovoz berish vaqti!</b>\nKimni chiqaramiz?",
  "game.votingAnnounce": "<b>Aybdorlarni aniqlash va jazolash vaqti keldi.</b>\nOvoz berish uchun <b>{seconds} sekund</b>\n<b>Ovoz berish</b>",
  "game.votingButton": "Ovoz berish",
  "game.votedOut": "👋 <b>{name}</b>{roleInline} chiqarildi!",
  "game.votedOutRole": "👋 <b>{name}</b> chiqarildi! Roli: {emoji} <b>{role}</b>",
  "game.noOneVotedOut": "🤷 Ovozlar teng — hech kim chiqarilmadi!",
  "game.alreadyVoted": "Siz allaqachon ovoz berdingiz!",
  "game.kamikazeActivated": "💣 <b>{name}</b> Kamikaze edi! <b>{target}</b>ni o'zi bilan olib ketdi!",
  "game.townWins": "🏆 <b>Shahar yutdi!</b> Barcha mafiya va yakka rollar yo'q qilindi!",
  "game.mafiaWins": "🏆 <b>Mafiya yutdi!</b> Shahar qo'lga olindi!",
  "game.soloWins": "🏆 <b>{role} yutdi!</b> Yolg'iz qoldi!",
  "game.finalRoles": "\n📋 <b>Rollar:</b>\n{list}",

  // ===== NIGHT STORY =====
  "nightStory.SHERIFF": "🕵🏻‍♂ Komissar yozuvlarni qidirishga ketdi...",
  "nightStory.SHERIFF_SHOOT": "🕵🏻‍♂ Komissar katta pistoletini o'qladi...",
  "nightStory.DON": "🤵🏻 Don qurolini oldi va ko'chaga chiqdi...",
  "nightStory.MAFIA": "🤵🏼 Mafiya qora plashlarida tunni kezmoqda...",
  "nightStory.DOCTOR": "👨🏼‍⚕️ Shifokor qutqaruv to'plamini olib chiqdi...",
  "nightStory.TRAMP": "🧙🏼‍♂️ Daydi qo'shnilarning uyiga bosh urish uchun ketdi...",
  "nightStory.HOOKER": "💃 Kezuvchining bu tun qandaydir mehmoni bor...",
  "nightStory.WARLOCK": "⚡️ Koldun qora kitobini ochib sehr o'qimoqda...",
  "nightStory.SPY": "🦇 Ayg'oqchi tomlardan sakrab soyalar orasida g'oyib bo'ldi...",
  "nightStory.LAWYER": "👨🏼‍💼 Advokat qog'ozlarini to'plab yo'lga chiqdi...",
  "nightStory.LAB": "👨‍🔬 Labarant probirkalari bilan biror narsa aralashtirmoqda...",
  "nightStory.KILLER": "🔪 Qorong'ulikda kimdir pichog'ini charxlayapti...",
  "nightStory.SNIPER": "👨🏻‍🎤 Snayperchi tomga chiqdi va mo'ljalga tushdi...",
  "nightStory.ARCHER": "🏹 Qorong'ulikda kamon ipining tovushi eshitildi...",
  "nightStory.MINER": "☠️ Kimdir eshik oldida bir paket ortib qo'yyapti...",
  "nightStory.SERGEANT": "👮🏻‍♂ Serjant Komissar bilan radio orqali bog'landi...",
  "nightStory.KAMIKAZE": "",
  "nightStory.CIVILIAN": "",
  "nightStory.SANTA": "🎅🏻 Qorbobo sovg'a xaltasini ko'tarib yo'lga chiqdi...",
  "nightStory.SNOWBOY": "⛄️ Qorbola katta qor to'plarini tayyorlayapti...",
  "nightStory.TRAITOR": "🦎 Sotqin kimnidir poylab, jamoasini o'zgartirmoqchi...",
  "nightStory.ROBBER": "👺 Qaroqchi niqob kiyib ko'chaga chiqdi...",
  "nightStory.PROFESSOR": "🎩 Professor sirli qutichalarini tayyorlab yo'lga chiqdi...",

  // ===== DEATH STORY =====
  "deathStory.MAFIA_KILL":
    "💀 Tunda <b>{name}</b>{roleInline} vaxshiylarcha o'ldirildi. Aytishlaricha uyiga 🤵🏻 Mafiya kelgan.",
  "deathStory.SHERIFF_KILL":
    "💀 Tunda <b>{name}</b>{roleInline}ga 🕵🏻‍♂ Komissar o'q uzdi. Ehtimol u bekorga o'lmadi...",
  "deathStory.KILLER_KILL":
    "💀 Tunda <b>{name}</b>{roleInline} qorong'u ko'chada 🔪 noma'lum qotil tomonidan pichoqlab o'ldirildi.",
  "deathStory.SNIPER_KILL":
    "💀 Tunda <b>{name}</b>{roleInline} uzoqdan 👨🏻‍🎤 snayper o'qi bilan urildi. Hech qanday himoya uni saqlay olmadi.",
  "deathStory.ARCHER_KILL":
    "💀 Tunda <b>{name}</b>{roleInline}ning ko'kragida 🏹 kamon o'qi topildi. Kim otganini hech kim ko'rmagan.",
  "deathStory.MINER_KILL":
    "💀 Ertalab <b>{name}</b>{roleInline}ning eshigi oldida ☠️ kuchli portlash sodir bo'ldi. Undan hech narsa qolmadi.",
  "deathStory.SNOWBOY_KILL":
    "💀 Tunda <b>{name}</b>{roleInline} ⛄️ dahshatli qor bo'ronida nobud bo'ldi.",
  "deathStory.LAB_KILL":
    "💀 Tunda <b>{name}</b>{roleInline} 👨‍🔬 sirli kimyoviy moddadan zaharlanib vafot etdi.",
  "deathStory.WARLOCK_KILL":
    "💀 Tunda <b>{name}</b>{roleInline}ga ⚡️ Koldunning qorong'u qarg'ishi tushdi.",
  "deathStory.KAMIKAZE_KILL":
    "💣 <b>{name}</b>{roleInline} osilgan Kamikaze portlashi natijasida halok bo'ldi.",
  "deathStory.ROBBER_KILL":
    "💀 Tunda <b>{name}</b>{roleInline} 👺 Qaroqchining hujumida pul uchun o'ldirildi.",
  "deathStory.PROFESSOR_KILL":
    "💀 Tunda <b>{name}</b>{roleInline} 🎩 Professorning sirli qutisidan ⚰️ o'lim chiqargan.",
  "deathStory.VOTED_OUT":
    "⚖️ Aholi qaroriga ko'ra <b>{name}</b>{roleInline} maydonda osildi.",
  "deathStory.INACTIVE":
    "💤 <b>{name}</b>{roleInline} shahar ishlariga 2 kun mobaynida befarq bo'ldi va g'oyib bo'ldi...",

  // ===== ROLES =====
  "roles.CIVILIAN": "👨🏼 Tinch axoli",
  "roles.DOCTOR": "👨🏼‍⚕️ Shifokor",
  "roles.TRAMP": "🧙🏼‍♂️ Daydi",
  "roles.SHERIFF": "🕵🏻‍♂ Komissar",
  "roles.KAMIKAZE": "💣 Kamikaze",
  "roles.HOOKER": "💃 Kezuvchi",
  "roles.SERGEANT": "👮🏻‍♂ Serjant",
  "roles.WARLOCK": "⚡️ Koldun",
  "roles.SANTA": "🎅🏻 Qorbobo",
  "roles.SNOWBOY": "⛄️ Qorbola",
  "roles.DON": "🤵🏻 Don",
  "roles.MAFIA": "🤵🏼 Mafiya",
  "roles.LAWYER": "👨🏼‍💼 Advokat",
  "roles.SPY": "🦇 Ayg'oqchi",
  "roles.LAB": "👨‍🔬 Labarant",
  "roles.KILLER": "🔪 Qotil",
  "roles.MINER": "☠️ Minior",
  "roles.SNIPER": "👨🏻‍🎤 Snayperchi",
  "roles.ARCHER": "🏹 Kamonchi",
  "roles.TRAITOR": "🦎 Sotqin",
  "roles.ROBBER": "👺 Qaroqchi",
  "roles.PROFESSOR": "🎩 Professor",

  // ===== ROLE ASSIGNED =====
  "roleAssigned.CIVILIAN":
    "👨🏼 Siz <b>Tinch axoli</b>siz!\n" +
    "Vazifangiz: mafiyalarni va yakka rollarni kun davomida osishda faol ishtirok eting.",
  "roleAssigned.DOCTOR":
    "👨🏼‍⚕️ Siz <b>Shifokor</b>siz!\n" +
    "Tunda tanlagan odamingizni otishgan bo'lsa o'limdan qutqarasiz.\n" +
    "⚠️ O'zingizni faqat 1 marta davolay olasiz!",
  "roleAssigned.TRAMP":
    "🧙🏼‍♂️ Siz <b>Daydi</b>siz!\n" +
    "Tunda tanlagan odamingizning uyiga borasiz va kimlar kelganini ko'rasiz.\n" +
    "Qotillikka guvoh bo'lasiz!",
  "roleAssigned.SHERIFF":
    "🕵🏻‍♂ Siz <b>Komissar</b>siz!\n" +
    "Shaharning asosiy himoyachisi. Mafiyani toping!\n" +
    "⚠️ Birinchi tundan tekshirmasdan o'tish taqiqlanadi!",
  "roleAssigned.KAMIKAZE":
    "💣 Siz <b>Kamikaze</b>siz!\n" +
    "Tun va kunda tinch axolisiz, ammo osishganda xohlagan o'yinchini o'zingiz bilan qabrga olib ketishingiz mumkin!",
  "roleAssigned.HOOKER":
    "💃 Siz <b>Kezuvchi</b>siz!\n" +
    "Tunda bir kishini zararsizlantiring (bloklang).\n" +
    "⚠️ Komissarni uxlatish taqiqlanadi!",
  "roleAssigned.SERGEANT":
    "👮🏻‍♂ Siz <b>Serjant</b>siz!\n" +
    "Komissarga yordam bering. Voqealar haqida xabar olasiz.\n" +
    "⚠️ Komissar o'lsa — uning o'rnini egallaysiz!",
  "roleAssigned.WARLOCK":
    "⚡️ Siz <b>Koldun</b>siz!\n" +
    "Tunda tanlagan odam tinch axoli bo'lsa — tongda osilishdan saqlaysiz.\n" +
    "Boshqa taraf bo'lsa — o'ldirasiz!",
  "roleAssigned.SANTA":
    "🎅🏻 Siz <b>Qorbobo</b>siz!\n" +
    "Tunda istagan ishtirokchiga sovg'a ulashishingiz mumkin.",
  "roleAssigned.SNOWBOY":
    "⛄️ Siz <b>Qorbola</b>siz!\n" +
    "Tunda istagan ishtirokchini qorbo'ron qilib nobud qilishingiz mumkin!",
  "roleAssigned.DON":
    "🤵🏻 Siz <b>Don</b>siz!\n" +
    "Mafialar sardori! Tunda ovozingiz ko'proq ahamiyatga ega.\n" +
    "O'ldirish uchun ko'chaga chiqasiz!",
  "roleAssigned.MAFIA":
    "🤵🏼 Siz <b>Mafiya</b>siz!\n" +
    "Donga bo'ysunasiz va qarshilik qilganlarni o'ldirasiz.\n" +
    "Don o'lsa — yangi Don bo'lishingiz mumkin!",
  "roleAssigned.LAWYER":
    "👨🏼‍💼 Siz <b>Advokat</b>siz!\n" +
    "Tanlagan mafiyangizni Komissar taniy olmaydi — unga tinch axoli bo'lib ko'rinadi.",
  "roleAssigned.SPY":
    "🦇 Siz <b>Ayg'oqchi</b>siz!\n" +
    "Tunda xohlagan bitta o'yinchining rolini bilishingiz va mafialar uchun oshkor qilishingiz mumkin.",
  "roleAssigned.LAB":
    "👨‍🔬 Siz <b>Labarant</b>siz!\n" +
    "Tanlagan odamingiz mafiya tarafida bo'lsa — davolaysiz.\n" +
    "Mafiya bo'lmasa — o'ldirasiz!",
  "roleAssigned.KILLER":
    "🔪 Siz <b>Qotil</b>siz!\n" +
    "Shahardagi hamma o'lishi kerak, qotildan tashqari!\n" +
    "Yakka rolsiz — yolg'iz o'ynaysiz.",
  "roleAssigned.MINER":
    "☠️ Siz <b>Minior</b>siz!\n" +
    "Tunda tanlagan odamingizning eshigi oldiga mina qo'yasiz.\n" +
    "O'sha uyga kelgan sizdan boshqa hamma o'ladi!",
  "roleAssigned.SNIPER":
    "👨🏻‍🎤 Siz <b>Snayperchi</b>siz!\n" +
    "Tanlagan odamingizda himoya bo'lsa ham o'ladi!\n" +
    "Daydi sizi ko'ra olmaydi. Eng kuchli rollardan biri!",
  "roleAssigned.ARCHER":
    "🏹 Siz <b>Kamonchi</b>siz!\n" +
    "Maxfiy qotil — Daydi sizning harakatingizni sezmaydi!",
  "roleAssigned.TRAITOR":
    "🦎 Siz <b>Sotqin</b>siz!\n" +
    "Tunda tanlagan odamingiz mafiyadan bo'lsa — mafiyaga aylanasiz.\n" +
    "Tinch axolidan bo'lsa — serjant bo'lasiz.\n" +
    "Yakka tarafdan bo'lsa — qotilga aylanasiz!",
  "roleAssigned.ROBBER":
    "👺 Siz <b>Qaroqchi</b>siz!\n" +
    "Tunda birovning uyiga borib pul undirasiz.\n" +
    "Agar bosh tortsa — o'ldirasiz!",
  "roleAssigned.PROFESSOR":
    "🎩 Siz <b>Professor</b>siz!\n" +
    "Tunda tanlagan ishtirokchiga 3 ta sirli quti taklif qilasiz:\n" +
    "⚰️ O'lim, 🥡 Bo'sh quti, 🥷 Geroy — u o'z taqdirini o'zi hal qiladi!",

  // ===== NIGHT (prompts + results) =====
  "night.hookerPrompt": "💃 <b>Kimni bloklaysiz?</b>\n\n⚠️ Komissarni uxlatish taqiqlanadi!",
  "night.traitorPrompt": "🦎 <b>Kimni tanlaysiz?</b>\n\nUning jamoasiga qarab rolingiz o'zgaradi.",
  "night.lawyerPrompt": "👨🏼‍💼 <b>Qaysi mafiya a'zosini himoyaga olasiz?</b>\n\nKomissar uni tekshirsa — tinch axoli deb ko'radi.",
  "night.spyPrompt": "🦇 <b>Kimning rolini aniqlaysiz?</b>\n\nNatijani faqat siz bilasiz.",
  "night.mafiaPrompt": "🤵🏼 <b>Mafiya jamoasi:</b>\n{members}\n\n<b>Kimni o'ldiramiz?</b>",
  "night.labPrompt": "👨‍🔬 <b>Kimni tanlaysiz?</b>\n\nAgar u mafiya bo'lsa — davolaysiz.\nAgar mafiya bo'lmasa — zaharlab o'ldirasiz.",
  "night.sheriffPrompt": "🕵🏻‍♂ <b>Kimni tekshirasiz?</b>\n\nTekshirish yoki otish tanlovi keyingi bosqichda.",
  "night.sergeantPrompt": "👮🏻‍♂ <b>Serjant</b>siz. Komissar haqida ma'lumot olyapsiz...",
  "night.doctorPrompt": "👨🏼‍⚕️ <b>Kimni davolaysiz?</b>\n\n⚠️ O'zingizni butun o'yinda faqat 1 marta davolashingiz mumkin!",
  "night.warlockPrompt": "⚡️ <b>Kimni tanlaysiz?</b>\n\nAgar tinch axoli bo'lsa — himoya qilasiz.\nAgar boshqa taraf bo'lsa — qarg'ish bilan o'ldirasiz.",
  "night.trampPrompt": "🧙🏼‍♂️ <b>Kimning uyiga borasiz?</b>\n\nSiz u uyga kelganlarni ko'rasiz.",
  "night.killerPrompt": "🔪 <b>Kimni o'ldirasiz?</b>\n\nYakka rol siz — hammasini tugatishingiz kerak.",
  "night.sniperPrompt": "👨🏻‍🎤 <b>Kimni otib tushirasiz?</b>\n\n⚠️ Snayper o'qi himoyani ham yorib o'tadi!",
  "night.archerPrompt": "🏹 <b>Kimni ovlaysiz?</b>\n\nSizning hujumingizni hech kim sezmaydi.",
  "night.minerPrompt": "☠️ <b>Kimning eshigiga mina qo'yasiz?</b>\n\nO'sha uyga kelganlar ham portlashdan nobud bo'ladi.",
  "night.snowboyPrompt": "⛄️ <b>Kimni qorbo'ron qilasiz?</b>",
  "night.santaPrompt": "🎅🏻 <b>Kimga sovg'a berasiz?</b>",
  "night.robberPrompt": "👺 <b>Kimning uyiga bostirib kirasiz?</b>\n\nUndan pul talab qilasiz — pul bermasa o'ldirasiz.",
  "night.robberTargetPrompt": "⚠️ <b>Uyingizga Qaroqchi bostirib kirdi!</b>\n\nPul berasizmi yoki jon shirinmi?",
  "night.robberTargetPaid": "💰 <b>1000 pul to'ladingiz</b> — tirik qoldingiz.\nErtalab butun qishloq bilasan.",
  "night.robberTargetRefused": "🏃 <b>Bosh tortdingiz.</b>\n\nNatijasi tong otganda ma'lum bo'ladi...",
  "night.robberWaiting": "👺 <b>{name}</b>ning uyiga bostirib kirdingiz.\nJavobini kutmoqdasiz...",
  "night.professorPrompt": "🎩 <b>Kimga 3 ta sirli quti taklif qilasiz?</b>\n\nNishoningiz o'z taqdirini o'zi hal qiladi.",
  "night.professorBoxesPrompt": "🎩 <b>Professor sizga 3 ta sirli quti taklif qildi!</b>\n\nBirini tanlang — taqdiringiz shunda hal bo'ladi:\n⚰️ O'lim\n🥡 Bo'sh\n🥷 Geroy",
  "night.professorResult_death": "⚰️ <b>Qutidan O'LIM chiqdi!</b>\n\nSiz tongda topilmaysiz...",
  "night.professorResult_empty": "🥡 <b>Quti bo'sh chiqdi!</b>\n\nOmadingiz bor ekan.",
  "night.professorResult_hero": "🥷 <b>Qutidan Geroy kuchi chiqdi!</b>\n\nBu sizga keyingi tunda yordam beradi.",
  "night.sheriffResult_town": "🔍 <b>Tekshiruv natijasi:</b>\n✅ <b>{name}</b> — tinch axoli",
  "night.sheriffResult_mafia": "🔍 <b>Tekshiruv natijasi:</b>\n🔴 <b>{name}</b> — MAFIYA!",
  "night.sheriffShoot_hit": "🔫 <b>{name}</b>ga o'q uzdingiz — o'q tekkan!",
  "night.spyResult": "🦇 <b>{name}</b>ning roli: {role}",
  "night.trampResult": "🧙🏼‍♂️ <b>{name}</b> uyiga kelganlar:\n{visitors}",
  "night.trampNoVisitors": "🧙🏼‍♂️ <b>{name}</b> uyiga hech kim kelmadi — tinch tun edi.",
  "night.trampWitness": "🔴 <b>Diqqat!</b> <b>{name}</b> uyida qotillik sodir bo'ldi!",
  "night.warlockSaved": "⚡️ <b>{name}</b> tinch axoli edi.\nUni osilishdan sehr bilan saqladingiz.",
  "night.warlockKilled": "⚡️ <b>{name}</b> dushman edi.\nQorong'u qarg'ish bilan uni o'ldirdingiz!",
  "night.labHealed": "👨‍🔬 <b>{name}</b> mafiya tarafida edi.\nDavoladingiz.",
  "night.labKilled": "👨‍🔬 <b>{name}</b> mafiya emas edi.\nZaharladingiz!",
  "night.sergeantInfo": "👮🏻‍♂ Komissar tirik va faol. Uning harakatlari haqida ma'lumotingiz bor.",
  "night.sergeantPromoted": "👮🏻‍♂ <b>Komissar vafot etdi!</b>\n\nEndi siz yangi <b>Komissar</b>siz. Shaharni himoya qiling!",
  "night.donPromote": "🤵🏻 <b>Don vafot etdi!</b>\n\nEndi siz yangi <b>Don</b>siz. Mafiyani boshqaring!",
  "night.traitorResult_mafia": "🦎 <b>{name}</b> mafiya tarafida edi.\nEndi siz <b>Mafiya</b>siz!",
  "night.traitorResult_town": "🦎 <b>{name}</b> tinch axoli edi.\nEndi siz <b>Serjant</b>siz!",
  "night.traitorResult_solo": "🦎 <b>{name}</b> yakka rol edi.\nEndi siz <b>Qotil</b>siz!",
  "night.skip": "🚫 O'tkazish",

  // Nishonga xabarlar (kim tashrif buyurganligi haqida)
  "night.sheriffCheckedYou": "🕵🏻‍♂ <b>Komissar sizning rolingizga qiziqdi.</b>",
  "night.trampVisitedYou": "🧙🏼‍♂️ <b>Daydi sizning uyingizga tashrif buyurdi.</b>",
  "night.doctorHealedYou": "👨🏼‍⚕️ <b>Shifokor sizni davolash uchun uyingizga keldi.</b>",
  "night.doctorHealedConfirm": "👨🏼‍⚕️ Siz <b>{name}</b>ni davoladingiz.",

  // ===== ERRORS =====
  "errors.notAdmin": "⚠️ Bu buyruq faqat adminlar uchun!",
  "errors.notInGame": "⚠️ Siz o'yinda emassiz!",
  "errors.notYourTurn": "⚠️ Hozir sizning navbatingiz emas!",
  "errors.playerDead": "⚠️ Siz allaqachon o'lik ekansiz!",
  "errors.invalidTarget": "⚠️ Noto'g'ri nishon!",
  "errors.onlyInGroup": "⚠️ Bu buyruq faqat guruhda ishlaydi!",
  "errors.onlyInPrivate": "⚠️ Bu buyruq faqat shaxsiy chatda ishlaydi!",
  "errors.cantTargetSelf": "⚠️ O'zingizni tanlash mumkin emas!",
  "errors.cantTargetMafia": "⚠️ Mafiya a'zosini tanlash mumkin emas!",

  // ===== STATS =====
  "stats.header": "📊 <b>{name}</b> statistikasi:",
  "stats.gamesPlayed": "🎮 O'yinlar: <b>{count}</b>",
  "stats.wins": "🏆 Yutganlar: <b>{count}</b>",
  "stats.losses": "💀 Yutqazganlar: <b>{count}</b>",
  "stats.rating": "⭐️ Reyting: <b>{rating}</b> ({rank})",
  "stats.killCount": "🔪 O'ldirganlar: <b>{count}</b>",
  "stats.savedCount": "💊 Saqlab qolganlar: <b>{count}</b>",
  "stats.noStats": "📊 Hali statistika yo'q. O'yin o'ynang!",

  // ===== TOP =====
  "top.header": "🏆 <b>Top o'yinchilar:</b>\n",
  "top.row": "{pos}. {emoji} <b>{name}</b> — {rating} ⭐️ ({wins}W/{games}G)",
  "top.empty": "Hali hech kim o'ynamagan!",

  // ===== BUTTONS =====
  "buttons.join": "✅ Qo'shilish",
  "buttons.leave": "❌ Chiqish",
  "buttons.noVote": "🚫 Hech kimga",
  "buttons.skip": "🚫 O'tkazish",

  // ===== SETTINGS =====
  "settings.title": "⚙️ <b>O'yin sozlamalari</b>",
  "settings.registrationTimeout": "⏱ Ro'yxatdan o'tish: <b>{value}s</b>",
  "settings.nightTimeout": "🌙 Tun vaqti: <b>{value}s</b>",
  "settings.dayDiscussionTimeout": "☀️ Kun muhokama: <b>{value}s</b>",
  "settings.votingTimeout": "🗳 Ovoz berish: <b>{value}s</b>",
  "settings.minPlayers": "👥 Min o'yinchilar: <b>{value}</b>",
  "settings.maxPlayers": "👥 Max o'yinchilar: <b>{value}</b>",
  "settings.muteOnNight": "🗑 Tunda xabarlarni o'chirish: <b>{value}</b>",
  "settings.updated": "✅ Sozlama yangilandi!",
  "settings.back": "🔙 Orqaga",
  "settings.btn.registrationTimeout": "⏱ Ro'yxatdan o'tish",
  "settings.btn.nightTimeout": "🌙 Tun",
  "settings.btn.dayDiscussionTimeout": "☀️ Kun muhokama",
  "settings.btn.votingTimeout": "🗳 Ovoz berish",
  "settings.btn.minPlayers": "👥 Min o'yinchilar",
  "settings.btn.maxPlayers": "👥 Max o'yinchilar",
  "settings.btn.muteOnNight": "🗑 Tunda o'chirish",

  // ===== GAME — qo'shimcha (Faza 3) =====
  "game.rolesDistributed": "🎭 <b>Rollar tarqatildi!</b>\n\nO'z rolingizni ko'rish uchun tugmani bosing 👇",
  "game.actionTimeout": "⏰ Vaqt tugadi! Harakatingiz o'tkazib yuborildi.",
  "game.lastWordsPrompt":
    "⏱ <b>Oxirgi so'z vaqti!</b>\n\n" +
    "Sizda <b>{seconds} soniya</b> ichida guruhga oxirgi xabar yuborish imkoniyati bor.\n" +
    "Shunchaki botga matnni yozing — guruhga yetkaziladi.",
  "game.heroDayPrompt":
    "🌅 <b>Tong otdi!</b>\n\n" +
    "🥷 Sizning Geroyingiz tayyor.\n" +
    "Bugun nima qilasiz?",
  "game.voteInconclusive": "Ovoz berish yakunlandi:\nAxoli kelisha olmadi... Kelisha olmaslik oqibatida hech kim osilmadi...",
  "game.warlockProtectedFromHang": "⚡️ <b>{name}</b> sehrli himoya ostida — osib bo'lmadi!",
  "game.hangConfirmPrompt": "⚖️ <b>{name}</b>ni osmoqchimisiz?\n\n👍 Ha — osish\n👎 Yo'q — qo'yib yuborish",
  "game.kamikazePrompt": "💣 Siz osildingiz! Kimni o'zingiz bilan olib ketasiz?",
  "game.hangCancelled": "Axoli kelisha olmadi... <b>{name}</b> osilmadi!",
  "game.voteEndedPrefix": "Ovoz berish yakunlandi:\n",
  "game.mafiaIntro": "🤵🏼 <b>Mafiya jamoasi:</b>\n{members}\n\nTunda birgalikda nishon tanlaysiz!",
  "game.morningRising": "🌅 <b>Tong otmoqda...</b>",
  "game.doctorSaved": "💊 Shifokor bir kishini saqlab qoldi!",
  "game.gameEndHeader": "🎉 <b>O'yin tugadi!</b>\n\n",
  "game.townWinsHeader": "🏆 <b>Shahar yutdi!</b>\n\n",
  "game.mafiaWinsHeader": "🏆 <b>Mafiya yutdi!</b>\n\n",
  "game.soloWinsHeader": "🏆 <b>{role} yutdi!</b>\n\n",
  "game.gameEndDraw": "🏁 <b>O'yin tugadi (durrang)</b>\n\n",
  "game.gameEndWinnersLabel": "🏆 <b>G'oliblar:</b>\n",
  "game.gameEndLosersLabel": "💀 <b>Qolgan o'yinchilar:</b>\n",
  "game.gameEndDuration": "⏱ O'yin: <b>{min}</b> minut davom etdi\n",
  "game.gameEndFooter": "\n🎭 Yangi o'yin boshlash: /startgame",
  "game.personalResultWon": "🎉 <b>Siz YUTDINGIZ!</b>\n\n",
  "game.personalResultLost": "😢 <b>Siz yutqazdingiz</b>\n\n",

  // O'yin roster (rollar tarqatilgandan keyin guruhda)
  "game.playerRoster":
    "Tirik o'yinchilar:\n{playerList}\n\n" +
    "🏘 Tinch aholilar — {townCount}\n{townRoles}\n\n" +
    "🤵🏻 Mafiya — {mafiaCount}\n{mafiaRoles}\n" +
    "{soloBlock}" +
    "\nJami: {total}",
  "game.playerRosterSoloBlock": "\n🔪 Yakka rollar — {soloCount}\n{soloRoles}\n",

  // Tun atmosferasi (Bot-ga o'tish tugmasi bilan)
  "game.nightAtmosphere":
    "🌙 <b>Tun</b>\n\n" +
    "Ko'chaga faqat jasur va qo'rqmas odamlar chiqishdi. " +
    "Ertalab tirik qolganlarni sanaymiz...",
  "game.nightBotButton": "Bot-ga o'tish",

  // /diamond guruhda — random tarqatish
  "game.diamondShareAnnounce":
    "💎 {sender} guruhga <b>{total}</b> olmos tarqatdi!\n\n" +
    "<b>Oluvchilar:</b>\n{list}\n\n" +
    "Komissiya: 1💎",
  "game.diamondShareNoGame": "⚠️ Hozir o'yin yo'q! Avval /startgame qiling.",
  "game.diamondShareNoReceivers": "⚠️ Guruhda faol a'zolar topilmadi. Bir nechta kishi yozishi kerak yoki /startgame bilan o'yin boshlang.",
  "game.diamondShareInsufficient": "❌ Yetarli olmosingiz yo'q! ({cost}💎 kerak)",

  // ===== roleAssigned — qo'shimchalar =====
  "roleAssigned.shieldActive": "\n\n🛡 <b>Shield faol!</b> 1 marta o'limdan saqlaydi (Snayperdan tashqari).",
  "roleAssigned.heroActive": "\n\n🥷 <b>Geroy faol!</b> Sizda maxsus qo'shimcha qobiliyat bor.",

  // ===== START / RULES =====
  "start.rules":
    "🎭 <b>Mafia o'yini qoidalari</b>\n\n" +
    "1. Shahar uxlaydi — kechada maxfiy rollar ishlaydi\n" +
    "2. Shahar uyg'onadi — muhokama va ovoz berish\n" +
    "3. Eng ko'p ovoz olgan chiqariladi\n\n" +
    "<b>Jamoalar:</b>\n" +
    "👨🏼 Tinch axoli — mafiyani toping!\n" +
    "🤵🏼 Mafiya — shaharlikllarni o'ldiring!\n" +
    "🔪 Yakka rollar — hammani yo'q qiling!\n\n" +
    "/help — Barcha buyruqlar",
  "start.gameNotFound": "⚠️ Bu o'yin allaqachon boshlangan yoki mavjud emas!",
  "start.alreadyJoined": "⚠️ Siz allaqachon bu o'yinga qo'shilgansiz!",
  "start.alreadyInOtherGame": "⚠️ Siz allaqachon boshqa guruhda o'yin o'ynayapsiz!",
  "start.cantJoin": "❌ Qo'shila olmadi! O'yin to'lgan bo'lishi mumkin.",
  "start.joinedSuccess":
    "✅ O'yinga muvaffaqiyatli qo'shildingiz!\n\n" +
    "👥 O'yinchilar: <b>{count}/{max}</b>\n" +
    "O'yin boshlanishini kuting...",
  "start.noVotingNow": "⚠️ Hozir ovoz berish vaqti emas!",
  "start.notInThisGame": "⚠️ Siz bu o'yinda emassiz!",
  "start.voteWhoPrompt": "🗳 <b>Kimga ovoz berasiz?</b>",

  // ===== PROFILE / SHOP =====
  "profile.shopTitle": "🏪 <b>Do'kon</b>\nKategoriyani tanlang:",
  "profile.shopBuyTitle": "🛒 Sotib olish — kategoriyani tanlang:",
  "profile.shopShield":
    "🛡 <b>Himoya (Shield)</b>\n\nO'yinda 1 marta o'limdan saqlaydi (Snayperdan tashqari).\n\n{emoji} Narxi: <b>{price}</b>",
  "profile.shopDocument":
    "📜 <b>Hujjat</b>\n\nKomissar tekshiruvini bekor qiladi (1 marta).\n⚠️ Faqat Mafiya va Yakka rollar uchun foydali.\n\n{emoji} Narxi: <b>{price}</b>",
  "profile.shopChest":
    "🗃 <b>Sandiq</b>\n\nRandom mukofot oling.\n\n{emoji} Narxi: <b>{price}</b>",
  "profile.shopVip":
    "⭐️ <b>VIP (1 oy)</b>\n\nSandiqni cheksiz ochish, maxsus badge.\n\n{emoji} Narxi: <b>{price}</b>",
  "profile.shopRole": "🎭 <b>Qaysi rolni sotib olmoqchisiz?</b>\n\nKeyingi o'yinda shu rol tarqatiladi.",
  "profile.chestOpened": "🗃 <b>Sandiq ochildi!</b>\n\nMukofot:\n",
  "profile.heroNone":
    "🥷 <b>Sizda Geroy yo'q</b>\n\nGeroy yarating va o'yinda qo'shimcha kuchga ega bo'ling!\n\n{emoji} Narxi: <b>{price}</b>",
  "profile.heroAttackPrompt": "🥷 <b>Kimga hujum qilasiz?</b>\n\nKuch: <b>{power}</b> | Zaryad: <b>{charges}</b>",
  "profile.heroAttackAnnounceKilled": "🥷 <b>{attackerRole}</b> o'z geroyi orqali <b>{name}</b>ni yakson qildi!",
  "profile.heroAttackAnnounceSurvived":
    "🥷 <b>{attackerRole}</b> o'z geroyi orqali <b>{name}</b>ning <b>{damagePct}%</b> jonini oldi. " +
    "Hozirda uning <b>{remainingPct}%</b> joni bor!",
  "profile.heroAttacked":
    "🥷 <b>Sizga kimdir hujum qildi!</b>\n\n" +
    "💪 Hujum kuchi: <b>{damage}</b>\n" +
    "🛡 Himoya yutdi: <b>{absorbed}</b>\n" +
    "❤️ HP zarar: <b>{hpDamage}</b>\n\n" +
    "❤️ Qolgan HP: <b>{remainingHP}/100</b>\n" +
    "🛡 Qolgan himoya: <b>{remainingProtection}</b>",
  "profile.useTitle":
    "🎁 <b>Keyingi o'yinda nimadan foydalanasiz?</b>\n\n" +
    "🛡 Himoya: {shieldCount} ta\n" +
    "📜 Hujjat: {documentCount} ta\n" +
    "🎭 Aktiv rol: {activeRole}\n" +
    "🥷 Geroy: {hero}",
  "profile.premiumGroupsEmpty": "⭐️ <b>Premium guruhlar</b>\n\nHozircha bo'sh — admin tomonidan qo'shiladi.",
};

// Kategoriya metadata — admin UI uchun
export const TEXT_CATEGORIES: { id: string; label: string; prefix: string }[] = [
  { id: "game", label: "🎮 O'yin xabarlari", prefix: "game." },
  { id: "nightStory", label: "🌙 Tundagi hikoyalar", prefix: "nightStory." },
  { id: "deathStory", label: "💀 O'lim hikoyalari", prefix: "deathStory." },
  { id: "roles", label: "👥 Rol nomlari", prefix: "roles." },
  { id: "roleAssigned", label: "📜 Rol tavsiflari", prefix: "roleAssigned." },
  { id: "night", label: "🔔 Tun promptlari", prefix: "night." },
  { id: "errors", label: "⚠️ Xatolar", prefix: "errors." },
  { id: "stats", label: "📊 Statistika", prefix: "stats." },
  { id: "top", label: "🏆 Reyting", prefix: "top." },
  { id: "buttons", label: "🔘 Tugmalar", prefix: "buttons." },
  { id: "settings", label: "⚙️ Sozlamalar UI", prefix: "settings." },
  { id: "start", label: "🚀 Start/Welcome", prefix: "start." },
  { id: "help", label: "📖 Help/Rules", prefix: "help." },
  { id: "profile", label: "👤 Profil/Do'kon", prefix: "profile." },
];

// Har kalit uchun o'zbekcha tavsif — admin panelda tushunarli ko'rinsin uchun
export const TEXT_LABELS: Record<string, string> = {
  // START
  "start.welcome": "Xush kelibsiz xabari (/start DM)",
  "start.botStartedInGroup": "Guruhda /start bosilganda",
  "start.rules": "/rules buyrug'i matni",
  "start.gameNotFound": "O'yin topilmadi xatosi",
  "start.alreadyJoined": "Allaqachon qo'shilgan",
  "start.alreadyInOtherGame": "Boshqa guruhda o'ynayapti",
  "start.cantJoin": "Qo'shila olmadi (to'lgan)",
  "start.joinedSuccess": "Muvaffaqiyatli qo'shildi",
  "start.noVotingNow": "Ovoz berish vaqti emas",
  "start.notInThisGame": "Bu o'yinda emas",
  "start.voteWhoPrompt": "Kimga ovoz berasiz?",

  // HELP
  "help.text": "/help buyrug'i matni",

  // GAME
  "game.started": "O'yin ro'yxatdan o'tishi boshlandi",
  "game.playerJoined": "O'yinchi qo'shildi",
  "game.playerLeft": "O'yinchi chiqdi",
  "game.playerList": "O'yinchilar ro'yxati",
  "game.notEnoughPlayers": "O'yinchilar yetarli emas",
  "game.alreadyInGame": "Allaqachon o'yinda",
  "game.gameInProgress": "O'yin davom etmoqda",
  "game.noActiveGame": "Aktiv o'yin yo'q",
  "game.gameStarting": "Rollar tarqatilmoqda",
  "game.gameStopped": "O'yin to'xtatildi",
  "game.startBotFirst": "Avval botga DM yozing",
  "game.extended": "Vaqt uzaytirildi",
  "game.gameFinished": "O'yin tugadi (qisqa)",
  "game.nightStarts": "Kecha boshlandi",
  "game.nightNoAction": "Hech narsa qilmadingiz",
  "game.nightTimeout": "Tun vaqti tugadi",
  "game.dayStarts": "Kun boshlandi",
  "game.noOneDied": "Bugun hech kim o'lmadi",
  "game.playerDied": "O'yinchi o'lik topildi",
  "game.playerDiedRole": "O'yinchi o'lik — rol ochiladi",
  "game.discussion": "Muhokama vaqti",
  "game.votingStarts": "Ovoz berish boshlandi (eski)",
  "game.votingAnnounce": "Ovoz berish e'loni (kundagi)",
  "game.votingButton": "Tugma — Ovoz berish",
  "game.votedOut": "Chiqarildi",
  "game.votedOutRole": "Chiqarildi — rol ochiladi",
  "game.noOneVotedOut": "Ovozlar teng — hech kim chiqmadi",
  "game.alreadyVoted": "Allaqachon ovoz bergansiz",
  "game.kamikazeActivated": "Kamikaze faolashtirildi",
  "game.townWins": "Shahar yutdi (qisqa)",
  "game.mafiaWins": "Mafiya yutdi (qisqa)",
  "game.soloWins": "Yakka rol yutdi (qisqa)",
  "game.finalRoles": "Rollar oshkor (yakun)",
  "game.rolesDistributed": "Rollar tarqatildi — tugma",
  "game.actionTimeout": "Harakat vaqti tugadi",
  "game.lastWordsPrompt": "Oxirgi so'z vaqti (o'lganga)",
  "game.heroDayPrompt": "Kunduz geroy egasiga",
  "game.voteInconclusive": "Ovoz natijasiz",
  "game.warlockProtectedFromHang": "Koldun himoyasi — osilmadi",
  "game.hangConfirmPrompt": "Osishni tasdiqlash",
  "game.kamikazePrompt": "Kamikaze — kimni olib keta?",
  "game.hangCancelled": "Osish bekor",
  "game.voteEndedPrefix": "Ovoz berish yakunlandi: (prefix)",
  "game.mafiaIntro": "Mafiya jamoasi tanishuvi",
  "game.morningRising": "Tong otmoqda",
  "game.doctorSaved": "Shifokor saqlab qoldi",
  "game.gameEndHeader": "O'yin tugadi — sarlavha",
  "game.townWinsHeader": "Shahar yutdi — sarlavha",
  "game.mafiaWinsHeader": "Mafiya yutdi — sarlavha",
  "game.soloWinsHeader": "Yakka yutdi — sarlavha",
  "game.gameEndDraw": "Durrang — sarlavha",
  "game.gameEndWinnersLabel": "G'oliblar yorlig'i",
  "game.gameEndLosersLabel": "Yutqazganlar yorlig'i",
  "game.gameEndDuration": "O'yin davomiyligi",
  "game.gameEndFooter": "Yakun — yangi o'yin havolasi",
  "game.personalResultWon": "Shaxsiy natija — yutdi",
  "game.personalResultLost": "Shaxsiy natija — yutqazdi",
  "game.playerRoster": "Roster — tirik o'yinchilar + jamoalar",
  "game.playerRosterSoloBlock": "Roster — yakka rollar bloki",
  "game.nightAtmosphere": "Tun atmosferasi (Bot-ga o'tish)",
  "game.nightBotButton": "Tugma — Bot-ga o'tish",
  "game.diamondShareAnnounce": "Olmos random tarqatish e'loni",
  "game.diamondShareNoGame": "Olmos tarqatish — o'yin yo'q xatosi (ishlatilmaydi)",
  "game.diamondShareNoReceivers": "Olmos tarqatish — faol a'zo topilmadi",
  "game.diamondShareInsufficient": "Olmos tarqatish — yetarli emas",

  // NIGHT STORY (guruhga tun xabarlari)
  "nightStory.SHERIFF": "Tun hikoyasi — Komissar tekshirish",
  "nightStory.SHERIFF_SHOOT": "Tun hikoyasi — Komissar otish",
  "nightStory.DON": "Tun hikoyasi — Don",
  "nightStory.MAFIA": "Tun hikoyasi — Mafiya",
  "nightStory.DOCTOR": "Tun hikoyasi — Shifokor",
  "nightStory.TRAMP": "Tun hikoyasi — Daydi",
  "nightStory.HOOKER": "Tun hikoyasi — Kezuvchi",
  "nightStory.WARLOCK": "Tun hikoyasi — Koldun",
  "nightStory.SPY": "Tun hikoyasi — Ayg'oqchi",
  "nightStory.LAWYER": "Tun hikoyasi — Advokat",
  "nightStory.LAB": "Tun hikoyasi — Labarant",
  "nightStory.KILLER": "Tun hikoyasi — Qotil",
  "nightStory.SNIPER": "Tun hikoyasi — Snayperchi",
  "nightStory.ARCHER": "Tun hikoyasi — Kamonchi",
  "nightStory.MINER": "Tun hikoyasi — Minior",
  "nightStory.SERGEANT": "Tun hikoyasi — Serjant",
  "nightStory.KAMIKAZE": "Tun hikoyasi — Kamikaze (bo'sh)",
  "nightStory.CIVILIAN": "Tun hikoyasi — Tinch axoli (bo'sh)",
  "nightStory.SANTA": "Tun hikoyasi — Qorbobo",
  "nightStory.SNOWBOY": "Tun hikoyasi — Qorbola",
  "nightStory.TRAITOR": "Tun hikoyasi — Sotqin",
  "nightStory.ROBBER": "Tun hikoyasi — Qaroqchi",
  "nightStory.PROFESSOR": "Tun hikoyasi — Professor",

  // DEATH STORY
  "deathStory.MAFIA_KILL": "O'lim — Mafiya o'ldirdi",
  "deathStory.SHERIFF_KILL": "O'lim — Komissar otdi",
  "deathStory.KILLER_KILL": "O'lim — Qotil pichoqladi",
  "deathStory.SNIPER_KILL": "O'lim — Snayper otdi",
  "deathStory.ARCHER_KILL": "O'lim — Kamonchi otdi",
  "deathStory.MINER_KILL": "O'lim — Mina portladi",
  "deathStory.SNOWBOY_KILL": "O'lim — Qorbola bo'roni",
  "deathStory.LAB_KILL": "O'lim — Labarant zahar",
  "deathStory.WARLOCK_KILL": "O'lim — Koldun qarg'ishi",
  "deathStory.KAMIKAZE_KILL": "O'lim — Kamikaze portlashi",
  "deathStory.ROBBER_KILL": "O'lim — Qaroqchi hujumi",
  "deathStory.PROFESSOR_KILL": "O'lim — Professor qutisi",
  "deathStory.VOTED_OUT": "O'lim — Osildi (ovoz)",
  "deathStory.INACTIVE": "O'lim — Harakatsizlik (2 kun)",

  // ROLES (rol nomlari)
  "roles.CIVILIAN": "Rol nomi — Tinch axoli",
  "roles.DOCTOR": "Rol nomi — Shifokor",
  "roles.TRAMP": "Rol nomi — Daydi",
  "roles.SHERIFF": "Rol nomi — Komissar",
  "roles.KAMIKAZE": "Rol nomi — Kamikaze",
  "roles.HOOKER": "Rol nomi — Kezuvchi",
  "roles.SERGEANT": "Rol nomi — Serjant",
  "roles.WARLOCK": "Rol nomi — Koldun",
  "roles.SANTA": "Rol nomi — Qorbobo",
  "roles.SNOWBOY": "Rol nomi — Qorbola",
  "roles.DON": "Rol nomi — Don",
  "roles.MAFIA": "Rol nomi — Mafiya",
  "roles.LAWYER": "Rol nomi — Advokat",
  "roles.SPY": "Rol nomi — Ayg'oqchi",
  "roles.LAB": "Rol nomi — Labarant",
  "roles.KILLER": "Rol nomi — Qotil",
  "roles.MINER": "Rol nomi — Minior",
  "roles.SNIPER": "Rol nomi — Snayperchi",
  "roles.ARCHER": "Rol nomi — Kamonchi",
  "roles.TRAITOR": "Rol nomi — Sotqin",
  "roles.ROBBER": "Rol nomi — Qaroqchi",
  "roles.PROFESSOR": "Rol nomi — Professor",

  // ROLE ASSIGNED (rol berildi — DMda)
  "roleAssigned.CIVILIAN": "Rol tavsifi — Tinch axoli",
  "roleAssigned.DOCTOR": "Rol tavsifi — Shifokor",
  "roleAssigned.TRAMP": "Rol tavsifi — Daydi",
  "roleAssigned.SHERIFF": "Rol tavsifi — Komissar",
  "roleAssigned.KAMIKAZE": "Rol tavsifi — Kamikaze",
  "roleAssigned.HOOKER": "Rol tavsifi — Kezuvchi",
  "roleAssigned.SERGEANT": "Rol tavsifi — Serjant",
  "roleAssigned.WARLOCK": "Rol tavsifi — Koldun",
  "roleAssigned.SANTA": "Rol tavsifi — Qorbobo",
  "roleAssigned.SNOWBOY": "Rol tavsifi — Qorbola",
  "roleAssigned.DON": "Rol tavsifi — Don",
  "roleAssigned.MAFIA": "Rol tavsifi — Mafiya",
  "roleAssigned.LAWYER": "Rol tavsifi — Advokat",
  "roleAssigned.SPY": "Rol tavsifi — Ayg'oqchi",
  "roleAssigned.LAB": "Rol tavsifi — Labarant",
  "roleAssigned.KILLER": "Rol tavsifi — Qotil",
  "roleAssigned.MINER": "Rol tavsifi — Minior",
  "roleAssigned.SNIPER": "Rol tavsifi — Snayperchi",
  "roleAssigned.ARCHER": "Rol tavsifi — Kamonchi",
  "roleAssigned.TRAITOR": "Rol tavsifi — Sotqin",
  "roleAssigned.ROBBER": "Rol tavsifi — Qaroqchi",
  "roleAssigned.PROFESSOR": "Rol tavsifi — Professor",
  "roleAssigned.shieldActive": "Shield faol — qo'shimcha",
  "roleAssigned.heroActive": "Geroy faol — qo'shimcha",

  // NIGHT (DM promptlar + natijalar)
  "night.hookerPrompt": "Kezuvchi — kimni bloklash?",
  "night.traitorPrompt": "Sotqin — kimni tanlash?",
  "night.lawyerPrompt": "Advokat — kimni himoya?",
  "night.spyPrompt": "Ayg'oqchi — kimni aniqlash?",
  "night.mafiaPrompt": "Mafiya — kimni o'ldirish?",
  "night.labPrompt": "Labarant — kimni tanlash?",
  "night.sheriffPrompt": "Komissar — kimni tekshirish?",
  "night.sergeantPrompt": "Serjant — ma'lumot olish",
  "night.doctorPrompt": "Shifokor — kimni davolash?",
  "night.warlockPrompt": "Koldun — kimni tanlash?",
  "night.trampPrompt": "Daydi — kimni kuzatish?",
  "night.killerPrompt": "Qotil — kimni o'ldirish?",
  "night.sniperPrompt": "Snayper — kimni otish?",
  "night.archerPrompt": "Kamonchi — kimni ovlash?",
  "night.minerPrompt": "Minior — kimga mina?",
  "night.snowboyPrompt": "Qorbola — kimga qor bo'roni?",
  "night.santaPrompt": "Qorbobo — kimga sovg'a?",
  "night.robberPrompt": "Qaroqchi — kimga hujum?",
  "night.robberTargetPrompt": "Qaroqchi nishoniga — pul yoki jon?",
  "night.robberTargetPaid": "Qaroqchi nishoniga — pul to'ladim",
  "night.robberTargetRefused": "Qaroqchi nishoniga — bosh tortdim",
  "night.robberWaiting": "Qaroqchi — javob kutish",
  "night.professorPrompt": "Professor — kimga qutilar?",
  "night.professorBoxesPrompt": "Professor nishoniga — 3 ta quti",
  "night.professorResult_death": "Professor quti — O'lim",
  "night.professorResult_empty": "Professor quti — Bo'sh",
  "night.professorResult_hero": "Professor quti — Geroy",
  "night.sheriffResult_town": "Komissar natijasi — tinch axoli",
  "night.sheriffResult_mafia": "Komissar natijasi — MAFIYA!",
  "night.sheriffShoot_hit": "Komissar otdi — o'q tekkan",
  "night.spyResult": "Ayg'oqchi natijasi — rol",
  "night.trampResult": "Daydi natijasi — uyga kelganlar",
  "night.trampNoVisitors": "Daydi natijasi — hech kim kelmadi",
  "night.trampWitness": "Daydi — qotillikka guvoh",
  "night.warlockSaved": "Koldun — tinch axolini saqladi",
  "night.warlockKilled": "Koldun — dushmanni o'ldirdi",
  "night.labHealed": "Labarant — davoladi",
  "night.labKilled": "Labarant — zaharladi",
  "night.sergeantInfo": "Serjant — Komissar ma'lumoti",
  "night.sergeantPromoted": "Serjant — yangi Komissar",
  "night.donPromote": "Don vafot — yangi Don",
  "night.traitorResult_mafia": "Sotqin natijasi — Mafiya",
  "night.traitorResult_town": "Sotqin natijasi — Serjant",
  "night.traitorResult_solo": "Sotqin natijasi — Qotil",
  "night.skip": "O'tkazish tugmasi",
  "night.sheriffCheckedYou": "Nishonga — Komissar tekshirdi",
  "night.trampVisitedYou": "Nishonga — Daydi tashrif buyurdi",
  "night.doctorHealedYou": "Nishonga — Shifokor keldi",
  "night.doctorHealedConfirm": "Shifokorga — kimni davoladi",

  // ERRORS
  "errors.notAdmin": "Xato — admin emas",
  "errors.notInGame": "Xato — o'yinda emas",
  "errors.notYourTurn": "Xato — sizning navbatingiz emas",
  "errors.playerDead": "Xato — siz o'liksiz",
  "errors.invalidTarget": "Xato — noto'g'ri nishon",
  "errors.onlyInGroup": "Xato — faqat guruhda",
  "errors.onlyInPrivate": "Xato — faqat DMda",
  "errors.cantTargetSelf": "Xato — o'zini tanlash mumkin emas",
  "errors.cantTargetMafia": "Xato — mafiyani tanlash mumkin emas",

  // STATS
  "stats.header": "Statistika — sarlavha",
  "stats.gamesPlayed": "Statistika — jami o'yinlar",
  "stats.wins": "Statistika — yutganlar",
  "stats.losses": "Statistika — yutqazganlar",
  "stats.rating": "Statistika — reyting",
  "stats.killCount": "Statistika — o'ldirganlar",
  "stats.savedCount": "Statistika — saqlab qolganlar",
  "stats.noStats": "Statistika yo'q",

  // TOP
  "top.header": "Reyting — sarlavha",
  "top.row": "Reyting — qator",
  "top.empty": "Reyting bo'sh",

  // BUTTONS
  "buttons.join": "Tugma — qo'shilish",
  "buttons.leave": "Tugma — chiqish",
  "buttons.noVote": "Tugma — hech kimga",
  "buttons.skip": "Tugma — o'tkazish",

  // SETTINGS
  "settings.title": "Sozlamalar — sarlavha",
  "settings.registrationTimeout": "Sozlama — ro'yxatdan o'tish vaqti",
  "settings.nightTimeout": "Sozlama — tun vaqti",
  "settings.dayDiscussionTimeout": "Sozlama — kun muhokama vaqti",
  "settings.votingTimeout": "Sozlama — ovoz berish vaqti",
  "settings.minPlayers": "Sozlama — min o'yinchi",
  "settings.maxPlayers": "Sozlama — max o'yinchi",
  "settings.muteOnNight": "Sozlama — tunda mute",
  "settings.updated": "Sozlama yangilandi",
  "settings.back": "Tugma — orqaga",
  "settings.btn.registrationTimeout": "Tugma — ro'yxat vaqti",
  "settings.btn.nightTimeout": "Tugma — tun",
  "settings.btn.dayDiscussionTimeout": "Tugma — kun muhokama",
  "settings.btn.votingTimeout": "Tugma — ovoz berish",
  "settings.btn.minPlayers": "Tugma — min o'yinchilar",
  "settings.btn.maxPlayers": "Tugma — max o'yinchilar",
  "settings.btn.muteOnNight": "Tugma — tunda o'chirish",

  // PROFILE
  "profile.shopTitle": "Do'kon — sarlavha",
  "profile.shopBuyTitle": "Do'kon — sotib olish",
  "profile.shopShield": "Do'kon — Shield tavsifi",
  "profile.shopDocument": "Do'kon — Hujjat tavsifi",
  "profile.shopChest": "Do'kon — Sandiq tavsifi",
  "profile.shopVip": "Do'kon — VIP tavsifi",
  "profile.shopRole": "Do'kon — rol tanlash",
  "profile.chestOpened": "Sandiq ochildi",
  "profile.heroNone": "Geroy yo'q — taklif",
  "profile.heroAttackPrompt": "Geroy — hujum nishoni",
  "profile.heroAttackAnnounceKilled": "Geroy hujumi — guruhda o'ldi",
  "profile.heroAttackAnnounceSurvived": "Geroy hujumi — guruhda omon",
  "profile.heroAttacked": "Geroy hujumi — nishonga xabar",
  "profile.useTitle": "Foydalanish — sarlavha",
  "profile.premiumGroupsEmpty": "Premium guruhlar — bo'sh",
};
