-- Fix handle_bet_settled: set search_path so trigger can find public tables

CREATE OR REPLACE FUNCTION handle_bet_settled()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes to a settled state
  IF NEW.status != OLD.status
     AND NEW.status IN ('won','lost','void','cashout','partial_cashout')
     AND NEW.profit_loss IS NOT NULL THEN

    -- Update bankroll and peak on profile
    UPDATE public.profiles
    SET
      current_bankroll = current_bankroll + NEW.profit_loss,
      peak_bankroll = GREATEST(peak_bankroll, current_bankroll + NEW.profit_loss),
      updated_at = NOW()
    WHERE id = NEW.user_id;

    -- Invalidate Monte Carlo cache (forces recompute on next request)
    UPDATE public.monte_carlo_results
    SET invalidated_at = NOW()
    WHERE user_id = NEW.user_id AND invalidated_at IS NULL;

    -- Record settled_at timestamp
    IF NEW.settled_at IS NULL THEN
      NEW.settled_at := NOW();
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
