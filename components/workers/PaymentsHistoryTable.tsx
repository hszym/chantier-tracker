"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { EditPaymentSheet, type PaymentForEdit } from "./EditPaymentSheet"

type Payment = {
  id: string
  worker_id: string
  paid_by: string
  payment_date: string
  amount: number
  payment_method: string
  notes: string | null
  workers: { name: string } | null
  people: { name: string } | null
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  cb: "Carte",
}

export function PaymentsHistoryTable() {
  const supabase = createClient()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PaymentForEdit | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("worker_payments")
      .select("id, worker_id, paid_by, payment_date, amount, payment_method, notes, workers(name), people!paid_by(name)")
      .order("payment_date", { ascending: false }) as unknown as { data: Payment[] | null }
    setPayments(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(p: Payment) {
    setEditing({
      id: p.id,
      worker_id: p.worker_id,
      worker_name: p.workers?.name ?? null,
      paid_by: p.paid_by,
      payer_name: p.people?.name ?? null,
      payment_date: p.payment_date,
      amount: p.amount,
      payment_method: p.payment_method,
      notes: p.notes,
    })
  }

  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <>
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
        <span>
          {loading ? "Chargement…" : `${payments.length} paiement${payments.length > 1 ? "s" : ""} — ${formatCurrency(total)}`}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Aucun paiement enregistré</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl border px-4 py-3 space-y-1 cursor-pointer active:bg-muted/30"
                onClick={() => openEdit(p)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm">{p.workers?.name ?? "—"}</span>
                  <span className="tabular-nums font-bold text-sm shrink-0">{formatCurrency(p.amount)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <span>{formatDate(p.payment_date)}</span>
                  {p.people?.name && <span>· Payé par {p.people.name}</span>}
                  <span>· {METHOD_LABELS[p.payment_method] ?? p.payment_method}</span>
                  {p.notes && <span>· {p.notes}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ouvrier</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Payé par</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEdit(p)}>
                    <TableCell className="tabular-nums text-sm">{formatDate(p.payment_date)}</TableCell>
                    <TableCell className="font-medium">{p.workers?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(p.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.people?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{METHOD_LABELS[p.payment_method] ?? p.payment_method}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {editing && (
        <EditPaymentSheet
          payment={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </>
  )
}
