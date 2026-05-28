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

const PROJECT_ID = "11111111-1111-1111-1111-111111111111"

type Worker = { id: string; name: string; default_hourly_rate: number | null }
type Phase = { id: string; name: string }

interface Props {
  open: boolean
  onClose: () => void
}

export function LogWorkDaySheet({ open, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [workers, setWorkers] = useState<Worker[]>([])
  const [phases, setPhases] = useState<Phase[]>([])

  const [workerId, setWorkerId] = useState("")
  const [date, setDate] = useState(today())
  const [hours, setHours] = useState("")
  const [rate, setRate] = useState("")
  const [phaseId, setPhaseId] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: w }, { data: p }] = await Promise.all([
        supabase.from("workers").select("id, name, default_hourly_rate").eq("is_active", true).order("name"),
        supabase.from("phases").select("id, name").order("order_index"),
      ])
      setWorkers(w ?? [])
      setPhases(p ?? [])
    }
    load()
  }, [])

  function handleWorkerChange(id: string) {
    setWorkerId(id)
    const w = workers.find((w) => w.id === id)
    if (w?.default_hourly_rate) setRate(String(w.default_hourly_rate))
  }

  function handleClose() {
    onClose()
    setWorkerId(""); setDate(today()); setHours(""); setRate(""); setPhaseId(""); setNotes(""); setError(null)
  }

  const amountDue = hours && rate ? parseFloat(hours) * parseFloat(rate) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!workerId || !date || !hours || !rate) return
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase.from("work_days").insert({
      worker_id: workerId,
      project_id: PROJECT_ID,
      phase_id: phaseId || null,
      work_date: date,
      hours_worked: parseFloat(hours),
      hourly_rate: parseFloat(rate),
      notes: notes || null,
    })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    handleClose()
    router.refresh()
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Saisir une journée">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Ouvrier *</label>
          <Select value={workerId} onValueChange={handleWorkerChange}>
            <SelectTrigger><SelectValue placeholder="Choisir un ouvrier" /></SelectTrigger>
            <SelectContent>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Date *</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Heures *</label>
            <Input
              type="number" step="0.5" min="0.5" max="24"
              placeholder="8"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Taux horaire (€) *</label>
            <Input
              type="number" step="0.5" min="0"
              placeholder="15"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
            />
          </div>
        </div>

        {amountDue !== null && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            Montant dû : <span className="font-semibold">{formatCurrency(amountDue)}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Phase</label>
          <Select value={phaseId} onValueChange={setPhaseId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner une phase" /></SelectTrigger>
            <SelectContent>
              {phases.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Input placeholder="Optionnel…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Annuler</Button>
          <Button type="submit" className="flex-1" disabled={!workerId || !date || !hours || !rate || submitting}>
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
