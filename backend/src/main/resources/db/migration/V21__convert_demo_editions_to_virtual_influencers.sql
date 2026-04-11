UPDATE creator_profile
SET
    display_name = 'Astra Vale',
    channel_handle = '@astravale',
    avatar_url = '/demo-assets/panibottle-avatar.jpg',
    verified = TRUE
WHERE id = 1;

UPDATE creator_profile
SET
    display_name = 'Mina Loop',
    channel_handle = '@minaloop',
    avatar_url = '/demo-assets/jbkwak-avatar.jpg',
    verified = TRUE
WHERE id = 2;

UPDATE creator_profile
SET
    display_name = 'Noah Reed',
    channel_handle = '@noahreed',
    avatar_url = '/demo-assets/chimchakman-avatar.jpg',
    verified = TRUE
WHERE id = 3;

UPDATE app_user
SET display_name = 'Astra Vale'
WHERE email = 'creator@playpick.local';

UPDATE edition
SET
    title = 'Astra Vale 사막 횡단 메모리북 데모',
    subtitle = '가상 여행 크리에이터 Astra Vale의 기록 감성으로 구성한 메모리북 데모',
    cover_image_url = '/demo-assets/panibottle-cover.jpg',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 1;

UPDATE edition
SET
    title = 'Mina Loop 시티 로드트립 팬레터북 데모',
    subtitle = '가상 라이프스타일 크리에이터 Mina Loop의 로드트립 무드를 담은 팬레터북 데모',
    cover_image_url = '/demo-assets/jbkwak-cover.jpg',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 2;

UPDATE edition
SET
    title = 'Noah Reed 나이트 스튜디오 하이라이트북 데모',
    subtitle = '가상 토크 크리에이터 Noah Reed의 스튜디오 무드를 담은 하이라이트북 데모',
    cover_image_url = '/demo-assets/chimchakman-cover.jpg',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 3;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '낯선 풍경을 건너는 기록을 남겨요',
        'message', 'Astra Vale의 사막 여행 다큐 감성을 바탕으로, 팬이 오래 기억한 풍경과 문장을 한 권의 메모리북으로 엮는 가상 에디션입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '다시 펼치면 그때의 공기가 돌아오도록',
        'message', '거대한 풍경과 조용한 이동의 감도를 팬의 문장과 함께 보관하도록 설계한 가상 포토북 데모예요.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 1;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '가볍게 웃고 지나간 길도 한 장면이 됩니다',
        'message', 'Mina Loop의 도시 로드트립 무드를 바탕으로, 팬의 기억과 짧은 편지를 함께 쌓아가는 가상 팬레터북 에디션입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '한 번 스친 장면도 문장으로 남기면 오래 가요',
        'message', '차에 기대 웃던 표정, 도시의 빛, 팬의 한마디를 함께 묶어 읽는 속도까지 가볍게 흐르도록 구성했습니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 2;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '늦은 밤의 대화는 이상하게 오래 남아요',
        'message', 'Noah Reed의 차분한 스튜디오 토크 감성을 바탕으로, 팬이 접어두고 싶은 문장과 장면을 다시 꺼내보는 가상 하이라이트북 에디션입니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '조용히 정리된 한 문장을 오래 붙잡아 둡니다',
        'message', '빛이 낮게 깔린 스튜디오의 온도와 팬의 메모가 자연스럽게 이어지도록 만든 가상 포토북 데모예요.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 3;

UPDATE curated_asset
SET title = '사막 초상 무드컷', content = '/demo-assets/panibottle-landscape.jpg'
WHERE edition_version_id = 1 AND sort_order = 1;

UPDATE curated_asset
SET title = '야간열차 플랫폼의 노트', content = '/demo-assets/panibottle-landscape.jpg'
WHERE edition_version_id = 1 AND sort_order = 2;

UPDATE curated_asset
SET title = '트래블 다이어리 메모', content = '긴 이동 끝에 남는 공기와 시선을 팬의 문장으로 이어 붙이는 여행 다큐형 가상 에디션입니다.'
WHERE edition_version_id = 1 AND sort_order = 3;

UPDATE curated_asset
SET title = '파스텔 골목 초상', content = '밝고 경쾌한 도심 여행의 무드를 한 장면 안에 담아두는 가상 로드트립 에디션입니다.'
WHERE edition_version_id = 2 AND sort_order = 1;

UPDATE curated_asset
SET title = '언덕 위 로드트립 컷', content = '/demo-assets/jbkwak-landscape.jpg'
WHERE edition_version_id = 2 AND sort_order = 2;

UPDATE curated_asset
SET title = '팬레터 메모', content = '머뭇거리다가도 결국 길을 택하는 기분을 팬의 말투로 정리해 보관하도록 설계했습니다.'
WHERE edition_version_id = 2 AND sort_order = 3;

UPDATE curated_asset
SET title = '스튜디오 오프닝 포트레이트'
WHERE edition_version_id = 3 AND sort_order = 1;

UPDATE curated_asset
SET title = '야간 스튜디오 하이라이트', content = '/demo-assets/chimchakman-landscape.jpg'
WHERE edition_version_id = 3 AND sort_order = 2;

UPDATE curated_asset
SET title = '대화의 잔상 메모', content = '말보다 분위기가 먼저 남는 밤의 토크를 팬 메모와 함께 다시 펼쳐보는 가상 에디션입니다.'
WHERE edition_version_id = 3 AND sort_order = 3;

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '연두',
    'subscribedSince', '2023-07-14T00:00:00Z',
    'daysTogether', 1002,
    'uploadedImageUrl', '/demo-assets/panibottle-landscape.jpg',
    'favoriteVideoId', 'astra-demo-2',
    'fanNote', '밤기차 플랫폼에서 노트를 꼭 쥐고 서 있던 장면이 오래 남았어요. 낯선 풍경을 건너는 속도까지 함께 기록해두고 싶었습니다.',
    'channel', JSON_OBJECT(
        'channelId', 'VC_ASTRA_VALE',
        'title', 'Astra Vale',
        'subscriberCount', '2500000',
        'thumbnailUrl', '/demo-assets/panibottle-avatar.jpg',
        'bannerUrl', '/demo-assets/panibottle-landscape.jpg',
        'handle', '@astravale'
    ),
    'topVideos', JSON_ARRAY(
        JSON_OBJECT(
            'videoId', 'astra-demo-1',
            'title', '사막 도시의 첫 오후',
            'thumbnailUrl', '/demo-assets/panibottle-cover.jpg',
            'viewCount', 640000,
            'publishedAt', '2024-04-18T09:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'astra-demo-2',
            'title', '야간열차 플랫폼의 기록',
            'thumbnailUrl', '/demo-assets/panibottle-landscape.jpg',
            'viewCount', 580000,
            'publishedAt', '2024-10-03T10:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'astra-demo-3',
            'title', '창밖으로 흘러가던 황금빛 사막',
            'thumbnailUrl', '/demo-assets/panibottle-landscape.jpg',
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
    'favoriteMemory', '도시 가장자리 언덕에서 차에 기대 웃고 있던 장면이 제일 오래 남았어요. 가볍고 장난스러운 분위기가 이 에디션의 중심 같았거든요.',
    'fanMessage', '조금은 엉뚱하고 조금은 대담한 로드트립 무드를 좋아해요. 낯선 길 앞에서 망설이다가도 결국 한 걸음 내딛는 기분을 편지처럼 남기고 싶습니다.',
    'channel', JSON_OBJECT(
        'channelId', 'VC_MINA_LOOP',
        'title', 'Mina Loop',
        'subscriberCount', '2100000',
        'thumbnailUrl', '/demo-assets/jbkwak-avatar.jpg',
        'bannerUrl', '/demo-assets/jbkwak-landscape.jpg',
        'handle', '@minaloop'
    )
)
WHERE id = 2;

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '주은',
    'favoriteVideoId', 'noah-demo-2',
    'fanNote', '조용한 스튜디오에서 한 문장을 오래 붙잡고 있던 장면이 좋아요. 말의 속도보다 분위기를 다시 펼쳐보고 싶어서 이 북으로 남기고 싶었습니다.',
    'uploadedImageUrl', '/demo-assets/chimchakman-landscape.jpg',
    'channel', JSON_OBJECT(
        'channelId', 'VC_NOAH_REED',
        'title', 'Noah Reed',
        'subscriberCount', '3100000',
        'thumbnailUrl', '/demo-assets/chimchakman-avatar.jpg',
        'bannerUrl', '/demo-assets/chimchakman-landscape.jpg',
        'handle', '@noahreed'
    ),
    'topVideos', JSON_ARRAY(
        JSON_OBJECT(
            'videoId', 'noah-demo-1',
            'title', '정적이 먼저 흐르는 오프닝 토크',
            'thumbnailUrl', '/demo-assets/chimchakman-cover.jpg',
            'viewCount', 910000,
            'publishedAt', '2024-03-08T11:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'noah-demo-2',
            'title', '노트 위에 남겨둔 대화의 잔상',
            'thumbnailUrl', '/demo-assets/chimchakman-landscape.jpg',
            'viewCount', 860000,
            'publishedAt', '2024-11-20T13:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'noah-demo-3',
            'title', '늦은 밤 스튜디오 메모',
            'thumbnailUrl', '/demo-assets/chimchakman-landscape.jpg',
            'viewCount', 780000,
            'publishedAt', '2025-02-14T08:00:00Z'
        )
    )
)
WHERE id = 3;
