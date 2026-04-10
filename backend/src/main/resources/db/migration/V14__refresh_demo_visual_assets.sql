UPDATE creator_profile
SET avatar_url = '/demo-assets/panibottle-avatar.svg'
WHERE id = 1;

UPDATE creator_profile
SET avatar_url = '/demo-assets/jbkwak-avatar.svg'
WHERE id = 2;

UPDATE creator_profile
SET avatar_url = '/demo-assets/chimchakman-avatar.svg'
WHERE id = 3;

UPDATE edition
SET
    cover_image_url = '/demo-assets/panibottle-cover.svg',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 1;

UPDATE edition
SET
    cover_image_url = '/demo-assets/jbkwak-cover.svg',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 2;

UPDATE edition
SET
    cover_image_url = '/demo-assets/chimchakman-cover.svg',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 3;

UPDATE edition
SET
    cover_image_url = '/demo-assets/playpick-hero.svg',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE title = 'UI Order Verification Edition';

DELETE FROM curated_asset
WHERE edition_version_id IN (1, 2, 3);

INSERT INTO curated_asset (edition_version_id, asset_type, title, content, sort_order)
VALUES
    (1, 'IMAGE', '사막 횡단 무드컷', '/demo-assets/panibottle-landscape.svg', 1),
    (1, 'IMAGE', '현지 버스 창가 스냅', '/demo-assets/panibottle-landscape.svg', 2),
    (1, 'MESSAGE', '여행 메모', '공개 채널에서 보던 이동의 감도를 팬 메모와 함께 남길 수 있도록 구성한 데모 에디션입니다.', 3),
    (1, 'VIDEO', '여행 하이라이트 영상', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 4),
    (2, 'MESSAGE', '오프닝 레터', '여행 중 기억에 남았던 장면과 팬의 한 문장을 모아두는 데모 팬레터북입니다.', 1),
    (2, 'IMAGE', '로드트립 무드컷', '/demo-assets/jbkwak-landscape.svg', 2),
    (2, 'MESSAGE', '현장감 메모', '에피소드 뒤에 남는 감상을 짧은 편지처럼 쌓아가는 흐름으로 설계했습니다.', 3),
    (3, 'VIDEO', '토크 하이라이트 영상', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1),
    (3, 'IMAGE', '스튜디오 무드컷', '/demo-assets/chimchakman-landscape.svg', 2),
    (3, 'MESSAGE', '코멘트 메모', '다시 보고 싶은 토크 장면에 팬의 해석과 메모를 끼워 넣는 데모 리캡북입니다.', 3);

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '유진',
    'subscribedSince', '2023-05-02T00:00:00Z',
    'daysTogether', 1075,
    'uploadedImageUrl', '/demo-assets/panibottle-landscape.svg',
    'favoriteVideoId', 'pani-video-2',
    'fanNote', '낯선 도시를 걷는 장면을 볼 때마다 나도 언젠가 떠나고 싶다는 마음이 들었어요.',
    'channel', JSON_OBJECT(
        'channelId', 'UC_DEMO_PANIBOTTLE',
        'title', '빠니보틀 Pani Bottle',
        'subscriberCount', '2500000',
        'thumbnailUrl', '/demo-assets/panibottle-avatar.svg',
        'bannerUrl', '/demo-assets/panibottle-landscape.svg'
    ),
    'topVideos', JSON_ARRAY(
        JSON_OBJECT(
            'videoId', 'pani-video-1',
            'title', '사막 도시에서 보낸 하루',
            'thumbnailUrl', '/demo-assets/panibottle-landscape.svg',
            'viewCount', 640000,
            'publishedAt', '2024-04-18T09:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'pani-video-2',
            'title', '야간열차 타고 국경 넘기',
            'thumbnailUrl', '/demo-assets/panibottle-landscape.svg',
            'viewCount', 580000,
            'publishedAt', '2024-10-03T10:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'pani-video-3',
            'title', '로컬 버스에서 만난 사람들',
            'thumbnailUrl', '/demo-assets/panibottle-landscape.svg',
            'viewCount', 420000,
            'publishedAt', '2025-01-12T07:30:00Z'
        )
    )
)
WHERE id = 1;

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '민지',
    'favoriteMemory', '낯선 도시에서 로컬 음식을 처음 맛보던 장면이 아직도 가장 선명해요.',
    'fanMessage', '영상에서 느낀 어색함과 웃긴 포인트가 그대로 남아 있어서, 이번 데모도 편지 형식이 잘 어울린다고 생각했어요.',
    'channel', JSON_OBJECT(
        'channelId', 'UC_DEMO_JBKWAK',
        'title', '곽튜브',
        'subscriberCount', '2100000',
        'thumbnailUrl', '/demo-assets/jbkwak-avatar.svg',
        'bannerUrl', '/demo-assets/jbkwak-landscape.svg'
    )
)
WHERE id = 2;

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '성훈',
    'favoriteVideoId', 'chim-video-2',
    'fanNote', '길게 떠들다가도 갑자기 한 문장으로 정리되는 순간이 좋아서 자꾸 다시 보게 됩니다.',
    'uploadedImageUrl', '/demo-assets/chimchakman-landscape.svg',
    'channel', JSON_OBJECT(
        'channelId', 'UC_DEMO_CHIMCHAKMAN',
        'title', '침착맨',
        'subscriberCount', '3100000',
        'thumbnailUrl', '/demo-assets/chimchakman-avatar.svg',
        'bannerUrl', '/demo-assets/chimchakman-landscape.svg'
    ),
    'topVideos', JSON_ARRAY(
        JSON_OBJECT(
            'videoId', 'chim-video-1',
            'title', '오래 남는 토크 명장면',
            'thumbnailUrl', '/demo-assets/chimchakman-landscape.svg',
            'viewCount', 910000,
            'publishedAt', '2024-03-08T11:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'chim-video-2',
            'title', '먹방과 잡담이 길어지던 날',
            'thumbnailUrl', '/demo-assets/chimchakman-landscape.svg',
            'viewCount', 860000,
            'publishedAt', '2024-11-20T13:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'chim-video-3',
            'title', '팬이 다시 고른 하이라이트',
            'thumbnailUrl', '/demo-assets/chimchakman-landscape.svg',
            'viewCount', 780000,
            'publishedAt', '2025-02-14T08:00:00Z'
        )
    )
)
WHERE id = 3;
