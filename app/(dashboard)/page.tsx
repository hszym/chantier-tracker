import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import { HardHat, Receipt, TrendingUp, Users, Clock, Target, ShoppingCart } from "lucide-react"
import Link from "next/link"

const PROJECT_ID = "11111111-1111-1111-1111-111111111111"

type RecentReceipt = {
  id: string
  receipt_date: string
  total_amount: number
  stores: { name: string } | null
  people: { name: string } | null
}

type StoreSpend = {
  store_id: string | null
  store_name: string | null
  total: number
}

type BudgetEstimate = {
  lot_id: string | null
  estimated_amount: number
  description: string | null
  work_lots: { name: string; color: string | null } | null
}

export const metadata = { title: "Dashboard — Chantier Tracker" }

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: costData },
    { data: lotData },
    { data: workerData },
    { data: recentReceipts },
    { count: pendingCount },
    { data: budgetData },
    { data: storeSpendRaw },
  ] = await Promise.all([
    supabase.from("project_total_cost").select("*").single(),
    supabase.from("spend_by_lot_project").select("lot_id, lot_name, total_spent").order("total_spent", { ascending: false }),
    supabase.from("worker_balances").select("worker_name, balance_due").gt("balance_due", 0).order("balance_due", { ascending: false }),
    supabase
      .from("receipts")
      .select("id, receipt_date, total_amount, stores(name), people!paid_by(name)")
      .neq("status", "archived")
      .order("receipt_date", { ascending: false })
      .limit(5) as unknown as Promise<{ data: RecentReceipt[] | null }>,
    supabase.from("receipts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("budget_estimates")
      .select("lot_id, estimated_amount, description, work_lots(name, color)")
      .eq("project_id", PROJECT_ID)
      .order("estimated_amount", { ascending: false }) as unknown as Promise<{ data: BudgetEstimate[] | null }>,
    supabase
      .from("receipts")
      .select("store_id, total_amount, stores(name)")
      .neq("status", "archived") as unknown as Promise<{ data: { store_id: string | null; total_amount: number; stores: { name: string } | null }[] | null }>,
  ])

  const lots = (lotData ?? []).filter((l) => l.lot_name && l.total_spent > 0)
  const maxLotSpend = lots[0]?.total_spent ?? 1
  const totalWorkersDue = (workerData ?? []).reduce((s, w) => s + w.balance_due, 0)

  const spendByLotId = Object.fromEntries((lotData ?? []).map((l) => [l.lot_id, l.total_spent]))
  const budgetItems = (budgetData ?? []).map((b) => ({
    label: b.description ?? b.work_lots?.name ?? "—",
    color: b.work_lots?.color ?? null,
    estimated: b.estimated_amount,
    spent: b.lot_id ? (spendByLotId[b.lot_id] ?? 0) : 0,
  }))
  const totalEstimated = budgetItems.reduce((s, b) => s + b.estimated, 0)
  const totalSpentOnEstimated = budgetItems.reduce((s, b) => s + b.spent, 0)

  const storeSpendMap = new Map<string, StoreSpend>()
  for (const r of storeSpendRaw ?? []) {
    const key = r.store_id ?? "__none__"
    const existing = storeSpendMap.get(key)
    if (existing) {
      existing.total += r.total_amount
    } else {
      storeSpendMap.set(key, { store_id: r.store_id, store_name: r.stores?.name ?? null, total: r.total_amount })
    }
  }
  const storeSpend = Array.from(storeSpendMap.values())
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total)
  const maxStoreSpend = storeSpend[0]?.total ?? 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">La Turbie</h1>
        <p className="text-muted-foreground text-sm">Rénovation maison principale</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Coût total
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold tabular-nums">{formatCurrency(costData?.total_cost ?? 0)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Matériaux + MO</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Receipt className="h-3.5 w-3.5" /> Matériaux
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold tabular-nums">{formatCurrency(costData?.materials_cost ?? 0)}</div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              {pendingCount ? (
                <span className="text-yellow-600 font-medium">{pendingCount} en attente</span>
              ) : (
                "Toutes validées"
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HardHat className="h-3.5 w-3.5" /> Main d&apos;œuvre
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold tabular-nums">{formatCurrency(costData?.labor_cost ?? 0)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Journées travaillées</div>
          </CardContent>
        </Card>

        <Card className={totalWorkersDue > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Dû aux ouvriers
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-xl font-bold tabular-nums ${totalWorkersDue > 0 ? "text-orange-700" : "text-green-700"}`}>
              {formatCurrency(totalWorkersDue)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {totalWorkersDue > 0 ? `${workerData?.length} ouvrier${(workerData?.length ?? 0) > 1 ? "s" : ""}` : "Tout est réglé"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spending by lot */}
        {lots.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Dépenses par lot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {lots.slice(0, 8).map((lot) => (
                <div key={lot.lot_id ?? "uncategorized"} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate max-w-[65%] text-muted-foreground">{lot.lot_name ?? "Non catégorisé"}</span>
                    <span className="tabular-nums font-medium">{formatCurrency(lot.total_spent)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(lot.total_spent / maxLotSpend) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {lots.length > 8 && (
                <p className="text-xs text-muted-foreground pt-1">+ {lots.length - 8} autres lots</p>
              )}
              <Link href="/materiaux" className="block text-xs text-primary hover:underline pt-1">
                Voir le détail matériaux →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Workers due */}
        {(workerData?.length ?? 0) > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-orange-500" />
                Paiements en attente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workerData?.map((w) => (
                <div key={w.worker_name} className="flex justify-between items-center text-sm">
                  <span>{w.worker_name}</span>
                  <span className="tabular-nums font-semibold text-orange-700">{formatCurrency(w.balance_due)}</span>
                </div>
              ))}
              <Link href="/workers" className="block text-xs text-primary hover:underline pt-1">
                Gérer les paiements →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dépenses par magasin */}
      {storeSpend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              Dépenses par magasin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {storeSpend.slice(0, 10).map((s) => (
              <div key={s.store_id ?? "unknown"} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="truncate max-w-[65%] text-muted-foreground">{s.store_name ?? "Inconnu"}</span>
                  <span className="tabular-nums font-medium">{formatCurrency(s.total)}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(s.total / maxStoreSpend) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {storeSpend.length > 10 && (
              <p className="text-xs text-muted-foreground pt-1">+ {storeSpend.length - 10} autres magasins</p>
            )}
            <Link href="/receipts" className="block text-xs text-primary hover:underline pt-1">
              Voir toutes les factures →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Budget prévisionnel */}
      {budgetItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Target className="h-4 w-4 text-muted-foreground" />
                Budget prévisionnel
              </CardTitle>
              <div className="text-xs text-muted-foreground tabular-nums">
                {formatCurrency(totalSpentOnEstimated)} / {formatCurrency(totalEstimated)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {budgetItems.map((b, i) => {
              const pct = b.estimated > 0 ? Math.min((b.spent / b.estimated) * 100, 100) : 0
              const over = b.spent > b.estimated && b.spent > 0
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate max-w-[55%] text-muted-foreground">{b.label}</span>
                    <div className="flex items-center gap-1.5 tabular-nums shrink-0">
                      <span className={over ? "text-red-600 font-medium" : "font-medium"}>
                        {formatCurrency(b.spent)}
                      </span>
                      <span className="text-muted-foreground">/ {formatCurrency(b.estimated)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${over ? "bg-red-500" : pct > 80 ? "bg-orange-400" : "bg-emerald-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent receipts */}
      {(recentReceipts?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Dernières factures</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {recentReceipts?.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div>
                  <div className="text-sm font-medium">{r.stores?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(r.receipt_date)} · {r.people?.name ?? "—"}
                  </div>
                </div>
                <span className="tabular-nums font-semibold text-sm">{formatCurrency(r.total_amount)}</span>
              </div>
            ))}
          </CardContent>
          <div className="px-6 pb-4">
            <Link href="/receipts" className="text-xs text-primary hover:underline">
              Voir toutes les factures →
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
