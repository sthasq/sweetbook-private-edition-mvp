UPDATE edition
SET subtitle = '세 크리에이터의 여행, 드라이브, 나이트 토크를 한 권에 엮은 콜라보 포토북 에디션',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 1;

UPDATE edition_version
SET official_intro = JSON_OBJECT(
        'title', '세 개의 시선이 한 권으로 만나는 순간',
        'message', 'Astra Vale의 먼 풍경, Mina Loop의 경쾌한 이동감, Noah Reed의 조용한 밤의 대화. 서로 다른 결의 장면들을 한 권의 아카이브 북으로 엮었습니다. 챕터와 챕터 사이에는 팬이 오래 붙잡아 둔 문장과 기억이 자연스럽게 스며들도록 설계해, 넘길수록 더 개인적인 책이 되도록 만들었습니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '마지막 장을 덮고도 오래 남는 온도',
        'message', '해질녘 도로의 바람, 도시를 스치는 불빛, 조용한 스튜디오의 숨이 한 권 안에 차례로 머뭅니다. 당신이 더한 한 문장까지 함께 남아, 이 에디션이 한 번 보고 끝나는 굿즈가 아니라 오래 꺼내 보게 되는 작은 기록이 되기를 바랍니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 1
  AND approved_at IS NOT NULL;

UPDATE personalization_schema
SET label = '책에 적힐 이름 또는 닉네임'
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    )
  AND field_key = 'fanNickname';

UPDATE personalization_schema
SET label = '이 에디션을 기억하게 된 날짜'
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    )
  AND field_key = 'subscribedSince';

UPDATE personalization_schema
SET label = '책의 중심에 둘 장면'
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    )
  AND field_key = 'favoriteVideoId';

UPDATE personalization_schema
SET label = '마지막 페이지에 남길 문장'
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    )
  AND field_key = 'fanNote';

UPDATE personalization_schema
SET label = '함께 넣고 싶은 사진 한 장'
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    )
  AND field_key = 'uploadedImageUrl';

UPDATE curated_asset
SET title = '에디터스 노트',
    content = '서로 다른 셋의 무드가 한 권 안에서 자연스럽게 이어지도록 구성한 콜라보 에디션입니다. 시작은 넓은 풍경으로, 중간은 이동의 리듬으로, 마지막은 조용한 밤의 여운으로 닫히도록 설계해 실제 아카이브 북처럼 읽히게 했습니다.'
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    )
  AND sort_order = 2;

UPDATE curated_asset
SET title = 'Chapter 1. 먼 풍경이 먼저 말을 거는 장면',
    content = 'Astra Vale 챕터는 긴 이동 끝에 도착한 풍경과 짧은 정차의 감정을 기록합니다. 사막의 열기, 차창의 빛, 플랫폼에 멈춘 숨을 포토 다이어리처럼 이어 붙여 첫 장부터 깊은 여백을 남기도록 구성했습니다.'
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    )
  AND sort_order = 10;

UPDATE curated_asset
SET title = 'Chapter 2. 속도를 올리면 웃음도 커지는 오후',
    content = 'Mina Loop 챕터는 포토북의 템포를 환기하는 중간 장입니다. 창문 틈으로 스치는 바람, 가볍게 터지는 웃음, 목적지보다 순간의 분위기가 먼저 남는 드라이브의 결을 담아 책 전체에 리듬을 만들어 줍니다.'
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    )
  AND sort_order = 17;

UPDATE curated_asset
SET title = 'Chapter 3. 불을 낮춘 뒤 더 선명해지는 대화',
    content = 'Noah Reed 챕터는 앞선 장면들의 속도를 천천히 낮추며 가장 긴 여운을 남깁니다. 말보다 공기와 표정이 먼저 기억되는 밤의 대화를 담아, 마지막으로 갈수록 팬의 문장이 자연스럽게 머무를 수 있는 조용한 결을 만들었습니다.'
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    )
  AND sort_order = 24;

UPDATE curated_asset
SET title = '마지막에 남는 한 줄',
    content = '세 사람의 서로 다른 온도는 팬의 문장과 만났을 때 비로소 한 권의 책처럼 완성됩니다. 이 에필로그는 장면보다 오래 남는 감정이 무엇인지, 마지막 페이지에서 조용히 붙잡아 두기 위한 여백입니다.'
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    )
  AND sort_order = 25;

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
        'mode', 'demo',
        'fanNickname', '연두',
        'subscribedSince', '2023-07-14',
        'daysTogether', 1002,
        'favoriteVideoId', 'collab-demo-3',
        'fanNote', '세 사람이 한 권 안에서 다른 표정을 보여주는 구성이 정말 좋았어요. 특히 Mina Loop의 오후 장면으로 넘어갈 때 공기가 확 바뀌는 느낌이 좋아서, 제 문장도 그 페이지들 사이에 같이 남기고 싶었습니다.',
        'uploadedImageUrl', '/demo-assets/collab-trio-sunset.png',
        'bookCopy', JSON_OBJECT(
            'relationshipTitle', '처음 이 조합을 저장해 둔 날',
            'relationshipBody', '연두님이 이 콜라보를 오래 붙잡아 둔 시간은 벌써 1002일이 되었어요. 여러 장면 사이에서도 결국 마음이 다시 돌아오는 페이지가 있다는 걸, 이 책의 시작에 조용히 남겨둘게요.',
            'momentTitle', '공기가 바뀌는 바로 그 장면',
            'momentBody', 'Mina Loop의 오후 컷으로 넘어가는 순간, 책의 속도도 표정도 함께 달라집니다. 연두님이 좋아한 그 미묘한 전환을 이번 포토북의 중심 장면으로 단단히 묶어둘게요.',
            'fanNoteTitle', '당신의 문장이 이 장면을 완성해요',
            'fanNoteBody', '세 사람이 한 권 안에서 다른 온도를 보여준다는 연두님의 감상을 마지막까지 가져가겠습니다. 페이지 사이에 남긴 그 한 문장이, 이 에디션을 가장 연두님답게 만들어 줄 거예요.'
        ),
        'channel', JSON_OBJECT(
            'channelId', 'VC_TRINITY_ARCHIVE',
            'title', 'Astra Vale · Mina Loop · Noah Reed',
            'subscriberCount', '7700000',
            'thumbnailUrl', '/demo-assets/collab-trio-sunset.png',
            'bannerUrl', '/demo-assets/collab-trio-sunset.png',
            'handle', '@playpicktrio'
        ),
        'topVideos', JSON_ARRAY(
            JSON_OBJECT('videoId', 'collab-demo-1', 'title', '세 사람이 한 프레임에 모인 골든아워 오프닝', 'thumbnailUrl', '/demo-assets/collab-trio-sunset.png', 'viewCount', 1450000, 'publishedAt', '2025-09-01T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-2', 'title', 'Astra Vale, 붉은 협곡을 건너는 오후', 'thumbnailUrl', '/demo-assets/astra-vale-story-1.png', 'viewCount', 980000, 'publishedAt', '2025-09-04T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-3', 'title', 'Mina Loop, 도시의 불빛을 따라 달린 저녁', 'thumbnailUrl', '/demo-assets/mina-loop-story-2.png', 'viewCount', 910000, 'publishedAt', '2025-09-09T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-4', 'title', 'Noah Reed, 조용한 스튜디오의 야간 메모', 'thumbnailUrl', '/demo-assets/noah-reed-story-2.png', 'viewCount', 870000, 'publishedAt', '2025-09-14T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-5', 'title', '플랫폼 끝에서 다시 맞춘 세 사람의 시선', 'thumbnailUrl', '/demo-assets/astra-vale-story-4.png', 'viewCount', 790000, 'publishedAt', '2025-09-20T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-6', 'title', '해질녘 해안도로 위 로드트립 컷', 'thumbnailUrl', '/demo-assets/mina-loop-banner.png', 'viewCount', 730000, 'publishedAt', '2025-09-24T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-7', 'title', '창가에 남겨둔 밤의 끝 인사', 'thumbnailUrl', '/demo-assets/noah-reed-banner.png', 'viewCount', 710000, 'publishedAt', '2025-09-28T00:00:00Z')
        )
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 1;

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
        'mode', 'demo',
        'fanNickname', '소연',
        'subscribedSince', '2024-01-05',
        'daysTogether', 828,
        'favoriteVideoId', 'collab-demo-1',
        'fanNote', '첫 장의 셀피처럼 가까운 공기가 이 에디션 전체를 붙잡아주는 느낌이 좋아요. 세 사람이 같이 웃는 표정이 이 북의 표지처럼 느껴져서, 제 기억도 그 장면부터 시작되면 좋겠습니다.',
        'uploadedImageUrl', '/demo-assets/mina-loop-story-3.png',
        'bookCopy', JSON_OBJECT(
            'relationshipTitle', '표지처럼 먼저 떠오르는 얼굴들',
            'relationshipBody', '소연님이 이 에디션을 떠올릴 때 가장 먼저 세 사람이 함께 웃는 장면부터 시작된다는 마음을, 책의 첫 문장으로 남겨둘게요. 가까운 공기로 시작하는 북은 펼치는 순간부터 더 오래 기억에 남으니까요.',
            'momentTitle', '처음부터 표지가 되어버린 골든아워',
            'momentBody', '한 프레임 안에 모인 표정과 빛이 이 책 전체의 인상을 정해줍니다. 소연님이 좋아한 그 친밀한 거리감을 첫 장의 무드로 가져와, 이후의 장면들도 자연스럽게 이어지도록 구성할게요.',
            'fanNoteTitle', '기억의 시작점을 여기 두었습니다',
            'fanNoteBody', '이 책이 세 사람이 같이 웃는 장면에서 시작되면 좋겠다는 소연님의 마음을 그대로 살렸어요. 표지를 넘긴 뒤에도 그 첫 공기가 계속 이어지도록, 가장 따뜻한 컷을 오래 붙잡아 두겠습니다.'
        ),
        'channel', JSON_OBJECT(
            'channelId', 'VC_TRINITY_ARCHIVE',
            'title', 'Astra Vale · Mina Loop · Noah Reed',
            'subscriberCount', '7700000',
            'thumbnailUrl', '/demo-assets/collab-trio-sunset.png',
            'bannerUrl', '/demo-assets/collab-trio-sunset.png',
            'handle', '@playpicktrio'
        ),
        'topVideos', JSON_ARRAY(
            JSON_OBJECT('videoId', 'collab-demo-1', 'title', '세 사람이 한 프레임에 모인 골든아워 오프닝', 'thumbnailUrl', '/demo-assets/collab-trio-sunset.png', 'viewCount', 1450000, 'publishedAt', '2025-09-01T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-2', 'title', 'Astra Vale, 붉은 협곡을 건너는 오후', 'thumbnailUrl', '/demo-assets/astra-vale-story-1.png', 'viewCount', 980000, 'publishedAt', '2025-09-04T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-3', 'title', 'Mina Loop, 도시의 불빛을 따라 달린 저녁', 'thumbnailUrl', '/demo-assets/mina-loop-story-2.png', 'viewCount', 910000, 'publishedAt', '2025-09-09T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-4', 'title', 'Noah Reed, 조용한 스튜디오의 야간 메모', 'thumbnailUrl', '/demo-assets/noah-reed-story-2.png', 'viewCount', 870000, 'publishedAt', '2025-09-14T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-5', 'title', '플랫폼 끝에서 다시 맞춘 세 사람의 시선', 'thumbnailUrl', '/demo-assets/astra-vale-story-4.png', 'viewCount', 790000, 'publishedAt', '2025-09-20T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-6', 'title', '해질녘 해안도로 위 로드트립 컷', 'thumbnailUrl', '/demo-assets/mina-loop-banner.png', 'viewCount', 730000, 'publishedAt', '2025-09-24T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-7', 'title', '창가에 남겨둔 밤의 끝 인사', 'thumbnailUrl', '/demo-assets/noah-reed-banner.png', 'viewCount', 710000, 'publishedAt', '2025-09-28T00:00:00Z')
        )
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 2;

UPDATE fan_project
SET personalization_data = JSON_OBJECT(
        'mode', 'demo',
        'fanNickname', '주은',
        'subscribedSince', '2024-02-11',
        'daysTogether', 791,
        'favoriteVideoId', 'collab-demo-4',
        'fanNote', 'Noah Reed 파트로 넘어가는 순간 책의 호흡이 조용히 가라앉는 게 정말 좋았어요. 앞쪽의 밝은 무드와 뒤쪽의 밤 장면이 한 권 안에서 균형을 맞추는 느낌이라, 이 에디션을 실제 포토북처럼 오래 넘겨보고 싶었습니다.',
        'uploadedImageUrl', '/demo-assets/noah-reed-story-3.png',
        'bookCopy', JSON_OBJECT(
            'relationshipTitle', '조용한 밤으로 넘어가는 시간',
            'relationshipBody', '주은님이 이 에디션에서 가장 오래 기억한 건 밝은 장면 뒤에 이어지는 조용한 호흡이었어요. 앞쪽의 활기와 뒤쪽의 밤이 균형을 이루는 순간을, 이 책의 가장 깊은 결로 남겨둘게요.',
            'momentTitle', '말보다 분위기가 먼저 남는 페이지',
            'momentBody', 'Noah Reed 챕터는 책의 속도를 천천히 낮추면서도 여운을 가장 길게 남깁니다. 주은님이 좋아한 그 잔잔한 전환이 마지막 파트 전체를 감싸도록 구성해 보겠습니다.',
            'fanNoteTitle', '오래 넘겨보고 싶은 이유',
            'fanNoteBody', '한 권 안에서 밝은 무드와 밤의 정서가 균형을 맞춘다는 주은님의 감상을 마지막 문장에 담아둘게요. 그래서 이 책은 한 번 보고 끝나는 굿즈보다, 자꾸 다시 펼치게 되는 기록에 더 가까워질 거예요.'
        ),
        'channel', JSON_OBJECT(
            'channelId', 'VC_TRINITY_ARCHIVE',
            'title', 'Astra Vale · Mina Loop · Noah Reed',
            'subscriberCount', '7700000',
            'thumbnailUrl', '/demo-assets/collab-trio-sunset.png',
            'bannerUrl', '/demo-assets/collab-trio-sunset.png',
            'handle', '@playpicktrio'
        ),
        'topVideos', JSON_ARRAY(
            JSON_OBJECT('videoId', 'collab-demo-1', 'title', '세 사람이 한 프레임에 모인 골든아워 오프닝', 'thumbnailUrl', '/demo-assets/collab-trio-sunset.png', 'viewCount', 1450000, 'publishedAt', '2025-09-01T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-2', 'title', 'Astra Vale, 붉은 협곡을 건너는 오후', 'thumbnailUrl', '/demo-assets/astra-vale-story-1.png', 'viewCount', 980000, 'publishedAt', '2025-09-04T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-3', 'title', 'Mina Loop, 도시의 불빛을 따라 달린 저녁', 'thumbnailUrl', '/demo-assets/mina-loop-story-2.png', 'viewCount', 910000, 'publishedAt', '2025-09-09T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-4', 'title', 'Noah Reed, 조용한 스튜디오의 야간 메모', 'thumbnailUrl', '/demo-assets/noah-reed-story-2.png', 'viewCount', 870000, 'publishedAt', '2025-09-14T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-5', 'title', '플랫폼 끝에서 다시 맞춘 세 사람의 시선', 'thumbnailUrl', '/demo-assets/astra-vale-story-4.png', 'viewCount', 790000, 'publishedAt', '2025-09-20T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-6', 'title', '해질녘 해안도로 위 로드트립 컷', 'thumbnailUrl', '/demo-assets/mina-loop-banner.png', 'viewCount', 730000, 'publishedAt', '2025-09-24T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-7', 'title', '창가에 남겨둔 밤의 끝 인사', 'thumbnailUrl', '/demo-assets/noah-reed-banner.png', 'viewCount', 710000, 'publishedAt', '2025-09-28T00:00:00Z')
        )
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 3;
