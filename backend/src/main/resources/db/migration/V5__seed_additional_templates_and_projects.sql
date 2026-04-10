INSERT INTO edition (id, creator_id, title, subtitle, cover_image_url, status, created_at, updated_at)
VALUES
    (2, 1, 'Fan Letter Archive', '한 장씩 편지를 남기는 메시지 중심 템플릿', 'https://picsum.photos/seed/fanletter-cover/1200/1200', 'PUBLISHED', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)),
    (3, 1, 'Milestone Recap Edition', '대표 영상과 팬 추억을 함께 담는 리캡형 템플릿', 'https://picsum.photos/seed/milestone-cover/1200/1200', 'PUBLISHED', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));

INSERT INTO edition_version (id, edition_id, version_number, official_intro, official_closing, book_spec_uid, approved_at, created_at, updated_at)
VALUES
    (
        2,
        2,
        1,
        JSON_OBJECT(
            'title', 'Every page starts with a message',
            'message', '한 사람씩 남긴 문장을 모아 팬의 온도를 기록하는 메시지형 PlayPick입니다.'
        ),
        JSON_OBJECT(
            'title', 'Letters we keep',
            'message', '짧은 문장도 오래 남는 기록이 될 수 있도록, 마지막 장까지 팬의 목소리를 담았습니다.'
        ),
        'SQUAREBOOK_HC',
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6)
    ),
    (
        3,
        3,
        1,
        JSON_OBJECT(
            'title', 'Highlights we chose together',
            'message', '공식 하이라이트 위에 팬의 선택을 더해 완성하는 마일스톤 리캡 에디션입니다.'
        ),
        JSON_OBJECT(
            'title', 'Your page in the milestone',
            'message', '대표 장면 사이에 당신의 추억이 들어갈 자리를 남겨두었습니다.'
        ),
        'SQUAREBOOK_HC',
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6)
    );

INSERT INTO curated_asset (edition_version_id, asset_type, title, content, sort_order)
VALUES
    (2, 'MESSAGE', 'Opening Letter', '이번 에디션은 팬 한 명 한 명의 문장을 모아 만든 공식 팬레터 북입니다.', 1),
    (2, 'IMAGE', 'Letter Mood Visual', 'https://picsum.photos/seed/fanletter-main/1200/900', 2),
    (3, 'VIDEO', 'Milestone Trailer', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1),
    (3, 'IMAGE', 'Milestone Banner', 'https://picsum.photos/seed/milestone-banner/1200/900', 2),
    (3, 'MESSAGE', 'Creator Cue', '대표 장면은 제가 고르고, 마지막 해석은 팬이 완성하는 구조로 만들었습니다.', 3);

INSERT INTO personalization_schema (edition_version_id, field_key, label, input_type, required, max_length, sort_order)
VALUES
    (2, 'fanNickname', '보내는 이름', 'TEXT', TRUE, 24, 1),
    (2, 'favoriteMemory', '기억에 남는 순간', 'TEXTAREA', FALSE, 240, 2),
    (2, 'fanMessage', '편지 본문', 'TEXTAREA', TRUE, 400, 3),
    (3, 'fanNickname', '팬 닉네임', 'TEXT', TRUE, 20, 1),
    (3, 'favoriteVideoId', '가장 좋아하는 영상', 'VIDEO_PICKER', TRUE, 40, 2),
    (3, 'uploadedImageUrl', '추억 이미지 URL', 'IMAGE_URL', FALSE, 500, 3),
    (3, 'fanNote', '추억 메모', 'TEXTAREA', TRUE, 240, 4);

INSERT INTO fan_project (id, edition_version_id, personalization_data, sweetbook_book_uid, status, owner_user_id, created_at, updated_at)
VALUES
    (
        2,
        2,
        JSON_OBJECT(
            'mode', 'demo',
            'fanNickname', '경신',
            'favoriteMemory', '첫 팬미팅에서 받은 한마디가 아직도 오래 남아 있어요.',
            'fanMessage', '이번 책은 제가 전하고 싶었던 문장을 정리하는 작은 보관함 같아요.'
        ),
        NULL,
        'DRAFT',
        2,
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6)
    ),
    (
        3,
        3,
        JSON_OBJECT(
            'mode', 'demo',
            'fanNickname', '경신',
            'favoriteVideoId', 'milestone-video-2',
            'fanNote', '대표 장면을 다시 넘겨보니 그 시기의 감정이 같이 떠오릅니다.',
            'uploadedImageUrl', 'https://picsum.photos/seed/milestone-fan/1200/900',
            'channel', JSON_OBJECT(
                'channelId', 'UC_DEMO_ONDOLOG',
                'title', '온도로그',
                'subscriberCount', '125000',
                'thumbnailUrl', 'https://picsum.photos/seed/ondolog-channel/600/600',
                'bannerUrl', 'https://picsum.photos/seed/ondolog-banner/1600/500'
            ),
            'topVideos', JSON_ARRAY(
                JSON_OBJECT(
                    'videoId', 'milestone-video-1',
                    'title', '연말 정산 브이로그',
                    'thumbnailUrl', 'https://picsum.photos/seed/milestone-video-1/1280/720',
                    'viewCount', 420000,
                    'publishedAt', '2024-02-14T09:00:00Z'
                ),
                JSON_OBJECT(
                    'videoId', 'milestone-video-2',
                    'title', '하이라이트 라이브 리캡',
                    'thumbnailUrl', 'https://picsum.photos/seed/milestone-video-2/1280/720',
                    'viewCount', 397000,
                    'publishedAt', '2024-11-22T11:30:00Z'
                )
            )
        ),
        'demo-book-ordered-seed',
        'ORDERED',
        2,
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6)
    );

INSERT INTO order_record (fan_project_id, sweetbook_order_uid, status, total_amount, recipient_name, recipient_phone, postal_code, address1, address2, ordered_at, created_at)
VALUES
    (
        3,
        'demo-order-seed-ordered',
        'PAID',
        12400.00,
        '천경신',
        '010-1234-5678',
        '06236',
        '서울특별시 강남구 테헤란로 123',
        '10층',
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6)
    );
