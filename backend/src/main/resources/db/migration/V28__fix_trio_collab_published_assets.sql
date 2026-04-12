UPDATE fan_project
SET edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_version_id IN (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
    )
  AND edition_version_id <> (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    );

UPDATE personalization_schema
SET label = '포토북에 적힐 팬 닉네임'
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
SET label = '이 콜라보를 처음 저장해 둔 날짜'
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
SET label = '가장 오래 남은 콜라보 장면'
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
SET label = '책 마지막에 남길 한 문장'
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
SET label = '포토북에 함께 넣을 추억 이미지'
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    )
  AND field_key = 'uploadedImageUrl';

DELETE FROM curated_asset
WHERE edition_version_id = (
        SELECT id
        FROM edition_version
        WHERE edition_id = 1
          AND approved_at IS NOT NULL
        ORDER BY version_number DESC, id DESC
        LIMIT 1
    );

INSERT INTO curated_asset (edition_version_id, asset_type, title, content, sort_order)
SELECT trio.id, 'IMAGE', '골든아워 트리오 오프닝', '/demo-assets/collab-trio-sunset.png', 1
FROM (
    SELECT id
    FROM edition_version
    WHERE edition_id = 1
      AND approved_at IS NOT NULL
    ORDER BY version_number DESC, id DESC
    LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'MESSAGE', '콜라보 에디션 노트', '세 명의 크리에이터가 서로 다른 결의 장면을 한 권의 시퀀스로 맞물리게 구성한 스페셜 콜라보 에디션입니다. 책장을 넘길수록 여행의 바깥 풍경, 도시의 속도, 밤의 온도가 차례로 이어지도록 설계했습니다.', 2 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 아카이브 포트레이트', '/demo-assets/astra-vale-avatar.png', 3 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 커버 포트레이트', '/demo-assets/astra-vale-cover.png', 4 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '사막 협곡의 첫 장면', '/demo-assets/astra-vale-story-1.png', 5 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '차창 밖 황금빛 사막', '/demo-assets/astra-vale-story-2.png', 6 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '노트에 적어둔 야간열차 메모', '/demo-assets/astra-vale-story-3.png', 7 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '플랫폼에 남겨둔 기록', '/demo-assets/astra-vale-story-4.png', 8 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 배너 씬', '/demo-assets/astra-vale-banner.png', 9 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'MESSAGE', 'Astra Vale 챕터', 'Astra Vale 파트는 먼 풍경을 건너는 감정의 속도를 기록합니다. 사막의 색과 차창의 빛, 플랫폼에 멈춘 짧은 숨을 포토 다이어리처럼 이어 붙였습니다.', 10 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 아카이브 포트레이트', '/demo-assets/mina-loop-avatar.png', 11 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 커버 컷', '/demo-assets/mina-loop-cover.png', 12 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '언덕 위 첫 드라이브', '/demo-assets/mina-loop-story-1.png', 13 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '차창에 기대 웃던 오후', '/demo-assets/mina-loop-story-2.png', 14 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '해질녘 차 옆의 인사', '/demo-assets/mina-loop-story-3.png', 15 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '도시를 가로지르는 로드트립 배너', '/demo-assets/mina-loop-banner.png', 16 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'MESSAGE', 'Mina Loop 챕터', 'Mina Loop 파트는 이동의 리듬과 웃음이 남기는 공기를 담아냅니다. 포토북 안에서 속도감이 필요한 중반부를 맡아, 한 권이 너무 정적이지 않게 흐름을 열어줍니다.', 17 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 아카이브 포트레이트', '/demo-assets/noah-reed-avatar.png', 18 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 커버 컷', '/demo-assets/noah-reed-cover.png', 19 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '스튜디오 첫 인사', '/demo-assets/noah-reed-story-1.png', 20 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '대화가 길어지는 밤', '/demo-assets/noah-reed-story-2.png', 21 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '미소가 먼저 풀리는 순간', '/demo-assets/noah-reed-story-3.png', 22 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'IMAGE', '창가에 남겨둔 하루의 끝', '/demo-assets/noah-reed-banner.png', 23 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'MESSAGE', 'Noah Reed 챕터', 'Noah Reed 파트는 말보다 분위기가 오래 남는 밤의 정서를 맡습니다. 후반부에서 호흡을 낮추고, 팬의 문장이 자연스럽게 마지막 챕터로 넘어가도록 조용한 결을 만들어줍니다.', 24 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio
UNION ALL
SELECT trio.id, 'MESSAGE', '트리오 에필로그', '세 사람의 장면을 한 권으로 묶는 마지막 메모입니다. 여행의 밝은 공기, 이동의 리듬, 밤의 정적이 팬의 한 문장과 만나 실제 포토북처럼 긴 여운으로 남도록 볼륨을 채웠습니다.', 25 FROM (
    SELECT id FROM edition_version WHERE edition_id = 1 AND approved_at IS NOT NULL ORDER BY version_number DESC, id DESC LIMIT 1
) trio;
