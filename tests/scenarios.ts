import { Scenario } from "./harness";

// Helper — oddiy kill sinarlari
const killTest = (
  name: string,
  killer: { role: string; name: string },
  target: string,
  extraPlayers: string[] = [],
  dead: string[] = [target]
): Scenario => {
  const players = [killer.name, target, ...extraPlayers];
  const roles: any = { [killer.name]: killer.role, [target]: "CIVILIAN" };
  for (const p of extraPlayers) roles[p] = "CIVILIAN";
  const actions: any = {};
  if (killer.role === "DON" || killer.role === "MAFIA") {
    return {
      name, players, roles,
      nights: [{ mafiaVotes: [{ voter: killer.name, target }] }],
      afterNight: [{ dead }],
    };
  }
  if (killer.role === "SHERIFF") {
    return {
      name, players, roles,
      nights: [{ sheriff: { target, mode: "shoot" } }],
      afterNight: [{ dead }],
    };
  }
  actions[killer.role] = target;
  return { name, players, roles, nights: [{ actions }], afterNight: [{ dead }] };
};

const manual: Scenario[] = [
  // ==================== ASOSIY KILL ====================
  {
    name: "Mafiya kechada tinch axolini o'ldiradi",
    players: ["Don", "Sheriff", "Doctor", "Civ1", "Civ2"],
    roles: { Don: "DON", Sheriff: "SHERIFF", Doctor: "DOCTOR", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Civ1" }], actions: { DOCTOR: "Civ2" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },
  {
    name: "Shifokor mafiya nishonini saqlaydi",
    players: ["Don", "Doctor", "Civ1", "Civ2"],
    roles: { Don: "DON", Doctor: "DOCTOR", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Civ1" }], actions: { DOCTOR: "Civ1" } }],
    afterNight: [{ alive: ["Don", "Doctor", "Civ1", "Civ2"] }],
  },
  {
    name: "Shifokor o'zini saqlaydi (1-marta)",
    players: ["Don", "Doctor", "Civ1"],
    roles: { Don: "DON", Doctor: "DOCTOR", Civ1: "CIVILIAN" },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Doctor" }], actions: { DOCTOR: "Doctor" } }],
    afterNight: [{ alive: ["Don", "Doctor", "Civ1"] }],
  },
  {
    name: "Snayper himoyani o'tadi (Doctor saqlay olmaydi)",
    players: ["Sniper", "Doctor", "Civ1", "Civ2"],
    roles: { Sniper: "SNIPER", Doctor: "DOCTOR", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { SNIPER: "Civ1", DOCTOR: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },
  {
    name: "Kamonchi maxfiy o'ldiradi",
    players: ["Archer", "Civ1", "Civ2"],
    roles: { Archer: "ARCHER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { ARCHER: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },
  {
    name: "Qotil kechada o'ldiradi",
    players: ["Killer", "Civ1", "Civ2"],
    roles: { Killer: "KILLER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { KILLER: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },
  {
    name: "Qorbola qorbo'ron bilan o'ldiradi",
    players: ["Snow", "Civ1", "Civ2"],
    roles: { Snow: "SNOWBOY", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { SNOWBOY: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },
  {
    name: "Komissar otish rejimi",
    players: ["Sheriff", "Don", "Civ1"],
    roles: { Sheriff: "SHERIFF", Don: "DON", Civ1: "CIVILIAN" },
    nights: [{ sheriff: { target: "Don", mode: "shoot" } }],
    afterNight: [{ dead: ["Don"] }],
  },
  {
    name: "Komissar faqat tekshiradi (target tirik qoladi)",
    players: ["Sheriff", "Don", "Civ1"],
    roles: { Sheriff: "SHERIFF", Don: "DON", Civ1: "CIVILIAN" },
    nights: [{ sheriff: { target: "Don", mode: "check" } }],
    afterNight: [{ alive: ["Sheriff", "Don", "Civ1"] }],
  },

  // ==================== KEZUVCHI / BLOK ====================
  {
    name: "Kezuvchi Qotilni bloklaydi",
    players: ["Hooker", "Killer", "Civ1", "Civ2"],
    roles: { Hooker: "HOOKER", Killer: "KILLER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { HOOKER: "Killer", KILLER: "Civ1" } }],
    afterNight: [{ alive: ["Hooker", "Killer", "Civ1", "Civ2"] }],
  },
  {
    name: "Kezuvchi Snayperni bloklaydi",
    players: ["Hooker", "Sniper", "Civ1", "Civ2"],
    roles: { Hooker: "HOOKER", Sniper: "SNIPER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { HOOKER: "Sniper", SNIPER: "Civ1" } }],
    afterNight: [{ alive: ["Hooker", "Sniper", "Civ1", "Civ2"] }],
  },
  {
    name: "Kezuvchi Kamonchini bloklaydi",
    players: ["Hooker", "Archer", "Civ1", "Civ2"],
    roles: { Hooker: "HOOKER", Archer: "ARCHER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { HOOKER: "Archer", ARCHER: "Civ1" } }],
    afterNight: [{ alive: ["Hooker", "Archer", "Civ1", "Civ2"] }],
  },
  {
    name: "Kezuvchi Qorbolani bloklaydi",
    players: ["Hooker", "Snow", "Civ1", "Civ2"],
    roles: { Hooker: "HOOKER", Snow: "SNOWBOY", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { HOOKER: "Snow", SNOWBOY: "Civ1" } }],
    afterNight: [{ alive: ["Hooker", "Snow", "Civ1", "Civ2"] }],
  },
  {
    // REGRESSIYA: mafiya o'ldirishi bloklashni umuman tekshirmasdi
    name: "Kezuvchi Donni bloklaydi — mafiya o'ldira olmaydi",
    players: ["Hooker", "Don", "Civ1", "Civ2"],
    roles: { Hooker: "HOOKER", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { HOOKER: "Don" }, mafiaVotes: [{ voter: "Don", target: "Civ1" }] }],
    afterNight: [{ alive: ["Hooker", "Don", "Civ1", "Civ2"] }],
  },
  {
    name: "Kezuvchi bitta mafiyani bloklaydi — Don o'ldiraveradi",
    players: ["Hooker", "Don", "Maf", "Civ1", "Civ2", "Civ3"],
    roles: { Hooker: "HOOKER", Don: "DON", Maf: "MAFIA", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    nights: [{
      actions: { HOOKER: "Maf" },
      mafiaVotes: [{ voter: "Don", target: "Civ1" }, { voter: "Maf", target: "Civ1" }],
    }],
    afterNight: [{ alive: ["Hooker", "Don", "Maf", "Civ2", "Civ3"] }],
  },
  {
    name: "Uxlatilgan o'yinchiga xabar boradi",
    players: ["Hooker", "Don", "Civ1", "Civ2"],
    roles: { Hooker: "HOOKER", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { HOOKER: "Don" }, mafiaVotes: [{ voter: "Don", target: "Civ1" }] }],
    afterNight: [{ eventContains: { HOOKER_BLOCK: ["uxlatishdi"] } }],
  },

  // ==================== DAYDI KUZATUVI ====================
  // REGRESSIYA: Daydi 11-qadamda hisoblanardi, shuning uchun undan keyin
  // yoziladigan tashrifchilarni (Qotil, Qorbola, Qorbobo, Qaroqchi, Professor) ko'rmasdi.
  {
    name: "Daydi Qaroqchi tashrifini ko'radi",
    players: ["Tramp", "Robber", "Civ1", "Civ2"],
    roles: { Tramp: "TRAMP", Robber: "ROBBER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { TRAMP: "Civ1", ROBBER: "Civ1" } }],
    afterNight: [{ eventContains: { TRAMP_VISIT: ["Qaroqchi"] } }],
  },
  {
    name: "Daydi Qorbobo tashrifini ko'radi",
    players: ["Tramp", "Santa", "Civ1", "Civ2"],
    roles: { Tramp: "TRAMP", Santa: "SANTA", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { TRAMP: "Civ1", SANTA: "Civ1" } }],
    afterNight: [{ eventContains: { TRAMP_VISIT: ["Qorbobo"] } }],
  },
  {
    name: "Daydi Qotil tashrifini va qotillikni ko'radi",
    players: ["Tramp", "Killer", "Civ1", "Civ2", "Civ3"],
    roles: { Tramp: "TRAMP", Killer: "KILLER", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    nights: [{ actions: { TRAMP: "Civ1", KILLER: "Civ1" } }],
    afterNight: [{ eventContains: { TRAMP_VISIT: ["Qotil"], TRAMP_WITNESS: ["Civ1"] } }],
  },
  {
    name: "Daydi mafiya tashrifini ko'radi",
    players: ["Tramp", "Don", "Civ1", "Civ2", "Civ3"],
    roles: { Tramp: "TRAMP", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    nights: [{ actions: { TRAMP: "Civ1" }, mafiaVotes: [{ voter: "Don", target: "Civ1" }] }],
    afterNight: [{ eventContains: { TRAMP_VISIT: ["Mafiya"] } }],
  },
  {
    name: "Bloklangan Daydi hech narsa ko'rmaydi",
    players: ["Tramp", "Hooker", "Robber", "Civ1", "Civ2"],
    roles: { Tramp: "TRAMP", Hooker: "HOOKER", Robber: "ROBBER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { HOOKER: "Tramp", TRAMP: "Civ1", ROBBER: "Civ1" } }],
    afterNight: [{ noEvents: ["TRAMP_VISIT"] }],
  },

  // ==================== ADVOKAT ====================
  {
    name: "Advokat mafiyani Komissar tekshiruvidan yashiradi",
    players: ["Don", "Lawyer", "Sheriff", "Civ1"],
    roles: { Don: "DON", Lawyer: "LAWYER", Sheriff: "SHERIFF", Civ1: "CIVILIAN" },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Civ1" }], actions: { LAWYER: "Don" }, sheriff: { target: "Don" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },

  // ==================== LAB ====================
  {
    name: "Labarant mafiyani davolaydi",
    players: ["Lab", "Don", "Doctor", "Civ1"],
    roles: { Lab: "LAB", Don: "DON", Doctor: "DOCTOR", Civ1: "CIVILIAN" },
    nights: [{ actions: { LAB: "Don" }, mafiaVotes: [{ voter: "Don", target: "Civ1" }] }],
    afterNight: [{ dead: ["Civ1"], alive: ["Lab", "Don", "Doctor"] }],
  },
  {
    name: "Labarant tinch axolini o'ldiradi",
    players: ["Lab", "Don", "Civ1", "Civ2"],
    roles: { Lab: "LAB", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { LAB: "Civ2" }, mafiaVotes: [{ voter: "Don", target: "Civ1" }] }],
    afterNight: [{ dead: ["Civ1", "Civ2"] }],
  },

  // ==================== WARLOCK ====================
  {
    name: "Koldun dushmanni o'ldiradi",
    players: ["Warlock", "Killer", "Civ1", "Civ2"],
    roles: { Warlock: "WARLOCK", Killer: "KILLER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { WARLOCK: "Killer", KILLER: "Civ1" } }],
    afterNight: [{ dead: ["Civ1", "Killer"] }],
  },
  {
    name: "Koldun tinch axolini saqlaydi (o'lmaydi)",
    players: ["Warlock", "Civ1", "Civ2", "Civ3"],
    roles: { Warlock: "WARLOCK", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    nights: [{ actions: { WARLOCK: "Civ1" } }],
    afterNight: [{ alive: ["Warlock", "Civ1", "Civ2", "Civ3"] }],
  },

  // ==================== SOTQIN ====================
  {
    name: "Sotqin mafiyani tanlaydi — mafiyaga aylanadi",
    players: ["Traitor", "Don", "Civ1", "Civ2"],
    roles: { Traitor: "TRAITOR", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { TRAITOR: "Don" }, mafiaVotes: [{ voter: "Don", target: "Civ1" }] }],
    afterNight: [{ dead: ["Civ1"] }],
  },
  {
    name: "Sotqin tinch axolini tanlaydi — serjant bo'ladi",
    players: ["Traitor", "Don", "Civ1", "Civ2"],
    roles: { Traitor: "TRAITOR", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { TRAITOR: "Civ1" }, mafiaVotes: [{ voter: "Don", target: "Civ2" }] }],
    afterNight: [{ dead: ["Civ2"] }],
  },
  {
    name: "Sotqin yakka rolni tanlaydi — qotilga aylanadi",
    players: ["Traitor", "Killer", "Civ1", "Civ2"],
    roles: { Traitor: "TRAITOR", Killer: "KILLER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { TRAITOR: "Killer", KILLER: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },

  // ==================== PROFESSOR ====================
  {
    name: "Professor nishonga 3 quti taklif qiladi",
    players: ["Prof", "Civ1", "Civ2", "Civ3"],
    roles: { Prof: "PROFESSOR", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    nights: [{ professor: { target: "Civ1", choice: 0 } }],
    afterNight: [{}],
  },
  {
    name: "Professor — nishon tanlamasa random",
    players: ["Prof", "Civ1", "Civ2"],
    roles: { Prof: "PROFESSOR", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ professor: { target: "Civ1" } }],
    afterNight: [{}],
  },

  // ==================== G'OLIB ====================
  {
    name: "Shahar yutadi — mafiya osilgan",
    players: ["Don", "Sheriff", "Civ1"],
    roles: { Don: "DON", Sheriff: "SHERIFF", Civ1: "CIVILIAN" },
    votes: [{ votes: { Sheriff: "Don", Civ1: "Don", Don: "Sheriff" } }],
    afterVote: [{ dead: ["Don"], winner: "TOWN" }],
    finalWinner: "TOWN",
  },
  {
    name: "Mafiya yutadi — teng soni",
    players: ["Don", "Mafia", "Civ1"],
    roles: { Don: "DON", Mafia: "MAFIA", Civ1: "CIVILIAN" },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Civ1" }, { voter: "Mafia", target: "Civ1" }] }],
    afterNight: [{ dead: ["Civ1"], winner: "MAFIA" }],
    finalWinner: "MAFIA",
  },
  {
    name: "Yakka qotil yutadi — hamma boshqalar o'ldi",
    players: ["Killer", "Civ1", "Civ2"],
    roles: { Killer: "KILLER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { KILLER: "Civ1" } }],
    votes: [{ votes: { Killer: "Civ2", Civ2: "Killer" } }],
    // Teng ovoz → hech kim osilmaydi, lekin keyingi tunda qotil Civ2 ni o'ldirsa yutadi
  },

  // ==================== KAMIKAZE ====================
  {
    name: "Kamikaze osishda Donni olib ketadi",
    players: ["Kami", "Don", "Sheriff", "Civ1"],
    roles: { Kami: "KAMIKAZE", Don: "DON", Sheriff: "SHERIFF", Civ1: "CIVILIAN" },
    votes: [{ votes: { Don: "Kami", Sheriff: "Kami", Civ1: "Kami", Kami: "Don" }, kamikaze: "Don" }],
    afterVote: [{ dead: ["Kami", "Don"] }],
  },
  {
    name: "Kamikaze osilmasa — hech kim olmaydi",
    players: ["Kami", "Sheriff", "Civ1"],
    roles: { Kami: "KAMIKAZE", Sheriff: "SHERIFF", Civ1: "CIVILIAN" },
    votes: [{ votes: { Kami: "Sheriff", Sheriff: "Civ1", Civ1: "Kami" } }],
    // Teng ovoz — hech kim
    afterVote: [{ alive: ["Kami", "Sheriff", "Civ1"] }],
  },

  // ==================== MINIOR ====================
  {
    name: "Minior minasi — Daydi kelsa o'ladi",
    players: ["Miner", "Tramp", "Civ1", "Civ2"],
    roles: { Miner: "MINER", Tramp: "TRAMP", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { MINER: "Civ1", TRAMP: "Civ1" } }],
    afterNight: [{ dead: ["Tramp"] }],
  },
  {
    name: "Minior minasi — boshqa kelmasa hech kim",
    players: ["Miner", "Civ1", "Civ2", "Civ3"],
    roles: { Miner: "MINER", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    nights: [{ actions: { MINER: "Civ1" } }],
    afterNight: [{ alive: ["Miner", "Civ1", "Civ2", "Civ3"] }],
  },

  // ==================== SPY / TRAMP ====================
  {
    name: "Ayg'oqchi rolni biladi",
    players: ["Spy", "Don", "Civ1", "Civ2"],
    roles: { Spy: "SPY", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { SPY: "Civ1" }, mafiaVotes: [{ voter: "Don", target: "Civ2" }] }],
    afterNight: [{ dead: ["Civ2"] }],
  },
  {
    name: "Daydi qotillikka guvoh bo'ladi",
    players: ["Tramp", "Don", "Civ1", "Civ2"],
    roles: { Tramp: "TRAMP", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { TRAMP: "Civ1" }, mafiaVotes: [{ voter: "Don", target: "Civ1" }] }],
    afterNight: [{ dead: ["Civ1"] }],
  },

  // ==================== QAROQCHI ====================
  {
    name: "Qaroqchi — pul beradi, tirik qoladi",
    players: ["Robber", "Civ1", "Civ2"],
    roles: { Robber: "ROBBER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ robber: { target: "Civ1", response: "pay" } }],
    afterNight: [{ alive: ["Robber", "Civ1", "Civ2"] }],
  },
  {
    name: "Qaroqchi — bosh tortadi, o'ladi",
    players: ["Robber", "Civ1", "Civ2"],
    roles: { Robber: "ROBBER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ robber: { target: "Civ1", response: "refuse" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },

  // ==================== OVOZ BERISH ====================
  {
    name: "Teng ovoz — hech kim osilmaydi",
    players: ["A", "B", "C", "D"],
    roles: { A: "CIVILIAN", B: "CIVILIAN", C: "CIVILIAN", D: "DON" },
    votes: [{ votes: { A: "B", B: "A", C: "D", D: "C" } }],
    afterVote: [{ alive: ["A", "B", "C", "D"] }],
  },
  {
    name: "Ko'pchilik ovozi — osiladi",
    players: ["A", "B", "C", "D", "E"],
    roles: { A: "CIVILIAN", B: "CIVILIAN", C: "CIVILIAN", D: "DON", E: "SHERIFF" },
    votes: [{ votes: { A: "D", B: "D", C: "D", D: "A", E: "D" } }],
    afterVote: [{ dead: ["D"] }],
  },

  // ==================== BIRLASHTIRILGAN ====================
  {
    name: "Doctor + Sheriff kombinatsiyasi — mafiya topiladi va osiladi",
    players: ["Don", "Sheriff", "Doctor", "Civ1", "Civ2"],
    roles: { Don: "DON", Sheriff: "SHERIFF", Doctor: "DOCTOR", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Sheriff" }], actions: { DOCTOR: "Sheriff" }, sheriff: { target: "Don" } }],
    votes: [{ votes: { Sheriff: "Don", Doctor: "Don", Civ1: "Don", Civ2: "Sheriff", Don: "Sheriff" } }],
    afterVote: [{ dead: ["Don"], winner: "TOWN" }],
  },

  // ==================== MAFIYA O'Z JAMOASINI O'LDIRMAYDI ====================
  {
    name: "Mafiya o'z a'zosiga ovoz berdi — o'lmaydi",
    players: ["Don", "Mafia", "Civ1"],
    roles: { Don: "DON", Mafia: "MAFIA", Civ1: "CIVILIAN" },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Mafia" }, { voter: "Mafia", target: "Mafia" }] }],
    afterNight: [{ alive: ["Don", "Mafia", "Civ1"] }],
  },

  // ==================== DOCTOR IKKINCHI MARTA O'ZIGA (block) ====================
  {
    name: "Shifokor 2-marta o'zini davolay olmaydi (state)",
    players: ["Don", "Doctor", "Civ1"],
    roles: { Don: "DON", Doctor: "DOCTOR", Civ1: "CIVILIAN" },
    nights: [
      { mafiaVotes: [{ voter: "Don", target: "Doctor" }], actions: { DOCTOR: "Doctor" } },
      { mafiaVotes: [{ voter: "Don", target: "Doctor" }], actions: { DOCTOR: "Doctor" } },
    ],
    // 2-chi tunda doctorSelfHealUsed tekshirilishi kerak, ammo harness buni engine state orqali tekshiradi
  },
];

// ==================== GENERATIVE: Har rol uchun takror variatsiyalar ====================

const simpleKillers: { role: string; alias: string }[] = [
  { role: "KILLER", alias: "Killer" },
  { role: "SNIPER", alias: "Sniper" },
  { role: "ARCHER", alias: "Archer" },
  { role: "SNOWBOY", alias: "Snow" },
];

const generated: Scenario[] = [];

// Har qotil × 3 ta Civ variant (3/4/5 kishi)
for (const k of simpleKillers) {
  for (let n = 2; n <= 5; n++) {
    const extras = Array.from({ length: n }, (_, i) => `X${i + 1}`);
    const players = [k.alias, ...extras];
    const roles: any = { [k.alias]: k.role };
    for (const e of extras) roles[e] = "CIVILIAN";
    generated.push({
      name: `${k.role} o'ldiradi (${n + 1} o'yinchi, nishon=X1)`,
      players, roles,
      nights: [{ actions: { [k.role]: "X1" } }],
      afterNight: [{ dead: ["X1"] }],
    });
  }
}

// Hooker har qotilni bloklaydi (repeat)
for (const k of simpleKillers) {
  for (let n = 2; n <= 4; n++) {
    const extras = Array.from({ length: n }, (_, i) => `Y${i + 1}`);
    const players = ["Hk", k.alias, ...extras];
    const roles: any = { Hk: "HOOKER", [k.alias]: k.role };
    for (const e of extras) roles[e] = "CIVILIAN";
    generated.push({
      name: `Hooker ${k.role}ni bloklaydi (${n + 2} o'yinchi)`,
      players, roles,
      nights: [{ actions: { HOOKER: k.alias, [k.role]: "Y1" } }],
      afterNight: [{ alive: players }],
    });
  }
}

// Doctor har qotildan saqlaydi (Sniper-dan tashqari)
for (const k of simpleKillers.filter((x) => x.role !== "SNIPER")) {
  for (let n = 1; n <= 4; n++) {
    const extras = Array.from({ length: n }, (_, i) => `Z${i + 1}`);
    const players = ["Doc", k.alias, "Target", ...extras];
    const roles: any = { Doc: "DOCTOR", [k.alias]: k.role, Target: "CIVILIAN" };
    for (const e of extras) roles[e] = "CIVILIAN";
    generated.push({
      name: `Doctor ${k.role}dan saqlaydi (${players.length} o'yinchi)`,
      players, roles,
      nights: [{ actions: { [k.role]: "Target", DOCTOR: "Target" } }],
      afterNight: [{ alive: players }],
    });
  }
}

// Mafia kill N players
for (let n = 3; n <= 8; n++) {
  const civs = Array.from({ length: n }, (_, i) => `C${i + 1}`);
  const players = ["Don", "Sheriff", ...civs];
  const roles: any = { Don: "DON", Sheriff: "SHERIFF" };
  for (const c of civs) roles[c] = "CIVILIAN";
  generated.push({
    name: `Mafiya C1ni o'ldiradi (${players.length} o'yinchi)`,
    players, roles,
    nights: [{ mafiaVotes: [{ voter: "Don", target: "C1" }] }],
    afterNight: [{ dead: ["C1"] }],
  });
}

// Komissar otish rejimi — har N
for (let n = 2; n <= 6; n++) {
  const civs = Array.from({ length: n }, (_, i) => `V${i + 1}`);
  const players = ["Sh", "Dn", ...civs];
  const roles: any = { Sh: "SHERIFF", Dn: "DON" };
  for (const c of civs) roles[c] = "CIVILIAN";
  generated.push({
    name: `Sheriff Donni otadi (${players.length} o'yinchi)`,
    players, roles,
    nights: [{ sheriff: { target: "Dn", mode: "shoot" } }],
    afterNight: [{ dead: ["Dn"] }],
  });
}

// Professor random choice (faqat xato bo'lmasin)
for (let n = 3; n <= 8; n++) {
  const extras = Array.from({ length: n }, (_, i) => `P${i + 1}`);
  const players = ["Prof", ...extras];
  const roles: any = { Prof: "PROFESSOR" };
  for (const e of extras) roles[e] = "CIVILIAN";
  for (const choice of [0, 1, 2]) {
    generated.push({
      name: `Professor P1ga (choice=${choice}, ${players.length} o'yinchi)`,
      players, roles,
      nights: [{ professor: { target: "P1", choice } }],
      afterNight: [{}],
    });
  }
}

// Qaroqchi pay/refuse har N
for (const resp of ["pay", "refuse"] as const) {
  for (let n = 2; n <= 4; n++) {
    const extras = Array.from({ length: n }, (_, i) => `R${i + 1}`);
    const players = ["Rob", ...extras];
    const roles: any = { Rob: "ROBBER" };
    for (const e of extras) roles[e] = "CIVILIAN";
    generated.push({
      name: `Qaroqchi (${resp}, ${players.length} o'yinchi)`,
      players, roles,
      nights: [{ robber: { target: "R1", response: resp } }],
      afterNight: resp === "pay"
        ? [{ alive: players }]
        : [{ dead: ["R1"] }],
    });
  }
}

// Ovoz berish variatsiyalari — ko'pchilik osiladi
for (let n = 3; n <= 6; n++) {
  const voters = Array.from({ length: n }, (_, i) => `U${i + 1}`);
  const target = "U1";
  const roles: any = { U1: "DON" };
  for (let i = 1; i < n; i++) roles[voters[i]] = "CIVILIAN";
  const votes: any = {};
  for (let i = 1; i < n; i++) votes[voters[i]] = target;
  votes[target] = voters[1];
  generated.push({
    name: `${n} o'yinchi — ko'pchilik U1ni osdi`,
    players: voters, roles,
    votes: [{ votes }],
    afterVote: [{ dead: [target] }],
  });
}

// Archer vs Tramp — Tramp sezmaydi
for (let n = 2; n <= 4; n++) {
  const extras = Array.from({ length: n }, (_, i) => `T${i + 1}`);
  const players = ["Ar", "Tr", ...extras];
  const roles: any = { Ar: "ARCHER", Tr: "TRAMP" };
  for (const e of extras) roles[e] = "CIVILIAN";
  generated.push({
    name: `Archer maxfiy — Tramp sezmaydi (${players.length} o'y)`,
    players, roles,
    nights: [{ actions: { ARCHER: "T1", TRAMP: "T1" } }],
    afterNight: [{ dead: ["T1"] }],
  });
}

// ==================== SHIELD / HUJJAT / GEROY / AKTIV ROL ====================

const inventoryScenarios: Scenario[] = [
  // -------- SHIELD --------
  {
    name: "Shield mafiya o'q'idan saqlaydi (sarflanadi)",
    players: ["Don", "Civ1", "Civ2"],
    roles: { Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Civ1: { shield: true } },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Civ1" }] }],
    afterNight: [{
      alive: ["Don", "Civ1", "Civ2"],
      inventory: { Civ1: { shield: false } }, // sarflandi
    }],
  },
  {
    name: "Shield Snayperdan saqlamaydi (shield bypass)",
    players: ["Sniper", "Civ1", "Civ2"],
    roles: { Sniper: "SNIPER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Civ1: { shield: true } },
    nights: [{ actions: { SNIPER: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },
  // Regressiya: killTargets — Map, shuning uchun Snayperdan KEYIN ishlaydigan qotil
  // (Kamonchi/Qorbola/Qaroqchi/Professor) o'lim sababini almashtirib yuborardi va
  // "cause !== SNIPER_KILL" tekshiruvi aldanib, Shield snayper o'qini to'sib qolardi.
  {
    name: "Shield Snayperdan saqlamaydi — Kamonchi ham otgan bo'lsa ham",
    players: ["Sniper", "Archer", "Civ1", "Civ2"],
    roles: { Sniper: "SNIPER", Archer: "ARCHER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Civ1: { shield: true } },
    nights: [{ actions: { SNIPER: "Civ1", ARCHER: "Civ1" } }],
    // Shield sarflanmaydi ham — snayper o'qini to'smaydi
    afterNight: [{ dead: ["Civ1"], inventory: { Civ1: { shield: true } } }],
  },
  {
    name: "Shield Snayperdan saqlamaydi — Qorbola ham urgan bo'lsa ham",
    players: ["Sniper", "Snow", "Civ1", "Civ2"],
    roles: { Sniper: "SNIPER", Snow: "SNOWBOY", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Civ1: { shield: true } },
    nights: [{ actions: { SNIPER: "Civ1", SNOWBOY: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },
  {
    name: "Shield Snayperdan saqlamaydi — Qaroqchi ham o'ldirmoqchi bo'lsa ham",
    players: ["Sniper", "Rob", "Civ1", "Civ2"],
    roles: { Sniper: "SNIPER", Rob: "ROBBER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Civ1: { shield: true } },
    nights: [{ actions: { SNIPER: "Civ1" }, robber: { target: "Civ1", response: "refuse" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },
  {
    name: "Snayper + Kamonchi + Shifokor — davolash ham o'tmaydi",
    players: ["Sniper", "Archer", "Doctor", "Civ1", "Civ2"],
    roles: { Sniper: "SNIPER", Archer: "ARCHER", Doctor: "DOCTOR", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { SNIPER: "Civ1", ARCHER: "Civ1", DOCTOR: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"] }],
  },
  {
    name: "Snayper + Kamonchi — Tan qo'riqchisi o'zini tashlamaydi (tirik qoladi)",
    players: ["Sniper", "Archer", "BG", "Civ1", "Civ2"],
    roles: { Sniper: "SNIPER", Archer: "ARCHER", BG: "BODYGUARD", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { SNIPER: "Civ1", ARCHER: "Civ1", BODYGUARD: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"], alive: ["Sniper", "Archer", "BG", "Civ2"] }],
  },
  {
    name: "Kamonchi + Tan qo'riqchisi (snaypersiz) — qo'riqchi jonini beradi",
    players: ["Archer", "BG", "Civ1", "Civ2"],
    roles: { Archer: "ARCHER", BG: "BODYGUARD", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { ARCHER: "Civ1", BODYGUARD: "Civ1" } }],
    afterNight: [{ dead: ["BG"], alive: ["Archer", "Civ1", "Civ2"] }],
  },
  {
    name: "Shield Qotil o'q'idan saqlaydi",
    players: ["Killer", "Civ1", "Civ2"],
    roles: { Killer: "KILLER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Civ1: { shield: true } },
    nights: [{ actions: { KILLER: "Civ1" } }],
    afterNight: [{ alive: ["Killer", "Civ1", "Civ2"], inventory: { Civ1: { shield: false } } }],
  },
  {
    name: "Shield Kamonchidan saqlaydi",
    players: ["Archer", "Civ1", "Civ2"],
    roles: { Archer: "ARCHER", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Civ1: { shield: true } },
    nights: [{ actions: { ARCHER: "Civ1" } }],
    afterNight: [{ alive: ["Archer", "Civ1", "Civ2"], inventory: { Civ1: { shield: false } } }],
  },
  {
    name: "Shield Qorboladan saqlaydi",
    players: ["Snow", "Civ1", "Civ2"],
    roles: { Snow: "SNOWBOY", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Civ1: { shield: true } },
    nights: [{ actions: { SNOWBOY: "Civ1" } }],
    afterNight: [{ alive: ["Snow", "Civ1", "Civ2"], inventory: { Civ1: { shield: false } } }],
  },
  {
    name: "Shield 2 marta ishlamaydi — 1-marta sarflanadi, 2-marta o'ladi",
    players: ["Don", "Mafia", "Civ1"],
    roles: { Don: "DON", Mafia: "MAFIA", Civ1: "CIVILIAN" },
    inventory: { Civ1: { shield: true } },
    nights: [
      { mafiaVotes: [{ voter: "Don", target: "Civ1" }, { voter: "Mafia", target: "Civ1" }] },
      { mafiaVotes: [{ voter: "Don", target: "Civ1" }, { voter: "Mafia", target: "Civ1" }] },
    ],
    afterNight: [
      { alive: ["Don", "Mafia", "Civ1"], inventory: { Civ1: { shield: false } } },
      { dead: ["Civ1"] },
    ],
  },
  {
    name: "Shield + Doctor — Shield birinchi ishlatiladi",
    players: ["Don", "Doctor", "Civ1"],
    roles: { Don: "DON", Doctor: "DOCTOR", Civ1: "CIVILIAN" },
    inventory: { Civ1: { shield: true } },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Civ1" }], actions: { DOCTOR: "Civ1" } }],
    afterNight: [{ alive: ["Don", "Doctor", "Civ1"] }],
  },
  {
    name: "Shield Labarantdan saqlaydi",
    players: ["Lab", "Don", "Civ1", "Civ2"],
    roles: { Lab: "LAB", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Civ2: { shield: true } },
    nights: [{ actions: { LAB: "Civ2" }, mafiaVotes: [{ voter: "Don", target: "Civ1" }] }],
    afterNight: [{ dead: ["Civ1"], alive: ["Lab", "Don", "Civ2"], inventory: { Civ2: { shield: false } } }],
  },
  {
    name: "Shield Koldundan saqlaydi",
    players: ["Warlock", "Killer", "Civ1"],
    roles: { Warlock: "WARLOCK", Killer: "KILLER", Civ1: "CIVILIAN" },
    inventory: { Killer: { shield: true } },
    nights: [{ actions: { WARLOCK: "Killer" } }],
    afterNight: [{ alive: ["Warlock", "Killer", "Civ1"], inventory: { Killer: { shield: false } } }],
  },

  // -------- HUJJAT --------
  {
    name: "Hujjat Komissar tekshiruvini aldaydi va sarflanadi",
    players: ["Sheriff", "Don", "Civ1"],
    roles: { Sheriff: "SHERIFF", Don: "DON", Civ1: "CIVILIAN" },
    inventory: { Don: { document: true } },
    nights: [{ sheriff: { target: "Don", mode: "check" } }],
    afterNight: [{ inventory: { Don: { document: false } } }],
  },
  {
    name: "Hujjat Sheriff otishda ishlamaydi (faqat check)",
    players: ["Sheriff", "Don"],
    roles: { Sheriff: "SHERIFF", Don: "DON" },
    inventory: { Don: { document: true } },
    nights: [{ sheriff: { target: "Don", mode: "shoot" } }],
    afterNight: [{ dead: ["Don"], inventory: { Don: { document: true } } }],
  },
  {
    name: "Hujjat 1-marta ishlaydi, 2-marta yo'q",
    players: ["Sheriff", "Don", "Civ1"],
    roles: { Sheriff: "SHERIFF", Don: "DON", Civ1: "CIVILIAN" },
    inventory: { Don: { document: true } },
    nights: [
      { sheriff: { target: "Don", mode: "check" } },
      { sheriff: { target: "Don", mode: "check" } },
    ],
    afterNight: [
      { inventory: { Don: { document: false } } },
      { inventory: { Don: { document: false } } },
    ],
  },

  // -------- SHIELD + HUJJAT birgalikda --------
  {
    name: "Shield va Hujjat bir vaqtda (ikki xil himoya)",
    players: ["Sheriff", "Don", "Civ1"],
    roles: { Sheriff: "SHERIFF", Don: "DON", Civ1: "CIVILIAN" },
    inventory: { Don: { shield: true, document: true } },
    nights: [{ sheriff: { target: "Don", mode: "check" }, mafiaVotes: [{ voter: "Don", target: "Sheriff" }] }],
    afterNight: [{ dead: ["Sheriff"], inventory: { Don: { shield: true, document: false } } }],
  },

  // -------- GEROY (Professor qutisidan) --------
  {
    name: "Professor qutisi Geroyni beradi (choice=0)",
    players: ["Prof", "Civ1", "Civ2", "Civ3"],
    roles: { Prof: "PROFESSOR", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    nights: [{ professor: { target: "Civ1", choice: 0 } }],
    // choice 0 aralashtirilgan — determinal emas, faqat xato bo'lmasin
    afterNight: [{}],
  },
  {
    name: "Geroy boshidan faol — inventory tekshiruvi",
    players: ["Don", "Civ1"],
    roles: { Don: "DON", Civ1: "CIVILIAN" },
    inventory: { Civ1: { hero: true } },
    afterNight: [{ inventory: { Civ1: { hero: true } } }],
    nights: [{}],
  },

  // -------- AKTIV ROL (preferredRole) --------
  // Eslatma: scenariy'da engine.assignRoles() chaqirilmaydi (biz rolni qo'lda beramiz),
  // shuning uchun preferredRole faqat PlayerState'da yoziladi va o'yin davomida ta'sir qilmaydi.
  // Lekin inventory flag sifatida tekshirsak bo'ladi.
  {
    name: "Aktiv rol — preferredRole state'da saqlanadi",
    players: ["P1", "P2", "P3"],
    roles: { P1: "DON", P2: "SHERIFF", P3: "CIVILIAN" },
    inventory: { P1: { preferredRole: "DON" } },
    afterNight: [{}],
    nights: [{}],
  },
];

// Shield har qotil uchun avtomatik
const shieldVsKillers: { role: string; alias: string; shouldDie: boolean }[] = [
  { role: "KILLER", alias: "Killer", shouldDie: false },
  { role: "SNIPER", alias: "Sniper", shouldDie: true },  // sniper shield'ni o'tadi
  { role: "ARCHER", alias: "Archer", shouldDie: false },
  { role: "SNOWBOY", alias: "Snow", shouldDie: false },
];

const shieldGen: Scenario[] = [];
for (const k of shieldVsKillers) {
  for (let n = 1; n <= 3; n++) {
    const extras = Array.from({ length: n }, (_, i) => `E${i + 1}`);
    const players = [k.alias, "Target", ...extras];
    const roles: any = { [k.alias]: k.role, Target: "CIVILIAN" };
    for (const e of extras) roles[e] = "CIVILIAN";
    shieldGen.push({
      name: `Shield vs ${k.role} (${players.length} o'yinchi) — ${k.shouldDie ? "o'ladi" : "saqlaydi"}`,
      players, roles,
      inventory: { Target: { shield: true } },
      nights: [{ actions: { [k.role]: "Target" } }],
      afterNight: [k.shouldDie
        ? { dead: ["Target"] }
        : { alive: players, inventory: { Target: { shield: false } } }],
    });
  }
}

// Hujjat har N o'yinchi uchun
const docGen: Scenario[] = [];
for (let n = 1; n <= 4; n++) {
  const extras = Array.from({ length: n }, (_, i) => `D${i + 1}`);
  const players = ["Sh", "Dn", ...extras];
  const roles: any = { Sh: "SHERIFF", Dn: "DON" };
  for (const e of extras) roles[e] = "CIVILIAN";
  docGen.push({
    name: `Hujjat Komissarni aldaydi (${players.length} o'yinchi)`,
    players, roles,
    inventory: { Dn: { document: true } },
    nights: [{ sheriff: { target: "Dn", mode: "check" } }],
    afterNight: [{ inventory: { Dn: { document: false } } }],
  });
}


// ==================== KAMIKAZE + SNAYPER O'QI (yangi) ====================
// Kamikaze: osilganda tanlagan odamni olib ketadi VA tunda uni o'ldirgan qotil ham portlaydi.
// Snayper o'qi: Shieldga teskari inventar — barcha himoyani yorib o'tadi, Shieldni parchalaydi.
const kamikazeAndBullet: Scenario[] = [
  // ==================== KAMIKAZE ====================
  {
    name: "Kamikaze osilganda tanlagan odamni o'zi bilan olib ketadi",
    players: ["Kam", "Don", "Civ1", "Civ2", "Civ3"],
    roles: { Kam: "KAMIKAZE", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    votes: [{ votes: { Don: "Kam", Civ1: "Kam", Civ2: "Kam", Civ3: "Kam" }, kamikaze: "Civ1" }],
    afterVote: [{ dead: ["Kam", "Civ1"], alive: ["Don", "Civ2", "Civ3"] }],
  },
  {
    name: "Kamikaze osilib hech kimni tanlamasa — faqat o'zi o'ladi",
    players: ["Kam", "Don", "Civ1", "Civ2"],
    roles: { Kam: "KAMIKAZE", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    votes: [{ votes: { Don: "Kam", Civ1: "Kam", Civ2: "Kam" } }],
    afterVote: [{ dead: ["Kam"], alive: ["Don", "Civ1", "Civ2"] }],
  },
  {
    name: "Kamikaze mafiyani o'zi bilan olib ketadi (osilganda)",
    players: ["Kam", "Don", "Mafia", "Civ1", "Civ2"],
    roles: { Kam: "KAMIKAZE", Don: "DON", Mafia: "MAFIA", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    votes: [{ votes: { Civ1: "Kam", Civ2: "Kam", Don: "Kam" }, kamikaze: "Don" }],
    afterVote: [{ dead: ["Kam", "Don"], alive: ["Mafia", "Civ1", "Civ2"] }],
  },
  {
    name: "Mafiya tunda Kamikazeni o'ldirsa — Don ham portlashdan o'ladi",
    players: ["Don", "Kam", "Civ1", "Civ2", "Civ3"],
    roles: { Don: "DON", Kam: "KAMIKAZE", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Kam" }] }],
    afterNight: [{ dead: ["Kam", "Don"], alive: ["Civ1", "Civ2", "Civ3"] }],
  },
  {
    name: "Qotil tunda Kamikazeni o'ldirsa — Qotil ham o'ladi",
    players: ["Killer", "Kam", "Civ1", "Civ2"],
    roles: { Killer: "KILLER", Kam: "KAMIKAZE", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { KILLER: "Kam" } }],
    afterNight: [{ dead: ["Kam", "Killer"], alive: ["Civ1", "Civ2"] }],
  },
  {
    name: "Kamikaze tunda Shifokor saqlab qolsa — portlash bo'lmaydi",
    players: ["Don", "Doctor", "Kam", "Civ1", "Civ2"],
    roles: { Don: "DON", Doctor: "DOCTOR", Kam: "KAMIKAZE", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Kam" }], actions: { DOCTOR: "Kam" } }],
    afterNight: [{ alive: ["Don", "Doctor", "Kam", "Civ1", "Civ2"] }],
  },
  {
    name: "Kamikaze Shieldi ishlasa — portlash bo'lmaydi",
    players: ["Killer", "Kam", "Civ1", "Civ2"],
    roles: { Killer: "KILLER", Kam: "KAMIKAZE", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Kam: { shield: true } },
    nights: [{ actions: { KILLER: "Kam" } }],
    afterNight: [{ alive: ["Killer", "Kam", "Civ1", "Civ2"], inventory: { Kam: { shield: false } } }],
  },
  {
    name: "Snayper Kamikazeni otsa — Snayper ham portlashdan o'ladi",
    players: ["Sniper", "Kam", "Civ1", "Civ2"],
    roles: { Sniper: "SNIPER", Kam: "KAMIKAZE", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    nights: [{ actions: { SNIPER: "Kam" } }],
    afterNight: [{ dead: ["Kam", "Sniper"], alive: ["Civ1", "Civ2"] }],
  },

  // ==================== SNAYPER O'QI (inventar) ====================
  {
    name: "Snayper o'qi Shieldni parchalaydi — nishon o'ladi, o'q sarflanadi",
    players: ["Killer", "Civ1", "Civ2", "Civ3"],
    roles: { Killer: "KILLER", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    inventory: { Killer: { bullet: true }, Civ1: { shield: true } },
    nights: [{ actions: { KILLER: "Civ1" } }],
    afterNight: [{
      dead: ["Civ1"],
      alive: ["Killer", "Civ2", "Civ3"],
      inventory: { Civ1: { shield: false }, Killer: { bullet: false } },
    }],
  },
  {
    name: "Snayper o'qi Shifokor davolashini yorib o'tadi",
    players: ["Killer", "Doctor", "Civ1", "Civ2"],
    roles: { Killer: "KILLER", Doctor: "DOCTOR", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Killer: { bullet: true } },
    nights: [{ actions: { KILLER: "Civ1", DOCTOR: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"], inventory: { Killer: { bullet: false } } }],
  },
  {
    name: "Snayper o'qi Tan qo'riqchisini yorib o'tadi — qo'riqchi tirik qoladi",
    players: ["Killer", "BG", "Civ1", "Civ2"],
    roles: { Killer: "KILLER", BG: "BODYGUARD", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Killer: { bullet: true } },
    nights: [{ actions: { KILLER: "Civ1", BODYGUARD: "Civ1" } }],
    afterNight: [{
      dead: ["Civ1"],
      alive: ["Killer", "BG", "Civ2"],
      inventory: { Killer: { bullet: false } },
    }],
  },
  {
    name: "Snayper o'qi himoyasiz odamda SARFLANMAYDI",
    players: ["Killer", "Civ1", "Civ2", "Civ3"],
    roles: { Killer: "KILLER", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    inventory: { Killer: { bullet: true } },
    nights: [{ actions: { KILLER: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"], inventory: { Killer: { bullet: true } } }],
  },
  {
    name: "Snayper o'qi tinch rolda sarflanmaydi (hech kimni o'ldirmadi)",
    players: ["Doctor", "Don", "Civ1", "Civ2"],
    roles: { Doctor: "DOCTOR", Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN" },
    inventory: { Doctor: { bullet: true } },
    nights: [{ actions: { DOCTOR: "Civ1" }, mafiaVotes: [{ voter: "Don", target: "Civ1" }] }],
    afterNight: [{ alive: ["Doctor", "Don", "Civ1", "Civ2"], inventory: { Doctor: { bullet: true } } }],
  },
  {
    name: "Snayper o'qi Mafiya o'ldirishida ham ishlaydi (Don o'q egasi)",
    players: ["Don", "Civ1", "Civ2", "Civ3"],
    roles: { Don: "DON", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    inventory: { Don: { bullet: true }, Civ1: { shield: true } },
    nights: [{ mafiaVotes: [{ voter: "Don", target: "Civ1" }] }],
    afterNight: [{
      dead: ["Civ1"],
      inventory: { Civ1: { shield: false }, Don: { bullet: false } },
    }],
  },
  {
    name: "Snayper o'qi Kamonchida ham ishlaydi",
    players: ["Archer", "Civ1", "Civ2", "Civ3"],
    roles: { Archer: "ARCHER", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    inventory: { Archer: { bullet: true }, Civ1: { shield: true } },
    nights: [{ actions: { ARCHER: "Civ1" } }],
    afterNight: [{ dead: ["Civ1"], inventory: { Archer: { bullet: false }, Civ1: { shield: false } } }],
  },
  {
    name: "Snayper o'qi 2-tunda ishlamaydi (1 marta sarflanadi)",
    players: ["Killer", "Civ1", "Civ2", "Civ3"],
    roles: { Killer: "KILLER", Civ1: "CIVILIAN", Civ2: "CIVILIAN", Civ3: "CIVILIAN" },
    inventory: { Killer: { bullet: true }, Civ1: { shield: true }, Civ2: { shield: true } },
    nights: [{ actions: { KILLER: "Civ1" } }, { actions: { KILLER: "Civ2" } }],
    afterNight: [
      { dead: ["Civ1"], inventory: { Killer: { bullet: false } } },
      // 2-tun: Civ2 shieldi ishlaydi, tirik qoladi
      { alive: ["Killer", "Civ2", "Civ3"], inventory: { Civ2: { shield: false } } },
    ],
  },
];

export const scenarios: Scenario[] = [...manual, ...generated, ...inventoryScenarios, ...shieldGen, ...docGen, ...kamikazeAndBullet];

