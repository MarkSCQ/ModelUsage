export interface DbStats {
  sessionCount: number
  fileCount: number
  dbSize: number
}

export interface ElectronAPI {
  getAllUsage: () => Promise<{
    success: boolean
    data?: UsageData
    error?: string
  }>
  getSessions: (provider: string) => Promise<{
    success: boolean
    data?: Session[]
    error?: string
  }>
  refreshData: () => Promise<{
    success: boolean
    data?: UsageData
    error?: string
  }>
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
  windowIsMaximized: () => Promise<boolean>
  windowResize: (width: number, height: number) => Promise<void>
  getPlatform: () => Promise<'linux' | 'win32' | 'darwin'>
  getDbStats: () => Promise<DbStats>
  saveSetting: (key: string, value: string) => Promise<{ success: boolean; error?: string }>
  getSetting: (key: string, defaultValue?: string) => Promise<{ success: boolean; value: string; error?: string }>
}

export interface ProviderData {
  available: boolean
  sessions: number
  messages: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export interface Session {
  sessionId: string
  provider: string
  project?: string
  messages: number
  inputTokens: number
  outputTokens: number
  lastMessage: string | null
  model?: string
}

export interface ProjectStats {
  sessions: number
  messages: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  provider: string
  lastActivity: string | null
}

export interface UsageData {
  totals: {
    sessions: number
    totalTokens: number
    inputTokens: number
    outputTokens: number
    costUsd: number
  }
  providers: Record<string, ProviderData>
  recentSessions: Session[]
  byModel: Record<string, unknown>
  byDate: Record<string, unknown>
  byProject: Record<string, ProjectStats>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

