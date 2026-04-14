ALTER TABLE sweetbook_webhook_event
    ADD COLUMN delivery_uid VARCHAR(120) NULL AFTER sweetbook_order_uid;

ALTER TABLE sweetbook_webhook_event
    ADD COLUMN linked INT NOT NULL DEFAULT 0 AFTER payload;

CREATE UNIQUE INDEX uq_sweetbook_webhook_event_delivery_uid ON sweetbook_webhook_event (delivery_uid);

UPDATE sweetbook_webhook_event
SET linked = CASE
        WHEN sweetbook_order_uid IS NULL OR sweetbook_order_uid = '' THEN 0
        ELSE 1
    END
WHERE linked = 0;
