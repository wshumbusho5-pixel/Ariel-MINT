import { BetForm } from '@/components/bets/BetForm'

export default function NewBetPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Add Bet</h1>
        <p className="text-slate-400 text-sm mt-0.5">Record a new bet manually</p>
      </div>
      <BetForm />
    </div>
  )
}
