UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '오늘도 여기 와줘서 고마워요',
        'message', 'Astra Vale의 장면들 사이에, 이번엔 당신의 문장도 같이 눌러 담아볼게요. 낯선 풍경을 건너던 마음을 내가 먼저 조용히 건네는 말처럼 펼쳐둘게요.'
    ),
    official_closing = JSON_OBJECT(
        'title', '이 기록이 당신의 작은 응원이 되길',
        'message', '책을 덮고 난 뒤에도, 오늘 붙잡아 둔 감정이 오래 남았으면 해요. 다음 풍경 앞에서도 당신이 망설이지 않도록 내가 한 장면 더 곁에 둘게요.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 1;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '먼저 웃으면서 말을 걸어볼게요',
        'message', 'Mina Loop의 가벼운 로드트립 무드 위에, 이번엔 당신의 기억을 같이 얹어둘게요. 스치듯 지나간 장면도 오늘만큼은 오래 머물도록 내가 먼저 다정하게 붙잡아볼게요.'
    ),
    official_closing = JSON_OBJECT(
        'title', '한 장쯤은 당신 편이 되는 문장으로',
        'message', '차창 밖으로 지나간 빛처럼 가벼웠던 순간도, 당신이 다시 꺼내볼 수 있게 여기 남겨둘게요. 오늘의 이 책이 다음 길 앞에서 작은 응원이 되었으면 좋겠어요.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 2;

UPDATE edition_version
SET
    official_intro = JSON_OBJECT(
        'title', '조용한 밤엔 내가 먼저 말을 걸게요',
        'message', 'Noah Reed의 스튜디오처럼 낮은 톤으로, 오늘은 당신이 오래 붙잡아 둔 장면을 같이 펼쳐볼게요. 금방 사라질 것 같던 감정도 여기선 천천히 문장이 되도록 둘게요.'
    ),
    official_closing = JSON_OBJECT(
        'title', '오늘의 문장이 오래 남기를 바라요',
        'message', '책을 다 넘긴 뒤에도, 당신이 여기서 받은 위로가 쉽게 식지 않았으면 해요. 다시 조용한 밤이 오면, 내가 건넨 이 문장이 먼저 당신 곁에 닿아 있기를 바랍니다.'
    ),
    updated_at = CURRENT_TIMESTAMP(6)
WHERE edition_id = 3;
