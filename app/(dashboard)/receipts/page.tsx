import ReceiptsTable from "@/components/receipts/ReceiptsTable"
import NewReceiptSheet from "@/components/receipts/NewReceiptSheet"

export const metadata = { title: "Factures — Chantier Tracker" }

export default function ReceiptsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Factures</h1>
          <p className="text-muted-foreground text-sm">Toutes les dépenses du projet La Turbie</p>
        </div>
        <NewReceiptSheet />
      </div>
      <ReceiptsTable />
    </div>
  )
}
