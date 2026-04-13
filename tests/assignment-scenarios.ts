import { AssignmentScenario } from "./harness";

// Eslatma: Komissar (SHERIFF) har doim bor; Shifokor (DOCTOR) 6+ o'yinchida;
// Don (DON) 6+ o'yinchida. Qolgan optional rollar random tarqatiladi.
// Hozirgi engine refund qilmaydi — agar rol pool'da yo'q bo'lsa, oddiy rol beriladi.
// repeat>1 — stokhastik testlarni bir necha marta qayta o'tkazish

export const assignmentScenarios: AssignmentScenario[] = [
  // ==================== POSITIVE (rol beriladi) ====================
  {
    name: "Aktiv SHERIFF — har doim beriladi (6 o'yinchi)",
    players: ["A", "B", "C", "D", "E", "F"],
    preferredRoles: { A: "SHERIFF" },
    expectRoles: { A: "SHERIFF" },
    repeat: 10,
  },
  {
    name: "Aktiv SHERIFF — har doim beriladi (10 o'yinchi)",
    players: ["A","B","C","D","E","F","G","H","I","J"],
    preferredRoles: { A: "SHERIFF" },
    expectRoles: { A: "SHERIFF" },
    repeat: 10,
  },
  {
    name: "Aktiv DOCTOR — 6+ o'yinchida beriladi",
    players: ["A", "B", "C", "D", "E", "F"],
    preferredRoles: { B: "DOCTOR" },
    expectRoles: { B: "DOCTOR" },
    repeat: 10,
  },
  {
    name: "Aktiv DOCTOR — 10 o'yinchida beriladi",
    players: ["A","B","C","D","E","F","G","H","I","J"],
    preferredRoles: { B: "DOCTOR" },
    expectRoles: { B: "DOCTOR" },
    repeat: 10,
  },
  {
    name: "Aktiv DON — 6+ o'yinchida beriladi",
    players: ["A", "B", "C", "D", "E", "F", "G"],
    preferredRoles: { C: "DON" },
    expectRoles: { C: "DON" },
    expectDonExists: true,
    repeat: 10,
  },
  {
    name: "Aktiv MAFIA — 9+ o'yinchida beriladi (mafia soni=2)",
    players: ["A","B","C","D","E","F","G","H","I"],
    preferredRoles: { D: "MAFIA" },
    expectRoles: { D: "MAFIA" },
    repeat: 10,
  },
  {
    name: "3 kishi har xil rollarni xohlaydi — hammasi oladi",
    players: ["A","B","C","D","E","F","G","H"],
    preferredRoles: { A: "SHERIFF", B: "DOCTOR", C: "DON" },
    expectRoles: { A: "SHERIFF", B: "DOCTOR", C: "DON" },
    repeat: 10,
  },
  {
    name: "15 o'yinchi — 4 kishi aktiv rol, hammasi oladi",
    players: ["P1","P2","P3","P4","P5","P6","P7","P8","P9","P10","P11","P12","P13","P14","P15"],
    preferredRoles: { P1: "SHERIFF", P2: "DOCTOR", P3: "DON", P4: "MAFIA" },
    expectRoles: { P1: "SHERIFF", P2: "DOCTOR", P3: "DON", P4: "MAFIA" },
    repeat: 10,
  },

  // ==================== NEGATIVE (rol pool'da yo'q) ====================
  {
    name: "Aktiv DON — 5 o'yinchida (Don pool'da yo'q) — berilmaydi",
    players: ["A", "B", "C", "D", "E"],
    preferredRoles: { C: "DON" },
    expectPreferredNotGranted: ["C"],
    expectDonExists: false,
    expectAllAssigned: true,
    repeat: 5,
  },
  {
    name: "Aktiv DOCTOR — 5 o'yinchida (Shifokor pool'da yo'q)",
    players: ["A", "B", "C", "D", "E"],
    preferredRoles: { A: "DOCTOR" },
    expectPreferredNotGranted: ["A"],
    expectAllAssigned: true,
    repeat: 5,
  },
  {
    name: "Aktiv MAFIA — 7 o'yinchida (faqat DON, MAFIA pool'da yo'q)",
    players: ["A", "B", "C", "D", "E", "F", "G"],
    preferredRoles: { D: "MAFIA" },
    expectPreferredNotGranted: ["D"],
    expectAllAssigned: true,
    repeat: 5,
  },

  // ==================== SETTINGS bilan cheklash ====================
  {
    name: "PROFESSOR disabled — aktiv Professor berilmaydi",
    players: ["A","B","C","D","E","F","G","H"],
    preferredRoles: { A: "PROFESSOR" },
    settings: { enableProfessor: false },
    expectPreferredNotGranted: ["A"],
    repeat: 5,
  },
  {
    name: "KILLER disabled — aktiv Killer berilmaydi",
    players: ["A","B","C","D","E","F","G","H"],
    preferredRoles: { A: "KILLER" },
    settings: { enableKiller: false },
    expectPreferredNotGranted: ["A"],
    repeat: 5,
  },
  {
    name: "HOOKER disabled — aktiv Hooker berilmaydi",
    players: ["A","B","C","D","E","F","G","H"],
    preferredRoles: { B: "HOOKER" },
    settings: { enableHooker: false },
    expectPreferredNotGranted: ["B"],
    repeat: 5,
  },
  {
    name: "TRAMP, KAMIKAZE, HOOKER hammasi disabled — aktiv Tramp berilmaydi",
    players: ["A","B","C","D","E","F","G","H","I","J"],
    preferredRoles: { C: "TRAMP" },
    settings: { enableTramp: false, enableKamikaze: false, enableHooker: false },
    expectPreferredNotGranted: ["C"],
    repeat: 5,
  },

  // ==================== KONFLIKT ====================
  {
    name: "2 kishi SHERIFFni xohlaydi — bittasi oladi, bittasi yo'q",
    players: ["A", "B", "C", "D", "E", "F"],
    preferredRoles: { A: "SHERIFF", B: "SHERIFF" },
    // Bir marta o'tkazildi: A yoki B dan bittasi SHERIFF
    expectAllAssigned: true,
    repeat: 10,
  },
  {
    name: "3 kishi DOCTORni xohlaydi — 1 ta DOCTOR mavjud",
    players: ["A","B","C","D","E","F","G"],
    preferredRoles: { A: "DOCTOR", B: "DOCTOR", C: "DOCTOR" },
    expectAllAssigned: true,
    repeat: 10,
  },
  {
    name: "Barcha 6 o'yinchi SHERIFF — 1 oladi, 5 ga oddiy rol",
    players: ["A","B","C","D","E","F"],
    preferredRoles: { A: "SHERIFF", B: "SHERIFF", C: "SHERIFF", D: "SHERIFF", E: "SHERIFF", F: "SHERIFF" },
    expectAllAssigned: true,
    repeat: 5,
  },

  // ==================== CIVILIAN ====================
  {
    name: "Aktiv CIVILIAN — deyarli har doim beriladi (katta o'yin)",
    players: ["A","B","C","D","E","F","G","H"],
    preferredRoles: { A: "CIVILIAN" },
    // 8 o'yinchida CIVILIAN slot ko'p
    expectRoles: { A: "CIVILIAN" },
    repeat: 10,
  },

  // ==================== STOKHASTIK: har kim boshqa rolni xohlaydi ====================
  {
    name: "5 o'yinchi — har biri boshqa aktiv rol, hammasi beriladi (pool-imkoniyatiga qarab)",
    players: ["A","B","C","D","E","F","G","H","I","J","K","L"],
    preferredRoles: {
      A: "SHERIFF",
      B: "DOCTOR",
      C: "DON",
      D: "MAFIA",
      E: "TRAMP",
    },
    expectRoles: { A: "SHERIFF", B: "DOCTOR", C: "DON", D: "MAFIA" },
    // TRAMP optional — stokhastik, tekshirmaymiz
    repeat: 10,
  },

  // ==================== HAMMA ROL OLGAN ====================
  {
    name: "Barcha aktiv rollar — hech kim rolsiz qolmaydi (10 o'y)",
    players: ["A","B","C","D","E","F","G","H","I","J"],
    preferredRoles: { A: "SHERIFF", B: "DOCTOR", C: "DON", D: "MAFIA" },
    expectAllAssigned: true,
    repeat: 10,
  },
];
