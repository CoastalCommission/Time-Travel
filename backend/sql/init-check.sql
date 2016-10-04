SELECT name
FROM sqlite_master
WHERE type = 'table'
AND name = 'time_tbl'
OR name = 'hours_tbl'
OR name = 'projects_tbl';
