ALTER TABLE customer_order
    ADD COLUMN quantity INT NOT NULL DEFAULT 1;

ALTER TABLE customer_order
    ADD COLUMN payment_provider VARCHAR(32) NULL;

ALTER TABLE customer_order
    ADD COLUMN payment_key VARCHAR(200) NULL;

ALTER TABLE customer_order
    ADD COLUMN payment_method VARCHAR(50) NULL;

ALTER TABLE customer_order
    ADD COLUMN payment_approved_at DATETIME(6) NULL;

CREATE UNIQUE INDEX uq_customer_order_payment_key ON customer_order (payment_key);
