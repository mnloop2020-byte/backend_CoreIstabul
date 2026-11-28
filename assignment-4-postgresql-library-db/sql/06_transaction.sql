-- 06_transaction.sql
-- A transaction groups several statements into one unit: either all of them are
-- saved (COMMIT) or none of them are (ROLLBACK).
--
-- Borrowing a book needs two writes that must stay in sync:
--   1. INSERT a row into loans
--   2. UPDATE books.available_copies = available_copies - 1
-- If only one of them is saved, the data is wrong (a loan for a copy that does
-- not exist, or a copy that disappeared without a loan).
--
-- Run after 02_seed.sql (it expects the seed data).


-- Demo 1: COMMIT. Noor Abbas (member 10) borrows 'The Bastard of Istanbul' (book 13, 1 copy left).

BEGIN;

INSERT INTO loans (book_id, member_id, due_at)
VALUES (13, 10, now() + INTERVAL '14 days')
RETURNING loan_id, book_id, member_id, due_at::date AS due_on;

UPDATE books
SET available_copies = available_copies - 1
WHERE book_id = 13
RETURNING book_id, title, available_copies;

COMMIT;

-- Both changes are saved.
SELECT b.title, b.available_copies,
       (SELECT count(*) FROM loans WHERE book_id = 13 AND returned_at IS NULL) AS open_loans
FROM books b
WHERE b.book_id = 13;


-- Demo 2: ROLLBACK after an error. Noor tries to borrow 'And Then There Were None'
-- (book 16), which has 0 copies left.

BEGIN;

-- Step 1 works: the loan row is inserted (inside the transaction).
INSERT INTO loans (book_id, member_id, due_at)
VALUES (16, 10, now() + INTERVAL '14 days')
RETURNING loan_id, book_id, member_id;

-- Step 2 fails: 0 - 1 = -1 breaks CHECK (available_copies >= 0).
-- PostgreSQL marks the transaction as failed and refuses every statement until ROLLBACK.
UPDATE books
SET available_copies = available_copies - 1
WHERE book_id = 16;

ROLLBACK;

-- The loan inserted in step 1 was undone too: no open loan of book 16 for Noor.
SELECT count(*) AS noor_loans_of_book_16
FROM loans
WHERE book_id = 16 AND member_id = 10;

SELECT title, available_copies
FROM books
WHERE book_id = 16;


-- Demo 3: ROLLBACK by choice. Someone runs a DELETE without a WHERE clause by mistake.

SELECT count(*) AS loans_before FROM loans;

BEGIN;

DELETE FROM loans;                         -- deletes every loan, but only inside this transaction

SELECT count(*) AS loans_inside_transaction FROM loans;

ROLLBACK;                                  -- undo it

SELECT count(*) AS loans_after_rollback FROM loans;
