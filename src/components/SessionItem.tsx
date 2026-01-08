import { formatNumber, formatDate } from '@/lib/utils'

interface Session {
  sessionId: string
  provider: string
  messages: number
  inputTokens: number
  outputTokens: number
  lastMessage: string | null
}

interface SessionItemProps {
  session: Session
}

const providerBadgeColors: Record<string, string> = {
  claude: 'bg-amber-500/20 text-amber-300',
  codex: 'bg-emerald-500/20 text-emerald-300',
}

export function SessionItem({ session }: SessionItemProps) {
  const badgeColor = providerBadgeColors[session.provider] || 'bg-blue-500/20 text-blue-300'

  return (
    <div className="flex items-center justify-between p-4 bg-card/40 backdrop-blur rounded-xl border border-border/30 hover:bg-card/60 hover:border-white/10 transition-all">
      <div className="flex flex-col min-w-0">
        <span 
          className="font-mono text-sm text-foreground truncate max-w-[200px]" 
          title={session.sessionId}
        >
          {session.sessionId}
        </span>
        <div className="flex items-center gap-2 mt-1">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${badgeColor}`}>
            {session.provider}
          </span>
          <span className="text-xs text-muted-foreground">
            {session.messages} msgs
          </span>
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-mono font-semibold text-foreground">
          {formatNumber(session.inputTokens + session.outputTokens)}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDate(session.lastMessage)}
        </div>
      </div>
    </div>
  )
}

