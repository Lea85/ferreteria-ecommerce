import { Heart } from "lucide-react";

export default function FavoritosPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-20 text-center">
      <Heart className="size-14 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-semibold text-foreground">
        No tenes favoritos aun
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Guarda productos tocando el corazon en el catalogo para verlos aca.
      </p>
    </div>
  );
}
