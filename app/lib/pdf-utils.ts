export type FieldKind = "text" | "checkbox" | "radio" | "dropdown" | "option-list" | "unknown";

export type PdfFieldState = {
  name: string;
  kind: FieldKind;
  value: string | boolean | string[];
  options?: string[];
};

export type TextOverlay = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  text: string;
  fontSize: number;
};

export function canvasPointToPdf(
  clickX: number,
  clickY: number,
  scale: number,
  pageHeightPt: number,
  fontSize: number,
) {
  return {
    x: clickX / scale,
    y: pageHeightPt - clickY / scale - fontSize,
  };
}

export function fieldKindFromConstructor(constructorName: string): FieldKind {
  const name = constructorName.toLowerCase();
  if (name.includes("textfield")) return "text";
  if (name.includes("checkbox")) return "checkbox";
  if (name.includes("radiogroup")) return "radio";
  if (name.includes("dropdown")) return "dropdown";
  if (name.includes("optionlist")) return "option-list";
  return "unknown";
}

type FormFieldLike = {
  constructor: { name: string };
  getName(): string;
  setText?(value: string): void;
  check?(): void;
  uncheck?(): void;
  select?(value: string | string[]): void;
};

export function applyFieldValues(fields: FormFieldLike[], values: PdfFieldState[]) {
  const byName = new Map(values.map((field) => [field.name, field]));
  for (const field of fields) {
    const next = byName.get(field.getName());
    if (!next) continue;
    if (next.kind === "text") field.setText?.(String(next.value ?? ""));
    if (next.kind === "checkbox") {
      if (next.value) field.check?.();
      else field.uncheck?.();
    }
    if (next.kind === "radio" || next.kind === "dropdown" || next.kind === "option-list") {
      const value = Array.isArray(next.value) ? next.value : String(next.value || "");
      if ((Array.isArray(value) && value.length) || value) field.select?.(value);
    }
  }
}
