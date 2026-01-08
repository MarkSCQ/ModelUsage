import { Minus, X, Maximize2, RefreshCw } from 'lucide-react'
import type { ProviderData } from '@/types/electron'
import type { FontSize } from '@/components/SettingsPage'

interface MiniViewProps {
  providers: Record<string, ProviderData>
  onExpand: () => void
  onRefresh: () => void
  refreshing: boolean
  fontSize: FontSize
}

const providerColors: Record<string, { bg: string; text: string }> = {
  claude: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  codex: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
}

const providerNames: Record<string, string> = {
  claude: 'Claude',
  codex: 'Codex',
}

// Font size mappings for mini view - each step +5px (6px → 11px → 16px)
const fontSizeConfig: Record<FontSize, {
  classes: { name: string; label: string; value: string; total: string }
  layout: { gap: string; nameW: string; valueW: string; padding: string }
}> = {
  small: {
    classes: { name: 'text-[6px]', label: 'text-[5px]', value: 'text-[6px]', total: 'text-[7px]' },
    layout: { gap: 'gap-1', nameW: 'w-8', valueW: 'w-8', padding: 'px-1.5 py-1' }
  },
  medium: {
    classes: { name: 'text-[11px]', label: 'text-[10px]', value: 'text-[11px]', total: 'text-[12px]' },
    layout: { gap: 'gap-2', nameW: 'w-12', valueW: 'w-12', padding: 'px-2.5 py-1.5' }
  },
  large: {
    classes: { name: 'text-[16px]', label: 'text-[15px]', value: 'text-[16px]', total: 'text-[17px]' },
    layout: { gap: 'gap-3', nameW: 'w-16', valueW: 'w-16', padding: 'px-3 py-2' }
  },
}

// Window sizes for different font sizes
export const miniWindowSizes: Record<FontSize, { width: number; height: number }> = {
  small: { width: 280, height: 140 },
  medium: { width: 380, height: 170 },
  large: { width: 500, height: 210 },
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
  return tokens.toString()
}

export function MiniView({ providers, onExpand, onRefresh, refreshing, fontSize }: MiniViewProps) {
  const handleMinimize = () => window.electronAPI?.windowMinimize()
  const handleClose = () => window.electronAPI?.windowClose()
  
  const config = fontSizeConfig[fontSize]
  const { classes: fontClasses, layout } = config

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] select-none overflow-hidden">
      {/* Mini Title Bar - Compact */}
      <div className="flex items-center justify-between h-8 px-2 bg-gradient-to-b from-[#0f0f15] to-[#0a0a0f] border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-2 titlebar-drag flex-1">
          <span className={`${fontClasses.name} font-medium text-foreground/80`}>Usage</span>
        </div>
        <div className="flex items-center gap-0.5 titlebar-no-drag">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="w-6 h-5 flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06] rounded transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onExpand}
            className="w-6 h-5 flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06] rounded transition-all"
            title="Expand"
          >
            <Maximize2 className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={handleMinimize}
            className="w-6 h-5 flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06] rounded transition-all"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={handleClose}
            className="w-6 h-5 flex items-center justify-center text-muted-foreground/60 hover:text-white hover:bg-red-500/90 rounded transition-all"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Mini Content - Compact */}
      <div className={`flex-1 p-1.5 space-y-1.5 overflow-hidden`}>
        {Object.entries(providers).map(([key, data]) => {
          const colors = providerColors[key] || { bg: 'bg-gray-500/10', text: 'text-gray-400' }
          const name = providerNames[key] || key
          const totalTokens = (data.inputTokens || 0) + (data.outputTokens || 0)

          return (
            <div
              key={key}
              className={`${layout.padding} rounded-md ${colors.bg} border border-white/[0.04]`}
            >
              <div className={`flex items-center justify-between ${layout.gap}`}>
                <div className={`flex items-center ${layout.gap} flex-1 min-w-0`}>
                  <span className={`${fontClasses.name} font-semibold ${colors.text} ${layout.nameW} flex-shrink-0`}>{name}</span>
                  <div className={`flex items-center ${layout.gap} ${fontClasses.value} flex-1 min-w-0`}>
                    <span className="text-muted-foreground flex-shrink-0">In</span>
                    <span className={`font-mono text-foreground ${layout.valueW} flex-shrink-0`}>{formatTokens(data.inputTokens || 0)}</span>
                    <span className="text-muted-foreground flex-shrink-0">Out</span>
                    <span className={`font-mono text-foreground ${layout.valueW} flex-shrink-0`}>{formatTokens(data.outputTokens || 0)}</span>
                  </div>
                </div>
                <div className={`flex items-center ${layout.gap} flex-shrink-0`}>
                  <span className={`${fontClasses.label} text-muted-foreground`}>{data.sessions} sess</span>
                  <span className={`${fontClasses.total} font-mono font-bold ${colors.text}`}>{formatTokens(totalTokens)}</span>
                </div>
              </div>
            </div>
          )
        })}
        
        {Object.keys(providers).length === 0 && (
          <div className={`text-center py-2 ${fontClasses.label} text-muted-foreground`}>
            No data
          </div>
        )}
      </div>
    </div>
  )
}
