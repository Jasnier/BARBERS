import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scissors, ArrowLeft, Home } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <Card className="w-full max-w-md border-0 bg-white shadow-lg">
        <CardContent className="flex flex-col items-center p-10 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
            <Scissors className="h-10 w-10 text-blue-600" />
          </div>

          <h1 className="mb-2 text-7xl font-extrabold tracking-tight text-gray-900">
            404
          </h1>
          <h2 className="mb-3 text-xl font-semibold text-gray-700">
            Página no encontrada
          </h2>
          <p className="mb-8 text-sm text-muted-foreground">
            La ruta que buscas no existe o fue movida. Verifica la URL o regresa al inicio.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button onClick={() => navigate("/")} className="gap-2">
              <Home className="h-4 w-4" />
              Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
