CREATE TABLE creator_profile (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    channel_handle VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE edition (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(255),
    cover_image_url VARCHAR(500) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_edition_creator FOREIGN KEY (creator_id) REFERENCES creator_profile(id)
);

CREATE TABLE edition_version (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    edition_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    official_intro JSON NOT NULL,
    official_closing JSON NOT NULL,
    book_spec_uid VARCHAR(80) NOT NULL,
    approved_at DATETIME(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_edition_version_edition FOREIGN KEY (edition_id) REFERENCES edition(id) ON DELETE CASCADE
);

CREATE TABLE curated_asset (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    edition_version_id BIGINT NOT NULL,
    asset_type VARCHAR(32) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    sort_order INT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_curated_asset_version FOREIGN KEY (edition_version_id) REFERENCES edition_version(id) ON DELETE CASCADE
);

CREATE TABLE personalization_schema (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    edition_version_id BIGINT NOT NULL,
    field_key VARCHAR(80) NOT NULL,
    label VARCHAR(200) NOT NULL,
    input_type VARCHAR(50) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    max_length INT,
    sort_order INT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_personalization_schema_version FOREIGN KEY (edition_version_id) REFERENCES edition_version(id) ON DELETE CASCADE
);

CREATE TABLE fan_project (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    edition_version_id BIGINT NOT NULL,
    personalization_data JSON NOT NULL,
    sweetbook_book_uid VARCHAR(120),
    status VARCHAR(32) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_fan_project_version FOREIGN KEY (edition_version_id) REFERENCES edition_version(id)
);

CREATE TABLE order_record (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fan_project_id BIGINT NOT NULL,
    sweetbook_order_uid VARCHAR(120) NOT NULL,
    status VARCHAR(32) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    address1 VARCHAR(255) NOT NULL,
    address2 VARCHAR(255),
    ordered_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_order_record_project UNIQUE (fan_project_id),
    CONSTRAINT fk_order_record_project FOREIGN KEY (fan_project_id) REFERENCES fan_project(id)
);

CREATE INDEX idx_edition_status ON edition(status);
CREATE INDEX idx_edition_version_approved ON edition_version(edition_id, approved_at);
CREATE INDEX idx_fan_project_status ON fan_project(status);
