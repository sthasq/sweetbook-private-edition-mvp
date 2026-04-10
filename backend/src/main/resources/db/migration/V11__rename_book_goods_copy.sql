UPDATE edition
SET
    title = '2주년 기념 메모리북',
    subtitle = '온도로그와 함께한 장면을 오래 남기는 2주년 드롭',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 1;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '우리의 두 번째 봄',
        'message', '좋아했던 장면에 당신의 추억이 더해져 완성되는 2주년 메모리북이에요.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 1;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '한 장은 한 문장부터',
        'message', '한 줄씩 남긴 마음이 모여 완성되는 메시지북이에요.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 2;
