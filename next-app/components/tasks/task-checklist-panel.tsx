"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { CheckIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  createChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  updateChecklistItemLabel,
} from "@/lib/tasks/checklist-actions";
import type { TaskChecklistItemView } from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

const LABEL_MAX = 200;

type ChecklistContextValue = {
  taskId: string;
  items: TaskChecklistItemView[];
  canManageChecklist: boolean;
  optimisticToggle: (itemId: string, checked: boolean) => void;
  optimisticDelete: (itemId: string) => void;
  appendItem: (item: TaskChecklistItemView) => void;
};

const ChecklistContext = createContext<ChecklistContextValue | null>(null);

function useChecklistContext(): ChecklistContextValue {
  const ctx = useContext(ChecklistContext);
  if (!ctx) {
    throw new Error(
      "TaskChecklist subcomponents must be used inside TaskChecklistProvider.",
    );
  }
  return ctx;
}

/**
 * ChecklistItemRow — fila individual del checklist.
 *
 * - canManage=true  → checkbox interactivo, edición inline al click en label, botón eliminar.
 * - canManage=false → checkbox deshabilitado (solo lectura), sin edición, sin eliminar.
 */
function ChecklistItemRow({
  item,
  canManage,
  onOptimisticToggle,
  onOptimisticDelete,
}: {
  item: TaskChecklistItemView;
  canManage: boolean;
  onOptimisticToggle: (itemId: string, checked: boolean) => void;
  onOptimisticDelete: (itemId: string) => void;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.label);
  const [editError, setEditError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleToggle = useCallback(() => {
    if (!canManage || isPending) return;
    const newChecked = !item.checked;
    onOptimisticToggle(item.id, newChecked);
    startTransition(async () => {
      const result = await toggleChecklistItem(item.id, newChecked);
      if (!result.ok) {
        router.refresh();
      }
    });
  }, [canManage, isPending, item.id, item.checked, onOptimisticToggle, router]);

  const startEditing = useCallback(() => {
    if (!canManage) return;
    setEditValue(item.label);
    setEditError(null);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [canManage, item.label]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditError(null);
    setEditValue(item.label);
  }, [item.label]);

  const confirmEditing = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed.length === 0) {
      setEditError("El label no puede estar vacío.");
      return;
    }
    if (trimmed.length > LABEL_MAX) {
      setEditError(`El label no puede superar los ${LABEL_MAX} caracteres.`);
      return;
    }
    if (trimmed === item.label) {
      setIsEditing(false);
      return;
    }
    setEditError(null);
    setIsEditing(false);
    startTransition(async () => {
      const result = await updateChecklistItemLabel(item.id, trimmed);
      if (!result.ok) {
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }, [editValue, item.id, item.label, router]);

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmEditing();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  };

  const handleDelete = useCallback(() => {
    if (!canManage || isPending) return;
    onOptimisticDelete(item.id);
    startTransition(async () => {
      const result = await deleteChecklistItem(item.id);
      if (!result.ok) {
        router.refresh();
      }
    });
  }, [canManage, isPending, item.id, onOptimisticDelete, router]);

  return (
    <li className="group flex items-start gap-2 py-1">
      <Checkbox
        id={`checklist-item-${item.id}`}
        checked={item.checked}
        onCheckedChange={canManage ? handleToggle : undefined}
        disabled={!canManage || isPending}
        className="mt-0.5 shrink-0"
        aria-label={item.checked ? "Marcar como pendiente" : "Marcar como completado"}
      />

      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={confirmEditing}
                maxLength={LABEL_MAX}
                className="h-7 text-sm"
                disabled={isPending}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                onClick={confirmEditing}
                disabled={isPending}
                title="Confirmar"
                aria-label="Confirmar edición"
              >
                <CheckIcon className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                onClick={cancelEditing}
                disabled={isPending}
                title="Cancelar"
                aria-label="Cancelar edición"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
            {editError ? (
              <p className="text-destructive text-xs">{editError}</p>
            ) : null}
          </div>
        ) : (
          <span
            role={canManage ? "button" : undefined}
            tabIndex={canManage ? 0 : undefined}
            onClick={canManage ? startEditing : undefined}
            onKeyDown={
              canManage
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      startEditing();
                    }
                  }
                : undefined
            }
            className={cn(
              "block text-sm leading-relaxed",
              item.checked && "text-muted-foreground line-through",
              canManage &&
                "cursor-pointer rounded px-1 -mx-1 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            )}
            title={canManage ? "Haz clic para editar" : undefined}
          >
            {item.label}
          </span>
        )}
      </div>

      {canManage && !isEditing ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleDelete}
          disabled={isPending}
          title="Elimina"
          aria-label="Elimina este item"
        >
          <TrashIcon className="size-4" />
        </Button>
      ) : null}
    </li>
  );
}

/**
 * TaskChecklistProvider
 *
 * Aloja el estado compartido del checklist (items optimistas) para que la lista
 * y el formulario de agregar puedan vivir en distintas zonas del layout — por
 * ejemplo, el input fijo al fondo del tab Detalle mientras la lista vive en el
 * área scrollable.
 */
export function TaskChecklistProvider({
  taskId,
  items: initialItems,
  canManageChecklist,
  children,
}: {
  taskId: string;
  items: TaskChecklistItemView[];
  canManageChecklist: boolean;
  children: ReactNode;
}) {
  const [items, setItems] = useState<TaskChecklistItemView[]>(initialItems);
  const [prevInitial, setPrevInitial] =
    useState<TaskChecklistItemView[]>(initialItems);

  if (prevInitial !== initialItems) {
    setPrevInitial(initialItems);
    setItems(initialItems);
  }

  const optimisticToggle = useCallback(
    (itemId: string, checked: boolean) => {
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, checked } : it)),
      );
    },
    [],
  );

  const optimisticDelete = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  }, []);

  const appendItem = useCallback((item: TaskChecklistItemView) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const value = useMemo<ChecklistContextValue>(
    () => ({
      taskId,
      items,
      canManageChecklist,
      optimisticToggle,
      optimisticDelete,
      appendItem,
    }),
    [
      taskId,
      items,
      canManageChecklist,
      optimisticToggle,
      optimisticDelete,
      appendItem,
    ],
  );

  return (
    <ChecklistContext.Provider value={value}>
      {children}
    </ChecklistContext.Provider>
  );
}

/**
 * TaskChecklistList
 *
 * Renderiza el título "Checklist" y la lista de items. No renderiza el input
 * para agregar — ese se monta aparte con `TaskChecklistAddForm` para poder
 * fijarlo al fondo del contenedor.
 *
 * Render condicional:
 *   - Sin items + sin canManageChecklist → no se renderiza nada
 *   - Sin items + con canManageChecklist → solo el título (el input vive afuera)
 */
export function TaskChecklistList() {
  const { items, canManageChecklist, optimisticToggle, optimisticDelete } =
    useChecklistContext();

  if (items.length === 0 && !canManageChecklist) {
    return null;
  }

  return (
    <section className="space-y-3">
      {items.length > 0 ? (
        <ul className="space-y-0.5">
          {items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              canManage={canManageChecklist}
              onOptimisticToggle={optimisticToggle}
              onOptimisticDelete={optimisticDelete}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * TaskChecklistAddForm
 *
 * Input + botón "Agregar" para crear nuevos items. Se monta separado de la
 * lista para poder fijarlo al fondo del tab Detalle (similar al input de
 * comentarios). Solo se renderiza si el usuario tiene `canManageChecklist`.
 */
export function TaskChecklistAddForm() {
  const router = useRouter();
  const { taskId, canManageChecklist, appendItem } = useChecklistContext();
  const [newLabel, setNewLabel] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const addInputRef = useRef<HTMLInputElement | null>(null);

  const submitNew = () => {
    if (isPending) return;
    const trimmed = newLabel.trim();
    if (trimmed.length === 0) {
      return;
    }
    if (trimmed.length > LABEL_MAX) {
      setAddError(`El label no puede superar los ${LABEL_MAX} caracteres.`);
      return;
    }
    setAddError(null);
    setNewLabel("");
    addInputRef.current?.focus();
    startTransition(async () => {
      const result = await createChecklistItem(taskId, trimmed);
      if (!result.ok) {
        setAddError(result.error);
        addInputRef.current?.focus();
        return;
      }
      appendItem(result.data);
      router.refresh();
      addInputRef.current?.focus();
    });
  };

  const handleAddKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitNew();
    }
  };

  if (!canManageChecklist) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          ref={addInputRef}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={handleAddKeyDown}
          placeholder="Agrega un item al checklist"
          className="h-8 text-sm"
          maxLength={LABEL_MAX}
          aria-label="Agrega un item al checklist"
        />
        <Button
          type="button"
          size="sm"
          onClick={submitNew}
          disabled={isPending || newLabel.trim().length === 0}
          className="shrink-0"
        >
          Agregar
        </Button>
      </div>
      {addError ? (
        <p className="text-destructive text-xs">{addError}</p>
      ) : null}
    </div>
  );
}
