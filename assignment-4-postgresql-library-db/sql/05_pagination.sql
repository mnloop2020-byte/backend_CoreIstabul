-- 05_pagination.sql
-- Pagination returns a big list one page at a time (here: 5 books per page).
-- ORDER BY is required: without it, PostgreSQL does not promise any row order,
-- so the same page could return different rows each time.

-- Method 1: LIMIT / OFFSET
--   OFFSET = (page_number - 1) * page_size
--   Simple, and lets a client jump to any page.
--   Drawback: PostgreSQL still reads and throws away all the skipped rows,
--   so deep pages (OFFSET 100000) get slow.

-- Page 1
SELECT book_id, title, genre
FROM books
ORDER BY book_id
LIMIT 5 OFFSET 0;

-- Page 2
SELECT book_id, title, genre
FROM books
ORDER BY book_id
LIMIT 5 OFFSET 5;

-- Page 4 (the last one, only 1 book left: 16 books / 5 per page)
SELECT book_id, title, genre
FROM books
ORDER BY book_id
LIMIT 5 OFFSET 15;

-- Total count, so a client can show "page 2 of 4".
SELECT
    count(*)                       AS total_books,
    ceil(count(*) / 5.0)::int      AS total_pages
FROM books;

-- Method 2: keyset (cursor) pagination
--   Instead of skipping rows, ask for rows after the last id the client saw.
--   The primary key index jumps straight there, so every page is equally fast.
--   Drawback: you can only go to the next page, not jump to page 50.

-- First page
SELECT book_id, title, genre
FROM books
ORDER BY book_id
LIMIT 5;

-- Next page: the last book_id on the previous page was 5.
SELECT book_id, title, genre
FROM books
WHERE book_id > 5
ORDER BY book_id
LIMIT 5;
