UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '우리의 두 번째 봄',
        'message', '좋아했던 장면에 당신의 추억이 더해져 완성되는 2주년 북굿즈예요.'
    ),
    official_closing = JSON_OBJECT(
        'title', '다음 장면에서도 만나요',
        'message', '당신의 한 줄이 들어오면 더 오래 꺼내 보고 싶은 한 권이 돼요.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 1;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '한 장은 한 문장부터',
        'message', '한 줄씩 남긴 마음이 모여 완성되는 메시지 북굿즈예요.'
    ),
    official_closing = JSON_OBJECT(
        'title', '오래 남는 편지',
        'message', '짧은 문장도 오래 남는 기억이 되도록, 마지막 장까지 마음을 담았어요.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 2;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '같이 고른 하이라이트',
        'message', '좋아하는 장면 위에 내 취향을 더해 완성하는 리캡북이에요.'
    ),
    official_closing = JSON_OBJECT(
        'title', '이 장면의 마지막 페이지는 당신',
        'message', '좋아했던 장면 사이에 당신의 추억이 들어갈 자리를 남겨뒀어요.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 3;

UPDATE curated_asset
SET
    title = '오프닝 레터',
    content = '이번 드롭은 한 줄씩 남긴 마음을 모아 만든 팬레터북이에요.'
WHERE edition_version_id = 2 AND sort_order = 1;

UPDATE curated_asset
SET
    title = '크리에이터 코멘트',
    content = '대표 장면은 제가 고르고, 마지막 감상은 팬이 완성하는 흐름으로 준비했어요.'
WHERE edition_version_id = 3 AND sort_order = 3;
