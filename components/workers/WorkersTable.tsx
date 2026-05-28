"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { LogWorkDaySheet } from "./LogWorkDaySheet"
import { RecordPaymentSheet } from "./RecordPaymentSheet"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Loader2, Plus, Wallet } from "lucide-react"

type Balance = {
  worker_id: string
  worker_name: string
  is_active: boolean
  total_earned: number
  total_paid: number
  balance_due: number
  days_worked: number
  total_hours: number
  last_work_date: string | null
}

export default function WorkersTable() {
  const supabase = createClient()
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)

  const [logOpen, setLogOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<string | undefined>()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from("worker_balances")
      .select("*")
      .order("worker_name")
    setBalances((data ?? []) as Balance[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openPay(workerId: string) {
    setSelectedWorker(workerId)
    setPayOpen(true)
  }

  const totalDue = balances.reduce((s, b) => s + (b.balance_due > 0 ? b.balance_due : 0), 0)

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Saisir une journée
        </Button>
        <Button size="sm" onClick={() => { setSelectedWorker(undefined); setPayOpen(true) }}>
          <Wallet className="h-4 w-4 mr-1.5" />
          Enregistrer un paiement
        </Button>
      </div>

      {/* Summary */}
      {!loading && totalDue > 0 && (
        <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-800">
          Total dû aux ouvriers : <span className="font-semibold">{formatCurrency(totalDue)}</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ouvrier</TableHead>
              <TableHead className="text-right">Jours / Heures</TableHead>
              <TableHead className="text-right">Total gagné</TableHead>
              <TableHead className="text-right">Total payé</TableHead>
              <TableHead className="text-right">Solde dû</TableHead>
              <TableHead>Dernière journée</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…
                </TableCell>
              </TableRow>
            ) : balances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun ouvrier trouvé
                </TableCell>
              </TableRow>
            ) : (
              balances.map((b) => (
                <TableRow key={b.worker_id} className={!b.is_active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">
                    {b.worker_name}
                    {!b.is_active && <span className="ml-2 text-xs text-muted-foreground">(inactif)</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {b.days_worked}j / {b.total_hours}h
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(b.total_earned)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(b.total_paid)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    <span className={b.balance_due > 0 ? "text-orange-600" : b.balance_due < 0 ? "text-blue-600" : "text-green-600"}>
                      {formatCurrency(b.balance_due)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(b.last_work_date)}
                  </TableCell>
                  <TableCell>
                    {b.balance_due > 0 && (
                      <Button size="sm" variant="outline" onClick={() => openPay(b.worker_id)}>
                        Payer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LogWorkDaySheet open={logOpen} onClose={() => { setLogOpen(false); load() }} />
      <RecordPaymentSheet open={payOpen} onClose={() => { setPayOpen(false); load() }} preselectedWorkerId={selectedWorker} />
    </div>
  )
}
