INSERT INTO creator_profile (id, display_name, channel_handle, avatar_url, verified, created_at)
VALUES
    (1, '온도로그', '@ondolog', 'https://picsum.photos/seed/ondolog-avatar/240/240', TRUE, CURRENT_TIMESTAMP(6));

INSERT INTO edition (id, creator_id, title, subtitle, cover_image_url, status, created_at, updated_at)
VALUES
    (1, 1, '2nd Anniversary PlayPick', 'Officially approved keepsake for the 온도로그 fandom', 'https://picsum.photos/seed/ondolog-cover/1200/1200', 'PUBLISHED', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));

INSERT INTO edition_version (id, edition_id, version_number, official_intro, official_closing, book_spec_uid, approved_at, created_at, updated_at)
VALUES
    (
        1,
        1,
        1,
        JSON_OBJECT(
            'title', 'To our second spring',
            'message', '온도로그가 직접 고른 순간들을 담고, 팬 한 명 한 명의 이야기를 덧입힌 PlayPick입니다.'
        ),
        JSON_OBJECT(
            'title', 'See you on the next page',
            'message', '당신의 추억이 공식 기록 위에 얹히는 순간, 이 책은 굿즈가 아니라 관계의 증거가 됩니다.'
        ),
        'SQUAREBOOK_HC',
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6)
    );

INSERT INTO curated_asset (edition_version_id, asset_type, title, content, sort_order)
VALUES
    (1, 'IMAGE', 'Anniversary Main Visual', 'https://picsum.photos/seed/ondolog-main/1200/900', 1),
    (1, 'IMAGE', 'Creator Behind The Scenes', 'https://picsum.photos/seed/ondolog-bts/1200/900', 2),
    (1, 'MESSAGE', 'Creator Note', '2주년을 함께 만들어줘서 고마워요. 이 페이지는 공식 기록이자 우리만의 축제예요.', 3),
    (1, 'VIDEO', 'Anniversary Trailer', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 4);

INSERT INTO personalization_schema (edition_version_id, field_key, label, input_type, required, max_length, sort_order)
VALUES
    (1, 'fanNickname', '팬 닉네임', 'TEXT', TRUE, 20, 1),
    (1, 'subscribedSince', '입덕 시점', 'DATE', TRUE, NULL, 2),
    (1, 'favoriteVideoId', '가장 좋아하는 영상', 'VIDEO_PICKER', TRUE, 40, 3),
    (1, 'fanNote', '한 줄 메시지', 'TEXTAREA', TRUE, 240, 4),
    (1, 'uploadedImageUrl', '추억 이미지 URL', 'IMAGE_URL', FALSE, 500, 5);

INSERT INTO fan_project (id, edition_version_id, personalization_data, sweetbook_book_uid, status, created_at, updated_at)
VALUES
    (
        1,
        1,
        JSON_OBJECT(
            'mode', 'demo',
            'fanNickname', '경신',
            'subscribedSince', '2022-08-15T00:00:00Z',
            'daysTogether', 1332,
            'uploadedImageUrl', 'https://picsum.photos/seed/ondolog-fan/1200/900',
            'favoriteVideoId', 'demo-video-2',
            'fanNote', '퇴근길에 보던 온도로그 덕분에 하루가 조금 더 단단해졌어요.',
            'channel', JSON_OBJECT(
                'channelId', 'UC_DEMO_ONDOLOG',
                'title', '온도로그',
                'subscriberCount', '125000',
                'thumbnailUrl', 'https://picsum.photos/seed/ondolog-channel/600/600',
                'bannerUrl', 'https://picsum.photos/seed/ondolog-banner/1600/500'
            ),
            'topVideos', JSON_ARRAY(
                JSON_OBJECT(
                    'videoId', 'demo-video-1',
                    'title', '온도로그의 아침 루틴',
                    'thumbnailUrl', 'https://picsum.photos/seed/ondolog-video-1/1280/720',
                    'viewCount', 520000,
                    'publishedAt', '2023-03-12T09:00:00Z'
                ),
                JSON_OBJECT(
                    'videoId', 'demo-video-2',
                    'title', '2주년 라이브 하이라이트',
                    'thumbnailUrl', 'https://picsum.photos/seed/ondolog-video-2/1280/720',
                    'viewCount', 481000,
                    'publishedAt', '2024-09-14T11:00:00Z'
                ),
                JSON_OBJECT(
                    'videoId', 'demo-video-3',
                    'title', '브이로그 편집 비하인드',
                    'thumbnailUrl', 'https://picsum.photos/seed/ondolog-video-3/1280/720',
                    'viewCount', 310000,
                    'publishedAt', '2024-12-01T07:30:00Z'
                ),
                JSON_OBJECT(
                    'videoId', 'demo-video-4',
                    'title', '팬들이 고른 명장면 TOP10',
                    'thumbnailUrl', 'https://picsum.photos/seed/ondolog-video-4/1280/720',
                    'viewCount', 290000,
                    'publishedAt', '2025-02-09T10:00:00Z'
                ),
                JSON_OBJECT(
                    'videoId', 'demo-video-5',
                    'title', '연말 편지 낭독',
                    'thumbnailUrl', 'https://picsum.photos/seed/ondolog-video-5/1280/720',
                    'viewCount', 255000,
                    'publishedAt', '2025-12-28T12:00:00Z'
                )
            )
        ),
        NULL,
        'PERSONALIZED',
        CURRENT_TIMESTAMP(6),
        CURRENT_TIMESTAMP(6)
    );
