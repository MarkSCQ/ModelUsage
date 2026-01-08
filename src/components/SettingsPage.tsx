import { Settings, Type, RefreshCw } from 'lucide-react'

export type FontSize = 'small' | 'medium' | 'large'
export type RefreshRate = '15min' | '30min' | '1hour'

interface SettingsPageProps {
  normalFontSize: FontSize
  miniFontSize: FontSize
  refreshRate: RefreshRate
  onNormalFontSizeChange: (size: FontSize) => void
  onMiniFontSizeChange: (size: FontSize) => void
  onRefreshRateChange: (rate: RefreshRate) => void
}

const fontSizeOptions: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

const refreshRateOptions: { value: RefreshRate; label: string; minutes: number }[] = [
  { value: '15min', label: '15 Minutes', minutes: 15 },
  { value: '30min', label: '30 Minutes', minutes: 30 },
  { value: '1hour', label: '1 Hour', minutes: 60 },
]

function FontSizeSelector({ 
  label, 
  description,
  value, 
  onChange 
}: { 
  label: string
  description: string
  value: FontSize
  onChange: (size: FontSize) => void 
}) {
  return (
    <div className="p-4 bg-gradient-to-br from-[#0f0f18]/80 to-[#0a0a12]/80 rounded-xl border border-white/[0.04]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg">
          <Type className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 p-1 bg-black/20 rounded-lg">
        {fontSizeOptions.map(option => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
              value === option.value
                ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SettingsPage({ 
  normalFontSize, 
  miniFontSize,
  refreshRate,
  onNormalFontSizeChange, 
  onMiniFontSizeChange,
  onRefreshRateChange
}: SettingsPageProps) {
  const handleNormalFontSizeChange = async (size: FontSize) => {
    onNormalFontSizeChange(size)
    // Save to database
    await window.electronAPI?.saveSetting('normalFontSize', size)
  }

  const handleMiniFontSizeChange = async (size: FontSize) => {
    onMiniFontSizeChange(size)
    // Save to database
    await window.electronAPI?.saveSetting('miniFontSize', size)
  }

  const handleRefreshRateChange = async (rate: RefreshRate) => {
    onRefreshRateChange(rate)
    // Save to database
    await window.electronAPI?.saveSetting('refreshRate', rate)
  }
  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-gray-500/20 to-slate-500/10 rounded-xl border border-gray-500/20">
          <Settings className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground">Customize your experience</p>
        </div>
      </div>

      {/* Data Refresh Settings */}
      <div className="space-y-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-1">
          Data Refresh
        </h2>
        
        <div className="p-4 bg-gradient-to-br from-[#0f0f18]/80 to-[#0a0a12]/80 rounded-xl border border-white/[0.04]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Refresh Rate</h3>
              <p className="text-xs text-muted-foreground">Auto-refresh interval for data updates</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-1 bg-black/20 rounded-lg">
            {refreshRateOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleRefreshRateChange(option.value)}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${
                  refreshRate === option.value
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Font Size Settings */}
      <div className="space-y-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-1">
          Font Size
        </h2>
        
        <FontSizeSelector
          label="Normal View"
          description="Font size for the main application"
          value={normalFontSize}
          onChange={handleNormalFontSizeChange}
        />
        
        <FontSizeSelector
          label="Mini View"
          description="Font size for the compact mini view"
          value={miniFontSize}
          onChange={handleMiniFontSizeChange}
        />
      </div>

      {/* Preview */}
      <div className="p-4 bg-gradient-to-br from-[#0f0f18]/80 to-[#0a0a12]/80 rounded-xl border border-white/[0.04]">
        <h3 className="text-sm font-semibold text-foreground mb-4">Preview</h3>
        <div className="space-y-4">
          <div className="p-3 bg-black/20 rounded-lg">
            <p className="text-[10px] text-muted-foreground mb-1">Normal View ({normalFontSize}) - {normalFontSize === 'small' ? '10px' : normalFontSize === 'medium' ? '15px' : '20px'}</p>
            <p className={`text-foreground ${normalFontSize === 'small' ? 'text-[10px]' : normalFontSize === 'medium' ? 'text-[15px]' : 'text-[20px]'}`}>
              Claude: 526K tokens • Codex: 20.5M tokens
            </p>
          </div>
          <div className="p-3 bg-black/20 rounded-lg">
            <p className="text-[10px] text-muted-foreground mb-1">Mini View ({miniFontSize}) - {miniFontSize === 'small' ? '6px' : miniFontSize === 'medium' ? '11px' : '16px'}</p>
            <p className={`text-foreground ${miniFontSize === 'small' ? 'text-[6px]' : miniFontSize === 'medium' ? 'text-[11px]' : 'text-[16px]'}`}>
              Claude: In 198K Out 328K Total 526K
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

