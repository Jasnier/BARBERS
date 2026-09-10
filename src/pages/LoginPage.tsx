import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, User } from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<"admin" | "barber">("admin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: "admin" | "barber") => {
    setMode(newMode);
    setIdentifier("");
    setPassword("");
    setError("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Scissors className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">BarberPro</CardTitle>
          <CardDescription>Inicia sesión para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => handleModeChange("admin")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "admin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Administrador
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("barber")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "barber" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Barbero
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="identifier">
                {mode === "barber" ? "Tu código" : "Correo electrónico"}
              </Label>
              <div className="relative">
                {mode === "barber" && (
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  id="identifier"
                  type={mode === "barber" ? "text" : "email"}
                  placeholder={mode === "barber" ? "Ej: carlos" : "admin@barberia.com"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={mode === "barber" ? "pl-9" : ""}
                  required
                />
              </div>
              {mode === "barber" && (
                <p className="text-xs text-muted-foreground">Pídele tu código al administrador</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/client/login" className="text-sm text-muted-foreground hover:text-primary hover:underline">
              Soy cliente →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
