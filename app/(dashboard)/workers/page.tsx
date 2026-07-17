import WorkersTable from "@/components/workers/WorkersTable"
import { PaymentsHistoryTable } from "@/components/workers/PaymentsHistoryTable"

export const metadata = { title: "Ouvriers — Chantier Tracker" }

export default function WorkersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ouvriers</h1>
        <p className="text-muted-foreground text-sm">Suivi des journées et paiements</p>
      </div>
      <WorkersTable />
      <div>
        <h2 className="text-lg font-semibold mb-4">Historique des paiements</h2>
        <PaymentsHistoryTable />
      </div>
    </div>
  )
}
