INSERT INTO curated_asset (edition_version_id, asset_type, title, content, sort_order)
WITH trio AS (
    SELECT id
    FROM edition_version
    WHERE edition_id = 1
      AND approved_at IS NOT NULL
    ORDER BY version_number DESC, id DESC
    LIMIT 1
)
SELECT trio.id, 'IMAGE', '골든아워 트리오 오프닝 · 디테일 크롭', '/demo-assets/generated/collab-trio-sunset-detail.jpg', 28 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', '골든아워 트리오 오프닝 · 웜 필름', '/demo-assets/generated/collab-trio-sunset-warm-film.jpg', 29 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', '골든아워 트리오 오프닝 · 매트 페이드', '/demo-assets/generated/collab-trio-sunset-matte-fade.jpg', 30 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', '골든아워 트리오 오프닝 · 모노 그레인', '/demo-assets/generated/collab-trio-sunset-mono-grain.jpg', 31 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', '실내 우정 포즈 · 디테일 크롭', '/demo-assets/generated/collab-trio-indoor-friendship-detail.jpg', 32 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', '실내 우정 포즈 · 웜 필름', '/demo-assets/generated/collab-trio-indoor-friendship-warm-film.jpg', 33 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', '실내 우정 포즈 · 매트 페이드', '/demo-assets/generated/collab-trio-indoor-friendship-matte-fade.jpg', 34 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', '실내 우정 포즈 · 모노 그레인', '/demo-assets/generated/collab-trio-indoor-friendship-mono-grain.jpg', 35 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', '저녁 대화 장면 · 디테일 크롭', '/demo-assets/generated/collab-trio-evening-conversation-detail.jpg', 36 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', '저녁 대화 장면 · 웜 필름', '/demo-assets/generated/collab-trio-evening-conversation-warm-film.jpg', 37 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', '저녁 대화 장면 · 매트 페이드', '/demo-assets/generated/collab-trio-evening-conversation-matte-fade.jpg', 38 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', '저녁 대화 장면 · 모노 그레인', '/demo-assets/generated/collab-trio-evening-conversation-mono-grain.jpg', 39 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 커버 포트레이트 · 디테일 크롭', '/demo-assets/generated/astra-vale-cover-detail.jpg', 40 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 커버 포트레이트 · 웜 필름', '/demo-assets/generated/astra-vale-cover-warm-film.jpg', 41 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 커버 포트레이트 · 매트 페이드', '/demo-assets/generated/astra-vale-cover-matte-fade.jpg', 42 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 커버 포트레이트 · 모노 그레인', '/demo-assets/generated/astra-vale-cover-mono-grain.jpg', 43 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 협곡 장면 · 디테일 크롭', '/demo-assets/generated/astra-vale-story-1-detail.jpg', 44 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 협곡 장면 · 웜 필름', '/demo-assets/generated/astra-vale-story-1-warm-film.jpg', 45 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 협곡 장면 · 매트 페이드', '/demo-assets/generated/astra-vale-story-1-matte-fade.jpg', 46 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 협곡 장면 · 모노 그레인', '/demo-assets/generated/astra-vale-story-1-mono-grain.jpg', 47 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 차창 장면 · 디테일 크롭', '/demo-assets/generated/astra-vale-story-2-detail.jpg', 48 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 차창 장면 · 웜 필름', '/demo-assets/generated/astra-vale-story-2-warm-film.jpg', 49 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 차창 장면 · 매트 페이드', '/demo-assets/generated/astra-vale-story-2-matte-fade.jpg', 50 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Astra Vale 차창 장면 · 모노 그레인', '/demo-assets/generated/astra-vale-story-2-mono-grain.jpg', 51 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 커버 컷 · 디테일 크롭', '/demo-assets/generated/mina-loop-cover-detail.jpg', 52 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 커버 컷 · 웜 필름', '/demo-assets/generated/mina-loop-cover-warm-film.jpg', 53 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 커버 컷 · 매트 페이드', '/demo-assets/generated/mina-loop-cover-matte-fade.jpg', 54 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 커버 컷 · 모노 그레인', '/demo-assets/generated/mina-loop-cover-mono-grain.jpg', 55 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 드라이브 장면 · 디테일 크롭', '/demo-assets/generated/mina-loop-story-1-detail.jpg', 56 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 드라이브 장면 · 웜 필름', '/demo-assets/generated/mina-loop-story-1-warm-film.jpg', 57 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 드라이브 장면 · 매트 페이드', '/demo-assets/generated/mina-loop-story-1-matte-fade.jpg', 58 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 드라이브 장면 · 모노 그레인', '/demo-assets/generated/mina-loop-story-1-mono-grain.jpg', 59 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 오후 컷 · 디테일 크롭', '/demo-assets/generated/mina-loop-story-2-detail.jpg', 60 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 오후 컷 · 웜 필름', '/demo-assets/generated/mina-loop-story-2-warm-film.jpg', 61 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 오후 컷 · 매트 페이드', '/demo-assets/generated/mina-loop-story-2-matte-fade.jpg', 62 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Mina Loop 오후 컷 · 모노 그레인', '/demo-assets/generated/mina-loop-story-2-mono-grain.jpg', 63 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 커버 컷 · 디테일 크롭', '/demo-assets/generated/noah-reed-cover-detail.jpg', 64 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 커버 컷 · 웜 필름', '/demo-assets/generated/noah-reed-cover-warm-film.jpg', 65 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 커버 컷 · 매트 페이드', '/demo-assets/generated/noah-reed-cover-matte-fade.jpg', 66 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 커버 컷 · 모노 그레인', '/demo-assets/generated/noah-reed-cover-mono-grain.jpg', 67 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 스튜디오 장면 · 디테일 크롭', '/demo-assets/generated/noah-reed-story-1-detail.jpg', 68 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 스튜디오 장면 · 웜 필름', '/demo-assets/generated/noah-reed-story-1-warm-film.jpg', 69 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 스튜디오 장면 · 매트 페이드', '/demo-assets/generated/noah-reed-story-1-matte-fade.jpg', 70 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 스튜디오 장면 · 모노 그레인', '/demo-assets/generated/noah-reed-story-1-mono-grain.jpg', 71 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 야간 대화 장면 · 디테일 크롭', '/demo-assets/generated/noah-reed-story-2-detail.jpg', 72 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 야간 대화 장면 · 웜 필름', '/demo-assets/generated/noah-reed-story-2-warm-film.jpg', 73 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 야간 대화 장면 · 매트 페이드', '/demo-assets/generated/noah-reed-story-2-matte-fade.jpg', 74 FROM trio
UNION ALL
SELECT trio.id, 'IMAGE', 'Noah Reed 야간 대화 장면 · 모노 그레인', '/demo-assets/generated/noah-reed-story-2-mono-grain.jpg', 75 FROM trio;
