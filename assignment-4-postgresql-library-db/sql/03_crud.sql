-- 03_crud.sql
-- Create, Read, Update, Delete.
-- RETURNING shows the affected row, so we can see each change without a second SELECT.
-- The file removes what it creates, so the data is the same before and after it runs.

-- CREATE: add a new author and one of their books.
INSERT INTO authors (name, country)
VALUES ('Fyodor Dostoevsky', 'Russia')
RETURNING author_id, name, country;

INSERT INTO books (title, author_id, genre, published_year, isbn, total_copies, available_copies)
VALUES (
    'Crime and Punishment',
    (SELECT author_id FROM authors WHERE name = 'Fyodor Dostoevsky'),
    'Novel', 1866, '9780000000017', 2, 2
)
RETURNING book_id, title, author_id, total_copies, available_copies;

-- READ: one row by a unique column, then a filtered and sorted list.
SELECT book_id, title, genre, published_year
FROM books
WHERE isbn = '9780000000017';

SELECT book_id, title, published_year, available_copies
FROM books
WHERE genre = 'Programming'
ORDER BY published_year;

-- UPDATE: the library buys one more copy of the new book.
UPDATE books
SET total_copies     = total_copies + 1,
    available_copies = available_copies + 1
WHERE isbn = '9780000000017'
RETURNING book_id, title, total_copies, available_copies;

-- DELETE: remove the book first, then its author.
-- (The other order fails: books.author_id is a foreign key with ON DELETE RESTRICT.)
DELETE FROM books
WHERE isbn = '9780000000017'
RETURNING book_id, title;

DELETE FROM authors
WHERE name = 'Fyodor Dostoevsky'
RETURNING author_id, name;

-- Check: back to the original 16 books and 8 authors.
SELECT
    (SELECT count(*) FROM books)   AS books,
    (SELECT count(*) FROM authors) AS authors;
