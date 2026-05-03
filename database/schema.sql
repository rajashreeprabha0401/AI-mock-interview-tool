-- ============================================================
--  AI Mock Interview System — PostgreSQL Schema
--  Compatible with Supabase (uses uuid, timestamptz)
-- ============================================================

-- Enable UUID extension (already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. USERS
-- Stores candidates + admins. role distinguishes access level.
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(120)        NOT NULL,
    email           VARCHAR(255)        NOT NULL UNIQUE,
    password_hash   TEXT                NOT NULL,
    role            VARCHAR(20)         NOT NULL DEFAULT 'candidate'
                        CHECK (role IN ('candidate', 'admin')),
    avatar_url      TEXT,
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);


-- ============================================================
-- 2. INTERVIEW ROLES
-- Job roles available for mock interviews (e.g. "React Developer")
-- ============================================================
CREATE TABLE interview_roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(120)        NOT NULL,           -- "React Developer"
    category        VARCHAR(80)         NOT NULL,           -- "Frontend", "Backend", etc.
    description     TEXT,
    difficulty      VARCHAR(20)         NOT NULL DEFAULT 'medium'
                        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interview_roles_category ON interview_roles(category);


-- ============================================================
-- 3. INTERVIEWS
-- One session = one row. Tracks the full lifecycle.
-- ============================================================
CREATE TABLE interviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID                NOT NULL REFERENCES interview_roles(id) ON DELETE RESTRICT,
    status          VARCHAR(20)         NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
    total_questions INT                 NOT NULL DEFAULT 5,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interviews_user_id   ON interviews(user_id);
CREATE INDEX idx_interviews_status    ON interviews(status);
CREATE INDEX idx_interviews_role_id   ON interviews(role_id);


-- ============================================================
-- 4. QUESTIONS
-- AI-generated questions tied to an interview session.
-- ============================================================
CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id    UUID                NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    role_id         UUID                NOT NULL REFERENCES interview_roles(id) ON DELETE RESTRICT,
    question_text   TEXT                NOT NULL,
    question_type   VARCHAR(30)         NOT NULL DEFAULT 'technical'
                        CHECK (question_type IN ('technical', 'behavioral', 'situational', 'hr')),
    order_index     SMALLINT            NOT NULL DEFAULT 1,  -- question number in session
    ai_model        VARCHAR(80),                             -- model used to generate
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_interview_id ON questions(interview_id);


-- ============================================================
-- 5. ANSWERS
-- Candidate's response to each question (one answer per question).
-- ============================================================
CREATE TABLE answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id    UUID                NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_id     UUID                NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    user_id         UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answer_text     TEXT                NOT NULL,
    time_taken_sec  INT,                                     -- seconds spent on this answer
    submitted_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_one_answer_per_question UNIQUE (question_id, user_id)
);

CREATE INDEX idx_answers_interview_id ON answers(interview_id);
CREATE INDEX idx_answers_question_id  ON answers(question_id);


-- ============================================================
-- 6. RESULTS
-- AI evaluation of each answer + overall interview score.
-- ============================================================
CREATE TABLE results (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id        UUID            NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    answer_id           UUID            NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Per-answer AI scores (0–10)
    score               NUMERIC(4,2)    CHECK (score BETWEEN 0 AND 10),
    relevance_score     NUMERIC(4,2)    CHECK (relevance_score BETWEEN 0 AND 10),
    clarity_score       NUMERIC(4,2)    CHECK (clarity_score BETWEEN 0 AND 10),
    depth_score         NUMERIC(4,2)    CHECK (depth_score BETWEEN 0 AND 10),

    -- AI feedback text
    feedback            TEXT,           -- detailed evaluation paragraph
    ideal_answer        TEXT,           -- what a great answer looks like
    strengths           TEXT[],         -- ["Good use of examples", ...]
    improvements        TEXT[],         -- ["Could mention X", ...]

    -- Overall interview summary (only filled once, on last answer)
    overall_score       NUMERIC(4,2)    CHECK (overall_score BETWEEN 0 AND 10),
    overall_feedback    TEXT,
    hire_recommendation VARCHAR(20)
                            CHECK (hire_recommendation IN ('strong_yes','yes','maybe','no','strong_no')),

    ai_model            VARCHAR(80),    -- model used for evaluation
    evaluated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_result_per_answer UNIQUE (answer_id)
);

CREATE INDEX idx_results_interview_id ON results(interview_id);
CREATE INDEX idx_results_user_id      ON results(user_id);


-- ============================================================
-- HELPER: auto-update updated_at on users
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- HR Interview Permissions
CREATE TABLE IF NOT EXISTS interview_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES users(id),
    role_id UUID REFERENCES interview_roles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_interview_permissions_candidate ON interview_permissions(candidate_id);
