import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Receipt, HardHat, TrendingUp } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: costData }, { count: receiptsCount }] = await Promise.all([
    supabase.from("project_total_cost").select("*").single(),
    supabase.from("receipts").select("*", { count: "exact", head: true }).neq("status", "archived"),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">La Turbie</h1>
        <p className="text-muted-foreground">Rénovation maison principale</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Coût total
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(costData?.total_cost ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Matériaux + main d&apos;œuvre
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Receipt className="h-4 w-4" /> Matériaux
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(costData?.materials_cost ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {receiptsCount ?? 0} factures importées
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <HardHat className="h-4 w-4" /> Main d&apos;œuvre
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(costData?.labor_cost ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Workers + artisans
          </CardContent>
        </Card>
      </div>

      <div className="text-sm text-muted-foreground">
        <Link href="/receipts" className="text-primary hover:underline">
          Voir toutes les factures →
        </Link>
      </div>
    </div>
  )
}
