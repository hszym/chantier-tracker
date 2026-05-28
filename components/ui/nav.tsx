"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Receipt, Users, Package } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/",          label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/receipts",  label: "Factures",         icon: Receipt },
  { href: "/materiaux", label: "Matériaux",         icon: Package },
  { href: "/workers",   label: "Ouvriers",          icon: Users },
]

export function DesktopNav() {
  const path = usePathname()
  return (
    <nav className="hidden md:flex items-center gap-4 text-sm">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t safe-area-pb">
      <div className="flex">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors",
                active ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
