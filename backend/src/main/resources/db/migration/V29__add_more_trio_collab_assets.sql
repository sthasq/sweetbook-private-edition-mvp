INSERT INTO curated_asset (edition_version_id, asset_type, title, content, sort_order)
SELECT trio.id,
       'IMAGE',
       '따뜻한 실내에서의 우정 포즈',
       '/demo-assets/collab-trio-indoor-friendship.png',
       COALESCE((SELECT MAX(sort_order) FROM curated_asset WHERE edition_version_id = trio.id), 0) + 1
FROM (
    SELECT id
    FROM edition_version
    WHERE edition_id = 1
      AND approved_at IS NOT NULL
    ORDER BY version_number DESC, id DESC
    LIMIT 1
) trio;

INSERT INTO curated_asset (edition_version_id, asset_type, title, content, sort_order)
SELECT trio.id,
       'IMAGE',
       '편안한 저녁, 친구들과의 대화',
       '/demo-assets/collab-trio-evening-conversation.png',
       COALESCE((SELECT MAX(sort_order) FROM curated_asset WHERE edition_version_id = trio.id), 0) + 1
FROM (
    SELECT id
    FROM edition_version
    WHERE edition_id = 1
      AND approved_at IS NOT NULL
    ORDER BY version_number DESC, id DESC
    LIMIT 1
) trio;
