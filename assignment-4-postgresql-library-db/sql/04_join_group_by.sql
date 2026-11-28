-- 04_join_group_by.sql
-- JOIN combines rows from related tables through their foreign keys.
-- GROUP BY collapses rows into one row per group so we can count or sum them.

-- 1) INNER JOIN across all 4 tables: every open loan with book, author and member.
SELECT
    l.loan_id,
    m.full_name           AS member,
    b.title               AS book,
    a.name                AS author,
    l.loaned_at::date     AS loaned_on,
    l.due_at::date        AS due_on
FROM loans   l
JOIN books   b ON b.book_id   = l.book_id
JOIN authors a ON a.author_id = b.author_id
JOIN members m ON m.member_id = l.member_id
WHERE l.returned_at IS NULL
ORDER BY l.due_at;

-- 2) Overdue loans: open and past their due date, with how many days late.
SELECT
    m.full_name                                   AS member,
    m.email,
    b.title                                       AS book,
    l.due_at::date                                AS due_on,
    (CURRENT_DATE - l.due_at::date)               AS days_overdue
FROM loans   l
JOIN books   b ON b.book_id   = l.book_id
JOIN members m ON m.member_id = l.member_id
WHERE l.returned_at IS NULL
  AND l.due_at < now()
ORDER BY days_overdue DESC;

-- 3) LEFT JOIN + GROUP BY: loans per member, including members with no loans.
--    An INNER JOIN would drop Noor Abbas, who has never borrowed a book.
--    count(l.loan_id) counts only matched loans, so it gives 0 for her (count(*) would give 1).
SELECT
    m.member_id,
    m.full_name,
    count(l.loan_id)                                       AS total_loans,
    count(l.loan_id) FILTER (WHERE l.returned_at IS NULL)  AS open_loans
FROM members m
LEFT JOIN loans l ON l.member_id = m.member_id
GROUP BY m.member_id, m.full_name
ORDER BY total_loans DESC, m.full_name;

-- 4) GROUP BY + HAVING: authors with more than one book, and their total copies.
--    WHERE filters rows before grouping; HAVING filters the groups after.
SELECT
    a.name                  AS author,
    count(b.book_id)        AS books,
    sum(b.total_copies)     AS total_copies,
    sum(b.available_copies) AS available_copies
FROM authors a
JOIN books   b ON b.author_id = a.author_id
GROUP BY a.author_id, a.name
HAVING count(b.book_id) > 1
ORDER BY books DESC, author;

-- 5) GROUP BY genre: how popular each genre is (number of loans ever).
SELECT
    b.genre,
    count(DISTINCT b.book_id) AS books_in_genre,
    count(l.loan_id)          AS times_loaned
FROM books b
LEFT JOIN loans l ON l.book_id = b.book_id
GROUP BY b.genre
ORDER BY times_loaned DESC, b.genre;
