CREATE TABLE app_user (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_app_user_email UNIQUE (email)
);

INSERT INTO app_user (id, email, password_hash, display_name, role, created_at)
VALUES
    (1, 'creator@privateedition.local', '$2b$12$iq2R3nssDoLY58uOVpMBgukwN63bDRP/kivjwivZzD4h0/aOOhU8m', 'Private Edition Creator', 'CREATOR', CURRENT_TIMESTAMP(6)),
    (2, 'fan@privateedition.local', '$2b$12$RTWje6cvlSs6qn0iCzfsteGpQXoBrqEXB4uWuNFHm2FgQs1Vr17W2', 'Demo Fan', 'FAN', CURRENT_TIMESTAMP(6));

ALTER TABLE creator_profile ADD COLUMN user_id BIGINT;
UPDATE creator_profile SET user_id = 1 WHERE id = 1;
ALTER TABLE creator_profile ADD CONSTRAINT uq_creator_profile_user UNIQUE (user_id);
ALTER TABLE creator_profile ADD CONSTRAINT fk_creator_profile_user FOREIGN KEY (user_id) REFERENCES app_user(id);

ALTER TABLE fan_project ADD COLUMN owner_user_id BIGINT NOT NULL DEFAULT 2;
UPDATE fan_project SET owner_user_id = 2 WHERE owner_user_id IS NULL;
ALTER TABLE fan_project ADD CONSTRAINT fk_fan_project_owner FOREIGN KEY (owner_user_id) REFERENCES app_user(id);
ALTER TABLE fan_project ALTER COLUMN owner_user_id DROP DEFAULT;

CREATE INDEX idx_fan_project_owner ON fan_project(owner_user_id);
