CREATE TABLE 'time_tbl'
('id'                INTEGER PRIMARY KEY AUTOINCREMENT,
'title'              VARCHAR(255),
'start'              VARCHAR(255),
'end'                VARCHAR(255),
'description'        VARCHAR(255),
'user'               INTEGER,
'status'             INTEGER,
'last_modified_date' DATE,
'last_modified_user' INTEGER);
