ALTER TABLE fan_project
    ADD COLUMN book_operation_type VARCHAR(32) NULL;

ALTER TABLE fan_project
    ADD COLUMN book_operation_status VARCHAR(32) NOT NULL DEFAULT 'IDLE';

ALTER TABLE fan_project
    ADD COLUMN book_operation_progress INT NULL;

ALTER TABLE fan_project
    ADD COLUMN book_operation_step VARCHAR(64) NULL;

ALTER TABLE fan_project
    ADD COLUMN book_operation_message VARCHAR(255) NULL;

ALTER TABLE fan_project
    ADD COLUMN book_operation_error VARCHAR(1000) NULL;

ALTER TABLE fan_project
    ADD COLUMN book_operation_started_at DATETIME(6) NULL;

ALTER TABLE fan_project
    ADD COLUMN book_operation_finished_at DATETIME(6) NULL;
