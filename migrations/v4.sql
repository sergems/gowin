-- GoWin V4 production migration
-- Renames 9 constraints added by v3.sql to match Drizzle's naming convention.
-- Safe to run repeatedly — each rename is guarded by an existence check.
-- Does NOT delete or modify any data.

BEGIN;

-- ── 1. lottery_games: unique slug constraint rename ──────────────────────────
-- btk.sql / v3.sql created: lottery_games_slug_key
-- Drizzle expects:          lottery_games_slug_unique
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_games_slug_key'
          AND conrelid = 'public.lottery_games'::regclass
    ) THEN
        ALTER TABLE public.lottery_games
            RENAME CONSTRAINT lottery_games_slug_key TO lottery_games_slug_unique;
    END IF;
END $$;

-- ── 2. lottery_tickets: unique code constraint rename ────────────────────────
-- btk.sql / v3.sql created: lottery_tickets_code_key
-- Drizzle expects:          lottery_tickets_code_unique
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_tickets_code_key'
          AND conrelid = 'public.lottery_tickets'::regclass
    ) THEN
        ALTER TABLE public.lottery_tickets
            RENAME CONSTRAINT lottery_tickets_code_key TO lottery_tickets_code_unique;
    END IF;
END $$;

-- ── 3. lottery_draws: foreign key rename ─────────────────────────────────────
-- v3.sql created: lottery_draws_game_id_fkey
-- Drizzle expects: lottery_draws_game_id_lottery_games_id_fk
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_draws_game_id_fkey'
          AND conrelid = 'public.lottery_draws'::regclass
    ) THEN
        ALTER TABLE public.lottery_draws
            RENAME CONSTRAINT lottery_draws_game_id_fkey
            TO lottery_draws_game_id_lottery_games_id_fk;
    END IF;
END $$;

-- ── 4. lottery_tickets: draw_id foreign key rename ───────────────────────────
-- v3.sql created: lottery_tickets_draw_id_fkey
-- Drizzle expects: lottery_tickets_draw_id_lottery_draws_id_fk
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_tickets_draw_id_fkey'
          AND conrelid = 'public.lottery_tickets'::regclass
    ) THEN
        ALTER TABLE public.lottery_tickets
            RENAME CONSTRAINT lottery_tickets_draw_id_fkey
            TO lottery_tickets_draw_id_lottery_draws_id_fk;
    END IF;
END $$;

-- ── 5. lottery_tickets: game_id foreign key rename ───────────────────────────
-- v3.sql created: lottery_tickets_game_id_fkey
-- Drizzle expects: lottery_tickets_game_id_lottery_games_id_fk
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_tickets_game_id_fkey'
          AND conrelid = 'public.lottery_tickets'::regclass
    ) THEN
        ALTER TABLE public.lottery_tickets
            RENAME CONSTRAINT lottery_tickets_game_id_fkey
            TO lottery_tickets_game_id_lottery_games_id_fk;
    END IF;
END $$;

-- ── 6. lottery_tickets: user_id foreign key rename ───────────────────────────
-- v3.sql created: lottery_tickets_user_id_fkey
-- Drizzle expects: lottery_tickets_user_id_users_id_fk
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_tickets_user_id_fkey'
          AND conrelid = 'public.lottery_tickets'::regclass
    ) THEN
        ALTER TABLE public.lottery_tickets
            RENAME CONSTRAINT lottery_tickets_user_id_fkey
            TO lottery_tickets_user_id_users_id_fk;
    END IF;
END $$;

-- ── 7. scraper_logs: game_id foreign key rename ──────────────────────────────
-- v3.sql created: scraper_logs_game_id_fkey
-- Drizzle expects: scraper_logs_game_id_lottery_games_id_fk
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'scraper_logs_game_id_fkey'
          AND conrelid = 'public.scraper_logs'::regclass
    ) THEN
        ALTER TABLE public.scraper_logs
            RENAME CONSTRAINT scraper_logs_game_id_fkey
            TO scraper_logs_game_id_lottery_games_id_fk;
    END IF;
END $$;

-- ── 8. settlement_logs: draw_id foreign key rename ───────────────────────────
-- v3.sql created: settlement_logs_draw_id_fkey
-- Drizzle expects: settlement_logs_draw_id_lottery_draws_id_fk
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'settlement_logs_draw_id_fkey'
          AND conrelid = 'public.settlement_logs'::regclass
    ) THEN
        ALTER TABLE public.settlement_logs
            RENAME CONSTRAINT settlement_logs_draw_id_fkey
            TO settlement_logs_draw_id_lottery_draws_id_fk;
    END IF;
END $$;

-- ── 9. settlement_logs: game_id foreign key rename ───────────────────────────
-- v3.sql created: settlement_logs_game_id_fkey
-- Drizzle expects: settlement_logs_game_id_lottery_games_id_fk
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'settlement_logs_game_id_fkey'
          AND conrelid = 'public.settlement_logs'::regclass
    ) THEN
        ALTER TABLE public.settlement_logs
            RENAME CONSTRAINT settlement_logs_game_id_fkey
            TO settlement_logs_game_id_lottery_games_id_fk;
    END IF;
END $$;

COMMIT;
