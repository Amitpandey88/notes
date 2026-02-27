'use client'

import { ElementStyle, ToolType } from '@/types/scene'

interface Props {
  style: ElementStyle
  onStyleChange: (style: ElementStyle) => void
  selectedTool: ToolType
}

const COLORS = [
  '#1a1a2e', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#3498db', '#9b59b6', '#1abc9c', '#e91e63', '#ffffff',
]

const FILL_COLORS = ['transparent', '#ffeaa7', '#dfe6e9', '#a29bfe', '#fd79a8', '#55efc4', '#74b9ff', '#fdcb6e']

export function StylePanel({ style, onStyleChange, selectedTool }: Props) {
  const update = (updates: Partial<ElementStyle>) => onStyleChange({ ...style, ...updates })
  const isShape = ['rectangle', 'ellipse', 'diamond'].includes(selectedTool)
  const isText = selectedTool === 'text'

  return (
    <div className="w-52 bg-white border-l border-slate-200 p-3 flex flex-col gap-4 overflow-y-auto">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Stroke</p>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => update({ strokeColor: color })}
              aria-label={`Stroke color ${color}`}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                style.strokeColor === color ? 'border-violet-500 scale-110' : 'border-white shadow-sm'
              }`}
              style={{ backgroundColor: color, boxShadow: color === '#ffffff' ? '0 0 0 1px #e2e8f0' : undefined }}
            />
          ))}
        </div>
        <input
          type="color"
          value={style.strokeColor}
          onChange={(e) => update({ strokeColor: e.target.value })}
          className="mt-2 w-full h-7 rounded cursor-pointer"
          aria-label="Custom stroke color"
        />
      </div>

      {isShape && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fill</p>
          <div className="flex flex-wrap gap-1.5">
            {FILL_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => update({ fillColor: color })}
                aria-label={`Fill color ${color}`}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  style.fillColor === color ? 'border-violet-500 scale-110' : 'border-slate-200'
                }`}
                style={{
                  backgroundColor: color === 'transparent' ? undefined : color,
                  backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : undefined,
                  backgroundSize: color === 'transparent' ? '6px 6px' : undefined,
                  backgroundPosition: color === 'transparent' ? '0 0, 3px 3px' : undefined,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Stroke Width: {style.strokeWidth}px
        </p>
        <input
          type="range" min={1} max={20} value={style.strokeWidth}
          onChange={(e) => update({ strokeWidth: Number(e.target.value) })}
          className="w-full accent-violet-500"
          aria-label="Stroke width"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Opacity: {Math.round(style.opacity * 100)}%
        </p>
        <input
          type="range" min={0.1} max={1} step={0.05} value={style.opacity}
          onChange={(e) => update({ opacity: Number(e.target.value) })}
          className="w-full accent-violet-500"
          aria-label="Opacity"
        />
      </div>

      {isText && (
        <>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Font Size: {style.fontSize}px
            </p>
            <input
              type="range" min={8} max={72} value={style.fontSize ?? 16}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="w-full accent-violet-500"
              aria-label="Font size"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Font</p>
            <select
              value={style.fontFamily ?? 'Caveat, cursive'}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-400"
              aria-label="Font family"
            >
              <option value="Caveat, cursive">Caveat (Handwritten)</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="Courier New, monospace">Monospace</option>
            </select>
          </div>
        </>
      )}
    </div>
  )
}
