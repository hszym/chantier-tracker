import { redirect } from "next/navigation"

// Root route — redirect to the dashboard (handled by (dashboard)/page.tsx)
export default function RootPage() {
  redirect("/receipts")
}
