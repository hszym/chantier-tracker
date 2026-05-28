import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HardHat } from "lucide-react"
import Link from "next/link"
import { DesktopNav, BottomNav } from "@/components/ui/nav"

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
            <span className="hidden sm:inline">Chantier Tracker</span>
          </Link>
          <DesktopNav />
          <div className="ml-auto text-xs text-muted-foreground truncate max-w-[160px]">{user.email}</div>
        </div>
      </header>
      <main className="flex-1 bg-muted/20 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
