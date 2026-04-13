UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '세 개의 무드가 한 권의 북으로 포개진 순간',
        'message', 'Astra Vale의 여행 기록, Mina Loop의 로드트립 공기, Noah Reed의 조용한 야간 스튜디오. 각자의 시선으로 담아낸 세 가지 조각을 모아 하나의 완전한 이야기로 엮었습니다. 우리가 직접 고른 장면들 사이에 여러분만의 소중한 문장을 더해, 세상에 단 하나뿐인 특별한 아카이브 북을 완성해 보세요.'
    ),
    official_closing = JSON_OBJECT(
        'title', '이 장면들은 책장을 덮은 뒤에도 오래 남아 있을 거예요',
        'message', '낯선 도로와 저녁의 도시, 조용한 밤의 시선까지 한 권 안에 겹쳐 담아두었습니다. 마지막 페이지를 넘긴 뒤에도, 우리가 함께 나눈 온도와 여러분이 더해준 따뜻한 문장이 한동안 곁에 머물기를 바랍니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 1
  AND approved_at IS NOT NULL;

UPDATE curated_asset
SET title = '트리오 아카이브 노트', content = '여행의 거친 바람, 시티 드라이브의 속도감, 그리고 조용한 밤의 스튜디오. 전혀 다른 색채를 가진 세 사람이 만나 하나의 이야기를 썼습니다. 각자의 채널에서 나누지 못한 진짜 우리들의 시선과 공기를 여러분만의 문장으로 함께 채워주세요.'
WHERE edition_version_id = 1 AND sort_order = 2;

UPDATE curated_asset
SET title = 'Chapter 1: 끝없는 사막 위를 달리는 심장 소리 (Astra Vale)', content = '창밖으로 끝없이 밀려오는 붉은 협곡과 먼지 냄새. 때로는 멈춰서야만 보이는 것들이 있습니다. Astra가 직접 필름 카메라로 담아온, 가장 뜨겁고도 정직했던 사막에서의 날들을 첫 페이지에 꽂아둡니다.'
WHERE edition_version_id = 1 AND sort_order = 9;

UPDATE curated_asset
SET title = 'Chapter 2: 해가 질 무렵, 볼륨을 높여볼까요? (Mina Loop)', content = '도로 위를 가로지를 때 우리는 아무 말 없이도 웃고 있었습니다. 창문 틈으로 들어온 미적지근한 노을 바람, 목적지 없이 달려도 즐거웠던 짧은 로드트립의 시퀀스. 너무 무겁지 않게, 딱 드라이브 템포로 남겼습니다.'
WHERE edition_version_id = 1 AND sort_order = 15;

UPDATE curated_asset
SET title = 'Chapter 3: 밤은 길고 할 이야기는 아직 많아요 (Noah Reed)', content = '앞선 챕터들의 속도를 조금 늦추고, 아늑한 조명 아래서 오늘 하루를 정리할 시간이에요. 카메라가 꺼진 뒤에야 어색하게 짓던 웃음, 가장 편안한 상태의 나이트 노트. 이 마지막 챕터 사이에 여러분이 전하고 싶었던 문장을 살짝 접어두세요.'
WHERE edition_version_id = 1 AND sort_order = 21;

UPDATE fan_project
SET
    personalization_data = JSON_OBJECT(
        'mode', 'demo',
        'fanNickname', '연두',
        'subscribedSince', '2023-07-14',
        'daysTogether', 1002,
        'favoriteVideoId', 'collab-demo-3',
        'fanNote', '세 사람이 한 권 안에서 다른 표정을 보여주는 구성이 정말 좋았어요. 특히 Mina Loop의 오후 장면으로 넘어갈 때 공기가 확 바뀌는 느낌이 좋아서, 제 문장도 그 페이지들 사이에 같이 남기고 싶었습니다.',
        'uploadedImageUrl', '/demo-assets/collab-trio-sunset.png',
        'channel', JSON_OBJECT(
            'channelId', 'VC_TRINITY_ARCHIVE',
            'title', 'Astra Vale · Mina Loop · Noah Reed',
            'subscriberCount', '7700000',
            'thumbnailUrl', '/demo-assets/collab-trio-sunset.png',
            'bannerUrl', '/demo-assets/collab-trio-sunset.png',
            'handle', '@playpicktrio'
        ),
        'topVideos', JSON_ARRAY(
            JSON_OBJECT('videoId', 'collab-demo-1', 'title', '[Vlog] 드디어 셋이 모였다! LA 사막 한가운데서 맞이한 골든아워 ✨', 'thumbnailUrl', '/demo-assets/collab-trio-sunset.png', 'viewCount', 1450000, 'publishedAt', '2025-09-01T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-2', 'title', '끝없는 모래바람 🏜️ 붉은 협곡에서 건진 인생샷 대방출 (feat. Astra Vale)', 'thumbnailUrl', '/demo-assets/astra-vale-story-1.png', 'viewCount', 980000, 'publishedAt', '2025-09-04T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-3', 'title', '도심을 가르는 시티 드라이브 🌃 밤공기 맞으며 찍은 미친 야경 (by Mina Loop)', 'thumbnailUrl', '/demo-assets/mina-loop-story-2.png', 'viewCount', 910000, 'publishedAt', '2025-09-09T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-4', 'title', '[Playlist] 감성 찢었다.. 🎧 조용한 스튜디오의 밤하늘을 닮은 나이트 노트 (with Noah Reed)', 'thumbnailUrl', '/demo-assets/noah-reed-story-2.png', 'viewCount', 870000, 'publishedAt', '2025-09-14T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-5', 'title', '아무 장비 없이 무작정 떠나본 플랫폼 🚉 셋이서 번갈아 담아본 서로의 시선', 'thumbnailUrl', '/demo-assets/astra-vale-story-4.png', 'viewCount', 790000, 'publishedAt', '2025-09-20T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-6', 'title', '노을 지는 해안도로 로드트립 🚙 바람 소리까지 완벽했던 힐링 모먼트', 'thumbnailUrl', '/demo-assets/mina-loop-banner.png', 'viewCount', 730000, 'publishedAt', '2025-09-24T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-7', 'title', '이제는 우리가 헤어져야 할 시간 🌙 창가 너머로 남겨둔 아쉬운 밤의 끝인사', 'thumbnailUrl', '/demo-assets/noah-reed-banner.png', 'viewCount', 710000, 'publishedAt', '2025-09-28T00:00:00Z')
        )
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 1;

UPDATE fan_project
SET
    personalization_data = JSON_OBJECT(
        'mode', 'demo',
        'fanNickname', '소연',
        'subscribedSince', '2024-01-05',
        'daysTogether', 828,
        'favoriteVideoId', 'collab-demo-1',
        'fanNote', '첫 장의 셀피처럼 가까운 공기가 이 에디션 전체를 붙잡아주는 느낌이 좋아요. 세 사람이 같이 웃는 표정이 이 북의 표지처럼 느껴져서, 제 기억도 그 장면부터 시작되면 좋겠습니다.',
        'uploadedImageUrl', '/demo-assets/mina-loop-story-3.png',
        'channel', JSON_OBJECT(
            'channelId', 'VC_TRINITY_ARCHIVE',
            'title', 'Astra Vale · Mina Loop · Noah Reed',
            'subscriberCount', '7700000',
            'thumbnailUrl', '/demo-assets/collab-trio-sunset.png',
            'bannerUrl', '/demo-assets/collab-trio-sunset.png',
            'handle', '@playpicktrio'
        ),
        'topVideos', JSON_ARRAY(
            JSON_OBJECT('videoId', 'collab-demo-1', 'title', '[Vlog] 드디어 셋이 모였다! LA 사막 한가운데서 맞이한 골든아워 ✨', 'thumbnailUrl', '/demo-assets/collab-trio-sunset.png', 'viewCount', 1450000, 'publishedAt', '2025-09-01T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-2', 'title', '끝없는 모래바람 🏜️ 붉은 협곡에서 건진 인생샷 대방출 (feat. Astra Vale)', 'thumbnailUrl', '/demo-assets/astra-vale-story-1.png', 'viewCount', 980000, 'publishedAt', '2025-09-04T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-3', 'title', '도심을 가르는 시티 드라이브 🌃 밤공기 맞으며 찍은 미친 야경 (by Mina Loop)', 'thumbnailUrl', '/demo-assets/mina-loop-story-2.png', 'viewCount', 910000, 'publishedAt', '2025-09-09T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-4', 'title', '[Playlist] 감성 찢었다.. 🎧 조용한 스튜디오의 밤하늘을 닮은 나이트 노트 (with Noah Reed)', 'thumbnailUrl', '/demo-assets/noah-reed-story-2.png', 'viewCount', 870000, 'publishedAt', '2025-09-14T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-5', 'title', '아무 장비 없이 무작정 떠나본 플랫폼 🚉 셋이서 번갈아 담아본 서로의 시선', 'thumbnailUrl', '/demo-assets/astra-vale-story-4.png', 'viewCount', 790000, 'publishedAt', '2025-09-20T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-6', 'title', '노을 지는 해안도로 로드트립 🚙 바람 소리까지 완벽했던 힐링 모먼트', 'thumbnailUrl', '/demo-assets/mina-loop-banner.png', 'viewCount', 730000, 'publishedAt', '2025-09-24T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-7', 'title', '이제는 우리가 헤어져야 할 시간 🌙 창가 너머로 남겨둔 아쉬운 밤의 끝인사', 'thumbnailUrl', '/demo-assets/noah-reed-banner.png', 'viewCount', 710000, 'publishedAt', '2025-09-28T00:00:00Z')
        )
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 2;

UPDATE fan_project
SET
    personalization_data = JSON_OBJECT(
        'mode', 'demo',
        'fanNickname', '주은',
        'subscribedSince', '2024-02-11',
        'daysTogether', 791,
        'favoriteVideoId', 'collab-demo-4',
        'fanNote', 'Noah Reed 파트로 넘어가는 순간 책의 호흡이 조용히 가라앉는 게 정말 좋았어요. 앞쪽의 밝은 무드와 뒤쪽의 밤 장면이 한 권 안에서 균형을 맞추는 느낌이라, 이 에디션을 실제 포토북처럼 오래 넘겨보고 싶었습니다.',
        'uploadedImageUrl', '/demo-assets/noah-reed-story-3.png',
        'channel', JSON_OBJECT(
            'channelId', 'VC_TRINITY_ARCHIVE',
            'title', 'Astra Vale · Mina Loop · Noah Reed',
            'subscriberCount', '7700000',
            'thumbnailUrl', '/demo-assets/collab-trio-sunset.png',
            'bannerUrl', '/demo-assets/collab-trio-sunset.png',
            'handle', '@playpicktrio'
        ),
        'topVideos', JSON_ARRAY(
            JSON_OBJECT('videoId', 'collab-demo-1', 'title', '[Vlog] 드디어 셋이 모였다! LA 사막 한가운데서 맞이한 골든아워 ✨', 'thumbnailUrl', '/demo-assets/collab-trio-sunset.png', 'viewCount', 1450000, 'publishedAt', '2025-09-01T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-2', 'title', '끝없는 모래바람 🏜️ 붉은 협곡에서 건진 인생샷 대방출 (feat. Astra Vale)', 'thumbnailUrl', '/demo-assets/astra-vale-story-1.png', 'viewCount', 980000, 'publishedAt', '2025-09-04T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-3', 'title', '도심을 가르는 시티 드라이브 🌃 밤공기 맞으며 찍은 미친 야경 (by Mina Loop)', 'thumbnailUrl', '/demo-assets/mina-loop-story-2.png', 'viewCount', 910000, 'publishedAt', '2025-09-09T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-4', 'title', '[Playlist] 감성 찢었다.. 🎧 조용한 스튜디오의 밤하늘을 닮은 나이트 노트 (with Noah Reed)', 'thumbnailUrl', '/demo-assets/noah-reed-story-2.png', 'viewCount', 870000, 'publishedAt', '2025-09-14T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-5', 'title', '아무 장비 없이 무작정 떠나본 플랫폼 🚉 셋이서 번갈아 담아본 서로의 시선', 'thumbnailUrl', '/demo-assets/astra-vale-story-4.png', 'viewCount', 790000, 'publishedAt', '2025-09-20T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-6', 'title', '노을 지는 해안도로 로드트립 🚙 바람 소리까지 완벽했던 힐링 모먼트', 'thumbnailUrl', '/demo-assets/mina-loop-banner.png', 'viewCount', 730000, 'publishedAt', '2025-09-24T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-7', 'title', '이제는 우리가 헤어져야 할 시간 🌙 창가 너머로 남겨둔 아쉬운 밤의 끝인사', 'thumbnailUrl', '/demo-assets/noah-reed-banner.png', 'viewCount', 710000, 'publishedAt', '2025-09-28T00:00:00Z')
        )
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 3;
