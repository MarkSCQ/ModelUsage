import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { TitleBar } from '@/components/TitleBar'
import { Sidebar, type PageType } from '@/components/Sidebar'
import { StatusPage } from '@/components/StatusPage'
import { Dashboard } from '@/components/Dashboard'
import { ProjectsPage } from '@/components/ProjectsPage'
import { SettingsPage, type FontSize, type RefreshRate } from '@/components/SettingsPage'
import { MiniView, miniWindowSizes } from '@/components/MiniView'
import type { ProviderData, Session, UsageData } from '@/types/electron'

// Window size for normal view
const NORMAL_SIZE = { width: 1100, height: 750 }

// Refresh rate to milliseconds mapping
const REFRESH_RATE_MS: Record<RefreshRate, number> = {
  '15min': 15 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
}

type Platform = 'linux' | 'win32' | 'darwin' | null

// Font size CSS classes - each step +5px
export const normalFontSizeClasses: Record<FontSize, string> = {
  small: 'text-[10px]',   // 10px
  medium: 'text-[15px]',  // 15px (+5)
  large: 'text-[20px]',   // 20px (+5)
}

export const miniFontSizeClasses: Record<FontSize, string> = {
  small: 'text-[6px]',    // 6px
  medium: 'text-[11px]',  // 11px (+5)
  large: 'text-[16px]',   // 16px (+5)
}

export default function App() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [providers, setProviders] = useState<Record<string, ProviderData>>({})
  const [sessions, setSessions] = useState<Session[]>([])
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [currentPage, setCurrentPage] = useState<PageType>('status')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [miniMode, setMiniMode] = useState(false)
  const [platform, setPlatform] = useState<Platform>(null)
  
  // Font size settings
  const [normalFontSize, setNormalFontSize] = useState<FontSize>('medium')
  const [miniFontSize, setMiniFontSize] = useState<FontSize>('medium')
  // Refresh rate setting
  const [refreshRate, setRefreshRate] = useState<RefreshRate>('15min')

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const normalResult = await window.electronAPI?.getSetting('normalFontSize', 'medium')
        if (normalResult?.success && normalResult.value) {
          setNormalFontSize(normalResult.value as FontSize)
        }

        const miniResult = await window.electronAPI?.getSetting('miniFontSize', 'medium')
        if (miniResult?.success && miniResult.value) {
          setMiniFontSize(miniResult.value as FontSize)
        }

        const refreshResult = await window.electronAPI?.getSetting('refreshRate', '15min')
        if (refreshResult?.success && refreshResult.value) {
          setRefreshRate(refreshResult.value as RefreshRate)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }

    loadSettings()
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const result = await window.electronAPI?.getAllUsage()
      if (result?.success && result.data) {
        setUsageData(result.data)
        // Filter out gemini
        const filteredProviders = Object.fromEntries(
          Object.entries(result.data.providers).filter(([key]) => key !== 'gemini')
        )
        setProviders(filteredProviders)

        // Filter out gemini sessions
        const filteredSessions = result.data.recentSessions.filter(
          (s: Session) => s.provider !== 'gemini'
        )
        setSessions(filteredSessions)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }, [])

  // 3. Manual refresh via button click
  const handleRefresh = async () => {
    setRefreshing(true)
    console.log('[App] Manual refresh triggered')
    try {
      await window.electronAPI?.refreshData()
      await fetchData()
      lastRefreshRef.current = Date.now() // Reset auto-refresh timer
    } catch (error) {
      console.error('Error refreshing:', error)
    }
    setRefreshing(false)
  }

  const toggleMiniMode = async () => {
    const newMiniMode = !miniMode
    setMiniMode(newMiniMode)
    
    // Resize window based on font size
    if (newMiniMode) {
      const size = miniWindowSizes[miniFontSize]
      await window.electronAPI?.windowResize(size.width, size.height)
    } else {
      await window.electronAPI?.windowResize(NORMAL_SIZE.width, NORMAL_SIZE.height)
    }
  }

  // Track last refresh time
  const lastRefreshRef = useRef<number>(Date.now())

  useEffect(() => {
    // Get platform info
    window.electronAPI?.getPlatform().then(p => setPlatform(p))
    
    // 1. Fetch data on app start
    console.log('[App] Initial data fetch on startup')
    fetchData().finally(() => setInitialLoading(false))
  }, [fetchData])

  // 2. Auto refresh based on user setting
  useEffect(() => {
    const refreshInterval = REFRESH_RATE_MS[refreshRate]
    
    const intervalId = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastRefreshRef.current
      
      // Only auto-refresh if not currently refreshing
      if (!refreshing && elapsed >= refreshInterval) {
        console.log(`[App] Auto refresh triggered (${refreshRate} interval)`)
        lastRefreshRef.current = now
        fetchData()
      }
    }, 60000) // Check every minute

    return () => clearInterval(intervalId)
  }, [fetchData, refreshing, refreshRate])

  // Resize mini window when font size changes
  useEffect(() => {
    if (miniMode) {
      const size = miniWindowSizes[miniFontSize]
      window.electronAPI?.windowResize(size.width, size.height)
    }
  }, [miniFontSize, miniMode])

  // Mini Mode View
  if (miniMode) {
    return (
      <MiniView
        providers={providers}
        onExpand={toggleMiniMode}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        fontSize={miniFontSize}
      />
    )
  }

  // Normal View
  return (
    <div className={`flex flex-col h-screen bg-gradient-to-br from-background via-background to-purple-950/5 ${normalFontSizeClasses[normalFontSize]}`}>
      <TitleBar
        onRefresh={handleRefresh}
        refreshing={refreshing}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onToggleMini={toggleMiniMode}
        platform={platform}
        fontSize={normalFontSize}
      />

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          collapsed={sidebarCollapsed}
          fontSize={normalFontSize}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {currentPage === 'status' ? (
            <StatusPage providers={providers} sessions={sessions} />
          ) : currentPage === 'dashboard' ? (
            <Dashboard data={usageData} sessions={sessions} />
          ) : currentPage === 'projects' ? (
            <ProjectsPage projects={usageData?.byProject || {}} />
          ) : (
            <SettingsPage
              normalFontSize={normalFontSize}
              miniFontSize={miniFontSize}
              refreshRate={refreshRate}
              onNormalFontSizeChange={setNormalFontSize}
              onMiniFontSizeChange={setMiniFontSize}
              onRefreshRateChange={setRefreshRate}
            />
          )}
        </main>
      </div>

      {/* Loading Overlay - only shown on initial load */}
      {initialLoading && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      )}
    </div>
  )
}
