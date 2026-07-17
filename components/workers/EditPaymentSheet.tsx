"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sheet } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

type Worker = { id: string; name: string }
type Person = { id: string; name: string }

export type PaymentForEdit = {
  id: string
  worker_id: string
  worker_name: string | null
  paid_by: string
  payer_name: string | null
  payment_date: string
  amount: number
  payment_method: string
  notes: string | null
}

interface Props {
  payment: PaymentForEdit | null
  onClose: () => void
  onSaved: () => void
}

export function EditPaymentSheet({ payment, onClose, onSaved }: Props) {
  const supabase = createClient()

  const [workers, setWorkers] = useState<Worker[]>([])
  const [people, setPeople] = useState<Person[]>([])

  const [workerId, setWorkerId] = useState("")
  const [paidBy, setPaidBy] = useState("")
  const [date, setDate] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("cash")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: w }, { data: p }] = await Promise.all([
        supabase.from("workers").select("id, name").order("name"),
        supabase.from("people").select("id, name").eq("is_active", true),
      ])
      setWorkers(w ?? [])
      setPeople(p ?? [])
    }
    load()
  }, [])

  useEffect(() => {
    if (!payment) return
    setWorkerId(payment.worker_id)
    setPaidBy(payment.paid_by)
    setDate(payment.payment_date)
    setAmount(String(payment.amount))
    setMethod(payment.payment_method)
    setNotes(payment.notes ?? "")
    setError(null)
  }, [payment])

  async function handleSave() {
    if (!payment) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase
      .from("worker_payments")
      .update({
        worker_id: workerId,
        paid_by: paidBy,
        payment_date: date,
        amount: parseFloat(amount),
        payment_method: method as "cash" | "virement" | "cheque" | "cb",
        notes: notes || null,
      })
      .eq("id", payment.id)
    setSubmitting(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <Sheet open={true} onClose={onClose} title="Modifier le paiement">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Ouvrier *</label>
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger><SelectValue placeholder="Choisir un ouvrier" /></SelectTrigger>
            <SelectContent>
              {workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Montant (€) *</label>
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Payé par *</label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger><SelectValue placeholder="Qui ?" /></SelectTrigger>
              <SelectContent>
                {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
          <Input
            placeholder="Optionnel…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button
            className="flex-1"
            disabled={!workerId || !paidBy || !date || !amount || submitting}
            onClick={handleSave}
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement…</> : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
