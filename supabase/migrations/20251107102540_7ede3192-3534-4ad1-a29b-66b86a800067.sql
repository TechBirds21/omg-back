-- Add ZohoPay to payment configuration if not exists
INSERT INTO payment_config (payment_method, is_enabled, is_primary, display_name, description, configuration) 
VALUES ('zohopay', false, false, 'Zoho Pay', 'Zoho Pay UPI/Cards/NetBanking', '{"supports_upi": true, "supports_cards": true, "supports_netbanking": true}')
ON CONFLICT (payment_method) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  configuration = EXCLUDED.configuration;
