import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HardHat, LayoutDashboard, Receipt } from "lucide-react"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
            <HardHat className="h-5 w-5" />
            Chantier Tracker
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Tableau de bord
            </Link>
            <Link
              href="/receipts"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Receipt className="h-4 w-4" />
              Factures
            </Link>
          </nav>
          <div className="ml-auto text-xs text-muted-foreground">{user.email}</div>
        </div>
      </header>
      <main className="flex-1 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  )
}
