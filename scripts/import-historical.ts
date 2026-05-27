/**
 * Import historical data from reclassified.csv into Supabase.
 * Usage: npx tsx scripts/import-historical.ts
 *
 * Uses SERVICE_ROLE_KEY to bypass RLS.
 * Idempotent: deletes all receipts with source='imported' before re-inserting.
 */

import * as fs from "fs"
import * as path from "path"
import Papa from "papaparse"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PROJECT_ID = "11111111-1111-1111-1111-111111111111"
const FALLBACK_DATE = "2026-01-01"
const UNKNOWN_WORKER_NAME = "Ouvrier non identifié"

type CsvRow = {
  date: string
  montant: string
  payeur: string
  magasin: string
  worker: string
  is_labor: string
  lot: string
  zone: string
  phase: string
  depense_raw: string
  projet_raw: string
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/** Parse DD/MM/YYYY → YYYY-MM-DD */
function parseDate(raw: string): string | null {
  if (!raw || raw.trim() === "NULL" || raw.trim() === "") return null
  const parts = raw.trim().split("/")
  if (parts.length === 3) {
    const [d, m, y] = parts
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

async function fetchMap(
  table: string,
  columns = "id, name"
): Promise<Map<string, string>> {
  const { data, error } = await db.from(table).select(columns)
  if (error) throw new Error(`Failed to load ${table}: ${error.message}`)
  const map = new Map<string, string>()
  for (const row of data as { id: string; name: string }[]) {
    map.set(row.name.trim().toLowerCase(), row.id)
  }
  return map
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🏗️  Chantier Tracker — Import historique\n")

  // ── 0. Load reference data ──────────────────────────────
  console.log("Loading reference data…")
  const [peopleMap, storesMap, phasesMap, lotsMap, zonesMap, workersMap] = await Promise.all([
    fetchMap("people"),
    fetchMap("stores"),
    fetchMap("phases"),
    fetchMap("work_lots", "id, name"),
    fetchMap("zones"),
    fetchMap("workers"),
  ])

  // ── 1. Idempotence: delete previous import ──────────────
  console.log("Removing previous imported receipts…")
  const { error: delErr } = await db
    .from("receipts")
    .delete()
    .eq("source", "imported")
  if (delErr) throw new Error(`Delete failed: ${delErr.message}`)

  // ── 2. Parse CSV ─────────────────────────────────────────
  const csvPath = path.resolve(__dirname, "../data/reclassified.csv")
  const csvContent = fs.readFileSync(csvPath, "utf-8")
  const { data: rows } = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  })
  console.log(`Parsed ${rows.length} CSV rows\n`)

  // Ensure unknown worker exists
  let unknownWorkerId = workersMap.get(UNKNOWN_WORKER_NAME.toLowerCase())
  if (!unknownWorkerId) {
    const { data: w, error: wErr } = await db
      .from("workers")
      .insert({ name: UNKNOWN_WORKER_NAME, worker_type: "journalier" as const })
      .select("id")
      .single()
    if (wErr) throw new Error(`Failed to create unknown worker: ${wErr.message}`)
    unknownWorkerId = w.id as string
    workersMap.set(UNKNOWN_WORKER_NAME.toLowerCase(), unknownWorkerId)
    console.log(`  Created worker: ${UNKNOWN_WORKER_NAME}`)
  }

  // ── 3. Process each row ───────────────────────────────────
  let receiptsCreated = 0
  let workerPaymentsCreated = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2 // 1-indexed + header row

    try {
      const amount = parseFloat(row.montant)
      if (isNaN(amount)) {
        errors.push(`Line ${lineNum}: invalid amount "${row.montant}"`)
        continue
      }

      // Skip zero-amount labor rows (Zenith advance placeholders)
      if (amount === 0) {
        console.log(`  Line ${lineNum}: skipping zero-amount row (${row.depense_raw})`)
        continue
      }

      const rawDate = parseDate(row.date)
      const receiptDate = rawDate ?? FALLBACK_DATE
      const missingDate = !rawDate

      // Resolve payer
      const payerId = peopleMap.get(row.payeur?.trim().toLowerCase())
      if (!payerId) {
        errors.push(`Line ${lineNum}: unknown payer "${row.payeur}"`)
        continue
      }

      // Resolve phase
      const phaseId = phasesMap.get(row.phase?.trim().toLowerCase()) ?? null

      // Resolve lot
      const lotId = lotsMap.get(row.lot?.trim().toLowerCase()) ?? null

      // Resolve zone
      const zoneId = zonesMap.get(row.zone?.trim().toLowerCase()) ?? null

      const isLabor = row.is_labor?.trim().toLowerCase() === "true"

      // Resolve store (create if missing, only for non-labor)
      let storeId: string | null = null
      if (!isLabor && row.magasin?.trim()) {
        const storeKey = row.magasin.trim().toLowerCase()
        storeId = storesMap.get(storeKey) ?? null
        if (!storeId) {
          // Create unknown store on the fly
          const { data: s, error: sErr } = await db
            .from("stores")
            .insert({ name: row.magasin.trim() })
            .select("id")
            .single()
          if (sErr) {
            errors.push(`Line ${lineNum}: failed to create store "${row.magasin}": ${sErr.message}`)
            continue
          }
          storeId = s.id
          storesMap.set(storeKey, storeId!)
          console.log(`  Created store: ${row.magasin.trim()}`)
        }
      }

      // Insert receipt
      const { data: receipt, error: rErr } = await db
        .from("receipts")
        .insert({
          project_id: PROJECT_ID,
          phase_id: phaseId,
          store_id: storeId,
          paid_by: payerId,
          receipt_date: receiptDate,
          total_amount: amount,
          status: "validated" as const,
          source: "imported" as const,
          notes: missingDate ? "Date manquante à corriger" : (row.depense_raw || null),
        })
        .select("id")
        .single()

      if (rErr) {
        errors.push(`Line ${lineNum}: receipt insert failed: ${rErr.message}`)
        continue
      }

      receiptsCreated++

      // Insert receipt line
      await db.from("receipt_lines").insert({
        receipt_id: receipt.id,
        line_number: 1,
        description: row.depense_raw?.trim() || row.lot?.trim() || "—",
        quantity: 1,
        line_total: amount,
        lot_id: lotId,
        zone_id: zoneId,
        is_categorized: !!lotId,
      })

      // Worker payment for labor rows
      if (isLabor) {
        const workerName = row.worker?.trim()
        const isUnknown = !workerName || workerName === "?" || workerName === "Inconnu"
        let workerId: string | null = null

        if (!isUnknown) {
          workerId = workersMap.get(workerName.toLowerCase()) ?? null
          if (!workerId) {
            // Worker referenced in CSV but not in seed — create them
            const { data: w, error: wErr } = await db
              .from("workers")
              .insert({ name: workerName, worker_type: "journalier" as const })
              .select("id")
              .single()
            if (wErr) {
              errors.push(`Line ${lineNum}: failed to create worker "${workerName}": ${wErr.message}`)
            } else {
              workerId = w.id
              workersMap.set(workerName.toLowerCase(), workerId!)
              console.log(`  Created worker: ${workerName}`)
            }
          }
        } else {
          workerId = unknownWorkerId!
        }

        if (workerId) {
          const { error: wpErr } = await db.from("worker_payments").insert({
            worker_id: workerId,
            paid_by: payerId,
            payment_date: receiptDate,
            amount,
            payment_method: "cash" as const,
            receipt_id: receipt.id,
            notes: row.depense_raw || null,
          })
          if (wpErr) {
            errors.push(`Line ${lineNum}: worker_payment insert failed: ${wpErr.message}`)
          } else {
            workerPaymentsCreated++
          }
        }
      }
    } catch (err) {
      errors.push(`Line ${lineNum}: unexpected error: ${String(err)}`)
    }
  }

  // ── 4. Summary ────────────────────────────────────────────
  console.log("\n" + "─".repeat(50))
  console.log("✅ Import terminé\n")
  console.log(`  Receipts créés       : ${receiptsCreated}`)
  console.log(`  Worker payments      : ${workerPaymentsCreated}`)
  console.log(`  Lignes en erreur     : ${errors.length}`)

  // Compute total from DB
  const { data: allReceipts } = await db
    .from("receipts")
    .select("total_amount")
    .eq("source", "imported")

  const importedTotal = (allReceipts as { total_amount: number }[] ?? []).reduce((acc: number, r: { total_amount: number }) => acc + r.total_amount, 0)
  console.log(`  Total importé        : ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(importedTotal)}`)
  console.log(`  (sur ${rows.length} lignes CSV)\n`)

  if (errors.length > 0) {
    console.log("Erreurs détectées :")
    errors.forEach((e) => console.log("  ⚠️ ", e))
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
