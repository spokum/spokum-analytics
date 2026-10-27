'use client'

import { fetchAnalytics } from "@/lib/analytics"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { toPng } from 'html-to-image'
import {
  Users, UserCheck, FileText, Gift, MessageSquare, Coins,
  TrendingUp, TrendingDown, Activity, Download, Lock, RefreshCw,
  Heart, Music, Eye,
} from 'lucide-react'

interface Stats {
  totalUsers: number
  onlineNow: number
  dailyActive: number
  newToday: number
  totalPosts: number
  totalGifts: number
  totalMessages: number
  totalCoins: number
  totalGiftsRevenue: number
}

interface MoodData {
  key: string
  label: string
  count: number
  color: string
}

interface WeekData {
  date: string
  label: string
  active: number
  newUsers: number
}

interface MonthlyData {
  monthName: string
  newUsers: number
  posts: number
  gifts: number
  likes: number
  chart: { date: string; label: string; newUsers: number; posts: number }[]
}

interface AnalyticsData {
  generatedAt: string
  stats: Stats
  monthly: MonthlyData
  moods: MoodData[]
  weekData: WeekData[]
}

export default function AnalyticsPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tiktokData, setTiktokData] = useState({ followers: 0, likes: 0 })
  const [editingTiktok, setEditingTiktok] = useState(false)
  const [tiktokForm, setTiktokForm] = useState({ followers: '', likes: '' })
  const exportRef = useRef<HTMLDivElement>(null)

  const fetchData = async (pwd: string) => {
    setLoading(true)
    setError('')
    try {
      const json = await fetchAnalytics()
      if (!json.stats) throw new Error('Нет данных')
      setData(json)
      setAuthed(true)
      // Save password in state for refresh
      sessionStorage.setItem('analytics_pwd', pwd)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    const pwd = sessionStorage.getItem('analytics_pwd') || password
    if (pwd) await fetchData(pwd)
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('analytics_pwd')
    if (saved) {
      setPassword(saved)
      fetchData(saved)
    }
  }, [])

  // TikTok stats - load from localStorage (manually updated)
  useEffect(() => {
    if (authed) {
      const saved = localStorage.getItem('spokum_tiktok_stats')
      if (saved) {
        try {
          setTiktokData(JSON.parse(saved))
        } catch {}
      }
    }
  }, [authed])

  const saveTiktok = () => {
    const newData = {
      followers: Number(tiktokForm.followers) || 0,
      likes: Number(tiktokForm.likes) || 0,
    }
    setTiktokData(newData)
    localStorage.setItem('spokum_tiktok_stats', JSON.stringify(newData))
    setEditingTiktok(false)
  }

  const startEditTiktok = () => {
    setTiktokForm({
      followers: String(tiktokData.followers),
      likes: String(tiktokData.likes),
    })
    setEditingTiktok(true)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    fetchData(password)
  }

  const [showSummary, setShowSummary] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)

  const exportImage = async () => {
    if (!summaryRef.current) return
    try {
      const dataUrl = await toPng(summaryRef.current, {
        quality: 0.95,
        backgroundColor: '#0f1419',
        pixelRatio: 2,
      })
      const link = document.createElement('a')
      link.download = `spokum-svodka-${data?.monthly.monthName || 'месяц'}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error(e)
    }
  }

  // Password screen
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1419] p-4">
        <Card className="w-full max-w-md bg-[#161b22] border-[#242c36]">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-center">
              <img
                src="/spokum-logo.jpg"
                alt="СпокУм"
                className="w-20 h-20 rounded-2xl object-cover"
              />
            </div>
            <CardTitle className="text-2xl text-white">СпокУм Аналитика</CardTitle>
            <p className="text-sm text-gray-400">Введите пароль для доступа</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль"
                  className="pl-10 bg-[#0f1419] border-[#242c36] text-white"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-[#87b7a3] hover:bg-[#5ae8a8] text-white"
              >
                {loading ? 'Проверка...' : 'Войти'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const { stats, moods, weekData } = data

  const statCards = [
    { label: 'Пользователей', value: stats.totalUsers, icon: Users, color: '#87b7a3' },
    { label: 'Онлайн сейчас', value: stats.onlineNow, icon: UserCheck, color: '#5ae8a8' },
    { label: 'Заходили за 24ч', value: stats.dailyActive, icon: Activity, color: '#e8c46a' },
    { label: 'Новых сегодня', value: stats.newToday, icon: TrendingUp, color: '#f0a8c8' },
    { label: 'Постов', value: stats.totalPosts, icon: FileText, color: '#7fa8e8' },
    { label: 'Подарков', value: stats.totalGifts, icon: Gift, color: '#d8b45c' },
    { label: 'Сообщений', value: stats.totalMessages, icon: MessageSquare, color: '#d8a8e8' },
    { label: 'Монет всего', value: stats.totalCoins, icon: Coins, color: '#e8a030' },
  ]

  // Week trend - calculate up/down
  const weekTrend = weekData.length >= 2
    ? weekData[weekData.length - 1].active - weekData[weekData.length - 2].active
    : 0

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      {/* Header */}
      <header className="border-b border-[#242c36] bg-[#161b22] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/spokum-logo.jpg"
              alt="СпокУм"
              className="w-12 h-12 rounded-xl object-cover"
            />
            <div>
              <h1 className="text-xl font-bold">СпокУм Аналитика</h1>
              <p className="text-xs text-gray-400">
                Обновлено: {new Date(data.generatedAt).toLocaleString('ru-RU')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={refresh}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-[#242c36] text-gray-300 hover:bg-[#242c36]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button
              onClick={exportImage}
              size="sm"
              className="bg-[#87b7a3] hover:bg-[#5ae8a8] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Скачать сводку
            </Button>
          </div>
        </div>
      </header>

      <div ref={exportRef} className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stat cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s) => {
            const Icon = s.icon
            return (
              <Card key={s.label} className="bg-[#161b22] border-[#242c36]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div className="text-2xl font-bold">{s.value.toLocaleString('ru-RU')}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Week trend */}
        <Card className="bg-[#161b22] border-[#242c36]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Активность за неделю</CardTitle>
              {weekTrend !== 0 && (
                <Badge
                  className={weekTrend > 0
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                  }
                >
                  {weekTrend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {weekTrend > 0 ? '+' : ''}{weekTrend} за день
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242c36" />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161b22',
                    border: '1px solid #242c36',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="active"
                  name="Активных"
                  stroke="#87b7a3"
                  strokeWidth={2}
                  dot={{ fill: '#87b7a3', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  name="Новых"
                  stroke="#e8c46a"
                  strokeWidth={2}
                  dot={{ fill: '#e8c46a', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Two columns: Moods + TikTok */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Moods */}
          <Card className="bg-[#161b22] border-[#242c36]">
            <CardHeader>
              <CardTitle className="text-lg">Настроения пользователей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={moods}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {moods.map((m) => (
                        <Cell key={m.key} fill={m.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161b22',
                        border: '1px solid #242c36',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {moods.map((m) => (
                    <div key={m.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                        <span className="text-sm">{m.label}</span>
                      </div>
                      <span className="text-sm font-semibold">{m.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TikTok + extra */}
          <div className="space-y-6">
            <Card className="bg-[#161b22] border-[#242c36]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Music className="w-5 h-5" style={{ color: '#e8588a' }} />
                    TikTok @spokum2
                  </CardTitle>
                  {!editingTiktok && (
                    <Button
                      onClick={startEditTiktok}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      Изменить
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingTiktok ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Подписчики</label>
                      <Input
                        type="number"
                        value={tiktokForm.followers}
                        onChange={(e) => setTiktokForm({ ...tiktokForm, followers: e.target.value })}
                        className="bg-[#0f1419] border-[#242c36] text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Лайки</label>
                      <Input
                        type="number"
                        value={tiktokForm.likes}
                        onChange={(e) => setTiktokForm({ ...tiktokForm, likes: e.target.value })}
                        className="bg-[#0f1419] border-[#242c36] text-white"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={saveTiktok}
                        size="sm"
                        className="bg-[#87b7a3] hover:bg-[#5ae8a8] text-white"
                      >
                        Сохранить
                      </Button>
                      <Button
                        onClick={() => setEditingTiktok(false)}
                        variant="outline"
                        size="sm"
                        className="border-[#242c36] text-gray-300"
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0f1419] rounded-lg p-4 text-center">
                        <Heart className="w-6 h-6 mx-auto mb-2 text-[#e8588a]" />
                        <div className="text-2xl font-bold">{tiktokData.likes.toLocaleString('ru-RU')}</div>
                        <div className="text-xs text-gray-400 mt-1">Лайков</div>
                      </div>
                      <div className="bg-[#0f1419] rounded-lg p-4 text-center">
                        <Users className="w-6 h-6 mx-auto mb-2 text-[#5ae8a8]" />
                        <div className="text-2xl font-bold">{tiktokData.followers.toLocaleString('ru-RU')}</div>
                        <div className="text-xs text-gray-400 mt-1">Подписчиков</div>
                      </div>
                    </div>
                    <a
                      href="https://www.tiktok.com/@spokum2"
                      target="_blank"
                      rel="noopener"
                      className="text-xs text-gray-400 hover:text-[#5ae8a8] mt-3 inline-block"
                    >
                      Открыть TikTok →
                    </a>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#161b22] border-[#242c36]">
              <CardHeader>
                <CardTitle className="text-lg">Дополнительно</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Подарков продано на</span>
                  <span className="font-semibold text-[#e8a030]">
                    {stats.totalGiftsRevenue.toLocaleString('ru-RU')} монет
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Средние монеты/юзер</span>
                  <span className="font-semibold">
                    {stats.totalUsers > 0 ? Math.round(stats.totalCoins / stats.totalUsers) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Постов/юзер</span>
                  <span className="font-semibold">
                    {stats.totalUsers > 0 ? (stats.totalPosts / stats.totalUsers).toFixed(1) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Активность за день</span>
                  <span className="font-semibold text-[#5ae8a8]">
                    {stats.totalUsers > 0 ? ((stats.dailyActive / stats.totalUsers) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Monthly Summary — beautiful export card */}
        {data && (
          <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none">
            <div
              ref={summaryRef}
              style={{
                width: '1080px',
                padding: '60px',
                background: 'linear-gradient(160deg, #0f1419 0%, #161b22 100%)',
                color: '#fff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
                <img
                  src="/spokum-logo.jpg"
                  alt="СпокУм"
                  style={{ width: '80px', height: '80px', borderRadius: '20px', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1.2 }}>
                    Сводка за {data.monthly.monthName}
                  </div>
                  <div style={{ fontSize: '18px', color: '#87b7a3', marginTop: '4px' }}>
                    СпокУм · Соцсеть про спокойствие
                  </div>
                </div>
              </div>

              {/* Big numbers grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
                {[
                  { label: 'Новых юзеров', value: data.monthly.newUsers, color: '#5ae8a8' },
                  { label: 'Постов', value: data.monthly.posts, color: '#7fa8e8' },
                  { label: 'Подарков', value: data.monthly.gifts, color: '#d8b45c' },
                  { label: 'Лайков', value: data.monthly.likes, color: '#e8588a' },
                  { label: 'Всего юзеров', value: data.stats.totalUsers, color: '#87b7a3' },
                  { label: 'Всего постов', value: data.stats.totalPosts, color: '#7fa8e8' },
                  { label: 'Монет в сети', value: data.stats.totalCoins, color: '#e8a030' },
                  { label: 'Онлайн за 24ч', value: data.stats.dailyActive, color: '#e8c46a' },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: '#161b22',
                      border: '1px solid #242c36',
                      borderRadius: '16px',
                      padding: '24px',
                    }}
                  >
                    <div style={{ fontSize: '42px', fontWeight: 800, color: s.color, lineHeight: 1 }}>
                      {s.value.toLocaleString('ru-RU')}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Mood distribution */}
              <div style={{ background: '#161b22', border: '1px solid #242c36', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Настроения в сети</div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {data.moods.map((m) => (
                    <div
                      key={m.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#0f1419',
                        padding: '8px 16px',
                        borderRadius: '999px',
                      }}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: m.color }} />
                      <span style={{ fontSize: '14px' }}>{m.label}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: m.color }}>{m.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  spokum.ru · {new Date(data.generatedAt).toLocaleString('ru-RU')}
                </div>
                <div style={{ fontSize: '14px', color: '#87b7a3', fontWeight: 600 }}>
                  СпокУм Аналитика
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-xs text-gray-500">
          СпокУм Аналитика · Соцсеть про спокойствие и настроение · spokum.ru
        </div>
      </div>
    </div>
  )
}
