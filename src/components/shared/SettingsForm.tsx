'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { CURRENCIES, TIMEZONES } from '@/lib/utils/locales'
import type { Profile, UserSettings } from '@/types/database'

// Minimal Switch if shadcn doesn't have it yet
function ToggleSwitch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export function SettingsForm({
  profile,
  settings,
}: {
  profile: Profile | null
  settings: UserSettings | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? false)
  const [currency, setCurrency] = useState(profile?.currency ?? 'USD')
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'UTC')
  const [country, setCountry] = useState(profile?.country ?? '')

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: fd.get('display_name') as string,
        timezone,
        currency,
        is_public: isPublic,
        country: country.trim() || null,
      })
      .eq('id', profile?.id ?? '')

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Profile updated')
      router.refresh()
    }
    setLoading(false)
  }

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: profile?.id,
        withdrawal_target: parseFloat(fd.get('withdrawal_target') as string) || null,
        break_on_consecutive_losses: parseInt(fd.get('break_on_consecutive_losses') as string) || 7,
        break_on_drawdown_pct: parseFloat(fd.get('break_on_drawdown_pct') as string) || 20,
        daily_loss_limit: parseFloat(fd.get('daily_loss_limit') as string) || null,
        weekly_loss_limit: parseFloat(fd.get('weekly_loss_limit') as string) || null,
      }, { onConflict: 'user_id' })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Settings saved')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base font-semibold text-white">Profile</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Username</Label>
              <Input
                value={profile?.username ?? ''}
                disabled
                className="bg-slate-800 border-slate-700 text-slate-400"
              />
              <p className="text-xs text-slate-500">Username cannot be changed</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Display Name</Label>
              <Input
                name="display_name"
                defaultValue={profile?.display_name ?? ''}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Country</Label>
              <Input
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="e.g. Zimbabwe, United Kingdom..."
                className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">Used to show bettors near you in the Community page</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Currency</Label>
                <SearchableSelect
                  name="currency"
                  value={currency}
                  onChange={setCurrency}
                  options={CURRENCIES}
                  placeholder="Select currency..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Timezone</Label>
                <SearchableSelect
                  name="timezone"
                  value={timezone}
                  onChange={setTimezone}
                  options={TIMEZONES}
                  placeholder="Select timezone..."
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div>
                <p className="text-sm text-white font-medium">Public Profile</p>
                <p className="text-xs text-slate-400">Allow anonymous leaderboard ranking</p>
              </div>
              <ToggleSwitch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <Button type="submit" disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Risk thresholds */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base font-semibold text-white">Risk & Withdrawal Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <form onSubmit={saveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Withdrawal Target ({currency})</Label>
                <Input type="number" name="withdrawal_target" defaultValue={settings?.withdrawal_target ?? ''} placeholder="500" className="bg-slate-800 border-slate-700 text-slate-200" />
                <p className="text-xs text-slate-500">Alert when profit reaches this amount</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Break After Losses</Label>
                <Input type="number" name="break_on_consecutive_losses" defaultValue={settings?.break_on_consecutive_losses ?? 7} className="bg-slate-800 border-slate-700 text-slate-200" />
                <p className="text-xs text-slate-500">Consecutive losses to suggest a break</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Drawdown Alert (%)</Label>
                <Input type="number" name="break_on_drawdown_pct" defaultValue={settings?.break_on_drawdown_pct ?? 20} className="bg-slate-800 border-slate-700 text-slate-200" />
                <p className="text-xs text-slate-500">Alert when bankroll drops this % from peak</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Daily Loss Limit ({currency})</Label>
                <Input type="number" name="daily_loss_limit" defaultValue={settings?.daily_loss_limit ?? ''} placeholder="Optional" className="bg-slate-800 border-slate-700 text-slate-200" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
