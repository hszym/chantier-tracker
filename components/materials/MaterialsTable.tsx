"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Loader2, LayoutList, Layers } from "lucide-react"

type MaterialLine = {
  id: string
  description: string
  quantity: number | null
  unit: string | null
  unit_price: number | null
  line_total: number
  is_categorized: boolean
  receipt_date: string
  store_name: string | null
  store_id: string | null
  lot_name: string | null
  lot_color: string | null
  lot_id: string | null
}

type Lot = { id: string; name: string; color: string | null }
type Store = { id: string; name: string }

export default function MaterialsTable() {
  const supabase = createClient()
  const [lines, setLines] = useState<MaterialLine[]>([])
  const [loading, setLoading] = useState(true)
  const [lots, setLots] = useState<Lot[]>([])
  const [stores, setStores] = useState<Store[]>([])

  const [filterLot, setFilterLot] = useState("all")
  const [filterStore, setFilterStore] = useState("all")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [groupByLot, setGroupByLot] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: lotsData }, { data: storesData }, { data: receipts }] = await Promise.all([
        supabase.from("work_lots").select("id, name, color").order("order_index"),
        supabase.from("stores").select("id, name").order("name"),
        supabase
          .from("receipts")
          .select(`
            id, receipt_date, store_id,
            stores(name),
            receipt_lines(id, description, quantity, unit, unit_price, line_total, is_categorized, lot_id,
              work_lots!lot_id(name, color))
          `)
          .neq("status", "archived")
          .order("receipt_date", { ascending: false }),
      ])

      setLots(lotsData ?? [])
      setStores(storesData ?? [])

      const flat: MaterialLine[] = []
      for (const r of (receipts as any[]) ?? []) {
        for (const line of r.receipt_lines ?? []) {
          flat.push({
            id: line.id,
            description: line.description,
            quantity: line.quantity ?? null,
            unit: line.unit ?? null,
            unit_price: line.unit_price ?? null,
            line_total: line.line_total,
            is_categorized: line.is_categorized,
            receipt_date: r.receipt_date,
            store_name: r.stores?.name ?? null,
            store_id: r.store_id ?? null,
            lot_name: line.work_lots?.name ?? null,
            lot_color: line.work_lots?.color ?? null,
            lot_id: line.lot_id ?? null,
          })
        }
      }
      setLines(flat)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = lines
    if (filterLot !== "all") result = result.filter((l) => l.lot_id === filterLot)
    if (filterStore !== "all") result = result.filter((l) => l.store_id === filterStore)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) => l.description.toLowerCase().includes(q) || l.store_name?.toLowerCase().includes(q)
      )
    }
    if (dateFrom) result = result.filter((l) => l.receipt_date >= dateFrom)
    if (dateTo) result = result.filter((l) => l.receipt_date <= dateTo)
    return result
  }, [lines, filterLot, filterStore, search, dateFrom, dateTo])

  const totalAmount = useMemo(() => filtered.reduce((s, l) => s + l.line_total, 0), [filtered])

  const grouped = useMemo(() => {
    if (!groupByLot) return null
    const map = new Map<string, { lot_name: string | null; lot_color: string | null; lines: MaterialLine[]; total: number }>()
    for (const l of filtered) {
      const key = l.lot_id ?? "__none__"
      if (!map.has(key)) map.set(key, { lot_name: l.lot_name, lot_color: l.lot_color, lines: [], total: 0 })
      const g = map.get(key)!
      g.lines.push(l)
      g.total += l.line_total
    }
    return Array.from(map.entries())
      .map(([, g]) => g)
      .sort((a, b) => b.total - a.total)
  }, [filtered, groupByLot])

  const hasFilters = filterLot !== "all" || filterStore !== "all" || search || dateFrom || dateTo

  function resetFilters() {
    setFilterLot("all"); setFilterStore("all"); setSearch(""); setDateFrom(""); setDateTo("")
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
        <Input
          placeholder="Rechercher…"
          className="shrink-0 w-44 md:w-56"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="shrink-0 w-44 md:w-auto md:min-w-[180px]">
          <Select value={filterLot} onValueChange={setFilterLot}>
            <SelectTrigger><SelectValue placeholder="Lot" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les lots</SelectItem>
              {lots.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="shrink-0 w-40 md:w-auto md:min-w-[160px]">
          <Select value={filterStore} onValueChange={setFilterStore}>
            <SelectTrigger><SelectValue placeholder="Magasin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les magasins</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <Input type="date" className="w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-muted-foreground text-sm">→</span>
          <Input type="date" className="w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="shrink-0" onClick={resetFilters}>
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Summary + view toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {loading ? "Chargement…" : `${filtered.length} article${filtered.length > 1 ? "s" : ""} — ${formatCurrency(totalAmount)}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant={groupByLot ? "outline" : "default"}
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => setGroupByLot(false)}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Liste
          </Button>
          <Button
            variant={groupByLot ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => setGroupByLot(true)}
          >
            <Layers className="h-3.5 w-3.5" />
            Par lot
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Aucun article trouvé</div>
      ) : groupByLot && grouped ? (
        <GroupedView groups={grouped} />
      ) : (
        <FlatView lines={filtered} />
      )}
    </div>
  )
}

function LotBadge({ name, color }: { name: string | null; color: string | null }) {
  if (!name) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <Badge
      style={{
        backgroundColor: color ? `${color}20` : undefined,
        borderColor: color ?? undefined,
        color: color ?? undefined,
      }}
      className="text-xs border whitespace-nowrap"
    >
      {name}
    </Badge>
  )
}

function FlatView({ lines }: { lines: MaterialLine[] }) {
  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {lines.map((l) => (
          <div key={l.id} className="bg-white rounded-xl border px-4 py-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-sm leading-snug">{l.description}</span>
              <span className="tabular-nums font-bold text-sm shrink-0">{formatCurrency(l.line_total)}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
              <span>{formatDate(l.receipt_date)}</span>
              {l.store_name && <span>· {l.store_name}</span>}
              {l.quantity && l.unit && <span>· {l.quantity} {l.unit}</span>}
              {l.unit_price && <span>· {formatCurrency(l.unit_price)}/u</span>}
            </div>
            <LotBadge name={l.lot_name} color={l.lot_color} />
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Magasin</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">P.U.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Lot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium max-w-[220px] truncate">{l.description}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.store_name ?? "—"}</TableCell>
                <TableCell className="tabular-nums text-sm text-muted-foreground">{formatDate(l.receipt_date)}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {l.quantity ? `${l.quantity}${l.unit ? ` ${l.unit}` : ""}` : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {l.unit_price ? formatCurrency(l.unit_price) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(l.line_total)}</TableCell>
                <TableCell><LotBadge name={l.lot_name} color={l.lot_color} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function GroupedView({ groups }: { groups: { lot_name: string | null; lot_color: string | null; lines: MaterialLine[]; total: number }[] }) {
  return (
    <div className="space-y-4">
      {groups.map((g, i) => (
        <div key={i} className="rounded-lg border bg-white overflow-hidden">
          {/* Lot header */}
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ backgroundColor: g.lot_color ? `${g.lot_color}15` : "#f8fafc" }}
          >
            <div className="flex items-center gap-2">
              {g.lot_color && (
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.lot_color }} />
              )}
              <span className="font-semibold text-sm">{g.lot_name ?? "Non catégorisé"}</span>
              <span className="text-xs text-muted-foreground">({g.lines.length} article{g.lines.length > 1 ? "s" : ""})</span>
            </div>
            <span className="tabular-nums font-bold text-sm">{formatCurrency(g.total)}</span>
          </div>

          {/* Mobile cards within group */}
          <div className="md:hidden divide-y">
            {g.lines.map((l) => (
              <div key={l.id} className="px-4 py-2.5 space-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm leading-snug">{l.description}</span>
                  <span className="tabular-nums text-sm font-medium shrink-0">{formatCurrency(l.line_total)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(l.receipt_date)}{l.store_name ? ` · ${l.store_name}` : ""}
                  {l.quantity && l.unit ? ` · ${l.quantity} ${l.unit}` : ""}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table within group */}
          <div className="hidden md:block">
            <Table>
              <TableBody>
                {g.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium max-w-[220px] truncate">{l.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.store_name ?? "—"}</TableCell>
                    <TableCell className="tabular-nums text-sm text-muted-foreground">{formatDate(l.receipt_date)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {l.quantity ? `${l.quantity}${l.unit ? ` ${l.unit}` : ""}` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {l.unit_price ? formatCurrency(l.unit_price) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(l.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  )
}
