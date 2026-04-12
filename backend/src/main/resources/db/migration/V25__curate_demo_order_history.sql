UPDATE app_user
SET display_name = '경신'
WHERE email = 'fan@playpick.local';

DELETE FROM customer_order
WHERE fan_project_id IN (4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28);

DELETE FROM order_record
WHERE fan_project_id IN (4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28);

DELETE FROM fan_project
WHERE id IN (4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28);

UPDATE fan_project
SET
    personalization_data = JSON_OBJECT(
        'mode', 'demo',
        'fanNickname', '연두',
        'subscribedSince', '2023-07-14',
        'daysTogether', 1002,
        'favoriteVideoId', 'astra-demo-2',
        'fanNote', '밤기차 플랫폼에서 노트를 꼭 쥐고 서 있던 장면이 오래 남았어요. 낯선 풍경을 건너는 속도까지 함께 기록해두고 싶었습니다.',
        'uploadedImageUrl', '/demo-assets/astra-vale-story-4.png',
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
                'viewCount', 630000,
                'publishedAt', '2024-06-01T00:00:00Z'
            ),
            JSON_OBJECT(
                'videoId', 'astra-demo-2',
                'title', '차창 밖으로 흘러가던 황금빛 사막',
                'thumbnailUrl', '/demo-assets/astra-vale-story-2.png',
                'viewCount', 520000,
                'publishedAt', '2024-10-01T00:00:00Z'
            ),
            JSON_OBJECT(
                'videoId', 'astra-demo-3',
                'title', '노트에 적어둔 야간열차 메모',
                'thumbnailUrl', '/demo-assets/astra-vale-story-3.png',
                'viewCount', 410000,
                'publishedAt', '2025-01-01T00:00:00Z'
            ),
            JSON_OBJECT(
                'videoId', 'astra-demo-4',
                'title', '플랫폼에서 다시 고쳐 든 여행 노트',
                'thumbnailUrl', '/demo-assets/astra-vale-story-4.png',
                'viewCount', 360000,
                'publishedAt', '2025-02-08T00:00:00Z'
            )
        )
    ),
    sweetbook_book_uid = 'demo-book-astra-ordered',
    status = 'ORDERED',
    updated_at = TIMESTAMP '2026-04-12 09:15:00.000000'
WHERE id = 1;

UPDATE fan_project
SET
    personalization_data = JSON_OBJECT(
        'mode', 'demo',
        'fanNickname', '소연',
        'favoriteMemory', '해 질 무렵 차에 기대 웃고 있던 장면이 제일 오래 남았어요. 가볍고 다정한 로드트립의 기분이 이 에디션의 표정 같았거든요.',
        'fanMessage', '조금은 엉뚱하고 조금은 대담한 여행의 속도를 좋아해요. 그날의 웃음과 공기를 편지처럼 오래 남겨두고 싶습니다.',
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
                'publishedAt', '2024-05-14T00:00:00Z'
            ),
            JSON_OBJECT(
                'videoId', 'mina-demo-2',
                'title', '차창에 기대 웃던 오후',
                'thumbnailUrl', '/demo-assets/mina-loop-story-2.png',
                'viewCount', 490000,
                'publishedAt', '2024-09-22T00:00:00Z'
            ),
            JSON_OBJECT(
                'videoId', 'mina-demo-3',
                'title', '해질녘 도시를 마주한 한 컷',
                'thumbnailUrl', '/demo-assets/mina-loop-story-3.png',
                'viewCount', 430000,
                'publishedAt', '2025-01-17T00:00:00Z'
            )
        )
    ),
    sweetbook_book_uid = 'demo-book-mina-ordered',
    status = 'ORDERED',
    updated_at = TIMESTAMP '2026-04-11 20:40:00.000000'
WHERE id = 2;

UPDATE fan_project
SET
    personalization_data = JSON_OBJECT(
        'mode', 'demo',
        'fanNickname', '주은',
        'favoriteVideoId', 'noah-demo-2',
        'fanNote', '조용한 스튜디오에서 한 문장을 오래 붙잡고 있던 장면이 좋아요. 말의 속도보다 분위기를 다시 펼쳐보고 싶어서 이 북으로 남기고 싶었습니다.',
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
                'viewCount', 980000,
                'publishedAt', '2024-05-01T00:00:00Z'
            ),
            JSON_OBJECT(
                'videoId', 'noah-demo-2',
                'title', '노트 위에 남겨둔 대화의 잔상',
                'thumbnailUrl', '/demo-assets/noah-reed-story-1.png',
                'viewCount', 870000,
                'publishedAt', '2024-11-01T00:00:00Z'
            ),
            JSON_OBJECT(
                'videoId', 'noah-demo-3',
                'title', '웃음 끝에 오래 남는 밤',
                'thumbnailUrl', '/demo-assets/noah-reed-story-3.png',
                'viewCount', 790000,
                'publishedAt', '2025-02-01T00:00:00Z'
            )
        )
    ),
    sweetbook_book_uid = 'demo-book-noah-ordered',
    status = 'ORDERED',
    updated_at = TIMESTAMP '2026-04-10 22:05:00.000000'
WHERE id = 3;

UPDATE fan_project
SET updated_at = TIMESTAMP '2026-04-09 18:20:00.000000'
WHERE id = 8;

UPDATE fan_project
SET updated_at = TIMESTAMP '2026-04-09 14:10:00.000000'
WHERE id = 9;

UPDATE fan_project
SET updated_at = TIMESTAMP '2026-04-08 21:00:00.000000'
WHERE id = 10;

UPDATE fan_project
SET updated_at = TIMESTAMP '2026-04-08 10:00:00.000000'
WHERE id = 11;

DELETE FROM customer_order
WHERE fan_project_id IN (1, 2, 3);

INSERT INTO customer_order (
    fan_project_id,
    order_uid,
    status,
    total_amount,
    simulated,
    recipient_name,
    recipient_phone,
    postal_code,
    address1,
    address2,
    quantity,
    commission_rate,
    vendor_cost,
    margin_rate,
    margin_amount,
    platform_fee,
    creator_payout,
    payment_provider,
    payment_key,
    payment_method,
    payment_approved_at,
    ordered_at,
    created_at
)
VALUES
    (
        1,
        'demo-order-astra-20260412',
        'PAID',
        22900.00,
        FALSE,
        '김연두',
        '010-2048-3124',
        '04781',
        '서울특별시 성동구 연무장길 31',
        '3층',
        1,
        0.2000,
        16963.00,
        0.3500,
        5937.00,
        1187.40,
        4749.60,
        'TOSS_PAYMENTS',
        'pay-demo-astra-20260412',
        'CARD',
        TIMESTAMP '2026-04-12 09:15:00.000000',
        TIMESTAMP '2026-04-12 09:15:00.000000',
        TIMESTAMP '2026-04-12 09:15:00.000000'
    ),
    (
        2,
        'demo-order-mina-20260411',
        'PAID',
        45800.00,
        FALSE,
        '박소연',
        '010-5517-8842',
        '04032',
        '서울특별시 마포구 동교로 156',
        '502호',
        2,
        0.2000,
        33926.00,
        0.3500,
        11874.00,
        2374.80,
        9499.20,
        'TOSS_PAYMENTS',
        'pay-demo-mina-20260411',
        'CARD',
        TIMESTAMP '2026-04-11 20:40:00.000000',
        TIMESTAMP '2026-04-11 20:40:00.000000',
        TIMESTAMP '2026-04-11 20:40:00.000000'
    ),
    (
        3,
        'demo-order-noah-20260410',
        'PAID',
        22900.00,
        TRUE,
        '이주은',
        '010-6631-2904',
        '03044',
        '서울특별시 종로구 자하문로 44',
        '2층',
        1,
        0.2000,
        16963.00,
        0.3500,
        5937.00,
        1187.40,
        4749.60,
        NULL,
        NULL,
        NULL,
        NULL,
        TIMESTAMP '2026-04-10 22:05:00.000000',
        TIMESTAMP '2026-04-10 22:05:00.000000'
    );

DELETE FROM order_record
WHERE fan_project_id IN (1, 2, 3);

INSERT INTO order_record (
    fan_project_id,
    sweetbook_order_uid,
    status,
    total_amount,
    recipient_name,
    recipient_phone,
    postal_code,
    address1,
    address2,
    ordered_at,
    last_event_type,
    last_event_at,
    created_at
)
VALUES
    (
        1,
        'demo-fulfillment-astra-20260412',
        'SHIPPING_DELIVERED',
        22900.00,
        '김연두',
        '010-2048-3124',
        '04781',
        '서울특별시 성동구 연무장길 31',
        '3층',
        TIMESTAMP '2026-04-12 09:15:00.000000',
        'shipping.delivered',
        TIMESTAMP '2026-04-12 15:30:00.000000',
        TIMESTAMP '2026-04-12 09:15:00.000000'
    ),
    (
        2,
        'demo-fulfillment-mina-20260411',
        'SHIPPING_DEPARTED',
        45800.00,
        '박소연',
        '010-5517-8842',
        '04032',
        '서울특별시 마포구 동교로 156',
        '502호',
        TIMESTAMP '2026-04-11 20:40:00.000000',
        'shipping.departed',
        TIMESTAMP '2026-04-11 23:10:00.000000',
        TIMESTAMP '2026-04-11 20:40:00.000000'
    ),
    (
        3,
        'demo-fulfillment-noah-20260410',
        'SIMULATED',
        22900.00,
        '이주은',
        '010-6631-2904',
        '03044',
        '서울특별시 종로구 자하문로 44',
        '2층',
        TIMESTAMP '2026-04-10 22:05:00.000000',
        'simulation.ready',
        TIMESTAMP '2026-04-10 22:05:00.000000',
        TIMESTAMP '2026-04-10 22:05:00.000000'
    );
