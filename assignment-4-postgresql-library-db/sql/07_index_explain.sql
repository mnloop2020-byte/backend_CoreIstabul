-- 07_index_explain.sql
-- Evaluate one index with EXPLAIN ANALYZE.
--
-- Query to speed up: "show the loan history of one member".
-- loans.member_id is a foreign key, but PostgreSQL does NOT create an index for
-- foreign keys automatically (only for PRIMARY KEY and UNIQUE). So this query
-- reads the whole loans table.
--
-- With 15 rows an index makes no difference, so first we add test data:
-- 5,000 members and 200,000 old (already returned) loans.
-- Run this file last: the extra rows would change the results of the other files.

DROP INDEX IF EXISTS idx_loans_member_id;

-- Same random numbers on every run, so the results can be reproduced.
SELECT setseed(0.42);

INSERT INTO members (full_name, email, joined_at)
SELECT 'Test Member ' || g,
       'test.member' || g || '@example.com',
       DATE '2024-01-01' + (g % 600)
FROM generate_series(1, 5000) AS g;

-- Returned loans only, so books.available_copies stays correct.
INSERT INTO loans (book_id, member_id, loaned_at, due_at, returned_at)
SELECT book_id,
       member_id,
       loaned_at,
       loaned_at + INTERVAL '14 days',
       loaned_at + (1 + floor(random() * 20)) * INTERVAL '1 day'
FROM (
    SELECT 1  + floor(random() * 16)::int   AS book_id,     -- books 1..16
           11 + floor(random() * 5000)::int AS member_id,   -- the 5,000 test members (ids 11..5010)
           TIMESTAMPTZ '2024-01-01 10:00+03' + random() * INTERVAL '600 days' AS loaned_at
    FROM generate_series(1, 200000)
) AS t;

-- Refresh table statistics so the planner knows the new row counts.
ANALYZE loans;
ANALYZE members;

SELECT count(*) AS total_loans FROM loans;

-- How many rows does our test member (id 42) have?
SELECT count(*) AS loans_of_member_42 FROM loans WHERE member_id = 42;


-- BEFORE: no index on loans.member_id
-- EXPLAIN ANALYZE really runs the query and reports the plan and the real time.
-- BUFFERS shows how many 8 KB pages were read.

EXPLAIN (ANALYZE, BUFFERS)
SELECT loan_id, book_id, loaned_at, returned_at
FROM loans
WHERE member_id = 42
ORDER BY loaned_at DESC;


-- Create the index

CREATE INDEX idx_loans_member_id ON loans (member_id);
ANALYZE loans;

SELECT pg_size_pretty(pg_relation_size('loans'))               AS table_size,
       pg_size_pretty(pg_relation_size('idx_loans_member_id')) AS index_size;


-- AFTER: same query, now with the index

EXPLAIN (ANALYZE, BUFFERS)
SELECT loan_id, book_id, loaned_at, returned_at
FROM loans
WHERE member_id = 42
ORDER BY loaned_at DESC;
