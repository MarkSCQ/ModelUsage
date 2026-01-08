import { Card } from '@/components/ui/card'
import { formatNumber, formatCurrency } from '@/lib/utils'

interface ProviderData {
  available: boolean
  sessions: number
  messages: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

interface ProviderCardProps {
  name: string
  provider: string
  data: ProviderData
}

const providerColors: Record<string, { bg: string; shadow: string }> = {
  claude: { 
    bg: 'from-orange-400 to-amber-600', 
    shadow: 'shadow-orange-500/30' 
  },
  codex: { 
    bg: 'from-emerald-500 to-teal-600', 
    shadow: 'shadow-emerald-500/30' 
  },
}

// Claude (Anthropic) logo - based on official Anthropic branding
function ClaudeLogo() {
  return (
    <svg viewBox="0 0 46 32" fill="currentColor" className="w-6 h-5">
      <path d="M32.73 0h-6.945L38.45 32h6.945L32.73 0ZM14.36 0 0 32h7.149l2.81-6.25h14.633L27.4 32h7.149L20.188 0H14.36Zm.634 19.594L17.27 13.5l2.278 6.094h-4.554Z" />
    </svg>
  )
}

// Codex (OpenAI) logo - hexagonal shape
function CodexLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.392.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.612-1.5z" />
    </svg>
  )
}

const providerLogos: Record<string, () => JSX.Element> = {
  claude: ClaudeLogo,
  codex: CodexLogo,
}

export function ProviderCard({ name, provider, data }: ProviderCardProps) {
  const colors = providerColors[provider] || { bg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30' }
  const Logo = providerLogos[provider]

  return (
    <Card className="hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5 hover:border-white/10">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-11 h-11 flex items-center justify-center bg-gradient-to-br ${colors.bg} rounded-xl shadow-lg ${colors.shadow} text-white`}>
            {Logo ? <Logo /> : <span className="font-bold">{provider[0].toUpperCase()}</span>}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{name}</h3>
            <p className={`text-xs ${data.available ? 'text-emerald-400' : 'text-muted-foreground'}`}>
              {data.available ? '● Active' : '○ Not Found'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <StatBox label="Sessions" value={formatNumber(data.sessions)} />
          <StatBox label="Messages" value={formatNumber(data.messages)} />
          <StatBox label="Tokens" value={formatNumber(data.inputTokens + data.outputTokens)} />
          <StatBox label="Cost" value={formatCurrency(data.costUsd)} highlight />
        </div>
      </div>
    </Card>
  )
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col p-3 bg-background/50 rounded-lg border border-border/30">
      <span className={`font-mono font-semibold ${highlight ? 'text-emerald-400' : 'text-foreground'}`}>
        {value}
      </span>
      <span className="text-[10px] uppercase text-muted-foreground tracking-wider">
        {label}
      </span>
    </div>
  )
}
