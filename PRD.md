# Mafia Telegram Bot — Product Requirements Document (PRD)

## 1. Loyiha haqida umumiy ma'lumot

**Loyiha nomi:** Mafia Telegram Bot
**Texnologiyalar:** Node.js (TypeScript), grammY, Prisma ORM, PostgreSQL
**Platforma:** Telegram Bot API
**Maqsad:** Telegram guruhlarida Mafia o'yinini to'liq avtomatlashtirilgan holda o'ynash imkoniyatini berish

---

## 2. Texnologiya Stack

| Qatlam | Texnologiya |
|---|---|
| Runtime | Node.js 20+ (TypeScript) |
| Bot Framework | grammY v1.x |
| ORM | Prisma v5.x |
| Database | PostgreSQL 15+ |
| Session | grammY session (Prisma adapter) |
| Scheduler | node-cron (kecha/kunduz timer) |
| Logging | pino |
| Deployment | Docker + docker-compose |

---

## 3. O'yin qoidalari

### 3.1 Rollar

#### Tinch axoli (Shahar) tarafdorlari

| # | Rol | Emoji | Tunda harakat | Tavsif |
|---|---|---|---|---|
| 1 | **Tinch axoli (Civilian)** | 👨🏼 | Yo'q | Mafiyalarni va yakka rollarni kun davomida osishda faol ishtirok etadi |
| 2 | **Shifokor (Doctor)** | 👨🏼‍⚕️ | Davolash | Tunda tanlagan odamni otishgan bo'lsa o'limdan qutqaradi. O'zini faqat **1 marta** davolay oladi |
| 3 | **Daydi (Tramp)** | 🧙🏼‍♂️ | Kuzatish | Tunda tanlagan odamning uyiga borib, o'sha uyga kelgan odamlarni ko'radi. Qotillikka guvoh bo'ladi |
| 4 | **Komissar (Sheriff)** | 🕵🏻‍♂ | Tekshirish | Shaharning asosiy himoyachisi. Mafiyani topish va ovoz berishda osish vazifasi. Birinchi tundan **tekshirmasdan o'tish taqiqlanadi** |
| 5 | **Kamikaze** | 💣 | Yo'q (passiv) | Tun va kunda tinch axoli, ammo **osishganda** xohlagan o'yinchini o'zi bilan qabrga olib ketishi mumkin |
| 6 | **Kezuvchi (Hooker)** | 💃 | Bloklash | Tunda bir kishini zararsizlantiradi (bloklaydi). **Komissarni uxlatishi taqiqlanadi** |
| 7 | **Serjant (Sergeant)** | 👮🏻‍♂ | Komissar yordamchisi | Komissarga yordam beradi, voqealar haqida xabar oladi. **Komissar o'lsa — uning o'rnini egallaydi** |
| 8 | **Koldun (Warlock)** | ⚡️ | Himoya/O'ldirish | Tunda tanlagan odam **tinch axoli bo'lsa** — tongda osilishdan saqlaydi. **Boshqa taraf bo'lsa** — o'ldiradi |
| 9 | **Qorbobo (Santa)** | 🎅🏻 | Sovg'a berish | Tunda istagan ishtirokchiga sovg'a ulashadi |
| 10 | **Qorbola (Snowboy)** | ⛄️ | O'ldirish | Tunda istagan ishtirokchini qorbo'ron qilib nobud qiladi |

#### Mafiya tarafdorlari

| # | Rol | Emoji | Tunda harakat | Tavsif |
|---|---|---|---|---|
| 11 | **Don (Mafia Boss)** | 🤵🏻 | O'ldirish (hal qiluvchi ovoz) | Mafialar sardori. Tunda Donning ovozi ko'proq ahamiyatga ega. O'ldirish uchun ko'chaga chiqadi |
| 12 | **Mafiya (Mafia)** | 🤵🏼 | O'ldirish | Donga bo'ysunadi va qarshilik qilganlarni o'ldiradi. **Don o'lsa — yangi Don bo'lishi mumkin** |
| 13 | **Advokat (Lawyer)** | 👨🏼‍💼 | Himoya | Tanlagan mafiyani Komissar taniy olmaydi — unga tinch axoli bo'lib ko'rinadi |
| 14 | **Ayg'oqchi (Spy)** | 🦇 | Tekshirish | Tunda xohlagan bitta o'yinchining rolini biladi va mafialar uchun oshkor qiladi |
| 15 | **Labarant (Lab)** | 👨‍🔬 | Davolash/O'ldirish | Tanlagan odam **mafiya tarafida bo'lsa** — davolaydi. **Mafiya bo'lmasa** — o'ldiradi |

#### Yakka rollar (Mustaqil)

| # | Rol | Emoji | Tunda harakat | Tavsif |
|---|---|---|---|---|
| 16 | **Qotil (Killer)** | 🔪 | O'ldirish | "Shahardagi hamma o'lishi kerak, qotildan tashqari". Yolg'iz o'ynaydi |
| 17 | **Minior (Miner)** | ☠️ | Mina qo'yish | Tunda tanlagan odamining eshigi oldiga mina qo'yadi. O'sha uyga kelgan **Miniordan boshqa hamma** o'ladi |
| 18 | **Snayperchi (Sniper)** | 👨🏻‍🎤 | O'ldirish (kuchli) | Tanlagan odamda **himoya bo'lsa ham o'ladi**. Daydi ham snayperni ko'ra olmaydi. Yakka taraf o'ldira olmaydi. **Eng kuchli rol** |
| 19 | **Kamonchi (Archer)** | 🏹 | O'ldirish (maxfiy) | Maxfiy qotil — Daydi uning harakatini **sezmaydi** |
| 20 | **Sotqin (Traitor)** | 🦎 | Rol o'zgartirish | Tanlagan odam **mafiyadan bo'lsa** — mafiyaga aylanadi, **tinch axolidan bo'lsa** — serjant bo'ladi, **yakka tarafdan bo'lsa** — qotilga aylanadi |

### 3.2 O'yin bosqichlari

```
RO'YXATGA OLISH → ROLLAR TARQATISH → KECHA BOSQICHI → KUNDUZ BOSQICHI → OVOZ BERISH → NATIJA
      ↑                                                                                    |
      └────────────────────────── O'yin tugamaguncha takrorlanadi ──────────────────────────┘
```

#### 3.2.1 Ro'yxatga olish (Registration)
- Admin `/startgame` buyrug'ini beradi
- Botda "Qo'shilish" inline tugmasi paydo bo'ladi
- Minimal o'yinchilar soni: **4**
- Maksimal o'yinchilar soni: **30**
- Ro'yxatga olish vaqti: **60-120 soniya** (sozlanishi mumkin)
- Ro'yxatga olish tugagach yoki admin `/begingame` buyrug'ini bergach o'yin boshlanadi

#### 3.2.2 Rollar tarqatish (Role Assignment)
- Rollar o'yinchilar soniga qarab avtomatik tarqatiladi
- Har bir o'yinchiga shaxsiy xabarda roli yoziladi
- Mafiya a'zolariga bir-birlarining ismlari ko'rsatiladi

**Rollar taqsimoti:**

| O'yinchilar | Don | Mafiya | Advokat | Ayg'oqchi | Labarant | Komissar | Serjant | Shifokor | Daydi | Kezuvchi | Koldun | Kamikaze | Qotil | Snayper | Kamonchi | Minior | Sotqin | Qorbobo | Qorbola | Tinch axoli |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4-5 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Qolganlari |
| 6-7 | 1 | 1 | 0 | 0 | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Qolganlari |
| 8-9 | 1 | 1 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Qolganlari |
| 10-12 | 1 | 2 | 1 | 0 | 0 | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | Qolganlari |
| 13-16 | 1 | 2 | 1 | 1 | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | Qolganlari |
| 17-20 | 1 | 3 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | Qolganlari |
| 21-25 | 1 | 4 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 0 | Qolganlari |
| 26-30 | 1 | 5 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | Qolganlari |

#### 3.2.3 Kecha bosqichi (Night Phase)
- Guruhga "Shahar uxlaydi..." xabari yuboriladi
- Har bir aktiv rolga **shaxsiy xabarda** inline tugmalar orqali tanlov beriladi
- Harakatlar ketma-ketligi:
  1. **Kezuvchi** — kimni bloklashni tanlaydi (komissarni uxlatishi taqiqlanadi)
  2. **Sotqin** — kimni tanlashni belgilaydi (rol o'zgaradi)
  3. **Advokat** — qaysi mafiyani himoya qilishni tanlaydi
  4. **Ayg'oqchi** — kimning rolini bilishni tanlaydi
  5. **Mafiya/Don** — kimni o'ldirishni tanlaydi (guruhli ovoz, Don hal qiladi)
  6. **Labarant** — kimni tanlaydi (mafiya bo'lsa davolaydi, bo'lmasa o'ldiradi)
  7. **Komissar** — kimni tekshirishni tanlaydi (birinchi tunda o'tkazib bo'lmaydi)
  8. **Serjant** — komissar haqida ma'lumot oladi
  9. **Shifokor** — kimni davolashni tanlaydi (o'zini 1 marta)
  10. **Koldun** — kimni tanlaydi (tinch axoli bo'lsa himoya, boshqa bo'lsa o'ldiradi)
  11. **Daydi** — kimning uyiga borishni tanlaydi (kelganlarni ko'radi)
  12. **Qotil** — kimni o'ldirishni tanlaydi
  13. **Snayperchi** — kimni o'ldirishni tanlaydi (himoyani ham o'tadi)
  14. **Kamonchi** — kimni o'ldirishni tanlaydi (daydi sezmaydi)
  15. **Minior** — kimning eshigiga mina qo'yishni tanlaydi
  16. **Qorbola** — kimni qorbo'ron qilishni tanlaydi
  17. **Qorbobo** — kimga sovg'a berishni tanlaydi
- Har bir harakatga **60 soniya** vaqt beriladi (timeout bo'lsa — harakat o'tkazib yuboriladi)
- Timer tugagach barcha natijalar hisoblanadi

#### 3.2.4 Kunduz bosqichi (Day Phase)
- Kechasi nima bo'lgani e'lon qilinadi:
  - "Bugun ertalab [ism] o'lik topildi" yoki "Hech kim o'lmadi"
- **Muhokama vaqti:** 60-120 soniya (sozlanishi mumkin)
- O'yinchilar guruhda yozishmalar orqali muhokama qiladi

#### 3.2.5 Ovoz berish (Voting)
- Inline tugmalar orqali kim mafiya deb o'ylasa shu kishiga ovoz beradi
- "Hech kimga" ovoz berish imkoniyati ham bor
- Ovoz berish vaqti: **60 soniya**
- Eng ko'p ovoz olgan kishi chiqariladi
- Teng ovoz bo'lsa — hech kim chiqarilmaydi
- Chiqarilgan kishining roli oshkor qilinadi

#### 3.2.6 O'yin tugashi (Game End)
- **Shahar yutadi:** Barcha mafiya a'zolari va yakka rollar o'ldirilganda
- **Mafiya yutadi:** Mafiya soni shahar aholisiga teng yoki ko'p bo'lganda (yakka rollar hisobga olinmaydi)
- **Yakka rol yutadi:** Faqat yakka rol o'yinchisi(lar) tirik qolsa
- **Sotqin:** Qo'shilgan jamoasi bilan birga yutadi yoki yutqazadi

---

## 4. Bot buyruqlari

### 4.1 Umumiy buyruqlar

| Buyruq | Tavsif | Qayerda ishlaydi |
|---|---|---|
| `/start` | Botni ishga tushirish, ro'yxatdan o'tish | Shaxsiy chat |
| `/help` | Yordam va qoidalar | Shaxsiy/Guruh |
| `/stats` | Shaxsiy statistika | Shaxsiy/Guruh |
| `/top` | Eng yaxshi o'yinchilar reytingi | Guruh |
| `/rules` | O'yin qoidalari | Shaxsiy/Guruh |

### 4.2 O'yin buyruqlari (faqat guruhda)

| Buyruq | Tavsif | Kim ishlatadi |
|---|---|---|
| `/startgame` | Yangi o'yin boshlash | Guruh admin |
| `/begingame` | Ro'yxatni yopish va o'yinni boshlash | Guruh admin |
| `/stopgame` | O'yinni to'xtatish | Guruh admin |
| `/extend` | Ro'yxatga olish vaqtini uzaytirish (+30s) | Guruh admin |
| `/kick @user` | O'yinchini chiqarish (o'yin boshlanmasdan) | Guruh admin |

### 4.3 Admin buyruqlari

| Buyruq | Tavsif |
|---|---|
| `/setlang [uz/ru/en]` | Til o'rnatish |
| `/settings` | O'yin sozlamalari |
| `/settime [phase] [seconds]` | Bosqich vaqtini o'rnatish |

---

## 5. Database Schema (Prisma)

### 5.1 Entity Relationship Diagram

```
┌──────────┐     ┌───────────┐     ┌──────────────┐
│   User   │────<│  Player   │>────│    Game      │
└──────────┘     └───────────┘     └──────────────┘
     │                │                    │
     │                │              ┌─────┴──────┐
     │                │              │  GameRound  │
     │                │              └─────┬──────┘
     │           ┌────┴─────┐             │
     │           │  Action  │>────────────┘
     │           └──────────┘
     │
     │           ┌───────────────┐
     └──────────<│   UserStats   │
                 └───────────────┘
     
┌──────────┐     ┌───────────────┐
│   Chat   │────<│ ChatSettings  │
└──────────┘     └───────────────┘
```

### 5.2 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== USER & STATS ====================

model User {
  id         Int      @id @default(autoincrement())
  telegramId BigInt   @unique
  username   String?
  firstName  String
  lastName   String?
  language   String   @default("uz")
  isBot      Boolean  @default(false)
  isBanned   Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  players  Player[]
  stats    UserStats?

  @@index([telegramId])
}

model UserStats {
  id             Int   @id @default(autoincrement())
  userId         Int   @unique
  user           User  @relation(fields: [userId], references: [id])
  
  gamesPlayed    Int   @default(0)
  gamesWon       Int   @default(0)
  gamesLost      Int   @default(0)
  
  // Tinch axoli rollari
  timesCivilian  Int   @default(0)
  timesDoctor    Int   @default(0)
  timesTramp     Int   @default(0)
  timesSheriff   Int   @default(0)
  timesKamikaze  Int   @default(0)
  timesHooker    Int   @default(0)
  timesSergeant  Int   @default(0)
  timesWarlock   Int   @default(0)
  timesSanta     Int   @default(0)
  timesSnowboy   Int   @default(0)
  // Mafiya rollari
  timesDon       Int   @default(0)
  timesMafia     Int   @default(0)
  timesLawyer    Int   @default(0)
  timesSpy       Int   @default(0)
  timesLab       Int   @default(0)
  // Yakka rollar
  timesKiller    Int   @default(0)
  timesMiner     Int   @default(0)
  timesSniper    Int   @default(0)
  timesArcher    Int   @default(0)
  timesTraitor   Int   @default(0)
  
  killCount      Int   @default(0)
  savedCount     Int   @default(0)
  correctChecks  Int   @default(0)
  
  winStreak      Int   @default(0)
  maxWinStreak   Int   @default(0)
  
  rating         Int   @default(1000)  // ELO rating
  
  updatedAt      DateTime @updatedAt
}

// ==================== CHAT SETTINGS ====================

model Chat {
  id         Int      @id @default(autoincrement())
  telegramId BigInt   @unique
  title      String?
  type       String   // group, supergroup
  language   String   @default("uz")
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  games    Game[]
  settings ChatSettings?

  @@index([telegramId])
}

model ChatSettings {
  id                    Int     @id @default(autoincrement())
  chatId                Int     @unique
  chat                  Chat    @relation(fields: [chatId], references: [id])
  
  registrationTimeout   Int     @default(90)      // sekundlarda
  nightTimeout          Int     @default(60)
  dayDiscussionTimeout  Int     @default(90)
  votingTimeout         Int     @default(60)
  
  minPlayers            Int     @default(4)
  maxPlayers            Int     @default(30)
  
  showRoleOnDeath       Boolean @default(true)
  allowSelfVote         Boolean @default(false)
  // Tinch axoli rollari
  enableTramp           Boolean @default(true)
  enableKamikaze        Boolean @default(true)
  enableHooker          Boolean @default(true)
  enableSergeant        Boolean @default(true)
  enableWarlock         Boolean @default(true)
  enableSanta           Boolean @default(false)
  enableSnowboy         Boolean @default(false)
  // Mafiya rollari
  enableLawyer          Boolean @default(true)
  enableSpy             Boolean @default(true)
  enableLab             Boolean @default(true)
  // Yakka rollar
  enableKiller          Boolean @default(true)
  enableMiner           Boolean @default(true)
  enableSniper          Boolean @default(true)
  enableArcher          Boolean @default(true)
  enableTraitor         Boolean @default(true)
  
  updatedAt             DateTime @updatedAt
}

// ==================== GAME ====================

model Game {
  id         Int        @id @default(autoincrement())
  chatId     Int
  chat       Chat       @relation(fields: [chatId], references: [id])
  status     GameStatus @default(WAITING)
  winner     Winner?
  roundCount Int        @default(0)
  startedAt  DateTime?
  endedAt    DateTime?
  createdAt  DateTime   @default(now())

  players Player[]
  rounds  GameRound[]

  @@index([chatId, status])
}

enum GameStatus {
  WAITING      // Ro'yxatga olish
  STARTING     // Rollar tarqatilmoqda
  NIGHT        // Kecha
  DAY          // Kunduz muhokama
  VOTING       // Ovoz berish
  FINISHED     // Tugagan
  CANCELLED    // Bekor qilingan
}

enum Winner {
  TOWN    // Shahar yutdi
  MAFIA   // Mafiya yutdi
  SOLO    // Yakka rol yutdi (Qotil, Snayper, Kamonchi, Minior)
  DRAW    // Durrang
}

// ==================== PLAYER ====================

model Player {
  id         Int          @id @default(autoincrement())
  gameId     Int
  game       Game         @relation(fields: [gameId], references: [id])
  userId     Int
  user       User         @relation(fields: [userId], references: [id])
  role       Role?
  isAlive    Boolean      @default(true)
  deathRound Int?
  deathCause DeathCause?
  createdAt  DateTime     @default(now())

  actions        Action[]  @relation("actor")
  targetActions  Action[]  @relation("target")

  @@unique([gameId, userId])
  @@index([gameId, isAlive])
}

enum Role {
  // Tinch axoli
  CIVILIAN   // 👨🏼 Tinch axoli
  DOCTOR     // 👨🏼‍⚕️ Shifokor
  TRAMP      // 🧙🏼‍♂️ Daydi
  SHERIFF    // 🕵🏻‍♂ Komissar
  KAMIKAZE   // 💣 Kamikaze
  HOOKER     // 💃 Kezuvchi
  SERGEANT   // 👮🏻‍♂ Serjant
  WARLOCK    // ⚡️ Koldun
  SANTA      // 🎅🏻 Qorbobo
  SNOWBOY    // ⛄️ Qorbola
  // Mafiya
  DON        // 🤵🏻 Don
  MAFIA      // 🤵🏼 Mafiya
  LAWYER     // 👨🏼‍💼 Advokat
  SPY        // 🦇 Ayg'oqchi
  LAB        // 👨‍🔬 Labarant
  // Yakka rollar
  KILLER     // 🔪 Qotil
  MINER      // ☠️ Minior
  SNIPER     // 👨🏻‍🎤 Snayperchi
  ARCHER     // 🏹 Kamonchi
  TRAITOR    // 🦎 Sotqin
}

enum DeathCause {
  MAFIA_KILL     // Mafiya o'ldirdi
  KILLER_KILL    // Qotil o'ldirdi
  SNIPER_KILL    // Snayperchi o'ldirdi
  ARCHER_KILL    // Kamonchi o'ldirdi
  MINER_KILL     // Minior minasi portladi
  SNOWBOY_KILL   // Qorbola qorbo'ron qildi
  LAB_KILL       // Labarant o'ldirdi
  WARLOCK_KILL   // Koldun o'ldirdi
  KAMIKAZE_KILL  // Kamikaze o'zi bilan olib ketdi
  VOTED_OUT      // Ovoz bilan chiqarildi
  LEFT_GAME      // O'zi chiqib ketdi
}

// ==================== GAME ROUND ====================

model GameRound {
  id        Int      @id @default(autoincrement())
  gameId    Int
  game      Game     @relation(fields: [gameId], references: [id])
  roundNum  Int
  phase     Phase
  createdAt DateTime @default(now())
  endedAt   DateTime?

  actions Action[]

  @@unique([gameId, roundNum, phase])
  @@index([gameId])
}

enum Phase {
  NIGHT
  DAY
  VOTING
}

// ==================== ACTIONS ====================

model Action {
  id        Int        @id @default(autoincrement())
  roundId   Int
  round     GameRound  @relation(fields: [roundId], references: [id])
  actorId   Int
  actor     Player     @relation("actor", fields: [actorId], references: [id])
  targetId  Int?
  target    Player?    @relation("target", fields: [targetId], references: [id])
  type      ActionType
  result    String?    // JSON natija
  createdAt DateTime   @default(now())

  @@index([roundId, type])
}

enum ActionType {
  // Mafiya jamoasi
  MAFIA_KILL      // Mafiya/Don o'ldirish
  LAWYER_PROTECT  // Advokat himoya
  SPY_CHECK       // Ayg'oqchi tekshirish
  LAB_ACTION      // Labarant davolash/o'ldirish
  // Tinch axoli
  SHERIFF_CHECK   // Komissar tekshirish
  SERGEANT_INFO   // Serjant ma'lumot olish
  DOCTOR_HEAL     // Shifokor davolash
  TRAMP_VISIT     // Daydi kuzatish
  HOOKER_BLOCK    // Kezuvchi bloklash
  WARLOCK_ACTION  // Koldun himoya/o'ldirish
  KAMIKAZE_TAKE   // Kamikaze o'zi bilan olib ketish
  SANTA_GIFT      // Qorbobo sovg'a berish
  SNOWBOY_KILL    // Qorbola qorbo'ron
  // Yakka rollar
  KILLER_KILL     // Qotil o'ldirish
  SNIPER_KILL     // Snayperchi o'ldirish
  ARCHER_KILL     // Kamonchi o'ldirish
  MINER_PLANT     // Minior mina qo'yish
  TRAITOR_CHOOSE  // Sotqin tanlash (rol o'zgarishi)
  // Umumiy
  VOTE            // Kunduzgi ovoz
  SKIP            // O'tkazib yuborish
}
```

---

## 6. Loyiha strukturasi

```
mafiabot/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── index.ts                    # Entry point
│   ├── bot.ts                      # grammY bot instance
│   ├── config.ts                   # Environment config
│   │
│   ├── database/
│   │   ├── prisma.ts               # Prisma client instance
│   │   └── repositories/
│   │       ├── user.repository.ts
│   │       ├── game.repository.ts
│   │       ├── player.repository.ts
│   │       ├── chat.repository.ts
│   │       └── stats.repository.ts
│   │
│   ├── game/
│   │   ├── engine.ts               # Asosiy o'yin logic
│   │   ├── manager.ts              # Aktiv o'yinlarni boshqarish
│   │   ├── roles/
│   │   │   ├── index.ts            # Role registry
│   │   │   ├── base.role.ts        # Abstract role class
│   │   │   ├── civilian.ts         # 👨🏼 Tinch axoli
│   │   │   ├── doctor.ts           # 👨🏼‍⚕️ Shifokor
│   │   │   ├── tramp.ts            # 🧙🏼‍♂️ Daydi
│   │   │   ├── sheriff.ts          # 🕵🏻‍♂ Komissar
│   │   │   ├── kamikaze.ts         # 💣 Kamikaze
│   │   │   ├── hooker.ts           # 💃 Kezuvchi
│   │   │   ├── sergeant.ts         # 👮🏻‍♂ Serjant
│   │   │   ├── warlock.ts          # ⚡️ Koldun
│   │   │   ├── santa.ts            # 🎅🏻 Qorbobo
│   │   │   ├── snowboy.ts          # ⛄️ Qorbola
│   │   │   ├── don.ts              # 🤵🏻 Don
│   │   │   ├── mafia.ts            # 🤵🏼 Mafiya
│   │   │   ├── lawyer.ts           # 👨🏼‍💼 Advokat
│   │   │   ├── spy.ts              # 🦇 Ayg'oqchi
│   │   │   ├── lab.ts              # 👨‍🔬 Labarant
│   │   │   ├── killer.ts           # 🔪 Qotil
│   │   │   ├── miner.ts            # ☠️ Minior
│   │   │   ├── sniper.ts           # 👨🏻‍🎤 Snayperchi
│   │   │   ├── archer.ts           # 🏹 Kamonchi
│   │   │   └── traitor.ts          # 🦎 Sotqin
│   │   ├── phases/
│   │   │   ├── registration.ts     # Ro'yxatga olish
│   │   │   ├── night.ts            # Kecha bosqichi
│   │   │   ├── day.ts              # Kunduz muhokama
│   │   │   └── voting.ts           # Ovoz berish
│   │   ├── role-assigner.ts        # Rollarni tarqatish
│   │   └── win-checker.ts          # G'olibni aniqlash
│   │
│   ├── handlers/
│   │   ├── commands/
│   │   │   ├── start.ts
│   │   │   ├── help.ts
│   │   │   ├── game.ts             # startgame, begingame, stopgame
│   │   │   ├── stats.ts
│   │   │   ├── settings.ts
│   │   │   └── admin.ts
│   │   ├── callbacks/
│   │   │   ├── join-game.ts        # O'yinga qo'shilish
│   │   │   ├── night-action.ts     # Tundagi harakatlar
│   │   │   ├── vote.ts             # Ovoz berish
│   │   │   └── settings.ts         # Sozlamalar
│   │   └── middleware/
│   │       ├── auth.ts             # Foydalanuvchi tekshirish
│   │       ├── admin-only.ts       # Admin tekshirish
│   │       ├── game-context.ts     # O'yin konteksti
│   │       └── rate-limit.ts       # Rate limiting
│   │
│   ├── services/
│   │   ├── user.service.ts
│   │   ├── game.service.ts
│   │   ├── stats.service.ts
│   │   └── notification.service.ts # Xabarlar yuborish
│   │
│   ├── locales/
│   │   ├── uz.ts                   # O'zbek tili
│   │   ├── ru.ts                   # Rus tili
│   │   └── en.ts                   # Ingliz tili
│   │
│   ├── keyboards/
│   │   ├── main-menu.ts
│   │   ├── game.ts                 # O'yin tugmalari
│   │   ├── night-actions.ts        # Tundagi harakatlar tugmalari
│   │   ├── voting.ts               # Ovoz berish tugmalari
│   │   └── settings.ts             # Sozlamalar tugmalari
│   │
│   ├── types/
│   │   ├── context.ts              # grammY custom context
│   │   ├── game.ts                 # O'yin turlari
│   │   └── index.ts
│   │
│   └── utils/
│       ├── logger.ts               # Pino logger
│       ├── timer.ts                # Timer utility
│       ├── helpers.ts
│       └── constants.ts
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 7. Asosiy modullar tavsifi

### 7.1 Game Manager (`src/game/manager.ts`)

**Vazifasi:** Barcha aktiv o'yinlarni xotirada saqlash va boshqarish.

```typescript
// Konseptual interfeys
interface GameManager {
  // Aktiv o'yinlar (chatId -> GameEngine)
  activeGames: Map<bigint, GameEngine>;
  
  createGame(chatId: bigint, creatorId: bigint): Promise<GameEngine>;
  getGame(chatId: bigint): GameEngine | undefined;
  endGame(chatId: bigint): Promise<void>;
}
```

**Muhim:** Bir guruhda bir vaqtda faqat bitta o'yin bo'lishi mumkin.

### 7.2 Game Engine (`src/game/engine.ts`)

**Vazifasi:** Bitta o'yinning to'liq lifecycle'ini boshqarish.

```typescript
interface GameEngine {
  gameId: number;
  chatId: bigint;
  status: GameStatus;
  players: Map<number, PlayerState>;
  currentRound: number;
  
  // Lifecycle
  addPlayer(userId: bigint): Promise<boolean>;
  removePlayer(userId: bigint): Promise<boolean>;
  start(): Promise<void>;
  
  // Phases
  startNight(): Promise<void>;
  processNightActions(): Promise<NightResult>;
  startDay(nightResult: NightResult): Promise<void>;
  startVoting(): Promise<void>;
  processVotes(): Promise<VoteResult>;
  
  // Actions
  submitNightAction(playerId: number, targetId: number, type: ActionType): Promise<void>;
  submitVote(voterId: number, targetId: number): Promise<void>;
  
  // State
  checkWinCondition(): Winner | null;
  getAlivePlayers(): PlayerState[];
  getMafiaMembers(): PlayerState[];
}
```

### 7.3 Night Phase Resolution

Kecha bosqichida harakatlar quyidagi tartibda qayta ishlanadi:

```
 1. Kezuvchi bloklashi     → bloklangan o'yinchining tundagi harakati bekor
 2. Sotqin tanlovi         → tanlagan odamning jamoasiga qarab rol o'zgaradi
 3. Advokat himoyasi       → himoyalangan mafiya komissar tekshiruvidan yashirinadi
 4. Ayg'oqchi tekshiruvi   → tanlagan odamning roli oshkor bo'ladi (mafiylarga)
 5. Mafiya/Don ovozi       → eng ko'p ovoz olgan nishon, teng bo'lsa Don hal qiladi
 6. Labarant harakati      → mafiya tarafida bo'lsa davolaydi, bo'lmasa o'ldiradi
 7. Komissar tekshiruvi    → natija: mafiya yoki tinch axoli (advokat himoyasi hisobga olinadi)
 8. Serjant ma'lumoti      → komissar haqida ma'lumot oladi
 9. Shifokor davolashi     → nishon otishgan bo'lsa saqlab qoladi (o'zini 1 marta)
10. Koldun harakati        → tinch axoli bo'lsa osilishdan saqlaydi, boshqa taraf bo'lsa o'ldiradi
11. Daydi kuzatuvi         → tanlagan uyga kelganlarni ko'radi, qotillikka guvoh bo'ladi
12. Minior mina qo'yishi   → eshik oldiga mina, uyga kelganlar (Miniordan boshqa) o'ladi
13. Qotil o'ldirishi       → mustaqil o'ldirish
14. Snayperchi o'ldirishi  → himoyani ham o'tib o'ldiradi, daydi ko'rmaydi, yakka taraf o'ldira olmaydi
15. Kamonchi o'ldirishi    → maxfiy o'ldirish, daydi sezmaydi
16. Qorbola qorbo'roni     → tanlagan odamni nobud qiladi
17. Qorbobo sovg'asi       → tanlagan odamga sovg'a beradi
18. Natijalar hisoblanadi  → kim o'ldi, kim saqlab qolindi, Kamikaze effekti (osilganda)
```

**Muhim qoidalar:**
- **Minior minasi:** Agar Daydi, Shifokor yoki boshqa rol Minior tanlagan uyga kelsa — ular ham o'ladi (Miniordan tashqari)
- **Snayperchi:** Shifokor davolashi ham uni to'xtata olmaydi. Daydi uni ko'ra olmaydi
- **Kamonchi:** Daydi uning harakatini sezmaydi (maxfiy qotil)
- **Kamikaze:** Faqat kunduz osilganda ishlaydi — o'zi bilan bitta kishini olib ketadi
- **Don o'lsa:** Mafiyalardan biri yangi Don bo'ladi
- **Komissar o'lsa:** Serjant Komissar roliga o'tadi

### 7.4 Notification Service (`src/services/notification.service.ts`)

**Vazifasi:** Barcha xabarlarni yuborish logikasi.

```typescript
interface NotificationService {
  // Guruhga xabarlar
  sendToGroup(chatId: bigint, message: string, keyboard?: InlineKeyboard): Promise<void>;
  
  // Shaxsiy xabarlar (rollar, tundagi harakatlar)
  sendToPlayer(userId: bigint, message: string, keyboard?: InlineKeyboard): Promise<void>;
  
  // Mafiya guruhiga (mafiya a'zolariga bir xil xabar)
  sendToMafia(players: PlayerState[], message: string, keyboard?: InlineKeyboard): Promise<void>;
  
  // Kecha natijalari
  announceNightResults(chatId: bigint, results: NightResult): Promise<void>;
  
  // Ovoz berish natijalari
  announceVoteResults(chatId: bigint, results: VoteResult): Promise<void>;
  
  // O'yin natijalari
  announceGameEnd(chatId: bigint, winner: Winner, players: PlayerState[]): Promise<void>;
}
```

---

## 8. O'yin oqimi (Game Flow) — batafsil

### 8.1 Ro'yxatga olish

```
Admin: /startgame
  │
  ├─> Bot guruhga xabar yuboradi:
  │   "🎭 Mafia o'yini boshlanmoqda!
  │    Qo'shilish uchun tugmani bosing.
  │    O'yinchilar: 0/30
  │    Vaqt: 90 soniya"
  │   [Qo'shilish ✅] [Chiqish ❌]
  │
  ├─> O'yinchi "Qo'shilish" tugmasini bosganda:
  │   ├─> Bot o'yinchining shaxsiy chatda /start qilganini tekshiradi
  │   │   (agar yo'q → "Avval botga shaxsiy xabar yuboring" ogohlantirish)
  │   ├─> O'yinchi ro'yxatga qo'shiladi
  │   └─> Xabar yangilanadi (o'yinchilar soni + ismlari)
  │
  ├─> Timer tugaganda YOKI admin /begingame:
  │   ├─> Agar o'yinchilar < minPlayers → "Yetarli o'yinchi yo'q" → o'yin bekor
  │   └─> Agar o'yinchilar >= minPlayers → rollar tarqatish bosqichi
  │
  └─> Admin /stopgame → o'yin bekor qilinadi
```

### 8.2 Kecha bosqichi (batafsil)

```
Bot: "🌙 Shahar uxlaydi... Kecha #1"
  │
  ├─> 💃 Kezuvchiga shaxsiy xabar:
  │   "Kimni bloklaysiz? (Komissarni uxlatish taqiqlanadi)"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │
  ├─> 🦎 Sotqinga shaxsiy xabar:
  │   "Kimni tanlaysiz? (Uning jamoasiga qarab rolingiz o'zgaradi)"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │
  ├─> 👨🏼‍💼 Advokatga shaxsiy xabar:
  │   "Qaysi mafiyani himoya qilasiz?"
  │   [Mafiya 1] [Mafiya 2] ... [O'tkazish]
  │
  ├─> 🦇 Ayg'oqchiga shaxsiy xabar:
  │   "Kimning rolini bilmoqchisiz?"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │   → Natija: "🦇 [Ism] — roli: Komissar"
  │
  ├─> 🤵🏻🤵🏼 Mafiya a'zolariga shaxsiy xabar:
  │   "Mafiya jamoasi: [A], [B], [C]
  │    Kimni o'ldiramiz?"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │   (Har bir mafiya ovoz beradi, teng bo'lsa Don hal qiladi)
  │
  ├─> 👨‍🔬 Labarantga shaxsiy xabar:
  │   "Kimni tanlaysiz?"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │   → Natija: mafiya tarafida bo'lsa davolaydi, bo'lmasa o'ldiradi
  │
  ├─> 🕵🏻‍♂ Komissarga shaxsiy xabar:
  │   "Kimni tekshirasiz? (1-tunda o'tkazib bo'lmaydi!)"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │   → Natija: "✅ [Ism] — tinch axoli" yoki "🔴 [Ism] — mafiya!"
  │
  ├─> 👮🏻‍♂ Serjantga shaxsiy xabar:
  │   "Komissar haqida ma'lumot olasiz"
  │   → Natija: voqealar haqida xabar
  │
  ├─> 👨🏼‍⚕️ Shifokorga shaxsiy xabar:
  │   "Kimni davolaysiz? (O'zingizni faqat 1 marta)"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │
  ├─> ⚡️ Koldunga shaxsiy xabar:
  │   "Kimni tanlaysiz?"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │   → tinch axoli bo'lsa himoya, boshqa bo'lsa o'ldiradi
  │
  ├─> 🧙🏼‍♂️ Daydiga shaxsiy xabar:
  │   "Kimning uyiga borasiz?"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │   → Natija: "Uyga kelganlar: [A], [B]" yoki "Hech kim kelmadi"
  │
  ├─> ☠️ Miniorga shaxsiy xabar:
  │   "Kimning eshigiga mina qo'yasiz?"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │
  ├─> 🔪 Qotilga shaxsiy xabar:
  │   "Kimni o'ldirasiz?"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │
  ├─> 👨🏻‍🎤 Snayperchiga shaxsiy xabar:
  │   "Kimni o'ldirasiz? (Himoyani ham o'tadi)"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │
  ├─> 🏹 Kamonchiga shaxsiy xabar:
  │   "Kimni o'ldirasiz? (Maxfiy — daydi sezmaydi)"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │
  ├─> ⛄️ Qorbolaga shaxsiy xabar:
  │   "Kimni qorbo'ron qilasiz?"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │
  ├─> 🎅🏻 Qorboboga shaxsiy xabar:
  │   "Kimga sovg'a berasiz?"
  │   [O'yinchi 1] [O'yinchi 2] ... [O'tkazish]
  │
  ├─> Barcha harakatlar yig'ilgandan keyin YOKI timer tugagach:
  │   └─> processNightActions() → natijalarni hisoblash
  │
  └─> Kunduz bosqichiga o'tish
```

### 8.3 Ovoz berish

```
Bot: "🗳 Ovoz berish vaqti! Kimni chiqaramiz?"
     [O'yinchi 1 (0)] [O'yinchi 2 (0)] ... [Hech kim (0)]
     "Vaqt: 60 soniya"
  │
  ├─> O'yinchi tugma bosadi → ovozi hisoblanadi
  │   (qayta bossa → ovozi o'zgaradi)
  │   Xabar real-time yangilanadi: [O'yinchi 1 (3)] [O'yinchi 2 (1)]
  │
  ├─> Timer tugagach:
  │   ├─> Eng ko'p ovoz olgan o'yinchi chiqariladi
  │   │   Bot: "👋 [Ism] chiqarildi! Uning roli: Mafiya 🔫"
  │   ├─> Teng ovoz → hech kim chiqarilmaydi
  │   │   Bot: "Ovozlar teng — hech kim chiqarilmadi"
  │   └─> G'olib tekshiruvi → davom etish yoki o'yinni tugatish
```

---

## 9. Rating (ELO) tizimi

### 9.1 Ball hisoblash

| Hodisa | Ball |
|---|---|
| O'yin yutish (tinch axoli) | +25 |
| O'yin yutish (mafiya) | +35 (qiyinroq) |
| O'yin yutish (yakka rol) | +50 (eng qiyin) |
| O'yin yutqazish | -15 |
| Komissar to'g'ri tekshiruv | +5 |
| Shifokor muvaffaqiyatli davolash | +5 |
| Daydi qotillikka guvoh bo'lish | +5 |
| Koldun dushmanni o'ldirish | +5 |
| Snayperchi muvaffaqiyatli o'ldirish | +5 |
| Kamikaze mafiyani olib ketish | +10 |
| Birinchi kechada o'lish | -5 (bonus yo'qotish yo'q) |

### 9.2 Reyting darajalari

| Daraja | Rating oralig'i | Nomi |
|---|---|---|
| 1 | 0-999 | Yangi fuqaro |
| 2 | 1000-1199 | Oddiy fuqaro |
| 3 | 1200-1399 | Tajribali fuqaro |
| 4 | 1400-1599 | Katta aka |
| 5 | 1600-1799 | Avtoritet |
| 6 | 1800-1999 | Don |
| 7 | 2000+ | Krestnyy otets |

---

## 10. Xavfsizlik va cheklovlar

### 10.1 Anti-cheat

- O'yinchi faqat o'zining harakatini bajara oladi (player ID tekshiruvi)
- Mafiya a'zolari bir-birini o'ldira olmaydi
- Shifokor o'zini ketma-ket 2 marta davolay olmaydi
- O'lik o'yinchi ovoz bera olmaydi va harakat qila olmaydi
- O'yinchi faqat tirik o'yinchilarga nishon ola oladi
- Callback query'lar uchun o'yinchi va o'yin ID tekshiruvi

### 10.2 Rate Limiting

- Bir guruhda bir vaqtda faqat 1 ta o'yin
- Bir o'yinchi bir vaqtda faqat 1 ta o'yinda
- Buyruqlar uchun: 1 buyruq / 3 soniya / foydalanuvchi
- Callback query'lar uchun: 3 ta / 2 soniya / foydalanuvchi

### 10.3 Error Handling

- Bot shaxsiy xabar yubora olmasa — guruhda ogohlantirish
- Database ulanish uzilsa — o'yinlarni pause qilish
- Bot restart bo'lsa — aktiv o'yinlarni CANCELLED holatiga o'tkazish

---

## 11. Ko'p tillilik (i18n)

### 11.1 Qo'llab-quvvatlanadigan tillar

- **O'zbek (uz)** — asosiy til
- **Rus (ru)** — qo'shimcha
- **Ingliz (en)** — qo'shimcha

### 11.2 Til tanlash tartibi

1. Guruh tili (`ChatSettings.language`) — guruh xabarlari uchun
2. Foydalanuvchi tili (`User.language`) — shaxsiy xabarlar uchun
3. Telegram tili (`ctx.from.language_code`) — default fallback

### 11.3 Tarjima strukturasi

```typescript
// src/locales/uz.ts
export const uz = {
  game: {
    started: "🎭 Mafia o'yini boshlanmoqda!\nQo'shilish uchun tugmani bosing.",
    joined: "{name} o'yinga qo'shildi! ({count}/{max})",
    night: "🌙 Shahar uxlaydi... Kecha #{round}",
    day: "☀️ Shahar uyg'ondi!",
    voting: "🗳 Ovoz berish vaqti!",
    noOneDied: "Bugun kechasi hech kim o'lmadi.",
    playerDied: "💀 {name} o'lik topildi! Roli: {role}",
    townWins: "🏆 Shahar yutdi! Barcha mafiya va yakka rollar yo'q qilindi!",
    mafiaWins: "🏆 Mafiya yutdi! Shahar qo'lga olindi!",
    soloWins: "🏆 {role} yutdi! Yolg'iz qoldi!",
  },
  roles: {
    // Tinch axoli
    civilian: "👨🏼 Tinch axoli",
    doctor: "👨🏼‍⚕️ Shifokor",
    tramp: "🧙🏼‍♂️ Daydi",
    sheriff: "🕵🏻‍♂ Komissar",
    kamikaze: "💣 Kamikaze",
    hooker: "💃 Kezuvchi",
    sergeant: "👮🏻‍♂ Serjant",
    warlock: "⚡️ Koldun",
    santa: "🎅🏻 Qorbobo",
    snowboy: "⛄️ Qorbola",
    // Mafiya
    don: "🤵🏻 Don",
    mafia: "🤵🏼 Mafiya",
    lawyer: "👨🏼‍💼 Advokat",
    spy: "🦇 Ayg'oqchi",
    lab: "👨‍🔬 Labarant",
    // Yakka rollar
    killer: "🔪 Qotil",
    miner: "☠️ Minior",
    sniper: "👨🏻‍🎤 Snayperchi",
    archer: "🏹 Kamonchi",
    traitor: "🦎 Sotqin",
  },
  night: {
    mafiaPrompt: "Kimni o'ldiramiz?",
    sheriffPrompt: "Kimni tekshirasiz?",
    doctorPrompt: "Kimni davolaysiz?",
    hookerPrompt: "Kimni bloklaysiz?",
    donPrompt: "Kimni o'ldiramiz? (Don ovozi hal qiladi)",
    lawyerPrompt: "Qaysi mafiyani himoya qilasiz?",
    spyPrompt: "Kimning rolini bilmoqchisiz?",
    labPrompt: "Kimni tanlaysiz? (Mafiya bo'lsa davolaysiz, bo'lmasa o'ldirasiz)",
    trampPrompt: "Kimning uyiga borasiz?",
    warlockPrompt: "Kimni tanlaysiz? (Tinch axoli bo'lsa himoya, boshqa bo'lsa o'ldiradi)",
    killerPrompt: "Kimni o'ldirasiz?",
    sniperPrompt: "Kimni o'ldirasiz? (Himoyani ham o'tadi)",
    archerPrompt: "Kimni o'ldirasiz? (Maxfiy)",
    minerPrompt: "Kimning eshigiga mina qo'yasiz?",
    traitorPrompt: "Kimni tanlaysiz? (Jamoasi sizning yangi rolingiz)",
    snowboyPrompt: "Kimni qorbo'ron qilasiz?",
    santaPrompt: "Kimga sovg'a berasiz?",
    sergeantPrompt: "Komissar haqida ma'lumot olasiz",
    sheriffResult_town: "✅ {name} — tinch axoli",
    sheriffResult_mafia: "🔴 {name} — mafiya!",
    spyResult: "🦇 {name} — roli: {role}",
    trampResult: "{name} uyiga kelganlar: {visitors}",
    trampWitness: "🔴 {name} uyida qotillik sodir bo'ldi!",
    warlockResult_saved: "✅ {name} — tinch axoli, osilishdan saqladingiz",
    warlockResult_killed: "🔴 {name} — dushman, o'ldirdingiz!",
    labResult_healed: "✅ {name} — mafiya tarafida, davoladingiz",
    labResult_killed: "🔴 {name} — mafiya emas, o'ldirdingiz",
    skip: "O'tkazish",
  },
  errors: {
    alreadyInGame: "Siz allaqachon o'yindasiz!",
    gameInProgress: "Bu guruhda o'yin davom etmoqda!",
    notEnoughPlayers: "Yetarli o'yinchi yo'q! (min: {min})",
    notAdmin: "Bu buyruq faqat adminlar uchun!",
    startBotFirst: "Avval botga shaxsiy xabar yuboring: @{botUsername}",
    notInGame: "Siz o'yinda emassiz!",
    notYourTurn: "Hozir sizning navbatingiz emas!",
    playerDead: "Siz allaqachon o'lik ekansiz!",
    invalidTarget: "Noto'g'ri nishon!",
  },
  stats: {
    header: "📊 {name} statistikasi:",
    gamesPlayed: "O'yinlar: {count}",
    wins: "Yutganlar: {count}",
    rating: "Reyting: {rating} ({rank})",
  },
  buttons: {
    join: "✅ Qo'shilish",
    leave: "❌ Chiqish",
    noVote: "🚫 Hech kimga",
  },
};
```

---

## 12. grammY Custom Context

```typescript
// src/types/context.ts
import { Context, SessionFlavor } from "grammy";
import { PrismaClient } from "@prisma/client";

interface SessionData {
  // session ma'lumotlari
}

interface CustomContextFlavor {
  db: PrismaClient;
  user: {
    id: number;
    telegramId: bigint;
    language: string;
  };
  t: (key: string, params?: Record<string, string>) => string;
}

export type BotContext = Context & SessionFlavor<SessionData> & CustomContextFlavor;
```

---

## 13. Inline Keyboard layoutlar

### 13.1 Ro'yxatga olish

```
┌──────────────────────────────────┐
│  🎭 Mafia o'yini boshlanmoqda!  │
│  O'yinchilar: 3/30              │
│  1. Ali                         │
│  2. Vali                        │
│  3. Soli                        │
│  Vaqt: 45 soniya                │
├────────────────┬─────────────────┤
│  ✅ Qo'shilish │  ❌ Chiqish     │
└────────────────┴─────────────────┘
```

### 13.2 Tundagi harakat (shaxsiy chat)

```
┌──────────────────────────────────┐
│  🔍 Kimni tekshirasiz?          │
│  (Komissar)                     │
├──────────────────────────────────┤
│  👤 Ali                         │
├──────────────────────────────────┤
│  👤 Vali                        │
├──────────────────────────────────┤
│  👤 Soli                        │
├──────────────────────────────────┤
│  🚫 O'tkazish                   │
└──────────────────────────────────┘
```

### 13.3 Ovoz berish

```
┌──────────────────────────────────┐
│  🗳 Kimni chiqaramiz?           │
│  Vaqt: 35 soniya                │
├──────────────────────────────────┤
│  👤 Ali — 3 ovoz                │
├──────────────────────────────────┤
│  👤 Vali — 1 ovoz               │
├──────────────────────────────────┤
│  👤 Soli — 0 ovoz               │
├──────────────────────────────────┤
│  🚫 Hech kimga — 2 ovoz         │
└──────────────────────────────────┘
```

---

## 14. Docker Deployment

### 14.1 docker-compose.yml

```yaml
version: "3.8"

services:
  bot:
    build: .
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - DATABASE_URL=postgresql://mafia:${DB_PASSWORD}@db:5432/mafiabot
      - NODE_ENV=production
    networks:
      - mafianet

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=mafiabot
      - POSTGRES_USER=mafia
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mafia -d mafiabot"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - mafianet

volumes:
  pgdata:

networks:
  mafianet:
```

### 14.2 .env.example

```env
BOT_TOKEN=your_telegram_bot_token
DB_PASSWORD=strong_password_here
DATABASE_URL=postgresql://mafia:strong_password_here@localhost:5432/mafiabot
NODE_ENV=development
```

---

## 15. Rivojlantirish bosqichlari (Roadmap)

### Faza 1 — MVP (1-2 hafta)
- [x] Loyiha strukturasi va konfiguratsiya
- [ ] Prisma schema va migratsiyalar
- [ ] Bot asosiy buyruqlari (`/start`, `/help`)
- [ ] Ro'yxatga olish tizimi
- [ ] Asosiy rollar (Civilian, Mafia, Sheriff)
- [ ] Kecha/kunduz bosqichlari
- [ ] Ovoz berish
- [ ] G'olib aniqlash

### Faza 2 — To'liq rollar (1 hafta)
- [ ] Don roli
- [ ] Shifokor roli
- [ ] Fohisha roli
- [ ] Maniak roli
- [ ] Advokat roli
- [ ] Tergov roli

### Faza 3 — Statistika va reyting (3-5 kun)
- [ ] ELO reyting tizimi
- [ ] Shaxsiy statistika
- [ ] Guruh reytingi
- [ ] Top o'yinchilar

### Faza 4 — Polish (3-5 kun)
- [ ] Ko'p tillilik (uz, ru, en)
- [ ] Sozlamalar paneli
- [ ] Xato boshqarish va logging
- [ ] Docker deployment
- [ ] Performance optimizatsiya

### Faza 5 — Qo'shimcha funksiyalar (keyinchalik)
- [ ] Inline mode (boshqa guruhlarda o'yin boshlash)
- [ ] Turnir rejimi
- [ ] Maxsus rollar (Kamikadze, Barmen, va h.k.)
- [ ] Ovozli xabarlar qo'llab-quvvatlash
- [ ] Web dashboard (statistika)

---

## 16. Muhim texnik qarorlar

### 16.1 Session boshqarish
- grammY o'rnatilgan session **ISHLATILMAYDI** o'yin holati uchun
- O'yin holati `GameManager` ichida **xotirada (in-memory)** saqlanadi
- Faqat doimiy ma'lumotlar (users, stats, game history) PostgreSQL'da saqlanadi
- Sabab: o'yin holati tez o'zgaradi, DB yozish overhead bo'ladi

### 16.2 Mafiya ovoz berish
- Har bir mafiya a'zosi alohida shaxsiy chatda ovoz beradi
- Ko'pchilik ovozi hal qiladi (agar teng bo'lsa — Don hal qiladi)
- Mafiya a'zolariga boshqa a'zolarning ovozlari real-time ko'rsatiladi

### 16.3 Timer boshqarish
- `setTimeout` / `setInterval` ishlatiladi
- Har bir fase uchun alohida timer
- Timer tugagach — harakat qilmaganlar "skip" deb hisoblanadi
- Bot restart bo'lganda barcha timerlar yo'qoladi → aktiv o'yinlar bekor

### 16.4 Concurrent o'yinlar
- Har bir guruhda faqat 1 o'yin
- Lekin bot bir vaqtda ko'p guruhlarda o'yin olib borishi mumkin
- `GameManager.activeGames` — `Map<chatId, GameEngine>` orqali boshqariladi

---

*Oxirgi yangilangan: 2026-04-07*
*Versiya: 1.0*
