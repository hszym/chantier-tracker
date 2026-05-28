import WorkersTable from "@/components/workers/WorkersTable"

export const metadata = { title: "Ouvriers — Chantier Tracker" }

export default function WorkersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Ouvriers</h1>
        <p className="text-muted-foreground text-sm">Suivi des journées et paiements</p>
      </div>
      <WorkersTable />
    </div>
  )
}
