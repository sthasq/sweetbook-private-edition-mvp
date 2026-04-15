UPDATE creator_profile
SET avatar_url = '/demo-assets/astra-vale-avatar.png'
WHERE id = 1;

UPDATE creator_profile
SET avatar_url = '/demo-assets/mina-loop-avatar.png'
WHERE id = 2;

UPDATE creator_profile
SET avatar_url = '/demo-assets/noah-reed-avatar.png'
WHERE id = 3;

UPDATE edition
SET cover_image_url = '/demo-assets/astra-vale-cover.png'
WHERE id = 1;

UPDATE edition
SET cover_image_url = '/demo-assets/mina-loop-cover.png'
WHERE id = 2;

UPDATE edition
SET cover_image_url = '/demo-assets/noah-reed-cover.png'
WHERE id = 3;

UPDATE curated_asset
SET content = '/demo-assets/astra-vale-story-1.png'
WHERE edition_version_id = 1 AND asset_type = 'IMAGE';

UPDATE curated_asset
SET content = '/demo-assets/mina-loop-story-1.png'
WHERE edition_version_id = 2 AND asset_type = 'IMAGE';

UPDATE curated_asset
SET content = '/demo-assets/noah-reed-story-1.png'
WHERE edition_version_id = 3 AND asset_type = 'IMAGE';

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '연두',
    'subscribedSince', '2023-07-14T00:00:00Z',
    'daysTogether', 1002,
    'uploadedImageUrl', '/demo-assets/astra-vale-story-1.png',
    'favoriteVideoId', 'pani-video-2',
    'fanNote', '밤기차 창밖이 까맣게 흘러가는데도 계속 말을 이어가던 장면이 이상하게 오래 남았어요. 언젠가 저도 그런 식으로 낯선 도시를 건너보고 싶어요.',
    'channel', JSON_OBJECT(
        'channelId', 'UC_DEMO_PANIBOTTLE',
        'title', 'Astra Vale',
        'subscriberCount', '2500000',
        'thumbnailUrl', '/demo-assets/astra-vale-avatar.png',
        'bannerUrl', '/demo-assets/astra-vale-story-1.png'
    ),
    'topVideos', JSON_ARRAY(
        JSON_OBJECT(
            'videoId', 'pani-video-1',
            'title', '처음 내려본 사막 도시의 오후',
            'thumbnailUrl', '/demo-assets/astra-vale-cover.png',
            'viewCount', 640000,
            'publishedAt', '2024-04-18T09:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'pani-video-2',
            'title', '야간열차 타고 국경 넘기',
            'thumbnailUrl', '/demo-assets/astra-vale-story-1.png',
            'viewCount', 580000,
            'publishedAt', '2024-10-03T10:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'pani-video-3',
            'title', '로컬 버스에서 만난 사람들',
            'thumbnailUrl', '/demo-assets/astra-vale-story-1.png',
            'viewCount', 420000,
            'publishedAt', '2025-01-12T07:30:00Z'
        )
    )
)
WHERE id = 1;

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '소연',
    'favoriteMemory', '처음 보는 골목에서 멈칫하다가도 결국 웃으면서 들어가던 장면이 제일 Mina Loop답다고 느꼈어요.',
    'fanMessage', '영상 속 어색함이 오히려 용기가 되는 순간이 있더라고요. 이 북에는 그때마다 저장해 두고 싶었던 문장들을 편지처럼 모아보고 싶어요.',
    'channel', JSON_OBJECT(
        'channelId', 'UC_DEMO_JBKWAK',
        'title', 'Mina Loop',
        'subscriberCount', '2100000',
        'thumbnailUrl', '/demo-assets/mina-loop-avatar.png',
        'bannerUrl', '/demo-assets/mina-loop-story-1.png'
    )
)
WHERE id = 2;

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '주은',
    'favoriteVideoId', 'chim-video-2',
    'fanNote', '말이 빙 돌아가다가도 마지막에 툭 정리되는 순간이 좋아요. 웃다가도 메모하고 싶어지는 장면들만 따로 접어두고 싶었습니다.',
    'uploadedImageUrl', '/demo-assets/noah-reed-story-1.png',
    'channel', JSON_OBJECT(
        'channelId', 'UC_DEMO_CHIMCHAKMAN',
        'title', 'Noah Reed',
        'subscriberCount', '3100000',
        'thumbnailUrl', '/demo-assets/noah-reed-avatar.png',
        'bannerUrl', '/demo-assets/noah-reed-story-1.png'
    ),
    'topVideos', JSON_ARRAY(
        JSON_OBJECT(
            'videoId', 'chim-video-1',
            'title', '괜히 다시 켜보게 되는 토크',
            'thumbnailUrl', '/demo-assets/noah-reed-cover.png',
            'viewCount', 910000,
            'publishedAt', '2024-03-08T11:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'chim-video-2',
            'title', '먹방과 잡담이 길어지던 날',
            'thumbnailUrl', '/demo-assets/noah-reed-story-1.png',
            'viewCount', 860000,
            'publishedAt', '2024-11-20T13:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'chim-video-3',
            'title', '팬이 자주 꺼내보는 하이라이트',
            'thumbnailUrl', '/demo-assets/noah-reed-story-1.png',
            'viewCount', 780000,
            'publishedAt', '2025-02-14T08:00:00Z'
        )
    )
)
WHERE id = 3;
