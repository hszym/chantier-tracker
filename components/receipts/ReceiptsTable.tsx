"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

const PAGE_SIZE = 50

type Receipt = {
  id: string
  receipt_date: string
  total_amount: number
  status: string
  notes: string | null
  stores: { name: string } | null
  people: { name: string } | null
  phases: { name: string } | null
  receipt_lines: {
    lot_id: string | null
    work_lots: { name: string; color: string | null } | null
  }[]
}

type Phase = { id: string; name: string }
type Person = { id: string; name: string }
type Store = { id: string; name: string }

interface Filters {
  phase: string
  payer: string
  store: string
  dateFrom: string
  dateTo: string
}

export default function ReceiptsTable() {
  const supabase = createClient()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  const [phases, setPhases] = useState<Phase[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [stores, setStores] = useState<Store[]>([])

  const [filters, setFilters] = useState<Filters>({
    phase: "all",
    payer: "all",
    store: "all",
    dateFrom: "",
    dateTo: "",
  })

  useEffect(() => {
    async function loadRefs() {
      const [{ data: ph }, { data: pe }, { data: st }] = await Promise.all([
        supabase.from("phases").select("id, name").order("order_index"),
        supabase.from("people").select("id, name").eq("is_active", true),
        supabase.from("stores").select("id, name").order("name"),
      ])
      setPhases(ph ?? [])
      setPeople(pe ?? [])
      setStores(st ?? [])
    }
    loadRefs()
  }, [])

  const loadReceipts = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from("receipts")
      .select(
        `id, receipt_date, total_amount, status, notes,
         stores(name),
         people(name),
         phases(name),
         receipt_lines(lot_id, work_lots!receipt_lines_lot_id_fkey(name, color))`,
        { count: "exact" }
      )
      .neq("status", "archived")
      .order("receipt_date", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filters.phase !== "all") query = query.eq("phase_id", filters.phase)
    if (filters.payer !== "all") query = query.eq("paid_by", filters.payer)
    if (filters.store !== "all") query = query.eq("store_id", filters.store)
    if (filters.dateFrom) query = query.gte("receipt_date", filters.dateFrom)
    if (filters.dateTo) query = query.lte("receipt_date", filters.dateTo)

    const { data, count } = await query
    setReceipts((data as unknown as Receipt[]) ?? [])
    setTotal(count ?? 0)

    // sum all amounts matching current filters (no pagination)
    let sumQuery = supabase
      .from("receipts")
      .select("total_amount")
      .neq("status", "archived")

    if (filters.phase !== "all") sumQuery = sumQuery.eq("phase_id", filters.phase)
    if (filters.payer !== "all") sumQuery = sumQuery.eq("paid_by", filters.payer)
    if (filters.store !== "all") sumQuery = sumQuery.eq("store_id", filters.store)
    if (filters.dateFrom) sumQuery = sumQuery.gte("receipt_date", filters.dateFrom)
    if (filters.dateTo) sumQuery = sumQuery.lte("receipt_date", filters.dateTo)

    const { data: allAmounts } = await sumQuery
    const sum = (allAmounts ?? []).reduce((acc, r) => acc + (r.total_amount ?? 0), 0)
    setTotalAmount(sum)

    setLoading(false)
  }, [filters, page])

  useEffect(() => {
    loadReceipts()
  }, [loadReceipts])

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(0)
  }

  function getLotInfo(receipt: Receipt) {
    const lines = receipt.receipt_lines ?? []
    const withLot = lines.find((l) => l.work_lots)
    return withLot?.work_lots ?? null
  }

  const pageCount = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px]">
          <Select value={filters.phase} onValueChange={(v) => updateFilter("phase", v)}>
            <SelectTrigger><SelectValue placeholder="Toutes les phases" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les phases</SelectItem>
              {phases.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[130px]">
          <Select value={filters.payer} onValueChange={(v) => updateFilter("payer", v)}>
            <SelectTrigger><SelectValue placeholder="Tous les payeurs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les payeurs</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <Select value={filters.store} onValueChange={(v) => updateFilter("store", v)}>
            <SelectTrigger><SelectValue placeholder="Tous les magasins" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les magasins</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="date"
            className="w-36"
            value={filters.dateFrom}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
            placeholder="Du"
          />
          <span className="text-muted-foreground text-sm">→</span>
          <Input
            type="date"
            className="w-36"
            value={filters.dateTo}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
            placeholder="Au"
          />
        </div>
        {(filters.phase !== "all" || filters.payer !== "all" || filters.store !== "all" || filters.dateFrom || filters.dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => {
            setFilters({ phase: "all", payer: "all", store: "all", dateFrom: "", dateTo: "" })
            setPage(0)
          }}>
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {loading ? "Chargement…" : `${total} facture${total > 1 ? "s" : ""} — ${formatCurrency(totalAmount)} total`}
        </span>
        {pageCount > 1 && (
          <span>Page {page + 1} / {pageCount}</span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Magasin / Worker</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Payeur</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Chargement…
                </TableCell>
              </TableRow>
            ) : receipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucune facture trouvée
                </TableCell>
              </TableRow>
            ) : (
              receipts.map((r) => {
                const lot = getLotInfo(r)
                return (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums text-sm">{formatDate(r.receipt_date)}</TableCell>
                    <TableCell className="font-medium">
                      {r.stores?.name ?? r.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(r.total_amount)}
                    </TableCell>
                    <TableCell>{r.people?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                      {r.phases?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {lot ? (
                        <Badge
                          style={{
                            backgroundColor: lot.color ? `${lot.color}20` : undefined,
                            borderColor: lot.color ?? undefined,
                            color: lot.color ?? undefined,
                          }}
                          className="text-xs border"
                        >
                          {lot.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    pending:   { label: "En attente", class: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    validated: { label: "Validée",    class: "bg-green-50 text-green-700 border-green-200" },
    archived:  { label: "Archivée",   class: "bg-gray-50 text-gray-500 border-gray-200" },
  }
  const s = map[status] ?? { label: status, class: "" }
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${s.class}`}>
      {s.label}
    </span>
  )
}
