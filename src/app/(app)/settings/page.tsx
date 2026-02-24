import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SettingsForm } from '@/components/shared/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, settingsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
  ])

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your profile and betting preferences</p>
      </div>
      <SettingsForm profile={profileRes.data} settings={settingsRes.data} />
    </div>
  )
}
