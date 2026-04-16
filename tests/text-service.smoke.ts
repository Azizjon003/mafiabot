// Text service smoke test — Faza 1-4 integratsiyasi
// Ishga tushirish: npx tsx tests/text-service.smoke.ts

import { textService, t, validateHtml } from "../src/services/text.service";
import { TEXT_DEFAULTS, TEXT_CATEGORIES } from "../src/services/text-defaults";
import { prisma } from "../src/database/prisma";

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function assert(name: string, cond: boolean, detail?: string) {
  results.push({ name, ok: cond, detail: cond ? undefined : detail });
}

async function main() {
  console.log("🧪 Text service smoke testi boshlanmoqda...\n");

  // 1. Default'lar yuklangan
  assert(
    "TEXT_DEFAULTS 150+ kalit bor",
    Object.keys(TEXT_DEFAULTS).length >= 150,
    `Kalitlar soni: ${Object.keys(TEXT_DEFAULTS).length}`
  );

  // 2. Kategoriyalar
  assert(
    "14 kategoriya ro'yxatda",
    TEXT_CATEGORIES.length >= 13,
    `Kategoriya: ${TEXT_CATEGORIES.length}`
  );

  // 3. preloadAll
  await textService.preloadAll();
  assert("preloadAll() ishladi", textService.isPreloaded());

  // 4. t() — oddiy default
  const welcome = t("start.welcome");
  assert("t('start.welcome') default qaytardi", welcome.includes("xush kelibsiz"), `Olindi: ${welcome.slice(0, 40)}`);

  // 5. t() — placeholder
  const rendered = t("game.notEnoughPlayers", { min: 5 });
  assert(
    "Placeholder {min} → 5",
    rendered.includes("5") && !rendered.includes("{min}"),
    `Olindi: ${rendered}`
  );

  // 6. Noma'lum kalit — key o'zi qaytadi
  const unknown = t("foo.bar.nonexistent");
  assert("Noma'lum kalit key o'zi", unknown === "foo.bar.nonexistent", `Olindi: ${unknown}`);

  // 7. validateHtml — to'g'ri HTML
  const good = validateHtml("<b>salom</b> <i>dunyo</i>");
  assert("Valid HTML qabul qilinadi", good.ok);

  // 8. validateHtml — yopilmagan tag
  const bad = validateHtml("<b>ochiq qoldi");
  assert("Yopilmagan tag rad etiladi", !bad.ok);

  // 9. validateHtml — noto'g'ri ketma-ketlik
  const mismatch = validateHtml("<b><i>salom</b></i>");
  assert("Mos kelmagan teglar rad etiladi", !mismatch.ok);

  // 10. setText + cache
  const testKey = "game.noActiveGame";
  const testValue = "TEST " + Date.now();
  const setRes = await textService.setText(testKey, testValue, BigInt(999999));
  assert("setText() ok", setRes.ok);

  const readBack = t(testKey);
  assert(
    "setText keyin t() yangi qiymat qaytardi",
    readBack === testValue,
    `Kutilgan: ${testValue}, olingan: ${readBack}`
  );
  assert("isCustom() true qaytardi", textService.isCustom(testKey));

  // 11. Audit log yaratildi
  const history = await textService.getHistory(testKey, 5);
  assert("Audit log yozildi", history.length >= 1, `Tarix: ${history.length} ta`);
  if (history.length > 0) {
    assert("Audit yozuvida newValue to'g'ri", history[0].newValue === testValue);
    assert("Audit yozuvida editorTgId to'g'ri", history[0].editorTgId === BigInt(999999));
  }

  // 12. setText — noto'g'ri HTML rad etiladi
  const badSet = await textService.setText(testKey, "<b>yopilmagan", BigInt(999999));
  assert("setText noto'g'ri HTML rad etdi", !badSet.ok);

  // 13. resetText
  await textService.resetText(testKey, BigInt(999999));
  assert("resetText keyin isCustom=false", !textService.isCustom(testKey));
  const afterReset = t(testKey);
  assert(
    "resetText keyin default qaytadi",
    afterReset === TEXT_DEFAULTS[testKey],
    `Olindi: ${afterReset}`
  );

  // 14. search
  const searchResults = textService.search("mafiya");
  assert("search('mafiya') topdi", searchResults.length > 0, `Natija: ${searchResults.length}`);

  // 15. getKeysByPrefix
  const nightStoryKeys = textService.getKeysByPrefix("nightStory.");
  assert(
    "getKeysByPrefix('nightStory.') 20+ topdi",
    nightStoryKeys.length >= 20,
    `Topildi: ${nightStoryKeys.length}`
  );

  // 16. exportCustoms / importCustoms round-trip
  await textService.setText("errors.notInGame", "IMPORT-TEST", BigInt(888888));
  const exported = textService.exportCustoms();
  assert("exportCustoms() custom kalitlarni qaytardi", "errors.notInGame" in exported);

  await textService.resetText("errors.notInGame", BigInt(888888));
  const importRes = await textService.importCustoms({ "errors.notInGame": "IMPORTED" }, BigInt(888888));
  assert("importCustoms ok=1", importRes.ok === 1);
  assert("importCustoms keyin matn import qilingan", t("errors.notInGame") === "IMPORTED");

  // 17. import — noto'g'ri kalit rad etiladi
  const badImport = await textService.importCustoms({ "fake.key": "x" }, BigInt(888888));
  assert("importCustoms noto'g'ri kalit rad etdi", badImport.failed === 1);

  // Tozalash
  await textService.resetText("errors.notInGame", BigInt(888888));

  // ===== Natija =====
  console.log("\n📊 Natijalar:\n");
  let passed = 0;
  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    console.log(`${icon} ${r.name}${r.detail ? " — " + r.detail : ""}`);
    if (r.ok) passed++;
  }
  console.log(`\n${passed}/${results.length} test o'tdi.\n`);

  await prisma.$disconnect();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error("💥 Smoke test xatosi:", e);
  process.exit(1);
});
