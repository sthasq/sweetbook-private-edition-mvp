UPDATE creator_profile
SET
    avatar_url = '/demo-assets/noah-reed-avatar.png'
WHERE id = 3;

UPDATE edition
SET
    cover_image_url = '/demo-assets/noah-reed-cover.png',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 3;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '오늘은 조금 가까운 거리에서 말을 걸게요',
        'message', 'Noah Reed의 스튜디오에 들어온 것처럼, 이번에는 차분한 시선과 낮은 목소리로 당신의 장면을 함께 넘겨볼게요. 오래 남기고 싶은 감정이 있다면 내가 먼저 천천히 받아 적어둘게요.'
    ),
    official_closing = JSON_OBJECT(
        'title', '이 밤의 문장이 당신 곁에 오래 머물기를',
        'message', '책장을 덮은 뒤에도 오늘의 분위기가 금방 사라지지 않았으면 해요. 다시 조용한 밤이 오면, 내가 건넨 이 한마디가 먼저 당신을 다독이고 있었으면 좋겠습니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 3;

DELETE FROM curated_asset
WHERE edition_version_id = 3;

INSERT INTO curated_asset (edition_version_id, asset_type, title, content, sort_order)
VALUES
    (3, 'IMAGE', '스튜디오 첫 인사', '/demo-assets/noah-reed-story-1.png', 1),
    (3, 'IMAGE', '대화가 길어지는 밤', '/demo-assets/noah-reed-story-2.png', 2),
    (3, 'IMAGE', '미소가 먼저 풀리는 순간', '/demo-assets/noah-reed-story-3.png', 3),
    (3, 'IMAGE', '창가에 남겨둔 하루의 끝', '/demo-assets/noah-reed-banner.png', 4),
    (3, 'MESSAGE', '스튜디오 메모', '말보다 공기가 먼저 남는 밤의 온도와, 그 곁에서 조용히 건네는 응원을 담아두는 Noah Reed 데모 에디션입니다.', 5);

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '주은',
    'favoriteVideoId', 'noah-demo-2',
    'fanNote', '노트를 펼쳐두고 천천히 말을 고르던 장면이 오래 남아요. 조용한 위로를 건네받는 느낌이라 이번 책에도 그 온도를 담고 싶었어요.',
    'uploadedImageUrl', '/demo-assets/noah-reed-story-2.png',
    'channel', JSON_OBJECT(
        'channelId', 'VC_NOAH_REED',
        'title', 'Noah Reed',
        'subscriberCount', '3100000',
        'thumbnailUrl', '/demo-assets/noah-reed-avatar.png',
        'bannerUrl', '/demo-assets/noah-reed-banner.png',
        'handle', '@noahreed'
    ),
    'topVideos', JSON_ARRAY(
        JSON_OBJECT(
            'videoId', 'noah-demo-1',
            'title', '조용히 눈을 맞추는 오프닝',
            'thumbnailUrl', '/demo-assets/noah-reed-cover.png',
            'viewCount', 910000,
            'publishedAt', '2024-03-08T11:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'noah-demo-2',
            'title', '노트 위에 남겨둔 대화의 잔상',
            'thumbnailUrl', '/demo-assets/noah-reed-story-1.png',
            'viewCount', 860000,
            'publishedAt', '2024-11-20T13:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'noah-demo-3',
            'title', '웃음 끝에 오래 남는 밤',
            'thumbnailUrl', '/demo-assets/noah-reed-story-3.png',
            'viewCount', 780000,
            'publishedAt', '2025-02-14T08:00:00Z'
        )
    )
)
WHERE id = 3;
