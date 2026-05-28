"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sheet } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Worker = { id: string; name: string }
type Balance = { worker_id: string; balance_due: number }
type Person = { id: string; name: string }

interface Props {
  open: boolean
  onClose: () => void
  preselectedWorkerId?: string
}

export function RecordPaymentSheet({ open, onClose, preselectedWorkerId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [workers, setWorkers] = useState<Worker[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [people, setPeople] = useState<Person[]>([])

  const [workerId, setWorkerId] = useState(preselectedWorkerId ?? "")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today())
  const [method, setMethod] = useState("cash")
  const [paidBy, setPaidBy] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (preselectedWorkerId) setWorkerId(preselectedWorkerId)
  }, [preselectedWorkerId])

  useEffect(() => {
    async function load() {
      const [{ data: w }, { data: b }, { data: p }] = await Promise.all([
        supabase.from("workers").select("id, name").eq("is_active", true).order("name"),
        supabase.from("worker_balances").select("worker_id, balance_due"),
        supabase.from("people").select("id, name").eq("is_active", true),
      ])
      setWorkers(w ?? [])
      setBalances(b ?? [])
      setPeople(p ?? [])
    }
    load()
  }, [])

  const currentBalance = balances.find((b) => b.worker_id === workerId)?.balance_due ?? null

  function handleClose() {
    onClose()
    setWorkerId(preselectedWorkerId ?? ""); setAmount(""); setDate(today())
    setMethod("cash"); setPaidBy(""); setNotes(""); setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!workerId || !amount || !date || !paidBy) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase.from("worker_payments").insert({
      worker_id: workerId,
      paid_by: paidBy,
      payment_date: date,
      amount: parseFloat(amount),
      payment_method: method as "cash" | "virement" | "cheque" | "cb",
      notes: notes || null,
    })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    handleClose()
    router.refresh()
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Enregistrer un paiement">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Ouvrier *</label>
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger><SelectValue placeholder="Choisir un ouvrier" /></SelectTrigger>
            <SelectContent>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {workerId && currentBalance !== null && (
            <p className="text-xs text-muted-foreground">
              Solde actuel : <span className={currentBalance > 0 ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                {formatCurrency(currentBalance)}
              </span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Montant (€) *</label>
            <Input
              type="number" step="0.01" min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Payé par *</label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger><SelectValue placeholder="Qui ?" /></SelectTrigger>
              <SelectContent>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mode</label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="virement">Virement</SelectItem>
                <SelectItem value="cheque">Chèque</SelectItem>
                <SelectItem value="cb">Carte bancaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Input placeholder="Optionnel…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Annuler</Button>
          <Button type="submit" className="flex-1" disabled={!workerId || !amount || !date || !paidBy || submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement…</> : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}

function today() {
  return new Date().toISOString().split("T")[0]
}
