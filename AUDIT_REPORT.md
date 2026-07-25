# 🔍 MafiaBot — Kod Auditi (Batafsil Report)

**Sana:** 2026-07-25
**Qamrov:** O'yin logikasi · Iqtisod/Xavfsizlik · Infratuzilma/DB
**Metod:** 3 ta parallel agent + qo'lda tasdiqlash (charge tizimi, SOLO g'olib, `maxRounds`, race'lar)

> Ustuvorlik: 🔴 KRITIK (darhol) · 🟠 YUQORI · 🟡 O'RTA · ⚪️ PAST

---

## 🔴 KRITIK — darhol tuzatilishi kerak

### K1. Pul/olmos sarflashda "race condition" → double-spend, minus balans
**Fayl:** `src/services/economy.service.ts:33-56` (`spendDiamonds`, `spendMoney`), `:59-120` (transferlar)

Balansni tekshirish va yechish 2 alohida DB so'rovi, tranzaksiyasiz:
```ts
const user = await prisma.user.findUnique(...);   // o'qish
if (user.diamonds < amount) return false;          // tekshirish
await prisma.user.update({ diamonds: { decrement } }); // yozish — shartsiz!
```
**Ekspluatatsiya:** 20💎 bor foydalanuvchi bir vaqtda N ta so'rov yuboradi (skript bilan `/buyvip`, sandiq, `/change`, do'kon...). Hammasi `20 >= 20` ni ko'radi, hammasi yechadi → balans `20 - 20N` (minus), lekin N ta VIP/hero/sandiq bepul olinadi. **Butun iqtisodni buzadi** — barcha service'lar shu funksiyaga tayanadi.
**Yechim:** Atomik shartli update — `updateMany({ where: { id, diamonds: { gte: amount } }, data: { decrement } })`, `count===0` → muvaffaqiyatsiz. Mukofot/side-effect'larni bitta `$transaction` ga o'rash.

### K2. Zaryad (charge) tizimi butunlay ishlamaydi
**Fayl:** `src/game/engine.ts:779,788,887,899,916,925,942,951` + `:328`; `src/utils/constants.ts:141-157`; `src/game/persistence.ts`

Sniper/Archer/Warlock/Snowboy uchun "butun o'yinga 2 o'q" limiti **hech qachon** kuchga kirmaydi — 3 xato birga (tasdiqlangan):
1. **Noto'g'ri argument:** engine `hasCharge(actor.chargesLeft, "SNIPER")` deb chaqiradi, funksiya esa `hasCharge(player, role)` kutadi. Ichida `actor.chargesLeft.chargesLeft` izlanadi → `undefined` → `hasCharge` **doim `true`** qaytaradi.
2. **Har tun reset:** `startNight()` da `initCharges(player)` har tun zaryadni 2 ga qaytaradi.
3. **Saqlanmaydi:** `SerializedPlayer` da `chargesLeft` yo'q → restartda yo'qoladi.
**Natija:** Snayper har tun cheksiz o'q otadi, "Qoldiq: 2" doim 2 turadi. Balans buziladi.

### K3. Kecha ikki marta hisoblanishi (double phase transition)
**Fayl:** `src/game/controller.ts:248-313` (`handleNightEnd`); `src/handlers/callbacks/night-action.ts` (bir nechta joyda `isNightComplete → handleNightEnd`)

Kecha 2 yo'l bilan tugaydi: (a) timer, (b) oxirgi harakat. `handleNightEnd` boshida faqat `status !== "NIGHT"` guard bor, lekin status ancha keyin o'zgaradi va orada ko'p `await`. Reentrancy bayrog'i yo'q, timer boshida `clearTimer()` qilinmaydi.
**Natija:** Timer tugash oniga oxirgi harakat to'g'ri kelsa — `processNightActions()` 2 marta ishlaydi: `kill` ikki marta, natija 2 marta e'lon, `checkWin`/`endGame` 2 marta. Xuddi shu bilan **K1** birga → mukofot 2 barobar.
**Yechim:** `handleNightEnd` boshida `clearTimer()` + atomik `resolving` bayrog'i. Bir xil naqsh `endGame` (`controller.ts:561`, `status==="FINISHED"` guard yo'q) va `handleConfirmEnd` uchun ham kerak.

### K4. Prisma migration/schema drift + har restartda `db push --accept-data-loss`
**Fayl:** `prisma/migrations/…20260409…/migration.sql` vs `prisma/schema.prisma`; `Dockerfile:46-48`

Faqat **1 ta** migration bor, u schema bilan mos emas. Migrationda **yetishmaydi:** `Hero`, `Config`, `ConfigAudit`, `NextGameSubscription` jadvallari; `User`ning `shieldCount/documentCount/activeRole/use*` ustunlari; `Game.maxRounds/state`; `ChatSettings.maxRounds`; `Player.shieldCharges`; `DeathCause.INACTIVE` enum qiymati.
`migrate deploy` bilan qurilgan DB darhol crash bo'ladi. Prod faqat `Dockerfile` **har boot'da `prisma db push --accept-data-loss`** ishlatgani uchun tirik — bu esa xavfli: xato schema tahriri yoki yarim deploy **jimgina prod ustunlarini o'chiradi**.
**Yechim:** Toza migration tarixini qayta yaratish (`prisma migrate diff`/reset dev'da), prod'da `migrate deploy` ga o'tish, `--accept-data-loss` ni olib tashlash.

### K5. Kompilyatsiya xatosi — `this.settings.maxRounds` (`prisma generate` ishlamagan)
**Fayl:** `src/game/engine.ts:1415`

Schema'da `maxRounds` bor, lekin generatsiya qilingan Prisma client eskirgan (`node_modules/.prisma/...` da yo'q) → TypeScript xato. **Sabab:** schema o'zgargach `npx prisma generate` chaqirilmagan. Loyiha hozir toza build bo'lmaydi.
**Yechim:** `npx prisma generate` (+ K4 hal qilingach migration).

---

## 🟠 YUQORI

### Y1. `/unban` ni istalgan foydalanuvchi chaqira oladi (huquq oshirish)
**Fayl:** `src/handlers/commands/admin.ts:118` + `src/handlers/middleware/admin-only.ts:6-9`
`/unban` faqat `adminOnlyMiddleware` bilan (boshqa buyruqlardagi `groupOnly` yo'q). `adminOnlyMiddleware` esa **har qanday private chat** uchun `next()` beradi. **Ekspluatatsiya:** istalgan odam botga DM yozib `/unban <id>` bilan o'zini yoki sherigini ban'dan chiqaradi.
**Bog'liq (O'rta):** `ban/unban` **global** (bot bo'ylab), lekin `/ban` faqat *biror* guruh admini bo'lishni talab qiladi → yaramas admin istalgan odamni butun botdan ban qila oladi. Ban'ni owner'ga cheklash kerak.

### Y2. `unhandledRejection` handler yo'q + faza logikasi await'siz timer'da
**Fayl:** `src/index.ts` (handler yo'q); `src/game/controller.ts:242-244,342-344,404-406,472-474`
Barcha faza o'tishlari await qilinmagan `setTimeout` callback'ida. `handleNightEnd`/`startVotingPhase`/... reject bo'lsa — `unhandledRejection` → Node 20'da **butun process o'ladi**, ya'ni bitta o'yindagi xato **hamma o'yinlarni** yiqitadi. `bot.catch` faqat middleware ichini ushlaydi.
**Yechim:** `process.on('unhandledRejection'/'uncaughtException', …)` + har bir timer callback'ni `try/catch` yoki `.catch(log)` ga o'rash.

### Y3. Throttler o'rnatilgan-u, ulanmagan → 429 flood
**Fayl:** `package.json:19` (`@grammyjs/transformer-throttler`) — `src/` da **0 marta** ishlatilgan
Ommaviy PM sikllari throttlersiz: rol tarqatish (`controller.ts:168`), `notifyNextSubscribers` (`:778`, yuzlab/minglab foydalanuvchi), mafia/dead-chat rebroadcast (`chat.ts:130-174`). Faqat `autoRetry` bor — u 429'ni *oldini olmaydi*, retry qiladi (o'yin soatini to'xtatadi, `maxRetryAttempts:3` tugasa xabar yo'qoladi).
**Yechim:** `throttler` transformer'ni `bot.api.config.use(...)` ga ulash.

### Y4. SOLO g'olib rollar mukofot olmaydi (win-checker ≠ controller)
**Fayl:** `src/game/win-checker.ts:28-32` vs `src/game/controller.ts:686` (tasdiqlangan)
win-checker'da `soloAlive` = KILLER, MINER, SNIPER, ARCHER, **TRAITOR, ROBBER, PROFESSOR**. Ammo `didPlayerWin` (SOLO) faqat KILLER, SNIPER, ARCHER, MINER. **Natija:** oxirda yakka qolgan ROBBER/PROFESSOR/TRAITOR — win-checker "SOLO g'olib" deydi, lekin hech kim g'olib belgilanmaydi, mukofot/reyting berilmaydi, `soloWinnerRole=undefined`.

### Y5. Restartda Kamikaze (`KAMIKAZE_DELAY`) timer tiklanmaydi → o'yin qotadi
**Fayl:** `src/index.ts:156-173` (restore switch) + `src/game/controller.ts:506-518`
Timer tiklash switch faqat `NIGHT_END/DAY_END/VOTING_END/CONFIRM_END` ni biladi. Kamikaze osilganda 15s `KAMIKAZE_DELAY` o'rnatiladi. Bot shu 15s ichida restart bo'lsa — timer qayta yoqilmaydi, o'yin abadiy `CONFIRMING`/`VOTING`da qotadi (`/stopgame` gacha).

### Y6. Har xabarda `User` upsert (hot-path yozuv)
**Fayl:** `src/handlers/middleware/auth.ts:8-13`
`authMiddleware` **har** update'da (har guruh xabari ham) `User` upsert qiladi — asosan o'qish kifoya bo'lsa ham. Gavjum guruhda har xabar = 1 yozuv (+ Y7 dublikat indeks). Postgres pool'ni to'ldiradi. `:20-24` dagi mute-expiry bloki o'lik kod. `INACTIVE` enum yozuvi (`engine.ts:1092`) migration-based DB'da crash beradi (faqat `db push` yashiradi).

---

## 🟡 O'RTA

### O1. Sandiq oylik cheklovini race bilan aylanib o'tish + musbat EV
**Fayl:** `src/services/chest.service.ts:13-85`
`canOpen` → spend → `lastChestOpenedAt` update — 3 alohida so'rov. Bir vaqtda bir nechta `/openchest` → hammasi eski sanani ko'radi → oylik limit buziladi. Bundan tashqari sandiq **olmosda musbat EV** (~7💎 o'rtacha) va VIP'ga **cheksiz** — VIP pul→olmos cheksiz konvertor.

### O2. `buyVip` atomik emas + muddatni uzaytirmay ustidan yozadi
**Fayl:** `src/services/vip.service.ts:25-45`
Spend va update alohida (K1 bilan bepul VIP). `expiresAt = now + 30d` — mavjud muddatni **almashtiradi**, uzaytirmaydi; oy o'rtasida qayta olsa qolgan kunlar yo'qoladi.

### O3. `/send` guruh rejimida o'ziga yuborish taqiqini aylanadi
**Fayl:** `src/handlers/commands/economy.ts:73-118`
Reply shoxida self-send bloklangan, lekin guruh random-tarqatish pool'iga **yuboruvchi ham kiradi** → o'z olmosini o'ziga qaytarib olishi mumkin (alt'lar bilan aylantirish).

### O4. Mafiya ovozi dedup qilinmagan (`push`)
**Fayl:** `src/game/engine.ts:362-404,1228-1249`
Kunduzgi ovoz `Map` (dedup bor), lekin `mafiaVotes` har bosishda `push`. Bitta mafioz 2 marta bossa: (a) noto'g'ri nishon o'ldiriladi; (b) `mafiaVotes.length >= totalMafiaAlive` bajarilib, ikkinchi mafioz ovoz bermay kecha yakunlanadi.

### O5. Zaryadi/nishoni tugagan rol "harakatsizlik"dan o'ldiriladi
**Fayl:** `src/game/engine.ts:1079-1095`, `night.ts:117-122`
Harakatsizlik istisnosi faqat CIVILIAN/KAMIKAZE/SERGEANT. Himoyalanadigan mafioz qolmagan LAWYER (yoki zaryadi tugagan Sniper) submit qilolmay 2 tunda `INACTIVE` bilan o'ladi.

### O6. `maxRounds` chegarasi hech qayerda qo'llanilmaydi → cheksiz o'yin
**Fayl:** `src/game/win-checker.ts:12-70`
`maxRounds`/`currentRound` parametr sifatida keladi, lekin ishlatilmaydi. "maxRounds → DRAW" logikasi yo'q. O'ldira olmaydigan konfiguratsiyada o'yin g'olibsiz cheksiz.

### O7. Qaroqchi xabarlari summaga mos emas (100 vs "1000")
**Fayl:** `src/game/controller.ts:281-283` vs matnlar `uz.ts:264` / `engine.ts:1006`
Kod `ROB_AMOUNT=100` o'tkazadi, lekin xabar "1000 pul" deydi. (Yaqinda 1000→100 qilinganida matnlar yangilanmagan.)

### O8. Shutdown `bot.stop()` ni await qilmaydi + registratsiya o'yinlari restartda o'chadi
**Fayl:** `src/index.ts:98-110` (await yo'q), `:131-144` (WAITING force-cancel)
Shutdown `bot.stop()` ni await qilmay Prisma'ni uzadi → yozuv o'rtasida uzilish. Har restart barcha ro'yxatdagi (WAITING) lobbilarni o'chiradi.

### O9. Bot service'da healthcheck yo'q + broken `db:seed`
**Fayl:** `docker-compose.yml:2-26`; `package.json:13`
Faqat `db` da healthcheck. Osilib qolgan bot (Y3 backoff'da) orkestratorga ko'rinmaydi. `db:seed` → mavjud bo'lmagan `prisma/seed.ts` ni chaqiradi (seeding aslida `index.ts:36` da).

---

## ⚪️ PAST / O'LIK KOD

| # | Fayl | Muammo |
|---|------|--------|
| P1 | `role-assigner.ts:37-42` | `getRoleDistributionPreview` o'zini chaqiradi → stack overflow (o'lik kod) |
| P2 | `engine.ts:560-563` | Bo'sh `try/catch` (faqat sharh) |
| P3 | `visit-model.ts` | Massivda takror yozuvlar (WARLOCK/KILLER/SNOWBOY...); `getMinerVictims` stub — modul deyarli o'lik |
| P4 | `economy.ts:215-218` | `/gsend` `Math.floor` olmos yoqadi (`gsend 1` 5 kishiga → 0 tarqaladi, 2 yechiladi) |
| P5 | `owner.ts:1092` | Qidiruv natijasida `first_name` escape qilinmagan → HTML injection (owner-only) |
| P6 | `schema.prisma:60,259` | `telegramId` da dublikat indeks (`@unique` + `@@index`) → ortiqcha yozuv |
| P7 | `owner.ts:163-197,1145` | Manfiy give: spend muvaffaqiyatsiz bo'lsa ham "✅" deydi |
| P8 | `schema.prisma:26-27` | `diamonds/money` = `Int` (max ~2.1mlrd), yuqori chegara validatsiyasi yo'q |
| P9 | `controller.ts:282` va h.k. | `.catch(() => {})` muhim DB xatolarini jimgina yutadi |
| P10 | `chat-activity.service.ts:17` | Tashqi `Map` chat darajasida hech qachon tozalanmaydi (sekin leak) |
| P11 | `controller.ts:26-27` | `votingMessageId` map normal tugashda tozalanmaydi |
| P12 | `tsconfig.json:13-15` | App uchun `declaration/sourceMap` yoqilgan — `dist/` shishadi |

**Tekshirish tavsiya etiladi:** `submitVote` (`engine.ts:1273`) `allowSelfVote` ni tekshirmaydi; Miner (12-qadam) vs Killer (13-qadam) tashrif tartibini PRD bilan solishtirish.

---

## ✅ Yaxshi holatda (tekshirilgan)
- **Sirlar:** `config.ts`/`.env.example` faqat placeholder; haqiqiy `.env` git'da yo'q. Hardcoded token/ID yo'q.
- **Manfiy summa:** `/send /money /gsend /change` va `setprice` `amount<=0`/`value<0` ni bloklaydi.
- **User-facing HTML:** ismlar `mention()` → `escapeHtml()` orqali (owner qidiruvidan tashqari — P5).
- **Restore snapshot:** BigInt'lar to'g'ri `toString()` bilan saqlanadi; har harakatdan keyin persist.
- **Docker:** non-root user + `dumb-init` signal forwarding to'g'ri.

---

## 🎯 Tavsiya etilgan tuzatish tartibi

1. **K5 + K4** — `prisma generate`, keyin migration tarixini tozalash, `--accept-data-loss` ni olib tashlash. *(Bo'lmasa loyiha build/deploy ishonchsiz.)*
2. **K1** — barcha spend'larni atomik `updateMany(gte)` + `$transaction` ga o'tkazish. *(Bitta o'zgarish 5+ exploit'ni yopadi: K1, O1, O2.)*
3. **K2** — charge chaqiruvlarini `actor` ga to'g'rilash, har-tun reset'ni o'chirish, `chargesLeft` ni serializatsiyaga qo'shish.
4. **K3** — `handleNightEnd`/`endGame`/`handleConfirmEnd` ga `clearTimer()` + reentrancy guard.
5. **Y1** — `/unban` ga `groupOnly`; ban/unban'ni owner'ga cheklash.
6. **Y2** — `unhandledRejection`/`uncaughtException` handler + timer callback'larni o'rash.
7. **Y3** — throttler'ni ulash.
8. **Y4, Y5** — SOLO ro'yxatlarini moslashtirish; `KAMIKAZE_DELAY` restore.
9. Qolgan O'rta/Past'lar.
