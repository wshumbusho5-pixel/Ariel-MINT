import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { processOcrJob } from '@/lib/inngest/functions/processOcrJob'
import { runRiskEngine } from '@/lib/inngest/functions/runRiskEngine'
import { computeMonteCarlo } from '@/lib/inngest/functions/computeMonteCarlo'
import { dailyBankrollSnapshot } from '@/lib/inngest/functions/dailyBankrollSnapshot'
import { monthlyLeaderboard } from '@/lib/inngest/functions/monthlyLeaderboard'
import { checkWithdrawalTargets } from '@/lib/inngest/functions/checkWithdrawalTargets'
import { checkAdvisorStatus } from '@/lib/inngest/functions/checkAdvisorStatus'
import { weeklyDigest } from '@/lib/inngest/functions/weeklyDigest'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processOcrJob,
    runRiskEngine,
    computeMonteCarlo,
    dailyBankrollSnapshot,
    monthlyLeaderboard,
    checkWithdrawalTargets,
    checkAdvisorStatus,
    weeklyDigest,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
