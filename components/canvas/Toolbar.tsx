'use client'

import { ToolType } from '@/types/scene'

const TOOLS: { tool: ToolType; label: string; shortcut: string; icon: string }[] = [
  { tool: 'select', label: 'Select', shortcut: 'V', icon: 'M3 3l18 7-7 2-2 7z' },
  { tool: 'hand', label: 'Pan', shortcut: 'H', icon: 'M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11' },
  { tool: 'freedraw', label: 'Pen', shortcut: 'P', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
  { tool: 'line', label: 'Line', shortcut: 'L', icon: 'M5 19L19 5' },
  { tool: 'arrow', label: 'Arrow', shortcut: 'A', icon: 'M17 8l4 4m0 0l-4 4m4-4H3' },
  { tool: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z' },
  { tool: 'ellipse', label: 'Ellipse', shortcut: 'E', icon: 'M12 4a8 8 0 100 16A8 8 0 0012 4z' },
  { tool: 'diamond', label: 'Diamond', shortcut: 'D', icon: 'M12 2l10 10-10 10L2 12z' },
  { tool: 'text', label: 'Text', shortcut: 'T', icon: 'M4 6h16M4 12h8m-8 6h16' },
  { tool: 'eraser', label: 'Eraser', shortcut: 'X', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
]

interface Props {
  selectedTool: ToolType
  onSelectTool: (tool: ToolType) => void
}

export function Toolbar({ selectedTool, onSelectTool }: Props) {
  return (
    <div className="flex flex-col gap-1 p-2 bg-white border-r border-slate-200 w-14 items-center">
      {TOOLS.map(({ tool, label, shortcut, icon }) => (
        <button
          key={tool}
          onClick={() => onSelectTool(tool)}
          title={`${label} (${shortcut})`}
          aria-label={label}
          aria-pressed={selectedTool === tool}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            selectedTool === tool
              ? 'bg-violet-100 text-violet-600'
              : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </button>
      ))}
    </div>
  )
}
