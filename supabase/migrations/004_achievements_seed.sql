-- EdgeBook: Achievement Definitions Seed Data

INSERT INTO achievement_definitions (slug, name, description, icon, tier_req, points) VALUES
  -- Volume milestones
  ('first_bet',           'First Step',         'Place your first bet',                       '🎯', NULL,       10),
  ('bets_10',             'Getting Started',    'Place 10 bets',                              '📊', NULL,       20),
  ('bets_50',             'Consistent Tracker', 'Place 50 bets',                              '📈', 'bronze',   50),
  ('bets_100',            'Century Club',       'Place 100 bets',                             '💯', 'silver',  100),
  ('bets_500',            'Veteran Bettor',     'Place 500 bets',                             '🏆', 'gold',    200),

  -- Profit milestones
  ('first_profit',        'First Win',          'Record your first profitable bet',            '✅', NULL,       15),
  ('profit_100',          'Triple Digits',      'Reach $100 cumulative profit',               '💰', 'bronze',   50),
  ('profit_500',          'Half Grand',         'Reach $500 cumulative profit',               '💎', 'silver',  100),
  ('profit_1000',         'Four Figures',       'Reach $1,000 cumulative profit',             '🤑', 'gold',    200),

  -- ROI milestones
  ('roi_positive_30d',    'Positive ROI',       'Maintain positive ROI over 30 days',         '📉', 'bronze',   75),
  ('roi_10pct',           'Sharp Eye',          'Achieve 10%+ ROI over 50+ bets',             '🔍', 'silver',  150),
  ('roi_20pct',           'Edge Hunter',        'Achieve 20%+ ROI over 100+ bets',            '⚡', 'gold',    300),

  -- Discipline achievements
  ('followed_break',      'Self-Aware',         'Follow a break recommendation',              '🧘', NULL,       30),
  ('withdrawal_made',     'Smart Saver',        'Make your first withdrawal',                 '🏦', NULL,       40),
  ('no_late_night_30d',   'Early Bird',         'Avoid late-night betting for 30 days',       '🌅', 'silver',  100),
  ('streak_survived',     'Resilient',          'Survive a 5-bet losing streak without tilt', '💪', 'bronze',   80),

  -- Accuracy achievements
  ('5_win_streak',        'On Fire',            'Win 5 bets in a row',                        '🔥', 'bronze',   60),
  ('10_win_streak',       'Unstoppable',        'Win 10 bets in a row',                       '⚡', 'gold',    150),
  ('confidence_5_win',    'Trusted Instinct',   'Win a 5-confidence bet',                     '🎯', NULL,       25),

  -- Social achievements
  ('profile_public',      'Open Book',          'Make your profile public',                   '👁️', NULL,       20),
  ('share_card_created',  'Brag Rights',        'Create your first share card',               '📢', NULL,       15),
  ('leaderboard_top10',   'Top 10',             'Reach the top 10 on the monthly leaderboard','🏅', 'platinum', 500),

  -- Tier achievements
  ('tier_bronze',         'Bronze Bettor',      'Reach Bronze tier',                          '🥉', NULL,      100),
  ('tier_silver',         'Silver Bettor',      'Reach Silver tier',                          '🥈', 'bronze',  200),
  ('tier_gold',           'Gold Bettor',        'Reach Gold tier',                            '🥇', 'silver',  400),
  ('tier_platinum',       'Platinum Elite',     'Reach Platinum tier',                        '💠', 'gold',    600),
  ('tier_elite',          'The Edge',           'Reach Elite tier — top bettors only',        '👑', 'platinum',1000)
ON CONFLICT (slug) DO NOTHING;
