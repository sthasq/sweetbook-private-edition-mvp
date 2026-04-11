ALTER TABLE fan_project
    ADD COLUMN sweetbook_external_ref VARCHAR(120) NULL;

ALTER TABLE fan_project
    ADD COLUMN sweetbook_draft_created_at DATETIME(6) NULL;

ALTER TABLE fan_project
    ADD COLUMN sweetbook_finalized_at DATETIME(6) NULL;

ALTER TABLE order_record
    ADD COLUMN last_event_type VARCHAR(80) NULL;

ALTER TABLE order_record
    ADD COLUMN last_event_at DATETIME(6) NULL;

CREATE UNIQUE INDEX uq_order_record_sweetbook_order_uid ON order_record (sweetbook_order_uid);

CREATE TABLE sweetbook_webhook_event (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    sweetbook_order_uid VARCHAR(120),
    payload JSON NOT NULL,
    processed_at DATETIME(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

UPDATE fan_project
SET sweetbook_external_ref = CONCAT('playpick-project-', id),
    sweetbook_draft_created_at = CASE
        WHEN sweetbook_book_uid IS NOT NULL THEN updated_at
        ELSE NULL
    END,
    sweetbook_finalized_at = CASE
        WHEN status IN ('FINALIZED', 'ORDERED') THEN updated_at
        ELSE NULL
    END
WHERE sweetbook_external_ref IS NULL;

UPDATE order_record
SET last_event_type = CASE
        WHEN status = 'SIMULATED' THEN 'simulation.ready'
        WHEN status = 'CANCELLED' THEN 'order.cancelled'
        WHEN status = 'FAILED' THEN 'order.failed'
        WHEN status = 'PENDING_SUBMISSION' THEN 'order.pending_submission'
        ELSE 'order.created'
    END,
    last_event_at = COALESCE(last_event_at, ordered_at)
WHERE last_event_type IS NULL;
