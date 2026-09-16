/**
 * Props for the ColorPicker component
 */
export interface ColorPickerProps {
  /** Currently selected color */
  selectedColor: string;
  /** Callback when a color is selected */
  onChange: (color: string) => void;
}

/**
 * Preset colors for keywords
 * Curated palette that works well in both light and dark themes
 */
const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
];

/**
 * ColorPicker - Grid of preset colors for selecting keyword colors
 *
 * Displays a grid of color swatches. The selected color is highlighted
 * with a check mark. Clicking a color triggers the onChange callback.
 */
export function ColorPicker({ selectedColor, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {PRESET_COLORS.map((color) => {
        const isSelected = color.toLowerCase() === selectedColor.toLowerCase();
        
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="w-6 h-6 rounded-full transition-transform duration-150 hover:scale-110 active:scale-95 flex items-center justify-center"
            style={{
              backgroundColor: color,
              boxShadow: isSelected 
                ? '0 0 0 2px var(--bg-card), 0 0 0 4px ' + color
                : undefined,
            }}
            aria-label={'Select color ' + color}
            aria-pressed={isSelected}
          >
            {isSelected && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ColorPicker;
