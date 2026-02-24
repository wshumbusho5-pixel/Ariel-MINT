import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WithdrawalManager } from '@/components/shared/WithdrawalManager'
import { formatCurrency } from '@/lib/utils/currency'

export default async function WithdrawalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, targetsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('current_bankroll, starting_bankroll, currency')
      .eq('id', user.id)
      .single(),
    supabase
      .from('withdrawal_targets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data
  const targets = targetsRes.data ?? []
  const currentProfit = (profile?.current_bankroll ?? 0) - (profile?.starting_bankroll ?? 0)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Withdrawals</h1>
        <p className="text-slate-400 text-sm mt-0.5">Set targets and reminders to lock in your profits</p>
      </div>

      {/* Current profit summary */}
      <Card className={`border ${currentProfit >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Current profit / loss</p>
            <p className={`text-3xl font-bold mt-1 ${currentProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {currentProfit >= 0 ? '+' : ''}{formatCurrency(currentProfit, profile?.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Bankroll</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(profile?.current_bankroll ?? 0, profile?.currency)}</p>
            {currentProfit >= 50 && (
              <p className="text-xs text-emerald-400 mt-1">
                Consider withdrawing {formatCurrency(currentProfit * 0.5, profile?.currency)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <WithdrawalManager targets={targets} userId={user.id} currency={profile?.currency} currentProfit={currentProfit} />
    </div>
  )
}
