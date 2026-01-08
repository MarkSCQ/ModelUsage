import { useMemo, useState } from 'react'
import { FolderKanban, Clock, Zap, DollarSign, Search, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import type { ProjectStats } from '@/types/electron'

interface ProjectsPageProps {
  projects: Record<string, ProjectStats>
}

type SortKey = 'name' | 'sessions' | 'tokens' | 'cost' | 'lastActivity'
type SortOrder = 'asc' | 'desc'
type ProviderFilter = 'all' | 'claude' | 'codex'

const providerColors: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
  claude: { bg: 'from-orange-500/10 to-amber-500/5', text: 'text-orange-400', border: 'border-orange-500/20', activeBg: 'bg-orange-500/20' },
  codex: { bg: 'from-emerald-500/10 to-teal-500/5', text: 'text-emerald-400', border: 'border-emerald-500/20', activeBg: 'bg-emerald-500/20' },
  gemini: { bg: 'from-blue-500/10 to-cyan-500/5', text: 'text-blue-400', border: 'border-blue-500/20', activeBg: 'bg-blue-500/20' },
}

const providerFilters: { key: ProviderFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'claude', label: 'Claude' },
  { key: 'codex', label: 'Codex' },
]

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
  return tokens.toString()
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ProjectsPage({ projects }: ProjectsPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('lastActivity')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all')

  // Get unique providers from projects
  const availableProviders = useMemo(() => {
    const providers = new Set<string>()
    Object.values(projects).forEach(p => providers.add(p.provider))
    return providers
  }, [projects])

  // Count projects by provider
  const projectCountByProvider = useMemo(() => {
    const counts: Record<string, number> = { all: 0 }
    Object.values(projects).forEach(p => {
      counts.all++
      counts[p.provider] = (counts[p.provider] || 0) + 1
    })
    return counts
  }, [projects])

  const sortedProjects = useMemo(() => {
    const entries = Object.entries(projects)
      .filter(([name, stats]) => {
        // Filter by provider
        if (providerFilter !== 'all' && stats.provider !== providerFilter) {
          return false
        }
        // Filter by search query
        return name.toLowerCase().includes(searchQuery.toLowerCase())
      })
      .map(([name, stats]) => ({ name, ...stats }))

    return entries.sort((a, b) => {
      let comparison = 0
      
      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'sessions':
          comparison = a.sessions - b.sessions
          break
        case 'tokens':
          comparison = (a.inputTokens + a.outputTokens) - (b.inputTokens + b.outputTokens)
          break
        case 'cost':
          comparison = a.costUsd - b.costUsd
          break
        case 'lastActivity':
          const dateA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
          const dateB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
          comparison = dateA - dateB
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [projects, searchQuery, sortKey, sortOrder, providerFilter])

  // Calculate totals based on filtered projects
  const totals = useMemo(() => {
    return sortedProjects.reduce(
      (acc, p) => ({
        sessions: acc.sessions + p.sessions,
        tokens: acc.tokens + p.inputTokens + p.outputTokens,
        cost: acc.cost + p.costUsd,
      }),
      { sessions: 0, tokens: 0, cost: 0 }
    )
  }, [sortedProjects])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    )
  }

  return (
    <div className="p-5 space-y-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-purple-500/10 rounded-xl border border-violet-500/20">
            <FolderKanban className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Projects</h1>
            <p className="text-xs text-muted-foreground">
              {sortedProjects.length} of {Object.keys(projects).length} projects
            </p>
          </div>
        </div>
      </div>

      {/* Provider Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-1 p-1 bg-black/20 rounded-lg">
          {providerFilters.map(filter => {
            const isActive = providerFilter === filter.key
            const colors = filter.key !== 'all' ? providerColors[filter.key] : null
            const count = projectCountByProvider[filter.key] || 0
            const isAvailable = filter.key === 'all' || availableProviders.has(filter.key)
            
            return (
              <button
                key={filter.key}
                onClick={() => setProviderFilter(filter.key)}
                disabled={!isAvailable}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                  isActive
                    ? colors 
                      ? `${colors.activeBg} ${colors.text} shadow-sm`
                      : 'bg-violet-500/20 text-violet-400 shadow-sm'
                    : isAvailable
                      ? 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                      : 'text-muted-foreground/50 cursor-not-allowed'
                }`}
              >
                {filter.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/10' : 'bg-white/5'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="relative group p-4 bg-gradient-to-br from-violet-500/5 to-purple-500/5 rounded-xl border border-white/[0.04] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-violet-500/10 rounded-lg">
              <FolderKanban className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
              <p className="text-lg font-bold text-foreground">{totals.sessions}</p>
            </div>
          </div>
        </div>

        <div className="relative group p-4 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-xl border border-white/[0.04] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tokens</p>
              <p className="text-lg font-bold text-foreground">{formatTokens(totals.tokens)}</p>
            </div>
          </div>
        </div>

        <div className="relative group p-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-xl border border-white/[0.04] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-lg font-bold text-foreground">${totals.cost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-[#0f0f18]/80 border border-white/[0.06] rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
        />
      </div>

      {/* Projects Table */}
      <div className="relative bg-gradient-to-br from-[#0f0f18]/80 to-[#0a0a12]/80 rounded-xl border border-white/[0.04] backdrop-blur-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_100px_120px_100px_100px] gap-4 px-4 py-3 bg-black/20 border-b border-white/[0.04] text-xs font-medium text-muted-foreground">
          <button
            onClick={() => handleSort('name')}
            className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
          >
            Project <SortIcon columnKey="name" />
          </button>
          <button
            onClick={() => handleSort('sessions')}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Sessions <SortIcon columnKey="sessions" />
          </button>
          <button
            onClick={() => handleSort('tokens')}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Tokens <SortIcon columnKey="tokens" />
          </button>
          <button
            onClick={() => handleSort('cost')}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Cost <SortIcon columnKey="cost" />
          </button>
          <button
            onClick={() => handleSort('lastActivity')}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Last Activity <SortIcon columnKey="lastActivity" />
          </button>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/[0.04] max-h-[500px] overflow-auto">
          {sortedProjects.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {searchQuery || providerFilter !== 'all' 
                ? 'No projects match your filters' 
                : 'No projects found'}
            </div>
          ) : (
            sortedProjects.map((project) => {
              const colors = providerColors[project.provider] || providerColors.claude
              const totalTokens = project.inputTokens + project.outputTokens

              return (
                <div
                  key={project.name}
                  className="grid grid-cols-[1fr_100px_120px_100px_100px] gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
                    <span className="text-sm font-medium text-foreground truncate" title={project.name}>
                      {project.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.activeBg} ${colors.text}`}>
                      {project.provider}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {project.sessions}
                  </div>
                  <div className="text-sm font-mono text-foreground">
                    {formatTokens(totalTokens)}
                  </div>
                  <div className="text-sm font-mono text-emerald-400">
                    ${project.costUsd.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(project.lastActivity)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
