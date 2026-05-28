"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sheet } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Loader2, X, ExternalLink } from "lucide-react"

type Phase = { id: string; name: string }
type Person = { id: string; name: string }
type Store = { id: string; name: string }

export type ReceiptForEdit = {
  id: string
  receipt_date: string
  total_amount: number
  status: string
  notes: string | null
  photo_url: string | null
  payment_method: string | null
  store_id: string | null
  store_name: string | null
  paid_by: string | null
  phase_id: string | null
}

interface Props {
  receipt: ReceiptForEdit | null
  onClose: () => void
  onSaved: () => void
}

export default function EditReceiptSheet({ receipt, onClose, onSaved }: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phases, setPhases] = useState<Phase[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [stores, setStores] = useState<Store[]>([])

  const [storeName, setStoreName] = useState("")
  const [date, setDate] = useState("")
  const [amount, setAmount] = useState("")
  const [paidBy, setPaidBy] = useState("")
  const [phaseId, setPhaseId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [status, setStatus] = useState("")
  const [notes, setNotes] = useState("")

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!receipt) return
    setStoreName(receipt.store_name ?? "")
    setDate(receipt.receipt_date)
    setAmount(String(receipt.total_amount))
    setPaidBy(receipt.paid_by ?? "")
    setPhaseId(receipt.phase_id ?? "")
    setPaymentMethod(receipt.payment_method ?? "")
    setStatus(receipt.status)
    setNotes(receipt.notes ?? "")
    setPhotoPreview(receipt.photo_url ?? null)
    setNewPhoto(null)
    setError(null)
  }, [receipt])

  function handlePhotoChange(file: File) {
    setNewPhoto(file)
    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!receipt) return
    setSubmitting(true)
    setError(null)

    try {
      // Upload new photo if selected
      let photoUrl = receipt.photo_url
      if (newPhoto) {
        const ext = newPhoto.name.split(".").pop() ?? "jpg"
        const path = `${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from("receipts")
          .upload(path, newPhoto, { contentType: newPhoto.type })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path)
          photoUrl = urlData.publicUrl
        }
      }

      // Find or create store
      let storeId: string | null = receipt.store_id
      const trimmedStoreName = storeName.trim()
      if (trimmedStoreName) {
        const { data: existing } = await supabase
          .from("stores")
          .select("id")
          .ilike("name", trimmedStoreName)
          .maybeSingle()
        if (existing) {
          storeId = existing.id
        } else {
          const { data: newStore } = await supabase
            .from("stores")
            .insert({ name: trimmedStoreName })
            .select("id")
            .single()
          storeId = newStore?.id ?? null
          // Refresh store list
          const { data: st } = await supabase.from("stores").select("id, name").order("name")
          setStores(st ?? [])
        }
      } else {
        storeId = null
      }

      const { error: updateErr } = await supabase
        .from("receipts")
        .update({
          receipt_date: date,
          total_amount: parseFloat(amount),
          store_id: storeId as string | undefined,
          paid_by: (paidBy || null) as string | undefined,
          phase_id: (phaseId || null) as string | undefined,
          payment_method: (paymentMethod || null) as never,
          status: status as "pending" | "validated" | "archived",
          notes: notes || null,
          photo_url: photoUrl,
        })
        .eq("id", receipt.id)

      if (updateErr) throw updateErr

      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la mise à jour")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={true} onClose={onClose} title="Modifier la facture">
      <div className="space-y-5">
        {/* Photo */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Photo du ticket</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoChange(f) }}
          />
          {photoPreview ? (
            <div className="relative rounded-lg overflow-hidden border">
              <img src={photoPreview} alt="Ticket" className="w-full max-h-48 object-contain bg-muted/30" />
              <div className="absolute top-2 right-2 flex gap-1">
                {receipt?.photo_url && !newPhoto && (
                  <a
                    href={receipt.photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/80 rounded-full p-1 hover:bg-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/80 rounded-full p-1 hover:bg-white"
                  title="Remplacer la photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setNewPhoto(null); setPhotoPreview(null) }}
                  className="bg-white/80 rounded-full p-1 hover:bg-white"
                  title="Supprimer la photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Camera className="h-5 w-5" />
              <span className="text-sm">Ajouter une photo</span>
            </button>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* Date + Montant */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Montant (€) *</label>
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            />
          </div>
        </div>

        {/* Magasin */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Magasin / Fournisseur</label>
          <Input
            list="stores-list"
            placeholder="ex : Leroy Merlin…"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
          <datalist id="stores-list">
            {stores.map((s) => <option key={s.id} value={s.name} />)}
          </datalist>
          <p className="text-xs text-muted-foreground">Choisissez un magasin existant ou tapez un nouveau nom</p>
        </div>

        {/* Payeur + Mode paiement */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Payé par</label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger><SelectValue placeholder="Qui ?" /></SelectTrigger>
              <SelectContent>
                {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Paiement</label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cb">Carte bancaire</SelectItem>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="virement">Virement</SelectItem>
                <SelectItem value="cheque">Chèque</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Phase */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Phase</label>
          <Select value={phaseId} onValueChange={setPhaseId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner une phase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">— Aucune —</SelectItem>
              {phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Statut */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Statut</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="validated">Validée</SelectItem>
              <SelectItem value="archived">Archivée</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
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
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="flex-1"
            disabled={!date || !amount || !paidBy || submitting}
            onClick={handleSave}
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement…</> : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
