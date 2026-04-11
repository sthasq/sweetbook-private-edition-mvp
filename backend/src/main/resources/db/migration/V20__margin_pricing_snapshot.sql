ALTER TABLE customer_order
  ADD COLUMN vendor_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE customer_order
  ADD COLUMN margin_rate DECIMAL(5,4) NOT NULL DEFAULT 0.3500;

ALTER TABLE customer_order
  ADD COLUMN margin_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00;

UPDATE customer_order
SET margin_rate = 0.3500,
    vendor_cost = ROUND(total_amount / 1.3500, 2),
    margin_amount = ROUND(total_amount - ROUND(total_amount / 1.3500, 2), 2)
WHERE total_amount > 0
  AND vendor_cost = 0.00;

UPDATE customer_order
SET platform_fee = ROUND(margin_amount * commission_rate, 2),
    creator_payout = ROUND(margin_amount - ROUND(margin_amount * commission_rate, 2), 2)
WHERE total_amount > 0;
