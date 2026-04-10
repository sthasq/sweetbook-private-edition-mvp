CREATE TABLE customer_order (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fan_project_id BIGINT NOT NULL,
    order_uid VARCHAR(120) NOT NULL,
    status VARCHAR(32) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    simulated BOOLEAN NOT NULL DEFAULT FALSE,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    address1 VARCHAR(255) NOT NULL,
    address2 VARCHAR(255),
    ordered_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_customer_order_project UNIQUE (fan_project_id),
    CONSTRAINT uq_customer_order_uid UNIQUE (order_uid),
    CONSTRAINT fk_customer_order_project FOREIGN KEY (fan_project_id) REFERENCES fan_project(id)
);

INSERT INTO customer_order (
    fan_project_id,
    order_uid,
    status,
    total_amount,
    simulated,
    recipient_name,
    recipient_phone,
    postal_code,
    address1,
    address2,
    ordered_at,
    created_at
)
SELECT
    fan_project_id,
    CONCAT('site-order-migrated-', fan_project_id),
    CASE
        WHEN status = 'CANCELLED' THEN 'CANCELLED'
        ELSE 'PAID'
    END,
    total_amount,
    CASE
        WHEN sweetbook_order_uid LIKE 'demo-order-%' THEN TRUE
        ELSE FALSE
    END,
    recipient_name,
    recipient_phone,
    postal_code,
    address1,
    address2,
    ordered_at,
    created_at
FROM order_record;

UPDATE order_record
SET status = CASE
    WHEN status = 'CANCELLED' THEN 'CANCELLED'
    WHEN status = 'ESTIMATED' THEN 'PENDING_SUBMISSION'
    WHEN sweetbook_order_uid LIKE 'demo-order-%' THEN 'SIMULATED'
    ELSE 'SUBMITTED'
END;
