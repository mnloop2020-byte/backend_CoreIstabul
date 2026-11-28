-- 02_seed.sql
-- Sample data (generated with AI help, then checked by hand).
-- Run right after 01_schema.sql: the tables are new, so ids start at 1
-- in the order the rows are inserted.
-- ISBNs and member emails are fake placeholders.

INSERT INTO authors (name, country) VALUES
    ('Naguib Mahfouz',    'Egypt'),           -- 1
    ('Orhan Pamuk',       'Turkey'),          -- 2
    ('George Orwell',     'United Kingdom'),  -- 3
    ('Robert C. Martin',  'United States'),   -- 4
    ('Martin Kleppmann',  'Germany'),         -- 5
    ('Elif Shafak',       'Turkey'),          -- 6
    ('Andrew Hunt',       'United States'),   -- 7
    ('Agatha Christie',   'United Kingdom');  -- 8

-- available_copies = total_copies - open loans of that book (see loans below).
INSERT INTO books (title, author_id, genre, published_year, isbn, total_copies, available_copies) VALUES
    ('Palace Walk',                            1, 'Novel',       1956, '9780000000001', 3, 3),  -- 1
    ('The Thief and the Dogs',                 1, 'Novel',       1961, '9780000000002', 2, 2),  -- 2
    ('Children of the Alley',                  1, 'Novel',       1959, '9780000000003', 2, 2),  -- 3
    ('My Name Is Red',                         2, 'Novel',       1998, '9780000000004', 3, 2),  -- 4
    ('Snow',                                   2, 'Novel',       2002, '9780000000005', 2, 2),  -- 5
    ('The Museum of Innocence',                2, 'Novel',       2008, '9780000000006', 1, 1),  -- 6
    ('1984',                                   3, 'Dystopian',   1949, '9780000000007', 4, 2),  -- 7
    ('Animal Farm',                            3, 'Dystopian',   1945, '9780000000008', 3, 3),  -- 8
    ('Clean Code',                             4, 'Programming', 2008, '9780000000009', 3, 2),  -- 9
    ('Clean Architecture',                     4, 'Programming', 2017, '9780000000010', 2, 2),  -- 10
    ('Designing Data-Intensive Applications',  5, 'Programming', 2017, '9780000000011', 2, 1),  -- 11
    ('The Forty Rules of Love',                6, 'Novel',       2009, '9780000000012', 2, 1),  -- 12
    ('The Bastard of Istanbul',                6, 'Novel',       2006, '9780000000013', 1, 1),  -- 13
    ('The Pragmatic Programmer',               7, 'Programming', 1999, '9780000000014', 2, 2),  -- 14
    ('Murder on the Orient Express',           8, 'Mystery',     1934, '9780000000015', 2, 2),  -- 15
    ('And Then There Were None',               8, 'Mystery',     1939, '9780000000016', 1, 0);  -- 16 (no copy left)

INSERT INTO members (full_name, email, joined_at) VALUES
    ('Ahmed Yilmaz',   'ahmed.yilmaz@example.com',   '2026-01-10'),  -- 1
    ('Sara Demir',     'sara.demir@example.com',     '2026-02-03'),  -- 2
    ('Omar Haddad',    'omar.haddad@example.com',    '2026-03-15'),  -- 3
    ('Lina Kaya',      'lina.kaya@example.com',      '2026-04-01'),  -- 4
    ('Yusuf Celik',    'yusuf.celik@example.com',    '2026-05-20'),  -- 5
    ('Mariam Saleh',   'mariam.saleh@example.com',   '2026-06-11'),  -- 6
    ('Emre Arslan',    'emre.arslan@example.com',    '2026-07-08'),  -- 7
    ('Huda Nasser',    'huda.nasser@example.com',    '2026-08-19'),  -- 8
    ('Can Ozturk',     'can.ozturk@example.com',     '2026-09-02'),  -- 9
    ('Noor Abbas',     'noor.abbas@example.com',     '2026-10-25');  -- 10 (no loans yet)

INSERT INTO loans (book_id, member_id, loaned_at, due_at, returned_at) VALUES
    -- Returned loans (history)
    (1,  2, '2026-09-01 10:00+03', '2026-09-15 23:59+03', '2026-09-12 14:30+03'),
    (8,  3, '2026-09-05 11:00+03', '2026-09-19 23:59+03', '2026-09-20 09:15+03'),  -- returned late
    (9,  1, '2026-10-01 09:30+03', '2026-10-15 23:59+03', '2026-10-10 16:00+03'),
    (14, 4, '2026-10-03 13:00+03', '2026-10-17 23:59+03', '2026-10-16 12:00+03'),
    (11, 9, '2026-10-05 15:00+03', '2026-10-19 23:59+03', '2026-10-30 10:00+03'),  -- returned late
    (15, 7, '2026-10-10 10:00+03', '2026-10-24 23:59+03', '2026-10-22 17:45+03'),
    (7,  8, '2026-10-12 12:00+03', '2026-10-26 23:59+03', '2026-10-25 11:20+03'),
    (2,  2, '2026-10-20 14:00+03', '2026-11-03 23:59+03', '2026-11-01 10:10+03'),
    -- Open loans (returned_at is NULL)
    (11, 4, '2026-11-01 10:00+03', '2026-11-15 23:59+03', NULL),  -- overdue
    (7,  1, '2026-11-10 09:00+03', '2026-11-24 23:59+03', NULL),  -- overdue
    (9,  2, '2026-11-15 16:00+03', '2026-11-29 23:59+03', NULL),
    (16, 5, '2026-11-18 11:30+03', '2026-12-02 23:59+03', NULL),
    (7,  3, '2026-11-20 10:45+03', '2026-12-04 23:59+03', NULL),
    (12, 6, '2026-11-22 13:15+03', '2026-12-06 23:59+03', NULL),
    (4,  1, '2026-11-25 15:00+03', '2026-12-09 23:59+03', NULL);
