ALTER TABLE customer_order ADD COLUMN commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2000;
ALTER TABLE customer_order ADD COLUMN platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE customer_order ADD COLUMN creator_payout DECIMAL(10,2) NOT NULL DEFAULT 0.00;

UPDATE customer_order
SET platform_fee    = ROUND(total_amount * commission_rate, 2),
    creator_payout  = ROUND(total_amount * (1 - commission_rate), 2)
WHERE platform_fee = 0.00 AND total_amount > 0;

INSERT INTO app_user (email, password_hash, display_name, role, created_at)
VALUES ('admin@playpick.local',
        '$2b$12$GYWDpNP0PWORCQeg5aO9VeciaNGbKFdtNcpayiwYGrfAPWZaEHUJy',
        '플랫폼 관리자', 'ADMIN', CURRENT_TIMESTAMP(6));
