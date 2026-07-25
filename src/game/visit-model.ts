// VISIT MODEL - Kim kimni tashrif buyuradi (PRD v2)
// Bu jadval kishi/kishi tashriflarini aniqlash uchun ishlatiladi

export interface VisitRule {
  // Role name
  role: string;
  // Ushbu rol tashrif buyuradimi (uyga keladi)
  visits: boolean;
  // Daydi bu rolni ko'radimi (tashrif buyurgani sifatida)
  seenByTramp: boolean;
  // Minior minasi ushbu rol uchun ishlayadimi
  triggersMiner: boolean;
  // Maxfiy (Daydi sezmaydi)
  stealth?: boolean;
  // Masofaviy (masofadan o'ldiradi - tashrif buyurmaydi)
  ranged?: boolean;
  // Izoh
  notes?: string;
}

// VISIT MODEL JADVALI (PRD v2)
export const VISIT_MODEL: VisitRule[] = [
  // MAFIYA TARAFI
  {
    role: "MAFIA",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Mafiya qotil - uyga keladi, Daydi ko'radi, mina portlaydi"
  },
  {
    role: "DON",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Don ham o'ldiradi, hal qiluvchi ovozi bilan"
  },
  
  // MAJIYA HIMOTALARI (masofaviy - uylariga kirmaydi)
  {
    role: "LAWYER",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    notes: "Masofaviy himoya - uyga kirmaydi, Daydi ko'rmaydi, mina portlamaydi"
  },
  {
    role: "SPY",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    notes: "Masofaviy tekshiruv - uyga kirmaydi"
  },
  {
    role: "LAB",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    notes: "Masofaviy davolash/o'ldirish - uyga kirmaydi"
  },
  
  // TINCH AXOLI FAOL ROLLARI
  {
    role: "SHERIFF",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    notes: "Masofaviy tekshirish/o'tish - uyga kirmaydi"
  },
  {
    role: "SERGEANT",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    notes: "Masofaviy ma'lumot oladi - uyga kirmaydi"
  },
  {
    role: "DOCTOR",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, davolaydi - Daydi ko'radi, mina portlaydi"
  },
  {
    role: "WARLOCK",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, himoya/o'ldirish - Daydi ko'radi, mina portlaydi"
  },
  {
    role: "TRAMP",
    visits: true,
    seenByTramp: false, // O'zi Daydi - o'zini ko'rsatmaymiz
    triggersMiner: true,
    notes: "Uyga keladi, kuzatadi - o'zi Daydi"
  },
  {
    role: "HOOKER",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, bloklaydi - Daydi ko'radi, mina portlaydi"
  },
  {
    role: "WARLOCK",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, himoya/o'ldirish"
  },
  {
    role: "SANTA",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, sovg'a qoldiradi"
  },
  {
    role: "SNOWBOY",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, qorbo'ron qiladi"
  },
  {
    role: "KAMIKAZE",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    notes: "Tunda harakati yo'q - o'zini o'ldiradi (osishda)"
  },
  
  // YAKKA ROLLAR
  {
    role: "KILLER",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, o'ldiradi"
  },
  {
    role: "SNIPER",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    ranged: true,
    notes: "Masofaviy (uzoqdan) o'ldiradi - uyga kirmaydi, Daydi sezmaydi, mina portlamaydi"
  },
  {
    role: "ARCHER",
    visits: true,
    seenByTramp: false,
    triggersMiner: true,
    stealth: true,
    notes: "Maxfiy - Daydi sezmaydi, lekin mina portlaydi"
  },
  {
    role: "MINER",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    notes: "O'z minasi - o'z uyiga emas, boshqalarning uyiga qo'yadi"
  },
  {
    role: "SNOWBOY",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, qorbo'ron qiladi"
  },
  {
    role: "KILLER",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, o'ldiradi"
  },
  {
    role: "ARCHER",
    visits: true,
    seenByTramp: false,
    triggersMiner: true,
    stealth: true,
    notes: "Maxfiy - Daydi sezmaydi, lekin mina portlaydi"
  },
  {
    role: "MINER",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    notes: "O'z minasi - o'z uyiga emas, boshqalarning uyiga qo'yadi"
  },
  {
    role: "SNOWBOY",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, qorbo'ron qiladi"
  },
  {
    role: "TRAITOR",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, rol o'zgartiradi"
  },
  {
    role: "ROBBER",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, pul undiradi/o'ldiradi"
  },
  {
    role: "PROFESSOR",
    visits: true,
    seenByTramp: true,
    triggersMiner: true,
    notes: "Uyga keladi, qutilar taklif qiladi"
  },
  
  // PASSIV ROLLAR
  {
    role: "CIVILIAN",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    notes: "Tunda harakati yo'q"
  },
  {
    role: "KAMIKAZE",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    notes: "Tunda harakati yo'q - o'zini o'ldiradi (osishda)"
  },
  {
    role: "SERGEANT",
    visits: false,
    seenByTramp: false,
    triggersMiner: false,
    notes: "Avtomatik ma'lumot oladi - uyga kirmaydi"
  },
];

// Helper functions
export function getVisitRule(role: string): VisitRule | undefined {
  return VISIT_MODEL.find(v => v.role === role);
}

export function visitsHouse(role: string): boolean {
  const rule = VISIT_MODEL.find(v => v.role === role);
  return rule?.visits ?? false;
}

export function seenByTramp(role: string): boolean {
  const rule = VISIT_MODEL.find(v => v.role === role);
  return rule?.seenByTramp ?? false;
}

export function triggersMiner(role: string): boolean {
  const rule = VISIT_MODEL.find(v => v.role === role);
  return rule?.triggersMiner ?? false;
}

export function isStealth(role: string): boolean {
  const rule = VISIT_MODEL.find(v => v.role === role);
  return rule?.stealth ?? false;
}

export function isRanged(role: string): boolean {
  const rule = VISIT_MODEL.find(v => v.role === role);
  return rule?.ranged ?? false;
}

// Get all roles that visit houses
export function getVisitingRoles(): string[] {
  return VISIT_MODEL.filter(v => v.visits).map(v => v.role);
}

// Get all roles that trigger miner
export function getMinerTriggerRoles(): string[] {
  return VISIT_MODEL.filter(v => v.triggersMiner).map(v => v.role);
}

// Get roles visible to Tramp
export function getTrampVisibleRoles(): string[] {
  return VISIT_MODEL.filter(v => v.seenByTramp).map(v => v.role);
}

// Get stealth roles (Tramp doesn't see)
export function getStealthRoles(): string[] {
  return VISIT_MODEL.filter(v => v.stealth).map(v => v.role);
}

// Get ranged roles (don't visit houses)
export function getRangedRoles(): string[] {
  return VISIT_MODEL.filter(v => v.ranged).map(v => v.role);
}

// For Minior - who does he kill?
export function getMinerVictims(targetVisitors: string[]): string[] {
  // Minior kills everyone who visited the target house EXCEPT:
  // - Mafia (-1 in visitors map)
  // - Miner himself
  // Mafia members themselves don't die from mine
  return []; // Implementation in engine
}

// Export all roles list
export const ALL_ROLES = VISIT_MODEL.map(v => v.role);

// Export night-active roles (for inactivity check)
export const NIGHT_ACTIVE_ROLES = VISIT_MODEL
  .filter(v => v.visits || v.role === "TRAITOR" || v.role === "LAWYER" || v.role === "SPY" || v.role === "LAB")
  .map(v => v.role);