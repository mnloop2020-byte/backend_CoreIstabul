-- 01_schema.sql
-- Library database: 4 related tables.
--
--   authors 1 ──< books 1 ──< loans >── 1 members
--
-- Safe to re-run: drops the tables first (children before parents).

DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS authors;

-- An author can write many books.
CREATE TABLE authors (
    author_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    country    VARCHAR(60),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Each book belongs to exactly one author.
-- available_copies goes down when a book is loaned and up when it is returned.
CREATE TABLE books (
    book_id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title            VARCHAR(200) NOT NULL,
    author_id        INT          NOT NULL
                     REFERENCES authors (author_id) ON DELETE RESTRICT,
    genre            VARCHAR(50)  NOT NULL,
    published_year   INT          CHECK (published_year BETWEEN 1450 AND 2100),
    isbn             CHAR(13)     UNIQUE,
    total_copies     INT          NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
    available_copies INT          NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
    CONSTRAINT available_not_more_than_total CHECK (available_copies <= total_copies)
);

CREATE TABLE members (
    member_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE CHECK (email LIKE '%_@_%'),
    joined_at  DATE         NOT NULL DEFAULT CURRENT_DATE
);

-- A loan links one member to one book. returned_at stays NULL until the book comes back.
CREATE TABLE loans (
    loan_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    book_id     INT         NOT NULL REFERENCES books (book_id)     ON DELETE RESTRICT,
    member_id   INT         NOT NULL REFERENCES members (member_id) ON DELETE RESTRICT,
    loaned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at      TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    CONSTRAINT due_after_loan      CHECK (due_at > loaned_at),
    CONSTRAINT returned_after_loan CHECK (returned_at IS NULL OR returned_at >= loaned_at)
);
