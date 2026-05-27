"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { HardHat } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <HardHat className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Chantier Tracker</CardTitle>
          <CardDescription>La Turbie — Suivi de chantier</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-center text-sm text-muted-foreground">
              Lien de connexion envoyé à <strong>{email}</strong>. Vérifiez votre boîte mail.
            </p>
          ) : (
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                disabled={loading}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={handleLogin} disabled={loading || !email}>
                {loading ? "Envoi…" : "Recevoir un lien magique"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
