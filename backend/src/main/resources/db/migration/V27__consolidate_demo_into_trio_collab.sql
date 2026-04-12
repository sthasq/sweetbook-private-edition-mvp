UPDATE app_user
SET display_name = 'Astra Vale · Mina Loop · Noah Reed'
WHERE email = 'creator@playpick.local';

UPDATE creator_profile
SET
    display_name = 'Astra Vale · Mina Loop · Noah Reed',
    channel_handle = '@playpicktrio',
    avatar_url = '/demo-assets/collab-trio-sunset.png',
    verified = TRUE
WHERE id = 1;

UPDATE edition
SET
    creator_id = 1,
    title = 'Astra Vale · Mina Loop · Noah Reed Collab Archive',
    subtitle = '세 명의 크리에이터가 함께 완성한 여행·로드트립·나이트 다이어리 포토북',
    cover_image_url = '/demo-assets/collab-trio-sunset.png',
    status = 'PUBLISHED',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 1;

UPDATE edition
SET
    status = 'DRAFT',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id IN (2, 3);

UPDATE edition_version
SET
    sweetbook_cover_template_uid = '4MY2fokVjkeY',
    sweetbook_publish_template_uid = '75vMl9IeyPMI',
    sweetbook_content_template_uid = '3FhSEhJ94c0T',
    official_intro = JSON_OBJECT(
        'title', '세 개의 무드가 한 권의 북으로 포개진 순간',
        'message', 'Astra Vale의 여행 기록, Mina Loop의 로드트립 공기, Noah Reed의 조용한 야간 스튜디오를 한 권의 콜라보 포토북으로 엮었어요. 이번 에디션은 세 사람이 직접 골라둔 장면 위에 팬의 문장을 덧입혀, 실제 아카이브 북처럼 두께감 있게 넘기도록 구성했습니다.'
    ),
    official_closing = JSON_OBJECT(
        'title', '이 장면들은 책장을 덮은 뒤에도 오래 남아 있을 거예요',
        'message', '낯선 도로와 저녁의 도시, 조용한 밤의 시선까지 한 권 안에 겹쳐 담아두었습니다. 마지막 페이지를 넘긴 뒤에도, 세 사람이 같이 남긴 온도와 당신이 더한 문장이 한동안 곁에 머물기를 바랍니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 1
  AND approved_at IS NOT NULL;

DELETE FROM curated_asset
WHERE edition_version_id = 1;

INSERT INTO curated_asset (edition_version_id, asset_type, title, content, sort_order)
VALUES
    (1, 'IMAGE', '골든아워 트리오 오프닝', '/demo-assets/collab-trio-sunset.png', 1),
    (1, 'MESSAGE', '콜라보 에디션 노트', '세 명의 크리에이터가 서로 다른 결의 장면을 한 권의 시퀀스로 맞물리게 구성한 스페셜 콜라보 에디션입니다. 책장을 넘길수록 여행의 바깥 풍경, 도시의 속도, 밤의 온도가 차례로 이어지도록 설계했습니다.', 2),
    (1, 'IMAGE', 'Astra Vale 커버 포트레이트', '/demo-assets/astra-vale-cover.png', 3),
    (1, 'IMAGE', '사막 협곡의 첫 장면', '/demo-assets/astra-vale-story-1.png', 4),
    (1, 'IMAGE', '차창 밖 황금빛 사막', '/demo-assets/astra-vale-story-2.png', 5),
    (1, 'IMAGE', '노트에 적어둔 야간열차 메모', '/demo-assets/astra-vale-story-3.png', 6),
    (1, 'IMAGE', '플랫폼에 남겨둔 기록', '/demo-assets/astra-vale-story-4.png', 7),
    (1, 'IMAGE', 'Astra Vale 배너 씬', '/demo-assets/astra-vale-banner.png', 8),
    (1, 'MESSAGE', 'Astra Vale 챕터', 'Astra Vale 파트는 먼 풍경을 건너는 감정의 속도를 기록합니다. 사막의 색과 차창의 빛, 플랫폼에 멈춘 짧은 숨을 포토 다이어리처럼 이어 붙였습니다.', 9),
    (1, 'IMAGE', 'Mina Loop 커버 컷', '/demo-assets/mina-loop-cover.png', 10),
    (1, 'IMAGE', '언덕 위 첫 드라이브', '/demo-assets/mina-loop-story-1.png', 11),
    (1, 'IMAGE', '차창에 기대 웃던 오후', '/demo-assets/mina-loop-story-2.png', 12),
    (1, 'IMAGE', '해질녘 차 옆의 인사', '/demo-assets/mina-loop-story-3.png', 13),
    (1, 'IMAGE', '도시를 가로지르는 로드트립 배너', '/demo-assets/mina-loop-banner.png', 14),
    (1, 'MESSAGE', 'Mina Loop 챕터', 'Mina Loop 파트는 이동의 리듬과 웃음이 남기는 공기를 담아냅니다. 포토북 안에서 속도감이 필요한 중반부를 맡아, 한 권이 너무 정적이지 않게 흐름을 열어줍니다.', 15),
    (1, 'IMAGE', 'Noah Reed 커버 컷', '/demo-assets/noah-reed-cover.png', 16),
    (1, 'IMAGE', '스튜디오 첫 인사', '/demo-assets/noah-reed-story-1.png', 17),
    (1, 'IMAGE', '대화가 길어지는 밤', '/demo-assets/noah-reed-story-2.png', 18),
    (1, 'IMAGE', '미소가 먼저 풀리는 순간', '/demo-assets/noah-reed-story-3.png', 19),
    (1, 'IMAGE', '창가에 남겨둔 하루의 끝', '/demo-assets/noah-reed-banner.png', 20),
    (1, 'MESSAGE', 'Noah Reed 챕터', 'Noah Reed 파트는 말보다 분위기가 오래 남는 밤의 정서를 맡습니다. 후반부에서 호흡을 낮추고, 팬의 문장이 자연스럽게 마지막 챕터로 넘어가도록 조용한 결을 만들어줍니다.', 21);

UPDATE personalization_schema
SET label = '포토북에 적힐 팬 닉네임'
WHERE edition_version_id = 1
  AND field_key = 'fanNickname';

UPDATE personalization_schema
SET label = '이 콜라보에서 처음 마음을 빼앗긴 날짜'
WHERE edition_version_id = 1
  AND field_key = 'subscribedSince';

UPDATE personalization_schema
SET label = '가장 오래 남은 콜라보 장면'
WHERE edition_version_id = 1
  AND field_key = 'favoriteVideoId';

UPDATE personalization_schema
SET label = '책 마지막에 남길 한 문장'
WHERE edition_version_id = 1
  AND field_key = 'fanNote';

UPDATE personalization_schema
SET label = '포토북에 함께 넣을 추억 이미지'
WHERE edition_version_id = 1
  AND field_key = 'uploadedImageUrl';

UPDATE fan_project
SET edition_version_id = 1
WHERE edition_version_id IN (2, 3);

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
            JSON_OBJECT('videoId', 'collab-demo-1', 'title', '세 사람이 한 프레임에 들어온 골든아워 오프닝', 'thumbnailUrl', '/demo-assets/collab-trio-sunset.png', 'viewCount', 1450000, 'publishedAt', '2025-09-01T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-2', 'title', 'Astra Vale의 사막 협곡 포토 다이어리', 'thumbnailUrl', '/demo-assets/astra-vale-story-1.png', 'viewCount', 980000, 'publishedAt', '2025-09-04T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-3', 'title', 'Mina Loop의 시티 드라이브 컷', 'thumbnailUrl', '/demo-assets/mina-loop-story-2.png', 'viewCount', 910000, 'publishedAt', '2025-09-09T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-4', 'title', 'Noah Reed의 스튜디오 나이트 노트', 'thumbnailUrl', '/demo-assets/noah-reed-story-2.png', 'viewCount', 870000, 'publishedAt', '2025-09-14T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-5', 'title', '플랫폼에서 다시 맞춘 세 사람의 시선', 'thumbnailUrl', '/demo-assets/astra-vale-story-4.png', 'viewCount', 790000, 'publishedAt', '2025-09-20T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-6', 'title', '해질녘 도시 위에 겹친 로드트립 무드', 'thumbnailUrl', '/demo-assets/mina-loop-banner.png', 'viewCount', 730000, 'publishedAt', '2025-09-24T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-7', 'title', '창가에 남겨둔 밤의 끝 인사', 'thumbnailUrl', '/demo-assets/noah-reed-banner.png', 'viewCount', 710000, 'publishedAt', '2025-09-28T00:00:00Z')
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
            JSON_OBJECT('videoId', 'collab-demo-1', 'title', '세 사람이 한 프레임에 들어온 골든아워 오프닝', 'thumbnailUrl', '/demo-assets/collab-trio-sunset.png', 'viewCount', 1450000, 'publishedAt', '2025-09-01T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-2', 'title', 'Astra Vale의 사막 협곡 포토 다이어리', 'thumbnailUrl', '/demo-assets/astra-vale-story-1.png', 'viewCount', 980000, 'publishedAt', '2025-09-04T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-3', 'title', 'Mina Loop의 시티 드라이브 컷', 'thumbnailUrl', '/demo-assets/mina-loop-story-2.png', 'viewCount', 910000, 'publishedAt', '2025-09-09T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-4', 'title', 'Noah Reed의 스튜디오 나이트 노트', 'thumbnailUrl', '/demo-assets/noah-reed-story-2.png', 'viewCount', 870000, 'publishedAt', '2025-09-14T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-5', 'title', '플랫폼에서 다시 맞춘 세 사람의 시선', 'thumbnailUrl', '/demo-assets/astra-vale-story-4.png', 'viewCount', 790000, 'publishedAt', '2025-09-20T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-6', 'title', '해질녘 도시 위에 겹친 로드트립 무드', 'thumbnailUrl', '/demo-assets/mina-loop-banner.png', 'viewCount', 730000, 'publishedAt', '2025-09-24T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-7', 'title', '창가에 남겨둔 밤의 끝 인사', 'thumbnailUrl', '/demo-assets/noah-reed-banner.png', 'viewCount', 710000, 'publishedAt', '2025-09-28T00:00:00Z')
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
            JSON_OBJECT('videoId', 'collab-demo-1', 'title', '세 사람이 한 프레임에 들어온 골든아워 오프닝', 'thumbnailUrl', '/demo-assets/collab-trio-sunset.png', 'viewCount', 1450000, 'publishedAt', '2025-09-01T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-2', 'title', 'Astra Vale의 사막 협곡 포토 다이어리', 'thumbnailUrl', '/demo-assets/astra-vale-story-1.png', 'viewCount', 980000, 'publishedAt', '2025-09-04T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-3', 'title', 'Mina Loop의 시티 드라이브 컷', 'thumbnailUrl', '/demo-assets/mina-loop-story-2.png', 'viewCount', 910000, 'publishedAt', '2025-09-09T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-4', 'title', 'Noah Reed의 스튜디오 나이트 노트', 'thumbnailUrl', '/demo-assets/noah-reed-story-2.png', 'viewCount', 870000, 'publishedAt', '2025-09-14T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-5', 'title', '플랫폼에서 다시 맞춘 세 사람의 시선', 'thumbnailUrl', '/demo-assets/astra-vale-story-4.png', 'viewCount', 790000, 'publishedAt', '2025-09-20T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-6', 'title', '해질녘 도시 위에 겹친 로드트립 무드', 'thumbnailUrl', '/demo-assets/mina-loop-banner.png', 'viewCount', 730000, 'publishedAt', '2025-09-24T00:00:00Z'),
            JSON_OBJECT('videoId', 'collab-demo-7', 'title', '창가에 남겨둔 밤의 끝 인사', 'thumbnailUrl', '/demo-assets/noah-reed-banner.png', 'viewCount', 710000, 'publishedAt', '2025-09-28T00:00:00Z')
        )
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 3;
