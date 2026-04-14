START TRANSACTION;

UPDATE app_user
SET display_name = 'Trio Collab'
WHERE email = 'creator@playpick.local';

UPDATE app_user
SET display_name = 'Demo Fan'
WHERE email = 'fan@playpick.local';

UPDATE app_user
SET display_name = 'PlayPick Admin'
WHERE email = 'admin@playpick.local';

CREATE TEMPORARY TABLE keep_demo_projects (
    id BIGINT PRIMARY KEY
);

-- Keep the latest completed demo-fan order so the order history is not empty.
INSERT IGNORE INTO keep_demo_projects (id)
SELECT fp.id
FROM fan_project fp
JOIN app_user au ON au.id = fp.owner_user_id
WHERE au.email = 'fan@playpick.local'
  AND fp.status = 'ORDERED'
ORDER BY fp.created_at DESC
LIMIT 1;

-- Keep one progressed fulfillment example so reviewer pages show more than SUBMITTED.
INSERT IGNORE INTO keep_demo_projects (id)
SELECT fp.id
FROM fan_project fp
JOIN app_user au ON au.id = fp.owner_user_id
JOIN order_record or2 ON or2.fan_project_id = fp.id
WHERE au.email = 'fan@playpick.local'
  AND fp.status = 'ORDERED'
  AND or2.status <> 'SUBMITTED'
ORDER BY COALESCE(or2.last_event_at, or2.created_at) DESC
LIMIT 1;

-- Fallback: if there is no completed order yet, still keep the newest demo-fan project.
INSERT IGNORE INTO keep_demo_projects (id)
SELECT fp.id
FROM fan_project fp
JOIN app_user au ON au.id = fp.owner_user_id
WHERE au.email = 'fan@playpick.local'
ORDER BY fp.created_at DESC
LIMIT 1;

CREATE TEMPORARY TABLE keep_demo_order_uids (
    sweetbook_order_uid VARCHAR(255) PRIMARY KEY
);

INSERT IGNORE INTO keep_demo_order_uids (sweetbook_order_uid)
SELECT or2.sweetbook_order_uid
FROM order_record or2
JOIN keep_demo_projects kp ON kp.id = or2.fan_project_id
WHERE or2.sweetbook_order_uid IS NOT NULL
  AND or2.sweetbook_order_uid <> '';

-- If a matching order exists now, backfill previously unlinked webhook rows before pruning.
UPDATE sweetbook_webhook_event e
JOIN keep_demo_order_uids ku ON ku.sweetbook_order_uid = e.sweetbook_order_uid
SET e.linked = 1
WHERE e.linked = 0;

DELETE FROM sweetbook_webhook_event
WHERE sweetbook_order_uid IS NULL
   OR sweetbook_order_uid = ''
   OR sweetbook_order_uid NOT IN (SELECT sweetbook_order_uid FROM keep_demo_order_uids);

DELETE FROM order_record
WHERE fan_project_id NOT IN (SELECT id FROM keep_demo_projects);

DELETE FROM customer_order
WHERE fan_project_id NOT IN (SELECT id FROM keep_demo_projects);

DELETE FROM fan_project
WHERE id NOT IN (SELECT id FROM keep_demo_projects);

DELETE FROM app_user
WHERE email NOT IN ('creator@playpick.local', 'fan@playpick.local', 'admin@playpick.local');

DROP TEMPORARY TABLE keep_demo_order_uids;
DROP TEMPORARY TABLE keep_demo_projects;

COMMIT;
