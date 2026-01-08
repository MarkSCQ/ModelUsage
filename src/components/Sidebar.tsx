import { Activity, LayoutDashboard, Settings, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FontSize } from '@/components/SettingsPage'

export type PageType = 'status' | 'dashboard' | 'projects' | 'settings'

interface SidebarProps {
  currentPage: PageType
  onPageChange: (page: PageType) => void
  collapsed: boolean
  fontSize?: FontSize
}

// Font size mappings for sidebar
const fontSizeClasses: Record<FontSize, string> = {
  small: 'text-[10px]',
  medium: 'text-sm',
  large: 'text-[18px]',
}

const navItems = [
  { id: 'status' as const, icon: Activity, label: 'Status' },
  { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'projects' as const, icon: FolderKanban, label: 'Projects' },
  { id: 'settings' as const, icon: Settings, label: 'Settings' },
]

export function Sidebar({ currentPage, onPageChange, collapsed, fontSize = 'medium' }: SidebarProps) {
  const fontClass = fontSizeClasses[fontSize]

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[#0a0a0f]/80 backdrop-blur-xl border-r border-white/[0.04] transition-all duration-300 ease-out',
        collapsed ? 'w-14' : 'w-48'
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 p-2 pt-3 space-y-1">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = currentPage === id
          return (
            <button
              key={id}
              onClick={() => onPageChange(id)}
              className={cn(
                'relative flex items-center w-full h-10 rounded-lg transition-all duration-200 group',
                collapsed ? 'justify-center px-0' : 'px-3 gap-3',
                isActive
                  ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/10 text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
              )}
              title={collapsed ? label : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 w-0.5 h-5 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full" />
              )}
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition-all',
                  isActive && 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]'
                )}
              />
              {!collapsed && (
                <span className={`${fontClass} font-medium truncate`}>{label}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom gradient fade */}
      <div className="h-12 bg-gradient-to-t from-[#0a0a0f]/50 to-transparent pointer-events-none" />
    </div>
  )
}
