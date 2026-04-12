UPDATE edition
SET
    subtitle = '온도로그와 함께한 장면을 오래 남기는 2주년 에디션',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 1
  AND subtitle LIKE '%드롭%';

UPDATE edition
SET
    subtitle = '마음을 한 장씩 남기는 메시지 중심 에디션',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 2
  AND subtitle LIKE '%드롭%';

UPDATE edition
SET
    subtitle = '대표 장면과 내 추억을 함께 담는 리캡형 에디션',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 3
  AND subtitle LIKE '%드롭%';

UPDATE curated_asset
SET
    content = '이번 에디션은 팬 한 명 한 명의 문장을 모아 만든 팬레터 북입니다.'
WHERE edition_version_id IN (
    SELECT id
    FROM edition_version
    WHERE edition_id = 2
)
  AND sort_order = 1
  AND content LIKE '%드롭%';
