"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function PerfilPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Mi perfil</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Actualizá tus datos personales.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Datos de la cuenta</CardTitle>
          <Badge variant="secondary">Consumidor final</Badge>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" defaultValue="Lucas" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input id="apellido" defaultValue="Ferro" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue="lucas.ferro@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" type="tel" defaultValue="+54 11 6000-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">CUIT / DNI</Label>
              <Input id="tax" defaultValue="20-12345678-9" />
            </div>
            <Button type="submit" className="bg-primary">
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <Label htmlFor="current">Contraseña actual</Label>
              <Input id="current" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newp">Nueva contraseña</Label>
              <Input id="newp" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newp2">Repetir nueva contraseña</Label>
              <Input id="newp2" type="password" />
            </div>
            <Button type="submit" variant="secondary">
              Actualizar contraseña
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
