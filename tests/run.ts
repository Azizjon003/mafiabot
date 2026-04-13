import { writeFileSync } from "fs";
import { join } from "path";
import { runScenario, runAssignmentScenario } from "./harness";
import { scenarios } from "./scenarios";
import { assignmentScenarios } from "./assignment-scenarios";

interface Result {
  name: string;
  ok: boolean;
  errors: string[];
  durationMs: number;
  category: string;
  throwError?: string;
}

// Senariy nomidan kategoriya aniqlash (primitive tasnifi)
function categorize(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("shield")) return "Shield";
  if (n.includes("hujjat") || n.includes("document")) return "Hujjat";
  if (n.includes("geroy") || n.includes("hero")) return "Geroy";
  if (n.includes("aktiv rol") || n.includes("preferred")) return "Aktiv rol";
  if (n.includes("professor")) return "Professor";
  if (n.includes("sheriff") || n.includes("komissar")) return "Komissar";
  if (n.includes("hooker") || n.includes("kezuvchi")) return "Kezuvchi";
  if (n.includes("doctor") || n.includes("shifokor")) return "Shifokor";
  if (n.includes("sniper") || n.includes("snayper")) return "Snayper";
  if (n.includes("archer") || n.includes("kamonchi")) return "Kamonchi";
  if (n.includes("miner") || n.includes("minior")) return "Minior";
  if (n.includes("warlock") || n.includes("koldun")) return "Koldun";
  if (n.includes("lawyer") || n.includes("advokat")) return "Advokat";
  if (n.includes("lab")) return "Labarant";
  if (n.includes("traitor") || n.includes("sotqin")) return "Sotqin";
  if (n.includes("kamikaze")) return "Kamikaze";
  if (n.includes("qaroqchi") || n.includes("robber")) return "Qaroqchi";
  if (n.includes("snowboy") || n.includes("qorbola")) return "Qorbola";
  if (n.includes("spy") || n.includes("ayg'oqchi")) return "Ayg'oqchi";
  if (n.includes("tramp") || n.includes("daydi")) return "Daydi";
  if (n.includes("ovoz") || n.includes("osil")) return "Ovoz berish";
  if (n.includes("mafiya") || n.includes("mafia")) return "Mafiya";
  if (n.includes("yutadi") || n.includes("yutish")) return "G'olib";
  return "Boshqa";
}

async function main() {
  const results: Result[] = [];

  for (const s of scenarios) {
    const t0 = Date.now();
    try {
      const res = await runScenario(s);
      results.push({
        name: s.name,
        ok: res.ok,
        errors: res.errors,
        durationMs: Date.now() - t0,
        category: categorize(s.name),
      });
    } catch (e: any) {
      results.push({
        name: s.name,
        ok: false,
        errors: [],
        durationMs: Date.now() - t0,
        category: categorize(s.name),
        throwError: String(e?.stack ?? e),
      });
    }
  }

  // Assignment (preferredRole / aktiv rol) senariylari
  for (const s of assignmentScenarios) {
    const t0 = Date.now();
    try {
      const res = await runAssignmentScenario(s);
      results.push({
        name: s.name,
        ok: res.ok,
        errors: res.errors,
        durationMs: Date.now() - t0,
        category: "Aktiv rol",
      });
    } catch (e: any) {
      results.push({
        name: s.name,
        ok: false,
        errors: [],
        durationMs: Date.now() - t0,
        category: "Aktiv rol",
        throwError: String(e?.stack ?? e),
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  // ==================== CONSOLE REPORT ====================
  for (const r of results) {
    if (r.ok) console.log(`✅ ${r.name} (${r.durationMs}ms)`);
    else if (r.throwError) console.log(`💥 ${r.name} — exception`);
    else console.log(`❌ ${r.name}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log(`JAMI: ${results.length} | ✅ ${passed} | ❌ ${failed.length}`);
  console.log("=".repeat(60));

  // Kategoriya bo'yicha yig'indi
  const byCat = new Map<string, { total: number; failed: number }>();
  for (const r of results) {
    const cur = byCat.get(r.category) ?? { total: 0, failed: 0 };
    cur.total++;
    if (!r.ok) cur.failed++;
    byCat.set(r.category, cur);
  }
  console.log("\nKATEGORIYA BO'YICHA:");
  const sortedCats = [...byCat.entries()].sort((a, b) => b[1].failed - a[1].failed);
  for (const [cat, v] of sortedCats) {
    const status = v.failed === 0 ? "✅" : "❌";
    console.log(`  ${status} ${cat.padEnd(15)} ${v.total - v.failed}/${v.total}`);
  }

  // Xato detallari
  if (failed.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log(`XATOLIKLAR (${failed.length})`);
    console.log("=".repeat(60));
    for (const r of failed) {
      console.log(`\n❌ [${r.category}] ${r.name}`);
      if (r.throwError) {
        console.log("   💥 Exception:");
        console.log("   " + r.throwError.split("\n").slice(0, 3).join("\n   "));
      } else {
        for (const e of r.errors) console.log(`   • ${e}`);
      }
    }
  }

  // ==================== MARKDOWN REPORT ====================
  const reportPath = join(__dirname, "report.md");
  const md: string[] = [];
  md.push(`# Test Hisoboti`);
  md.push(`_Yaratildi: ${new Date().toISOString()}_\n`);
  md.push(`## Umumiy natija`);
  md.push(``);
  md.push(`- **Jami senariylar:** ${results.length}`);
  md.push(`- **✅ O'tdi:** ${passed}`);
  md.push(`- **❌ Xato:** ${failed.length}`);
  md.push(`- **Muvaffaqiyat foizi:** ${((passed / results.length) * 100).toFixed(1)}%`);
  md.push(`- **Jami vaqt:** ${results.reduce((s, r) => s + r.durationMs, 0)}ms\n`);

  md.push(`## Kategoriya bo'yicha`);
  md.push(``);
  md.push(`| Kategoriya | O'tdi | Jami | Holat |`);
  md.push(`|---|---|---|---|`);
  for (const [cat, v] of sortedCats) {
    const status = v.failed === 0 ? "✅" : `❌ (${v.failed} xato)`;
    md.push(`| ${cat} | ${v.total - v.failed} | ${v.total} | ${status} |`);
  }
  md.push(``);

  if (failed.length > 0) {
    md.push(`## ❌ Muvaffaqiyatsiz senariylar\n`);
    // Guruhlash
    const failByCat = new Map<string, Result[]>();
    for (const r of failed) {
      if (!failByCat.has(r.category)) failByCat.set(r.category, []);
      failByCat.get(r.category)!.push(r);
    }
    for (const [cat, items] of failByCat) {
      md.push(`### ${cat} (${items.length})\n`);
      for (const r of items) {
        md.push(`#### ${r.name}`);
        if (r.throwError) {
          md.push("```");
          md.push(r.throwError.split("\n").slice(0, 5).join("\n"));
          md.push("```");
        } else {
          for (const e of r.errors) md.push(`- ${e}`);
        }
        md.push(``);
      }
    }
  } else {
    md.push(`## ✅ Barcha senariylar muvaffaqiyatli o'tdi!\n`);
  }

  writeFileSync(reportPath, md.join("\n"), "utf-8");
  console.log(`\n📝 Batafsil hisobot: ${reportPath}`);

  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
