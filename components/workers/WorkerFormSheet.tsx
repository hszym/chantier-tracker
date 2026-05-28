"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sheet } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

type WorkerType = "journalier" | "artisan_forfait" | "sous_traitant" | "entreprise"

type Worker = {
  id: string
  name: string
  worker_type: WorkerType
  default_hourly_rate: number | null
  speciality: string | null
  phone: string | null
  notes: string | null
  is_active: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  worker?: Worker | null
}

const WORKER_TYPE_LABELS: Record<WorkerType, string> = {
  journalier: "Journalier",
  artisan_forfait: "Artisan (forfait)",
  sous_traitant: "Sous-traitant",
  entreprise: "Entreprise",
}

const EMPTY = {
  name: "",
  worker_type: "journalier" as WorkerType,
  default_hourly_rate: "",
  speciality: "",
  phone: "",
  notes: "",
  is_active: true,
}

export function WorkerFormSheet({ open, onClose, worker }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!worker

  useEffect(() => {
    if (worker) {
      setForm({
        name: worker.name,
        worker_type: worker.worker_type,
        default_hourly_rate: worker.default_hourly_rate != null ? String(worker.default_hourly_rate) : "",
        speciality: worker.speciality ?? "",
        phone: worker.phone ?? "",
        notes: worker.notes ?? "",
        is_active: worker.is_active,
      })
    } else {
      setForm(EMPTY)
    }
    setError(null)
  }, [worker, open])

  function set(key: keyof typeof EMPTY, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleClose() {
    onClose()
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      worker_type: form.worker_type,
      default_hourly_rate: form.default_hourly_rate ? parseFloat(form.default_hourly_rate) : null,
      speciality: form.speciality.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    }

    const { error: err } = isEdit
      ? await supabase.from("workers").update(payload).eq("id", worker!.id)
      : await supabase.from("workers").insert(payload)

    setSubmitting(false)
    if (err) { setError(err.message); return }
    handleClose()
    router.refresh()
  }

  return (
    <Sheet open={open} onClose={handleClose} title={isEdit ? "Modifier l'ouvrier" : "Ajouter un ouvrier"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nom *</label>
          <Input
            placeholder="ex : Mohamed, Zenith…"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <Select value={form.worker_type} onValueChange={(v) => set("worker_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(WORKER_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Taux horaire (€)</label>
            <Input
              type="number" step="0.5" min="0"
              placeholder="15"
              value={form.default_hourly_rate}
              onChange={(e) => set("default_hourly_rate", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Spécialité</label>
            <Input
              placeholder="Maçon, Électricien…"
              value={form.speciality}
              onChange={(e) => set("speciality", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Téléphone</label>
            <Input
              type="tel"
              placeholder="+33 6…"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Input
            placeholder="Optionnel…"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        {isEdit && (
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Ouvrier actif
          </label>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit" className="flex-1" disabled={!form.name.trim() || submitting}>
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{isEdit ? "Modification…" : "Création…"}</>
              : isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
