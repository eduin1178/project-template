import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function TaskCommentsPlaceholder({
  authorLabel,
}: {
  authorLabel: string;
}) {
  return (
    <footer className="space-y-3 border-t bg-muted/20 p-4">
      <Textarea
        placeholder={`Responde a ${authorLabel}…`}
        rows={3}
        disabled
        className="resize-none bg-background"
      />
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="mute-thread"
          className="text-muted-foreground flex items-center gap-2 text-sm"
        >
          <input
            id="mute-thread"
            type="checkbox"
            disabled
            className="size-4 rounded"
          />
          Silenciar esta tarea
        </label>
        <Button type="button" size="sm" disabled>
          Enviar
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Los comentarios llegan en una próxima entrega.
      </p>
    </footer>
  );
}
