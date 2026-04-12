DELETE FROM personalization_schema
WHERE input_type IN ('VIDEO_PICKER', 'IMAGE_URL')
   OR field_key IN ('favoriteVideoId', 'uploadedImageUrl');
