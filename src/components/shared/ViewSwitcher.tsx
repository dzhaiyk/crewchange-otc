export type ViewMode = "calendar" | "timeline";

interface ViewSwitcherProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

const SEGMENTS: { value: ViewMode; label: string }[] = [
  { value: "calendar", label: "Calendar" },
  { value: "timeline", label: "Timeline" },
];

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5">
      {SEGMENTS.map((seg) => (
        <button
          key={seg.value}
          type="button"
          onClick={() => onChange(seg.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            view === seg.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {seg.label}
        </button>
      ))}
    </div>
  );
}
