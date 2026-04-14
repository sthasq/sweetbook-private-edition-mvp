UPDATE app_user
SET display_name = 'Trio Collab'
WHERE email = 'creator@playpick.local';

UPDATE creator_profile
SET
    display_name = 'Trio Collab',
    channel_handle = '@trio'
WHERE id = 1;

UPDATE edition
SET
    title = 'Trio Archive',
    subtitle = '세 크리에이터 콜라보 포토북',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE id = 1;
