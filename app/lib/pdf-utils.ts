export type FieldKind = "text" | "checkbox" | "radio" | "dropdown" | "option-list" | "unknown";

export type PdfFieldState = {
  name: string;
  label?: string;
  kind: FieldKind;
  value: string | boolean | string[];
  options?: string[];
};

export type PdfTextLabelItem = {
  text: string;
  x: number;
  y: number;
  width: number;
};

export type PdfWidgetLabelSource = {
  name: string;
  rect: [number, number, number, number];
  alternativeText?: string;
};

const isUsefulLabelText = (text: string) => {
  const trimmed = text.trim();
  return trimmed.length > 1 && /[A-Za-z]/.test(trimmed) && !/^https?:|^www\./i.test(trimmed);
};

export function inferFieldLabel(widget: PdfWidgetLabelSource, items: PdfTextLabelItem[]) {
  if (widget.alternativeText?.trim()) return widget.alternativeText.trim();
  const [x1, y1, x2, y2] = widget.rect;
  const useful = items.filter((item) => isUsefulLabelText(item.text));

  const inlineLeft = useful
    .filter((item) => item.y >= y1 - 3 && item.y <= y2 + 3)
    .filter((item) => item.x + item.width <= x1 + 4)
    .sort((a, b) => (x1 - (a.x + a.width)) - (x1 - (b.x + b.width)));
  if (inlineLeft.length && x1 - (inlineLeft[0].x + inlineLeft[0].width) <= 16) return inlineLeft[0].text.trim();

  const inlineRight = useful
    .filter((item) => item.y >= y1 - 3 && item.y <= y2 + 3)
    .filter((item) => item.x >= x2 - 4 && item.x - x2 <= 20)
    .sort((a, b) => a.x - x2 - (b.x - x2));
  if (x2 - x1 <= 40 && inlineRight.length) return inlineRight[0].text.trim();

  const below = useful
    .filter((item) => item.y >= y1 - 20 && item.y <= y1 + 2)
    .filter((item) => item.x <= x2 + 4 && item.x + item.width >= x1 - 4)
    .sort((a, b) => Math.abs(a.y - y1) - Math.abs(b.y - y1) || a.x - b.x);
  if (y2 < 95 && below.length) return below[0].text.trim();

  const above = useful
    .filter((item) => item.y >= y2 - 2 && item.y <= y2 + 18)
    .filter((item) => item.x <= x2 + 4 && item.x + item.width >= x1 - 4)
    .sort((a, b) => Math.abs(a.y - y2) - Math.abs(b.y - y2) || a.x - b.x);
  if (above.length) {
    const nearestY = above[0].y;
    return above.filter((item) => Math.abs(item.y - nearestY) < 2).sort((a, b) => a.x - b.x).map((item) => item.text.trim()).join(" ");
  }

  if (inlineLeft.length) return inlineLeft[0].text.trim();
  if (below.length) return below[0].text.trim();

  return undefined;
}

export function friendlyFieldName(name: string) {
  const lastPart = name.split(".").pop() || name;
  return lastPart.replace(/\[\d+\]/g, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

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
