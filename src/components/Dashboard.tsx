import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, Calendar, Zap, DollarSign, Clock } from 'lucide-react'
import type { UsageData, Session } from '@/types/electron'

interface DashboardProps {
  data: UsageData | null
  sessions?: Session[]
}

interface ChartDataPoint {
  date: string
  displayDate: string
  inputTokens: number
  outputTokens: number
  sessions: number
  cost: number
}

interface ProviderChartDataPoint {
  date: string
  displayDate: string
  claudeTokens: number
  codexTokens: number
}

interface ProviderCostChartDataPoint {
  date: string
  displayDate: string
  claudeCost: number
  codexCost: number
}

type TimeRange = '4h' | '5h' | '1d'
type ChartTimeRange = '4h' | '5h' | '24h' | 'days'

const timeRanges: { key: TimeRange; label: string; hours: number }[] = [
  { key: '4h', label: '4 Hours', hours: 4 },
  { key: '5h', label: '5 Hours', hours: 5 },
  { key: '1d', label: '1 Day', hours: 24 },
]

const chartTimeRanges: { key: ChartTimeRange; label: string; hours: number | null }[] = [
  { key: '4h', label: '4h', hours: 4 },
  { key: '5h', label: '5h', hours: 5 },
  { key: '24h', label: '24h', hours: 24 },
  { key: 'days', label: 'Days', hours: null },
]

const providerColors: Record<string, { bg: string; text: string; border: string }> = {
  claude: { bg: 'from-orange-500/10 to-amber-500/5', text: 'text-orange-400', border: 'border-orange-500/20' },
  codex: { bg: 'from-emerald-500/10 to-teal-500/5', text: 'text-emerald-400', border: 'border-emerald-500/20' },
}

const providerNames: Record<string, string> = {
  claude: 'Claude',
  codex: 'Codex',
}

// Pricing per 1M tokens (simplified)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-3-5-sonnet': { input: 3, output: 15 },
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4': { input: 30, output: 60 },
  'o3': { input: 10, output: 40 },
  'o1': { input: 15, output: 60 },
  default: { input: 3, output: 15 },
}

function getModelPricing(model: string): { input: number; output: number } {
  const lowerModel = model.toLowerCase()
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (lowerModel.includes(key)) return pricing
  }
  return MODEL_PRICING.default
}

function calculateCost(inputTokens: number, outputTokens: number, model: string = 'default'): number {
  const pricing = getModelPricing(model)
  return (inputTokens / 1000000) * pricing.input + (outputTokens / 1000000) * pricing.output
}

export function Dashboard({ data, sessions = [] }: DashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('4h')
  const [tokenChartRange, setTokenChartRange] = useState<ChartTimeRange>('days')
  const [costChartRange, setCostChartRange] = useState<ChartTimeRange>('days')

  // Use sessions from props or from data.recentSessions
  const allSessions = sessions.length > 0 ? sessions : (data?.recentSessions || [])

  // Chart data by days (original 14 days)
  const chartDataByDays = useMemo<ChartDataPoint[]>(() => {
    if (!data?.byDate) return []

    const entries = Object.entries(data.byDate as Record<string, {
      sessions: number
      inputTokens: number
      outputTokens: number
      costUsd: number
    }>)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14) // Last 14 days

    return entries.map(([date, stats]) => ({
      date,
      displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      inputTokens: Math.round(stats.inputTokens / 1000), // Convert to K
      outputTokens: Math.round(stats.outputTokens / 1000),
      sessions: stats.sessions,
      cost: stats.costUsd,
    }))
  }, [data])

  // Chart data by hours (for 4h, 5h, 24h ranges)
  // Creates one data point per hour interval using LOCAL time
  const getChartDataByHours = useMemo(() => {
    // Helper to create a local hour key (YYYY-MM-DD-HH format in local time)
    const getLocalHourKey = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      return `${year}-${month}-${day}-${hour}`
    }

    return (hours: number): ChartDataPoint[] => {
      const now = new Date()
      // Round down to current hour (local time)
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())
      
      // Create hourly buckets - one for each hour
      const hourlyData: Record<string, { inputTokens: number; outputTokens: number; sessions: number; cost: number; time: Date }> = {}
      
      // Initialize all hour slots with zeros
      for (let i = hours - 1; i >= 0; i--) {
        const hourTime = new Date(currentHour.getTime() - i * 60 * 60 * 1000)
        const hourKey = getLocalHourKey(hourTime)
        hourlyData[hourKey] = { inputTokens: 0, outputTokens: 0, sessions: 0, cost: 0, time: hourTime }
      }
      
      // Fill in actual data from sessions
      const cutoffTime = currentHour.getTime() - (hours - 1) * 60 * 60 * 1000
      
      allSessions
        .filter(s => s.provider !== 'gemini')
        .forEach(session => {
          const sessionTime = session.lastMessage ? new Date(session.lastMessage).getTime() : 0
          if (sessionTime >= cutoffTime) {
            const sessionDate = new Date(sessionTime)
            // Round down to hour
            const sessionHourDate = new Date(
              sessionDate.getFullYear(),
              sessionDate.getMonth(),
              sessionDate.getDate(),
              sessionDate.getHours()
            )
            const hourKey = getLocalHourKey(sessionHourDate)
            
            if (hourlyData[hourKey]) {
              hourlyData[hourKey].inputTokens += session.inputTokens || 0
              hourlyData[hourKey].outputTokens += session.outputTokens || 0
              hourlyData[hourKey].sessions += 1
              hourlyData[hourKey].cost += calculateCost(
                session.inputTokens || 0,
                session.outputTokens || 0,
                session.model || 'default'
              )
            }
          }
        })

      // Convert to array and sort by time
      return Object.entries(hourlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hourKey, stats]) => {
          return {
            date: hourKey,
            displayDate: stats.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            inputTokens: Math.round(stats.inputTokens / 1000),
            outputTokens: Math.round(stats.outputTokens / 1000),
            sessions: stats.sessions,
            cost: stats.cost,
          }
        })
    }
  }, [allSessions])

  // Get chart data based on selected range
  const getChartData = (range: ChartTimeRange): ChartDataPoint[] => {
    if (range === 'days') return chartDataByDays
    const hours = chartTimeRanges.find(r => r.key === range)?.hours || 24
    return getChartDataByHours(hours)
  }

  const tokenChartData = useMemo(() => getChartData(tokenChartRange), [tokenChartRange, chartDataByDays, getChartDataByHours])

  // Provider-specific chart data by hours
  const [providerChartRange, setProviderChartRange] = useState<ChartTimeRange>('4h')
  
  const getProviderChartDataByHours = useMemo(() => {
    const getLocalHourKey = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      return `${year}-${month}-${day}-${hour}`
    }

    return (hours: number): ProviderChartDataPoint[] => {
      const now = new Date()
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())
      
      // Create hourly buckets
      const hourlyData: Record<string, { claudeTokens: number; codexTokens: number; time: Date }> = {}
      
      for (let i = hours - 1; i >= 0; i--) {
        const hourTime = new Date(currentHour.getTime() - i * 60 * 60 * 1000)
        const hourKey = getLocalHourKey(hourTime)
        hourlyData[hourKey] = { claudeTokens: 0, codexTokens: 0, time: hourTime }
      }
      
      const cutoffTime = currentHour.getTime() - (hours - 1) * 60 * 60 * 1000
      
      allSessions
        .filter(s => s.provider !== 'gemini')
        .forEach(session => {
          const sessionTime = session.lastMessage ? new Date(session.lastMessage).getTime() : 0
          if (sessionTime >= cutoffTime) {
            const sessionDate = new Date(sessionTime)
            const sessionHourDate = new Date(
              sessionDate.getFullYear(),
              sessionDate.getMonth(),
              sessionDate.getDate(),
              sessionDate.getHours()
            )
            const hourKey = getLocalHourKey(sessionHourDate)
            
            if (hourlyData[hourKey]) {
              const totalTokens = (session.inputTokens || 0) + (session.outputTokens || 0)
              if (session.provider === 'claude') {
                hourlyData[hourKey].claudeTokens += totalTokens
              } else if (session.provider === 'codex') {
                hourlyData[hourKey].codexTokens += totalTokens
              }
            }
          }
        })

      return Object.entries(hourlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hourKey, stats]) => ({
          date: hourKey,
          displayDate: stats.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          claudeTokens: Math.round(stats.claudeTokens / 1000),
          codexTokens: Math.round(stats.codexTokens / 1000),
        }))
    }
  }, [allSessions])

  const providerChartData = useMemo(() => {
    if (providerChartRange === 'days') {
      // For days view, aggregate by date
      const byDate: Record<string, { claudeTokens: number; codexTokens: number }> = {}
      
      allSessions
        .filter(s => s.provider !== 'gemini')
        .forEach(session => {
          if (session.lastMessage) {
            const date = new Date(session.lastMessage).toISOString().split('T')[0]
            if (!byDate[date]) {
              byDate[date] = { claudeTokens: 0, codexTokens: 0 }
            }
            const totalTokens = (session.inputTokens || 0) + (session.outputTokens || 0)
            if (session.provider === 'claude') {
              byDate[date].claudeTokens += totalTokens
            } else if (session.provider === 'codex') {
              byDate[date].codexTokens += totalTokens
            }
          }
        })

      return Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, stats]) => ({
          date,
          displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          claudeTokens: Math.round(stats.claudeTokens / 1000),
          codexTokens: Math.round(stats.codexTokens / 1000),
        }))
    }
    const hours = chartTimeRanges.find(r => r.key === providerChartRange)?.hours || 24
    return getProviderChartDataByHours(hours)
  }, [providerChartRange, allSessions, getProviderChartDataByHours])

  // Provider cost chart data by hours
  const getProviderCostChartDataByHours = useMemo(() => {
    const getLocalHourKey = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      return `${year}-${month}-${day}-${hour}`
    }

    return (hours: number): ProviderCostChartDataPoint[] => {
      const now = new Date()
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())
      
      // Create hourly buckets
      const hourlyData: Record<string, { claudeCost: number; codexCost: number; time: Date }> = {}
      
      for (let i = hours - 1; i >= 0; i--) {
        const hourTime = new Date(currentHour.getTime() - i * 60 * 60 * 1000)
        const hourKey = getLocalHourKey(hourTime)
        hourlyData[hourKey] = { claudeCost: 0, codexCost: 0, time: hourTime }
      }
      
      const cutoffTime = currentHour.getTime() - (hours - 1) * 60 * 60 * 1000
      
      allSessions
        .filter(s => s.provider !== 'gemini')
        .forEach(session => {
          const sessionTime = session.lastMessage ? new Date(session.lastMessage).getTime() : 0
          if (sessionTime >= cutoffTime) {
            const sessionDate = new Date(sessionTime)
            const sessionHourDate = new Date(
              sessionDate.getFullYear(),
              sessionDate.getMonth(),
              sessionDate.getDate(),
              sessionDate.getHours()
            )
            const hourKey = getLocalHourKey(sessionHourDate)
            
            if (hourlyData[hourKey]) {
              const cost = calculateCost(
                session.inputTokens || 0,
                session.outputTokens || 0,
                session.model || 'default'
              )
              if (session.provider === 'claude') {
                hourlyData[hourKey].claudeCost += cost
              } else if (session.provider === 'codex') {
                hourlyData[hourKey].codexCost += cost
              }
            }
          }
        })

      return Object.entries(hourlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hourKey, stats]) => ({
          date: hourKey,
          displayDate: stats.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          claudeCost: stats.claudeCost,
          codexCost: stats.codexCost,
        }))
    }
  }, [allSessions])

  // Provider cost chart data (by hours or days)
  const providerCostChartData = useMemo(() => {
    if (costChartRange === 'days') {
      // For days view, aggregate by date
      const byDate: Record<string, { claudeCost: number; codexCost: number }> = {}
      
      allSessions
        .filter(s => s.provider !== 'gemini')
        .forEach(session => {
          if (session.lastMessage) {
            const date = new Date(session.lastMessage).toISOString().split('T')[0]
            if (!byDate[date]) {
              byDate[date] = { claudeCost: 0, codexCost: 0 }
            }
            const cost = calculateCost(
              session.inputTokens || 0,
              session.outputTokens || 0,
              session.model || 'default'
            )
            if (session.provider === 'claude') {
              byDate[date].claudeCost += cost
            } else if (session.provider === 'codex') {
              byDate[date].codexCost += cost
            }
          }
        })

      return Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, stats]) => ({
          date,
          displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          claudeCost: stats.claudeCost,
          codexCost: stats.codexCost,
        }))
    }
    const hours = chartTimeRanges.find(r => r.key === costChartRange)?.hours || 24
    return getProviderCostChartDataByHours(hours)
  }, [costChartRange, allSessions, getProviderCostChartDataByHours])

  const totals = useMemo(() => {
    if (!chartDataByDays.length) return { tokens: 0, sessions: 0, cost: 0 }
    return chartDataByDays.reduce(
      (acc, day) => ({
        tokens: acc.tokens + day.inputTokens + day.outputTokens,
        sessions: acc.sessions + day.sessions,
        cost: acc.cost + day.cost,
      }),
      { tokens: 0, sessions: 0, cost: 0 }
    )
  }, [chartDataByDays])

  // Calculate provider stats by time range
  const providerStatsByTime = useMemo(() => {
    const now = Date.now()
    const selectedRange = timeRanges.find(r => r.key === selectedTimeRange)!
    const cutoffTime = now - selectedRange.hours * 60 * 60 * 1000

    // Initialize with both providers (always show both cards)
    const stats: Record<string, { inputTokens: number; outputTokens: number; sessions: number }> = {
      claude: { inputTokens: 0, outputTokens: 0, sessions: 0 },
      codex: { inputTokens: 0, outputTokens: 0, sessions: 0 },
    }

    allSessions
      .filter(s => s.provider !== 'gemini')
      .forEach(session => {
        const sessionTime = session.lastMessage ? new Date(session.lastMessage).getTime() : 0
        if (sessionTime >= cutoffTime) {
          if (stats[session.provider]) {
            stats[session.provider].inputTokens += session.inputTokens || 0
            stats[session.provider].outputTokens += session.outputTokens || 0
            stats[session.provider].sessions += 1
          }
        }
      })

    return stats
  }, [allSessions, selectedTimeRange])

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string }>
    label?: string
  }) => {
    if (!active || !payload?.length) return null

    return (
      <div className="bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl p-3 shadow-2xl">
        <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-foreground">
                {entry.name.includes('Cost')
                  ? `$${entry.value.toFixed(4)}`
                  : entry.name.includes('Token')
                    ? `${entry.value.toLocaleString()}K`
                    : entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
    return tokens.toString()
  }

  // Time range selector component
  const TimeRangeSelector = ({ 
    value, 
    onChange 
  }: { 
    value: ChartTimeRange
    onChange: (range: ChartTimeRange) => void 
  }) => (
    <div className="flex items-center gap-1 p-0.5 bg-black/20 rounded-lg">
      {chartTimeRanges.map(range => (
        <button
          key={range.key}
          onClick={() => onChange(range.key)}
          className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
            value === range.key
              ? 'bg-blue-500/20 text-blue-400 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  )

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div className="p-5 space-y-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-xl border border-emerald-500/20">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Usage Dashboard</h1>
          <p className="text-xs text-muted-foreground">Last 14 days activity</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="relative group p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl border border-white/[0.04] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tokens</p>
              <p className="text-lg font-bold text-foreground">{(totals.tokens).toLocaleString()}K</p>
            </div>
          </div>
        </div>

        <div className="relative group p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-xl border border-white/[0.04] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-purple-500/10 rounded-lg">
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-lg font-bold text-foreground">{totals.sessions}</p>
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

      {/* Provider Stats by Time Range */}
      <div className="relative p-5 bg-gradient-to-br from-[#0f0f18]/80 to-[#0a0a12]/80 rounded-xl border border-white/[0.04] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-foreground">Usage by Provider</h2>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 p-1 bg-black/20 rounded-lg">
            {timeRanges.map(range => (
              <button
                key={range.key}
                onClick={() => setSelectedTimeRange(range.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  selectedTimeRange === range.key
                    ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Time Range Display */}
        <div className="mb-4 text-xs text-muted-foreground">
          {(() => {
            const now = new Date()
            const selectedRange = timeRanges.find(r => r.key === selectedTimeRange)!
            const startTime = new Date(now.getTime() - selectedRange.hours * 60 * 60 * 1000)
            const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            })
            const formatDate = (d: Date) => d.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })
            
            // Check if dates are different
            const sameDay = now.toDateString() === startTime.toDateString()
            
            if (sameDay) {
              return `${formatTime(startTime)} → ${formatTime(now)} (Today)`
            } else {
              return `${formatDate(startTime)} ${formatTime(startTime)} → ${formatDate(now)} ${formatTime(now)}`
            }
          })()}
        </div>

        {/* Provider Cards */}
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(providerStatsByTime).length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">
              No activity in the selected time range
            </div>
          ) : (
            Object.entries(providerStatsByTime).map(([provider, stats]) => {
              const colors = providerColors[provider] || { bg: 'from-gray-500/10 to-gray-500/5', text: 'text-gray-400', border: 'border-gray-500/20' }
              const name = providerNames[provider] || provider
              const totalTokens = stats.inputTokens + stats.outputTokens

              return (
                <div
                  key={provider}
                  className={`relative p-4 bg-gradient-to-br ${colors.bg} rounded-xl border ${colors.border} overflow-hidden`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-semibold ${colors.text}`}>{name}</span>
                    <span className="text-xs text-muted-foreground">{stats.sessions} sessions</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Input</span>
                      <span className="text-sm font-mono font-medium text-foreground">
                        {formatTokens(stats.inputTokens)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Output</span>
                      <span className="text-sm font-mono font-medium text-foreground">
                        {formatTokens(stats.outputTokens)}
                      </span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total</span>
                      <span className={`text-sm font-mono font-bold ${colors.text}`}>
                        {formatTokens(totalTokens)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Token Usage Chart */}
      <div className="relative p-5 bg-gradient-to-br from-[#0f0f18]/80 to-[#0a0a12]/80 rounded-xl border border-white/[0.04] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Token Usage Trend</h2>
          <TimeRangeSelector value={tokenChartRange} onChange={setTokenChartRange} />
        </div>
        <div className="h-[280px]">
          {tokenChartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No data for selected time range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tokenChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="inputGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outputGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="displayDate"
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickFormatter={(value) => `${value}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="inputTokens"
                  name="Input Tokens"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#inputGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="outputTokens"
                  name="Output Tokens"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#outputGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Provider Token Trend Chart */}
      <div className="relative p-5 bg-gradient-to-br from-[#0f0f18]/80 to-[#0a0a12]/80 rounded-xl border border-white/[0.04] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Token Trend by Provider</h2>
          <TimeRangeSelector value={providerChartRange} onChange={setProviderChartRange} />
        </div>
        <div className="h-[280px]">
          {providerChartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No data for selected time range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={providerChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="claudeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="codexGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="displayDate"
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickFormatter={(value) => `${value}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="claudeTokens"
                  name="Claude"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#claudeGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="codexTokens"
                  name="Codex"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#codexGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Cost Chart */}
      <div className="relative p-5 bg-gradient-to-br from-[#0f0f18]/80 to-[#0a0a12]/80 rounded-xl border border-white/[0.04] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Cost Trend by Provider</h2>
          <TimeRangeSelector value={costChartRange} onChange={setCostChartRange} />
        </div>
        <div className="h-[280px]">
          {providerCostChartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No data for selected time range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={providerCostChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="claudeCostGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="codexCostGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="displayDate"
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="claudeCost"
                  name="Claude"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#claudeCostGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="codexCost"
                  name="Codex"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#codexCostGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
