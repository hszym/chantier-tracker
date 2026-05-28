import MaterialsTable from "@/components/materials/MaterialsTable"

export const metadata = { title: "Matériaux — Chantier Tracker" }

export default function MateriauxPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Matériaux</h1>
        <p className="text-muted-foreground text-sm">Détail des achats par article et par lot</p>
      </div>
      <MaterialsTable />
    </div>
  )
}
