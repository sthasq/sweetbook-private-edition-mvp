UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '여행 끝에 오래 남는 건 장면보다 기분일지도 몰라요',
        'message', 'Astra Vale 공개 채널의 이동감과 낯선 공기를 바탕으로, 팬이 오래 기억한 장면과 자기 문장을 한 권에 눌러 담는 메모리북 데모입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '한 번 다녀온 마음은 이상하게 다시 펼쳐보게 됩니다',
        'message', '다 지나간 여행 로그가 아니라, 나중에 꺼내 봐도 그때의 공기와 속도가 같이 돌아오도록 설계한 비공개 과제용 데모예요.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 1;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '웃긴데 이상하게 오래 남는 여행의 순간들',
        'message', 'Mina Loop 채널에서 느껴지는 어색함, 현장감, 돌발적인 웃음을 팬 편지 형식으로 다시 묶어보는 로드트립 팬레터북 데모입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '돌아와서야 문장이 되는 기억이 있더라고요',
        'message', '에피소드를 다 본 뒤에도 한참 남아 있던 감정을 편지 톤으로 적어둘 수 있게, 읽는 속도와 문장 길이까지 차분하게 맞췄습니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 2;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '결국 다시 보게 되는 건 말보다 분위기였어요',
        'message', 'Noah Reed 채널 특유의 긴 토크, 툭 던지는 정리, 괜히 다시 켜보게 되는 흐름을 팬의 메모와 함께 묶어보는 하이라이트북 데모입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '웃기고 지나간 장면도 기록해 두면 오래 남습니다',
        'message', '스쳐 지나간 잡담 같아도 다시 펼치면 그날의 리듬이 살아나도록, 팬이 직접 고른 장면과 짧은 감상을 자연스럽게 이어 붙였습니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 3;

UPDATE curated_asset
SET title = '사막 도로의 공기', content = '/demo-assets/astra-vale-story-1.png'
WHERE edition_version_id = 1 AND sort_order = 1;

UPDATE curated_asset
SET title = '야간 이동 직전의 창가', content = '/demo-assets/astra-vale-story-1.png'
WHERE edition_version_id = 1 AND sort_order = 2;

UPDATE curated_asset
SET title = '여행 메모', content = '낯선 장소에 도착했을 때의 어색함과 설렘이 같이 남도록, 팬의 문장이 중간중간 호흡처럼 끼어들게 만든 데모 에디션입니다.'
WHERE edition_version_id = 1 AND sort_order = 3;

UPDATE curated_asset
SET title = '첫 문장 같은 장면', content = '에피소드가 시작될 때 특유의 머뭇거림과 웃음 포인트를 편지의 첫 문단처럼 열어주는 용도로 잡았습니다.'
WHERE edition_version_id = 2 AND sort_order = 1;

UPDATE curated_asset
SET title = '로드트립 한 컷', content = '/demo-assets/mina-loop-story-1.png'
WHERE edition_version_id = 2 AND sort_order = 2;

UPDATE curated_asset
SET title = '현장감 메모', content = '보는 사람도 같이 멈칫하게 되는 순간들을 짧은 문장으로 끊어 적을 수 있게, 템포가 느껴지는 구성을 먼저 깔아둔 데모입니다.'
WHERE edition_version_id = 2 AND sort_order = 3;

UPDATE curated_asset
SET title = '다시 켜보게 되는 하이라이트 영상'
WHERE edition_version_id = 3 AND sort_order = 1;

UPDATE curated_asset
SET title = '토크의 온도', content = '/demo-assets/noah-reed-story-1.png'
WHERE edition_version_id = 3 AND sort_order = 2;

UPDATE curated_asset
SET title = '코멘트 메모', content = '길게 이어지는 잡담 속에서도 다시 접어두고 싶은 한 문장을 팬 메모로 붙잡아 두는 흐름을 먼저 설계했습니다.'
WHERE edition_version_id = 3 AND sort_order = 3;

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
            'title', '팬이 자주 꺼내보는 하이라이트',
            'thumbnailUrl', '/demo-assets/noah-reed-story-1.png',
            'viewCount', 780000,
            'publishedAt', '2025-02-14T08:00:00Z'
        )
    )
)
WHERE id = 3;
