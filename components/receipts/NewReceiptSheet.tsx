"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sheet } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Loader2, Plus, ScanLine, X } from "lucide-react"

const PROJECT_ID = "11111111-1111-1111-1111-111111111111"

type Phase = { id: string; name: string }
type Person = { id: string; name: string }

interface FormState {
  date: string
  total_amount: string
  store_name: string
  payment_method: string
  phase_id: string
  paid_by: string
  notes: string
}

const EMPTY_FORM: FormState = {
  date: "",
  total_amount: "",
  store_name: "",
  payment_method: "",
  phase_id: "",
  paid_by: "",
  notes: "",
}

export default function NewReceiptSheet() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [phases, setPhases] = useState<Phase[]>([])
  const [people, setPeople] = useState<Person[]>([])

  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRefs() {
      const [{ data: ph }, { data: pe }] = await Promise.all([
        supabase.from("phases").select("id, name").order("order_index"),
        supabase.from("people").select("id, name").eq("is_active", true),
      ])
      setPhases(ph ?? [])
      setPeople(pe ?? [])
    }
    loadRefs()
  }, [])

  function handleClose() {
    setOpen(false)
    setPhoto(null)
    setPhotoPreview(null)
    setOcrError(null)
    setForm(EMPTY_FORM)
    setSubmitError(null)
  }

  async function handlePhotoChange(file: File) {
    setPhoto(file)
    setOcrError(null)

    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Run OCR
    setOcrLoading(true)
    try {
      const { base64, mimeType: compressedMime } = await compressAndEncode(file)
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: compressedMime }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`)

      setForm((f) => ({
        ...f,
        date: data.date ?? f.date,
        total_amount: data.total_amount != null ? String(data.total_amount) : f.total_amount,
        store_name: data.store_name ?? f.store_name,
        payment_method: data.payment_method ?? f.payment_method,
      }))
    } catch (e) {
      setOcrError(`OCR échoué (${e instanceof Error ? e.message : "erreur inconnue"}) — remplissez manuellement`)
    } finally {
      setOcrLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.total_amount || !form.date || !form.paid_by) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      // 1. Upload photo if present
      let photoUrl: string | null = null
      if (photo) {
        const ext = photo.name.split(".").pop() ?? "jpg"
        const path = `${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from("receipts")
          .upload(path, photo, { contentType: photo.type })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path)
          photoUrl = urlData.publicUrl
        }
      }

      // 2. Find or create store
      let storeId: string | null = null
      if (form.store_name.trim()) {
        const { data: existing } = await supabase
          .from("stores")
          .select("id")
          .ilike("name", form.store_name.trim())
          .maybeSingle()

        if (existing) {
          storeId = existing.id
        } else {
          const { data: newStore } = await supabase
            .from("stores")
            .insert({ name: form.store_name.trim() })
            .select("id")
            .single()
          storeId = newStore?.id ?? null
        }
      }

      // 3. Insert receipt
      const { data: receipt, error: receiptErr } = await supabase
        .from("receipts")
        .insert({
          project_id: PROJECT_ID,
          phase_id: form.phase_id || null,
          store_id: storeId,
          paid_by: form.paid_by,
          receipt_date: form.date,
          total_amount: parseFloat(form.total_amount),
          payment_method: (form.payment_method || null) as never,
          photo_url: photoUrl,
          status: "pending",
          source: "manual",
          notes: form.notes || null,
        })
        .select("id")
        .single()

      if (receiptErr) throw receiptErr

      // 4. Insert one receipt_line for the total
      await supabase.from("receipt_lines").insert({
        receipt_id: receipt.id,
        line_number: 1,
        description: form.store_name || "Achat",
        line_total: parseFloat(form.total_amount),
        is_categorized: false,
      })

      handleClose()
      router.refresh()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Erreur lors de la création")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !!form.total_amount && !!form.date && !!form.paid_by && !submitting

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-1.5" />
        Nouvelle facture
      </Button>

      <Sheet open={open} onClose={handleClose} title="Nouvelle facture">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Photo du ticket</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handlePhotoChange(f)
              }}
            />

            {photoPreview ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img src={photoPreview} alt="Aperçu ticket" className="w-full max-h-48 object-contain bg-muted/30" />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                  className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white"
                >
                  <X className="h-4 w-4" />
                </button>
                {ocrLoading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyse OCR…
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Camera className="h-8 w-8" />
                <span className="text-sm">Prendre une photo ou choisir un fichier</span>
              </button>
            )}

            {ocrError && (
              <p className="text-xs text-destructive">{ocrError}</p>
            )}
            {!ocrLoading && photoPreview && !ocrError && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <ScanLine className="h-3 w-3" /> Champs pré-remplis par OCR — vérifiez avant de valider
              </p>
            )}
          </div>

          <div className="h-px bg-border" />

          {/* Date + Montant */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date *</label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Montant (€) *</label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={form.total_amount}
                onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value.replace(",", ".") }))}
              />
            </div>
          </div>

          {/* Magasin */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Magasin / Fournisseur</label>
            <Input
              placeholder="ex : Brico Dépôt, Leroy Merlin…"
              value={form.store_name}
              onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
            />
          </div>

          {/* Payé par + Mode paiement */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payé par *</label>
              <Select value={form.paid_by} onValueChange={(v) => setForm((f) => ({ ...f, paid_by: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Qui ?" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Paiement</label>
              <Select value={form.payment_method} onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
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
            <Select value={form.phase_id} onValueChange={(v) => setForm((f) => ({ ...f, phase_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une phase" />
              </SelectTrigger>
              <SelectContent>
                {phases.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Input
              placeholder="Optionnel…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement…</>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  )
}

async function compressAndEncode(file: File): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file)
  const MAX = 1500
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("Canvas toBlob failed")); return }
        const reader = new FileReader()
        reader.onload = () => resolve({
          base64: (reader.result as string).split(",")[1],
          mimeType: "image/jpeg",
        })
        reader.onerror = reject
        reader.readAsDataURL(blob)
      },
      "image/jpeg",
      0.85
    )
  })
}
