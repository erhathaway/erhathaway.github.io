-- Turn the right-side divider on for existing section titles. Titles that already have a value keep it.
UPDATE `project_artifacts`
SET `data_blob` = json_set(`data_blob`, '$.showDivider', json('true'))
WHERE `schema` = 'section-title-v1' AND json_type(`data_blob`, '$.showDivider') IS NULL;
