UPDATE edition
SET
    title = '2주년 기념 북굿즈',
    subtitle = '온도로그와 함께한 장면을 한 권의 굿즈로 남기는 2주년 기념 드롭',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 1;

UPDATE edition
SET
    title = '한마디 팬레터북',
    subtitle = '마음을 한 장씩 남기는 메시지 중심 드롭',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 2;

UPDATE edition
SET
    title = '하이라이트 리캡북',
    subtitle = '대표 장면과 내 추억을 함께 담는 리캡형 드롭',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 3;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '우리의 두 번째 봄',
        'message', '온도로그가 직접 고른 장면에 팬 한 명 한 명의 추억을 더해 완성하는 2주년 기념 PlayPick입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '다음 장면에서도 만나요',
        'message', '당신의 기억이 더해지는 순간, 이 책은 오래 꺼내 보고 싶은 굿즈가 됩니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 1;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '한 장은 한 문장부터',
        'message', '한 사람씩 남긴 문장을 모아 팬의 온도를 기록하는 메시지형 PlayPick입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '오래 남는 편지',
        'message', '짧은 문장도 오래 남는 기억이 되도록, 마지막 장까지 팬의 목소리를 담았습니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 2;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '같이 고른 하이라이트',
        'message', '대표 장면 위에 팬의 선택을 더해 완성하는 하이라이트 리캡북입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '이 장면의 마지막 페이지는 당신',
        'message', '좋아했던 장면 사이에 당신의 추억이 들어갈 자리를 남겨두었습니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 3;

UPDATE curated_asset
SET title = '2주년 메인 비주얼'
WHERE edition_version_id = 1 AND sort_order = 1;

UPDATE curated_asset
SET title = '비하인드 컷'
WHERE edition_version_id = 1 AND sort_order = 2;

UPDATE curated_asset
SET
    title = '크리에이터 노트',
    content = '2주년을 함께 만들어줘서 고마워요. 이 페이지는 우리만의 축제를 오래 남겨둘 수 있게 준비했어요.'
WHERE edition_version_id = 1 AND sort_order = 3;

UPDATE curated_asset
SET title = '2주년 트레일러'
WHERE edition_version_id = 1 AND sort_order = 4;

UPDATE curated_asset
SET
    title = '오프닝 레터',
    content = '이번 드롭은 팬 한 명 한 명의 문장을 모아 만든 팬레터 북입니다.'
WHERE edition_version_id = 2 AND sort_order = 1;

UPDATE curated_asset
SET title = '팬레터 무드컷'
WHERE edition_version_id = 2 AND sort_order = 2;

UPDATE curated_asset
SET title = '리캡 트레일러'
WHERE edition_version_id = 3 AND sort_order = 1;

UPDATE curated_asset
SET title = '하이라이트 배너'
WHERE edition_version_id = 3 AND sort_order = 2;

UPDATE curated_asset
SET
    title = '크리에이터 코멘트',
    content = '대표 장면은 제가 고르고, 마지막 감상은 팬이 완성하는 흐름으로 만들었어요.'
WHERE edition_version_id = 3 AND sort_order = 3;
