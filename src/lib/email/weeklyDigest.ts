interface DigestData {
  username: string
  weekLabel: string           // "Jan 20 – Jan 26, 2026"
  totalBets: number
  netPL: number
  roi: number
  winRate: number
  bestBet: { selection: string; odds: number; pl: number } | null
  worstBet: { selection: string; odds: number; pl: number } | null
  currentStreak: number       // positive = wins, negative = losses
  appUrl: string
}

function formatCurrency(n: number): string {
  return (n >= 0 ? '+$' : '-$') + Math.abs(n).toFixed(2)
}

function streakText(streak: number): string {
  if (streak === 0) return 'No current streak'
  const len = Math.abs(streak)
  const type = streak > 0 ? 'win' : 'loss'
  return `${len}-${type} streak`
}

export function weeklyDigestHtml(data: DigestData): string {
  const plColor = data.netPL >= 0 ? '#34d399' : '#f87171'
  const roiColor = data.roi >= 0 ? '#34d399' : '#f87171'
  const streakColor = data.currentStreak > 0 ? '#34d399' : data.currentStreak < 0 ? '#f87171' : '#94a3b8'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your weekly betting digest</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#10b981;width:28px;height:28px;border-radius:8px;text-align:center;vertical-align:middle;">
                    <span style="font-weight:700;color:#0f172a;font-size:12px;">A</span>
                  </td>
                  <td style="padding-left:10px;font-size:18px;font-weight:700;color:#ffffff;">Ariel MINT</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Weekly Digest</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:14px;color:#64748b;">${data.weekLabel} · @${data.username}</p>
            </td>
          </tr>

          <!-- Stats grid -->
          <tr>
            <td style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:16px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-bottom:20px;">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Bets Placed</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#ffffff;">${data.totalBets}</p>
                  </td>
                  <td width="50%" style="padding-bottom:20px;">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Net P&amp;L</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:${plColor};">${formatCurrency(data.netPL)}</p>
                  </td>
                </tr>
                <tr>
                  <td width="50%">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">ROI</p>
                    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:${roiColor};">${data.roi >= 0 ? '+' : ''}${data.roi}%</p>
                  </td>
                  <td width="50%">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Win Rate</p>
                    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#ffffff;">${data.winRate}%</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:12px;"></td></tr>

          <!-- Best bet -->
          ${data.bestBet ? `
          <tr>
            <td style="background:#1e293b;border-radius:12px;padding:16px 20px;margin-bottom:8px;">
              <p style="margin:0 0 6px;font-size:11px;color:#10b981;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Best Bet</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#ffffff;">${data.bestBet.selection}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">Odds ${data.bestBet.odds} &nbsp;·&nbsp; <span style="color:#34d399;font-weight:600;">${formatCurrency(data.bestBet.pl)}</span></p>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          ` : ''}

          <!-- Worst bet -->
          ${data.worstBet ? `
          <tr>
            <td style="background:#1e293b;border-radius:12px;padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:11px;color:#f87171;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Worst Bet</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#ffffff;">${data.worstBet.selection}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">Odds ${data.worstBet.odds} &nbsp;·&nbsp; <span style="color:#f87171;font-weight:600;">${formatCurrency(data.worstBet.pl)}</span></p>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          ` : ''}

          <!-- Streak -->
          ${data.currentStreak !== 0 ? `
          <tr>
            <td style="background:#1e293b;border-radius:12px;padding:14px 20px;">
              <p style="margin:0;font-size:14px;color:#94a3b8;">Current streak: <span style="color:${streakColor};font-weight:600;">${streakText(data.currentStreak)}</span></p>
            </td>
          </tr>
          <tr><td style="height:12px;"></td></tr>
          ` : ''}

          <!-- CTA -->
          <tr>
            <td style="padding:24px 0 8px;">
              <a href="${data.appUrl}/analytics/performance"
                 style="display:inline-block;background:#10b981;color:#0f172a;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
                View Full Analytics →
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:32px 0 16px;">
              <hr style="border:none;border-top:1px solid #1e293b;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td>
              <p style="margin:0;font-size:12px;color:#334155;">
                Ariel MINT &nbsp;·&nbsp;
                <a href="${data.appUrl}/settings" style="color:#334155;text-decoration:underline;">Unsubscribe from weekly digest</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function weeklyDigestSubject(weekLabel: string): string {
  return `Your weekly betting digest — ${weekLabel}`
}
