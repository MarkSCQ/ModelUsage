import { Minus, Square, X, Layers, RefreshCw, PanelLeftClose, PanelLeft, Minimize2 } from 'lucide-react'
import type { FontSize } from '@/components/SettingsPage'

interface TitleBarProps {
  onRefresh?: () => void
  refreshing?: boolean
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
  onToggleMini?: () => void
  platform?: 'linux' | 'win32' | 'darwin' | null
  fontSize?: FontSize
}

// Font size mappings for title bar
const fontSizeClasses: Record<FontSize, { title: string; button: string }> = {
  small: { title: 'text-[12px]', button: 'text-[10px]' },
  medium: { title: 'text-[15px]', button: 'text-xs' },
  large: { title: 'text-[18px]', button: 'text-sm' },
}

// Linux (Tux) logo
function LinuxLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.468v.018c.003.065.006.128.02.19.014.063.036.116.06.165a.57.57 0 00.041.064.61.61 0 01-.036.054.531.531 0 01-.071.041c-.118.05-.255.066-.381.066-.224 0-.422-.058-.567-.167a.8.8 0 01-.09-.08c-.02-.02-.04-.041-.054-.063a.49.49 0 01-.033-.054c.004-.05.01-.1.018-.15a1.607 1.607 0 00.023-.467 1.286 1.286 0 00-.09-.4.853.853 0 00-.2-.333c-.084-.1-.176-.132-.262-.132h-.016c-.1 0-.183.066-.267.132-.078.133-.139.2-.183.333a1.21 1.21 0 00-.061.4v.02c.006.138.035.274.088.402.037.065.133.138.183.198a1.312 1.312 0 00-.22.066c-.086.069-.18.088-.284.133a.71.71 0 00-.088.042.953.953 0 01-.213-.335 1.807 1.807 0 01-.15-.706l-.004.024a.086.086 0 01-.004.021v-.105c0 .02.006.04.006.06.008-.265.061-.465.166-.724.108-.2.248-.398.438-.533.188-.136.371-.198.584-.198h.013c.266 0 .503.088.699.265.196.177.336.401.413.67.056.199.082.401.08.608 0 .065-.003.132-.01.198a1.766 1.766 0 01-.087.401c-.041.123-.095.236-.16.338a1.038 1.038 0 01-.102.141c.123.062.248.103.382.103.146 0 .282-.05.399-.132a1.038 1.038 0 01-.102-.141 1.543 1.543 0 01-.16-.338 1.766 1.766 0 01-.087-.401c-.007-.066-.01-.133-.01-.198-.002-.207.024-.409.08-.608.077-.269.217-.493.413-.67.196-.177.433-.265.699-.265z"/>
    </svg>
  )
}

// Windows logo
function WindowsLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>
  )
}

// macOS logo (Apple)
function MacLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

export function TitleBar({ onRefresh, refreshing, sidebarCollapsed, onToggleSidebar, onToggleMini, platform, fontSize = 'medium' }: TitleBarProps) {
  const handleMinimize = () => window.electronAPI?.windowMinimize()
  const handleMaximize = () => window.electronAPI?.windowMaximize()
  const handleClose = () => window.electronAPI?.windowClose()

  const PlatformIcon = platform === 'linux' ? LinuxLogo : platform === 'win32' ? WindowsLogo : platform === 'darwin' ? MacLogo : null
  const fontClasses = fontSizeClasses[fontSize]

  return (
    <div className="flex items-center justify-between h-12 px-4 bg-gradient-to-b from-[#0f0f15] to-[#0a0a0f] border-b border-white/[0.04] select-none">
      {/* Left: Logo & Title & Platform & Sidebar Toggle */}
      <div className="flex items-center gap-3 flex-1 h-full">
        <div className="flex items-center gap-3 titlebar-drag">
          <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded-[10px] shadow-lg shadow-blue-500/20">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className={`${fontClasses.title} font-semibold text-foreground/90 tracking-tight`}>
            LLM Usage Tracker
          </span>
        </div>

        {/* Platform Icon */}
        {PlatformIcon && (
          <div 
            className="titlebar-no-drag w-7 h-7 flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors rounded-lg"
            title={platform === 'linux' ? 'Linux' : platform === 'win32' ? 'Windows' : 'macOS'}
          >
            <PlatformIcon />
          </div>
        )}

        {/* Sidebar Toggle Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="titlebar-no-drag w-8 h-8 flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06] rounded-lg transition-all"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Draggable area between buttons and right side */}
        <div className="flex-1 h-full titlebar-drag" />
      </div>

      {/* Right: Mini View + Refresh + Window Controls */}
      <div className="flex items-center gap-1 titlebar-no-drag">
        {/* Mini View Button */}
        {onToggleMini && (
          <button
            onClick={onToggleMini}
            className={`flex items-center gap-1.5 h-7 px-2.5 mr-1 ${fontClasses.button} font-medium text-muted-foreground hover:text-foreground bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.1] rounded-lg transition-all`}
            title="Mini view"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 h-7 px-3 mr-2 ${fontClasses.button} font-medium text-muted-foreground hover:text-foreground bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.1] rounded-lg transition-all disabled:opacity-50`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}

        {/* Window Controls */}
        <button
          onClick={handleMinimize}
          className="w-9 h-7 flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.06] rounded-md transition-all"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-9 h-7 flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.06] rounded-md transition-all"
        >
          <Square className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={handleClose}
          className="w-9 h-7 flex items-center justify-center text-muted-foreground/70 hover:text-white hover:bg-red-500/90 rounded-md transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
