import { ProviderCard } from '@/components/ProviderCard'
import { SessionItem } from '@/components/SessionItem'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ProviderData, Session } from '@/types/electron'

const providerNames: Record<string, string> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
}

interface StatusPageProps {
  providers: Record<string, ProviderData>
  sessions: Session[]
}

export function StatusPage({ providers, sessions }: StatusPageProps) {
  return (
    <div className="p-5 h-full overflow-auto">
      {/* Providers */}
      <section className="mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 px-1">
          By Provider
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(providers).map(([key, data]) => (
            <ProviderCard
              key={key}
              name={providerNames[key] || key}
              provider={key}
              data={data}
            />
          ))}
        </div>
      </section>

      {/* Recent Sessions */}
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 px-1">
          Recent Sessions
        </h2>
        <ScrollArea className="h-[calc(100vh-340px)] pr-3">
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No sessions found
              </div>
            ) : (
              sessions.map((session, idx) => (
                <SessionItem key={`${session.sessionId}-${idx}`} session={session} />
              ))
            )}
          </div>
        </ScrollArea>
      </section>
    </div>
  )
}

