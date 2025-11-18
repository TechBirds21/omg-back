-- TEMPORARILY DISABLED: Create trigger to automatically set status to 'confirmed' when payment_status becomes 'paid'
-- This trigger may be causing inventory issues when orders are moved to advanced statuses
/*
CREATE OR REPLACE FUNCTION auto_confirm_order_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment_status is being set to 'paid' and status is not already 'confirmed' or later
  IF NEW.payment_status = 'paid' AND
     (OLD.status IS NULL OR OLD.status NOT IN ('confirmed', 'processing', 'ready to ship', 'shipped', 'delivered')) THEN
    NEW.status = 'confirmed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_confirm_order ON orders;
CREATE TRIGGER trigger_auto_confirm_order
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_order_on_payment();
*/