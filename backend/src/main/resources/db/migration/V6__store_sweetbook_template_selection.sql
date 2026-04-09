ALTER TABLE edition_version
    ADD COLUMN sweetbook_cover_template_uid VARCHAR(120);

ALTER TABLE edition_version
    ADD COLUMN sweetbook_publish_template_uid VARCHAR(120);

ALTER TABLE edition_version
    ADD COLUMN sweetbook_content_template_uid VARCHAR(120);

UPDATE edition_version
SET
    sweetbook_cover_template_uid = '4MY2fokVjkeY',
    sweetbook_publish_template_uid = '75vMl9IeyPMI',
    sweetbook_content_template_uid = '46VqZhVNOfAp'
WHERE sweetbook_cover_template_uid IS NULL
   OR sweetbook_publish_template_uid IS NULL
   OR sweetbook_content_template_uid IS NULL;
