-- GoWin V3 production migration
-- Adds only the lottery/scraper tables missing from an existing installation.
-- Safe to run repeatedly. Does not delete or update existing application data.

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.lottery_games_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS public.lottery_draws_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS public.lottery_tickets_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS public.scraper_logs_id_seq AS integer;
CREATE SEQUENCE IF NOT EXISTS public.settlement_logs_id_seq AS integer;

CREATE TABLE IF NOT EXISTS public.lottery_games (
    id integer NOT NULL DEFAULT nextval('public.lottery_games_id_seq'::regclass),
    name text NOT NULL,
    slug text NOT NULL,
    country text NOT NULL,
    main_numbers_count integer NOT NULL,
    main_numbers_max integer NOT NULL,
    bonus_numbers_count integer NOT NULL DEFAULT 0,
    bonus_numbers_max integer NOT NULL DEFAULT 0,
    ticket_price numeric(10,2) NOT NULL,
    jackpot numeric(20,2) NOT NULL DEFAULT 0,
    next_draw_at timestamp with time zone,
    is_active boolean NOT NULL DEFAULT true,
    color text NOT NULL DEFAULT '#4ade80',
    emoji text NOT NULL DEFAULT '🎰',
    description text,
    payout_config jsonb DEFAULT '{"bonusOnly": "45/1", "withBonus": {"1": "344/1", "2": "2805/1", "3": "27645/1", "4": "460045/1"}, "excludedBonus": {"1": "13/2", "2": "60/1", "3": "600/1", "4": "10000/1", "5": "100000/1"}, "includedBonus": {"1": "11/2", "2": "50/1", "3": "420/1", "4": "5000/1", "5": "50000/1"}}'::jsonb,
    min_stake numeric(10,2) NOT NULL DEFAULT 1.00,
    max_stake numeric(10,2) NOT NULL DEFAULT 100.00,
    max_payout numeric(20,2) NOT NULL DEFAULT 500000.00,
    enabled_play_types jsonb NOT NULL DEFAULT '["1", "2", "3", "4", "5", "6", "bonus_only"]'::jsonb,
    website text,
    scraper_class text,
    draw_days jsonb DEFAULT '[]'::jsonb,
    draw_time text,
    timezone text DEFAULT 'UTC',
    logo_url text,
    betting_cutoff_minutes integer NOT NULL DEFAULT 15
);

CREATE TABLE IF NOT EXISTS public.lottery_draws (
    id integer NOT NULL DEFAULT nextval('public.lottery_draws_id_seq'::regclass),
    game_id integer NOT NULL,
    draw_date timestamp with time zone NOT NULL,
    winning_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
    bonus_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
    jackpot numeric(20,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lottery_tickets (
    id integer NOT NULL DEFAULT nextval('public.lottery_tickets_id_seq'::regclass),
    user_id integer NOT NULL,
    game_id integer NOT NULL,
    draw_id integer,
    numbers jsonb NOT NULL,
    bonus_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
    stake numeric(10,2) NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    prize_amount numeric(20,2),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    bonus_mode text,
    play_type text,
    odds text,
    potential_win numeric(20,2),
    code text
);

CREATE TABLE IF NOT EXISTS public.scraper_logs (
    id integer NOT NULL DEFAULT nextval('public.scraper_logs_id_seq'::regclass),
    game_id integer,
    website text,
    status text NOT NULL,
    message text,
    execution_time integer,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settlement_logs (
    id integer NOT NULL DEFAULT nextval('public.settlement_logs_id_seq'::regclass),
    draw_id integer,
    game_id integer,
    tickets_checked integer NOT NULL DEFAULT 0,
    winning_tickets integer NOT NULL DEFAULT 0,
    total_paid numeric(20,2) NOT NULL DEFAULT 0,
    execution_time integer,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER SEQUENCE public.lottery_games_id_seq
    OWNED BY public.lottery_games.id;
ALTER SEQUENCE public.lottery_draws_id_seq
    OWNED BY public.lottery_draws.id;
ALTER SEQUENCE public.lottery_tickets_id_seq
    OWNED BY public.lottery_tickets.id;
ALTER SEQUENCE public.scraper_logs_id_seq
    OWNED BY public.scraper_logs.id;
ALTER SEQUENCE public.settlement_logs_id_seq
    OWNED BY public.settlement_logs.id;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_games_pkey'
          AND conrelid = 'public.lottery_games'::regclass
    ) THEN
        ALTER TABLE public.lottery_games
            ADD CONSTRAINT lottery_games_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_games_slug_key'
          AND conrelid = 'public.lottery_games'::regclass
    ) THEN
        ALTER TABLE public.lottery_games
            ADD CONSTRAINT lottery_games_slug_key UNIQUE (slug);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_draws_pkey'
          AND conrelid = 'public.lottery_draws'::regclass
    ) THEN
        ALTER TABLE public.lottery_draws
            ADD CONSTRAINT lottery_draws_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_tickets_pkey'
          AND conrelid = 'public.lottery_tickets'::regclass
    ) THEN
        ALTER TABLE public.lottery_tickets
            ADD CONSTRAINT lottery_tickets_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_tickets_code_key'
          AND conrelid = 'public.lottery_tickets'::regclass
    ) THEN
        ALTER TABLE public.lottery_tickets
            ADD CONSTRAINT lottery_tickets_code_key UNIQUE (code);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'scraper_logs_pkey'
          AND conrelid = 'public.scraper_logs'::regclass
    ) THEN
        ALTER TABLE public.scraper_logs
            ADD CONSTRAINT scraper_logs_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'settlement_logs_pkey'
          AND conrelid = 'public.settlement_logs'::regclass
    ) THEN
        ALTER TABLE public.settlement_logs
            ADD CONSTRAINT settlement_logs_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_draws_game_id_fkey'
          AND conrelid = 'public.lottery_draws'::regclass
    ) THEN
        ALTER TABLE public.lottery_draws
            ADD CONSTRAINT lottery_draws_game_id_fkey
            FOREIGN KEY (game_id) REFERENCES public.lottery_games(id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_tickets_user_id_fkey'
          AND conrelid = 'public.lottery_tickets'::regclass
    ) THEN
        ALTER TABLE public.lottery_tickets
            ADD CONSTRAINT lottery_tickets_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_tickets_game_id_fkey'
          AND conrelid = 'public.lottery_tickets'::regclass
    ) THEN
        ALTER TABLE public.lottery_tickets
            ADD CONSTRAINT lottery_tickets_game_id_fkey
            FOREIGN KEY (game_id) REFERENCES public.lottery_games(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lottery_tickets_draw_id_fkey'
          AND conrelid = 'public.lottery_tickets'::regclass
    ) THEN
        ALTER TABLE public.lottery_tickets
            ADD CONSTRAINT lottery_tickets_draw_id_fkey
            FOREIGN KEY (draw_id) REFERENCES public.lottery_draws(id)
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'scraper_logs_game_id_fkey'
          AND conrelid = 'public.scraper_logs'::regclass
    ) THEN
        ALTER TABLE public.scraper_logs
            ADD CONSTRAINT scraper_logs_game_id_fkey
            FOREIGN KEY (game_id) REFERENCES public.lottery_games(id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'settlement_logs_draw_id_fkey'
          AND conrelid = 'public.settlement_logs'::regclass
    ) THEN
        ALTER TABLE public.settlement_logs
            ADD CONSTRAINT settlement_logs_draw_id_fkey
            FOREIGN KEY (draw_id) REFERENCES public.lottery_draws(id)
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'settlement_logs_game_id_fkey'
          AND conrelid = 'public.settlement_logs'::regclass
    ) THEN
        ALTER TABLE public.settlement_logs
            ADD CONSTRAINT settlement_logs_game_id_fkey
            FOREIGN KEY (game_id) REFERENCES public.lottery_games(id)
            ON DELETE SET NULL;
    END IF;
END
$migration$;

COMMIT;