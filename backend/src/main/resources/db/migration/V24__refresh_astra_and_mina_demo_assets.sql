UPDATE creator_profile
SET avatar_url = '/demo-assets/astra-vale-avatar.png'
WHERE id = 1;

UPDATE creator_profile
SET avatar_url = '/demo-assets/mina-loop-avatar.png'
WHERE id = 2;

UPDATE edition
SET cover_image_url = '/demo-assets/astra-vale-cover.png'
WHERE id = 1;

UPDATE edition
SET cover_image_url = '/demo-assets/mina-loop-cover.png'
WHERE id = 2;

DELETE FROM curated_asset
WHERE edition_version_id IN (1, 2);

INSERT INTO curated_asset (edition_version_id, asset_type, title, content, sort_order)
VALUES
    (1, 'IMAGE', '사막 협곡의 초상', '/demo-assets/astra-vale-story-1.png', 1),
    (1, 'IMAGE', '차창 밖 황금빛 사막', '/demo-assets/astra-vale-story-2.png', 2),
    (1, 'IMAGE', '노트에 적어둔 밤의 메모', '/demo-assets/astra-vale-story-3.png', 3),
    (1, 'IMAGE', '플랫폼에 남겨둔 기록', '/demo-assets/astra-vale-story-4.png', 4),
    (1, 'MESSAGE', '트래블 다이어리 메모', '사막과 열차, 짧은 정차의 공기까지 한 장씩 엮어 천천히 꺼내 보는 Astra Vale 메모리북 데모입니다.', 5),
    (2, 'IMAGE', '언덕 위 첫 드라이브', '/demo-assets/mina-loop-story-1.png', 1),
    (2, 'IMAGE', '차창에 기대 웃던 오후', '/demo-assets/mina-loop-story-2.png', 2),
    (2, 'IMAGE', '해질녘 차 옆의 인사', '/demo-assets/mina-loop-story-3.png', 3),
    (2, 'IMAGE', '도시를 가로지르는 로드트립', '/demo-assets/mina-loop-banner.png', 4),
    (2, 'MESSAGE', '로드트립 메모', 'Mina Loop의 가벼운 미소와 도시 외곽의 저녁빛을 따라, 팬의 편지 같은 문장을 함께 싣는 팬레터북 데모입니다.', 5);

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '연두',
    'subscribedSince', '2023-07-14T00:00:00Z',
    'daysTogether', 1002,
    'uploadedImageUrl', '/demo-assets/astra-vale-story-3.png',
    'favoriteVideoId', 'astra-demo-3',
    'fanNote', '열차 안에서 조용히 노트를 적어 내려가던 장면이 오래 남았어요. 낯선 풍경보다 그때의 마음이 더 선명해서 이번 책에도 꼭 담고 싶었습니다.',
    'channel', JSON_OBJECT(
        'channelId', 'VC_ASTRA_VALE',
        'title', 'Astra Vale',
        'subscriberCount', '2500000',
        'thumbnailUrl', '/demo-assets/astra-vale-avatar.png',
        'bannerUrl', '/demo-assets/astra-vale-banner.png',
        'handle', '@astravale'
    ),
    'topVideos', JSON_ARRAY(
        JSON_OBJECT(
            'videoId', 'astra-demo-1',
            'title', '사막 협곡에서 꺼낸 첫 문장',
            'thumbnailUrl', '/demo-assets/astra-vale-story-1.png',
            'viewCount', 640000,
            'publishedAt', '2024-04-18T09:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'astra-demo-2',
            'title', '차창 밖으로 흘러가던 황금빛 사막',
            'thumbnailUrl', '/demo-assets/astra-vale-story-2.png',
            'viewCount', 580000,
            'publishedAt', '2024-10-03T10:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'astra-demo-3',
            'title', '노트에 적어둔 야간열차 메모',
            'thumbnailUrl', '/demo-assets/astra-vale-story-3.png',
            'viewCount', 420000,
            'publishedAt', '2025-01-12T07:30:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'astra-demo-4',
            'title', '플랫폼에서 다시 고쳐 든 여행 노트',
            'thumbnailUrl', '/demo-assets/astra-vale-story-4.png',
            'viewCount', 350000,
            'publishedAt', '2025-02-09T12:10:00Z'
        )
    )
)
WHERE id = 1;

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
    'mode', 'demo',
    'fanNickname', '소연',
    'favoriteMemory', '언덕 위에서 차에 기대 웃고 있던 장면이 가장 오래 남았어요. 가볍고 자유로운 공기 때문에 저까지 여행을 시작하는 기분이 들었거든요.',
    'fanMessage', '조금은 장난스럽고 조금은 다정한 로드트립 무드를 좋아해요. 해 질 무렵 도시를 내려다보며 웃던 순간처럼, 오래 꺼내 보고 싶은 기분을 한 권으로 남기고 싶습니다.',
    'channel', JSON_OBJECT(
        'channelId', 'VC_MINA_LOOP',
        'title', 'Mina Loop',
        'subscriberCount', '2100000',
        'thumbnailUrl', '/demo-assets/mina-loop-avatar.png',
        'bannerUrl', '/demo-assets/mina-loop-banner.png',
        'handle', '@minaloop'
    ),
    'topVideos', JSON_ARRAY(
        JSON_OBJECT(
            'videoId', 'mina-demo-1',
            'title', '언덕 위에서 시작한 시티 드라이브',
            'thumbnailUrl', '/demo-assets/mina-loop-cover.png',
            'viewCount', 540000,
            'publishedAt', '2024-05-14T09:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'mina-demo-2',
            'title', '차창에 기대 웃던 오후',
            'thumbnailUrl', '/demo-assets/mina-loop-story-2.png',
            'viewCount', 490000,
            'publishedAt', '2024-09-22T11:00:00Z'
        ),
        JSON_OBJECT(
            'videoId', 'mina-demo-3',
            'title', '해질녘 도시를 마주한 한 컷',
            'thumbnailUrl', '/demo-assets/mina-loop-story-3.png',
            'viewCount', 430000,
            'publishedAt', '2025-01-17T08:30:00Z'
        )
    )
)
WHERE id = 2;
