INSERT INTO creator_profile (id, display_name, channel_handle, avatar_url, verified, user_id, created_at)
VALUES
    (1, 'Astra Vale', '@astravale', '/demo-assets/astra-vale-avatar.png', TRUE, 1, CURRENT_TIMESTAMP(6)),
    (2, 'Mina Loop', '@minaloop', '/demo-assets/mina-loop-avatar.png', TRUE, NULL, CURRENT_TIMESTAMP(6)),
    (3, 'Noah Reed', '@noahreed', '/demo-assets/noah-reed-avatar.png', TRUE, NULL, CURRENT_TIMESTAMP(6))
ON DUPLICATE KEY UPDATE
    display_name = VALUES(display_name),
    channel_handle = VALUES(channel_handle),
    avatar_url = VALUES(avatar_url),
    verified = VALUES(verified),
    user_id = VALUES(user_id);

UPDATE app_user
SET display_name = 'Astra Vale'
WHERE email = 'creator@playpick.local';

UPDATE edition
SET
    creator_id = 1,
    title = 'Astra Vale 세계여행 메모리북 데모',
    subtitle = 'Astra Vale 공개 채널 감성으로 구성한 비공개 과제용 트래블 굿즈 데모',
    cover_image_url = '/demo-assets/astra-vale-cover.png',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 1;

UPDATE edition
SET
    creator_id = 2,
    title = 'Mina Loop 로드트립 팬레터북 데모',
    subtitle = 'Mina Loop 공개 채널 분위기를 바탕으로 만든 비공개 과제용 메시지북 데모',
    cover_image_url = '/demo-assets/mina-loop-cover.png',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 2;

UPDATE edition
SET
    creator_id = 3,
    title = 'Noah Reed 토크 하이라이트북 데모',
    subtitle = 'Noah Reed 공개 채널 감성을 참고한 비공개 과제용 하이라이트북 데모',
    cover_image_url = '/demo-assets/noah-reed-cover.png',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 3;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '이번 여행의 메모를 남겨요',
        'message', 'Astra Vale 채널의 여행 무드를 바탕으로, 팬이 고른 장면과 개인 메모를 한 권으로 묶는 데모 메모리북입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '다음 여정 전에도 펼쳐볼 페이지',
        'message', '공개 채널에서 본 장면에 내 추억을 덧입혀 오래 남기는 과제용 데모 시나리오예요.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 1;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '여행 뒤에 남는 건 결국 한 문장',
        'message', 'Mina Loop 채널에서 느낀 에피소드 감도를 팬 메시지와 함께 쌓아가는 비공개 과제용 팬레터북 데모입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '다음 에피소드에도 내 문장을 보태요',
        'message', '현장감 있는 여행 기억을 팬의 말투로 정리해 보관하는 데 초점을 맞췄습니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 2;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '계속 다시 보게 되는 토크 장면들',
        'message', 'Noah Reed 채널의 토크와 하이라이트 감상을 팬의 시선으로 다시 엮는 비공개 과제용 리캡북 데모입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '다음 장면의 해석도 함께 남겨둡니다',
        'message', '좋아했던 장면 사이에 팬 메모와 이미지를 끼워 넣어 다시 펼쳐보기 좋은 데모 굿즈로 구성했습니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 3;

DELETE FROM curated_asset
WHERE edition_version_id IN (1, 2, 3);

INSERT INTO curated_asset (edition_version_id, asset_type, title, content, sort_order)
VALUES
    (1, 'IMAGE', '사막 횡단 무드컷', '/demo-assets/astra-vale-story-1.png', 1),
    (1, 'IMAGE', '현지 버스 창가 스냅', '/demo-assets/astra-vale-story-1.png', 2),
    (1, 'MESSAGE', '여행 메모', '공개 채널에서 보던 이동의 감도를 팬 메모와 함께 남길 수 있도록 구성한 데모 에디션입니다.', 3),
    (1, 'VIDEO', '여행 하이라이트 영상', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 4),
    (2, 'MESSAGE', '오프닝 레터', '여행 중 기억에 남았던 장면과 팬의 한 문장을 모아두는 데모 팬레터북입니다.', 1),
    (2, 'IMAGE', '로드트립 무드컷', '/demo-assets/mina-loop-story-1.png', 2),
    (2, 'MESSAGE', '현장감 메모', '에피소드 뒤에 남는 감상을 짧은 편지처럼 쌓아가는 흐름으로 설계했습니다.', 3),
    (3, 'VIDEO', '토크 하이라이트 영상', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1),
    (3, 'IMAGE', '스튜디오 무드컷', '/demo-assets/noah-reed-story-1.png', 2),
    (3, 'MESSAGE', '코멘트 메모', '다시 보고 싶은 토크 장면에 팬의 해석과 메모를 끼워 넣는 데모 리캡북입니다.', 3);

UPDATE personalization_schema
SET label = '여행 메이트 이름'
WHERE edition_version_id = 1 AND field_key = 'fanNickname';

UPDATE personalization_schema
SET label = '처음 구독한 시점'
WHERE edition_version_id = 1 AND field_key = 'subscribedSince';

UPDATE personalization_schema
SET label = '가장 다시 본 여행 영상'
WHERE edition_version_id = 1 AND field_key = 'favoriteVideoId';

UPDATE personalization_schema
SET label = '남기고 싶은 여행 메모'
WHERE edition_version_id = 1 AND field_key = 'fanNote';

UPDATE personalization_schema
SET label = '함께 넣을 여행 사진 URL'
WHERE edition_version_id = 1 AND field_key = 'uploadedImageUrl';

UPDATE personalization_schema
SET label = '보내는 이름'
WHERE edition_version_id = 2 AND field_key = 'fanNickname';

UPDATE personalization_schema
SET label = '가장 기억나는 여행 장면'
WHERE edition_version_id = 2 AND field_key = 'favoriteMemory';

UPDATE personalization_schema
SET label = '전하고 싶은 편지'
WHERE edition_version_id = 2 AND field_key = 'fanMessage';

UPDATE personalization_schema
SET label = '팬 닉네임'
WHERE edition_version_id = 3 AND field_key = 'fanNickname';

UPDATE personalization_schema
SET label = '다시 본 토크 영상'
WHERE edition_version_id = 3 AND field_key = 'favoriteVideoId';

UPDATE personalization_schema
SET label = '넣고 싶은 장면 이미지 URL'
WHERE edition_version_id = 3 AND field_key = 'uploadedImageUrl';

UPDATE personalization_schema
SET label = '기억에 남는 장면 메모'
WHERE edition_version_id = 3 AND field_key = 'fanNote';

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '유진',
    'subscribedSince', '2023-05-02T00:00:00Z',
    'daysTogether', 1075,
    'uploadedImageUrl', '/demo-assets/astra-vale-story-1.png',
    'favoriteVideoId', 'pani-video-2',
    'fanNote', '낯선 도시를 걷는 장면을 볼 때마다 나도 언젠가 떠나고 싶다는 마음이 들었어요.',
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
            'title', '사막 도시에서 보낸 하루',
            'thumbnailUrl', '/demo-assets/astra-vale-story-1.png',
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
    'fanNickname', '민지',
    'favoriteMemory', '낯선 도시에서 로컬 음식을 처음 맛보던 장면이 아직도 가장 선명해요.',
    'fanMessage', '영상에서 느낀 어색함과 웃긴 포인트가 그대로 남아 있어서, 이번 데모도 편지 형식이 잘 어울린다고 생각했어요.',
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
    'fanNickname', '성훈',
    'favoriteVideoId', 'chim-video-2',
    'fanNote', '길게 떠들다가도 갑자기 한 문장으로 정리되는 순간이 좋아서 자꾸 다시 보게 됩니다.',
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
            'title', '오래 남는 토크 명장면',
            'thumbnailUrl', '/demo-assets/noah-reed-story-1.png',
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
            'title', '팬이 다시 고른 하이라이트',
            'thumbnailUrl', '/demo-assets/noah-reed-story-1.png',
            'viewCount', 780000,
            'publishedAt', '2025-02-14T08:00:00Z'
        )
    )
)
WHERE id = 3;
