--
-- PostgreSQL database dump
--

\restrict mQegBexlNiWVzdg6HMP7CA7QOBOzHTeJ1XqdE2MeclcKXdrG04kowQ9W1c6deb1

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: bet_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.bet_status AS ENUM (
    'pending',
    'won',
    'lost',
    'void'
);


ALTER TYPE public.bet_status OWNER TO postgres;

--
-- Name: fixture_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.fixture_status AS ENUM (
    'upcoming',
    'live',
    'finished',
    'cancelled'
);


ALTER TYPE public.fixture_status OWNER TO postgres;

--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.transaction_type AS ENUM (
    'credit',
    'debit',
    'bet_placed',
    'bet_won',
    'bet_refund'
);


ALTER TYPE public.transaction_type OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'user',
    'admin'
);


ALTER TYPE public.user_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bet_selections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bet_selections (
    id integer NOT NULL,
    bet_id integer NOT NULL,
    fixture_id integer NOT NULL,
    market text NOT NULL,
    selection text NOT NULL,
    odds numeric(10,4) NOT NULL
);


ALTER TABLE public.bet_selections OWNER TO postgres;

--
-- Name: bet_selections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bet_selections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bet_selections_id_seq OWNER TO postgres;

--
-- Name: bet_selections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bet_selections_id_seq OWNED BY public.bet_selections.id;


--
-- Name: bets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    stake numeric(15,2) NOT NULL,
    total_odds numeric(10,4) NOT NULL,
    potential_win numeric(15,2) NOT NULL,
    status public.bet_status DEFAULT 'pending'::public.bet_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bets OWNER TO postgres;

--
-- Name: bets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bets_id_seq OWNER TO postgres;

--
-- Name: bets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bets_id_seq OWNED BY public.bets.id;


--
-- Name: fixtures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixtures (
    id integer NOT NULL,
    league_id integer NOT NULL,
    home_team_id integer NOT NULL,
    away_team_id integer NOT NULL,
    start_time timestamp with time zone NOT NULL,
    status public.fixture_status DEFAULT 'upcoming'::public.fixture_status NOT NULL,
    score_home integer,
    score_away integer
);


ALTER TABLE public.fixtures OWNER TO postgres;

--
-- Name: fixtures_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fixtures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fixtures_id_seq OWNER TO postgres;

--
-- Name: fixtures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fixtures_id_seq OWNED BY public.fixtures.id;


--
-- Name: leagues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leagues (
    id integer NOT NULL,
    sport_id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.leagues OWNER TO postgres;

--
-- Name: leagues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leagues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leagues_id_seq OWNER TO postgres;

--
-- Name: leagues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leagues_id_seq OWNED BY public.leagues.id;


--
-- Name: markets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.markets (
    id integer NOT NULL,
    fixture_id integer NOT NULL,
    market_type text NOT NULL
);


ALTER TABLE public.markets OWNER TO postgres;

--
-- Name: markets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.markets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.markets_id_seq OWNER TO postgres;

--
-- Name: markets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.markets_id_seq OWNED BY public.markets.id;


--
-- Name: odds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.odds (
    id integer NOT NULL,
    market_id integer NOT NULL,
    selection text NOT NULL,
    odds_value text NOT NULL
);


ALTER TABLE public.odds OWNER TO postgres;

--
-- Name: odds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.odds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.odds_id_seq OWNER TO postgres;

--
-- Name: odds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.odds_id_seq OWNED BY public.odds.id;


--
-- Name: sports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sports (
    id integer NOT NULL,
    name text NOT NULL,
    icon text
);


ALTER TABLE public.sports OWNER TO postgres;

--
-- Name: sports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sports_id_seq OWNER TO postgres;

--
-- Name: sports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sports_id_seq OWNED BY public.sports.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    name text NOT NULL,
    logo text
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teams_id_seq OWNER TO postgres;

--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    wallet_id integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    type public.transaction_type NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    balance numeric(15,2) DEFAULT 0.00 NOT NULL
);


ALTER TABLE public.wallets OWNER TO postgres;

--
-- Name: wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wallets_id_seq OWNER TO postgres;

--
-- Name: wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wallets_id_seq OWNED BY public.wallets.id;


--
-- Name: bet_selections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bet_selections ALTER COLUMN id SET DEFAULT nextval('public.bet_selections_id_seq'::regclass);


--
-- Name: bets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bets ALTER COLUMN id SET DEFAULT nextval('public.bets_id_seq'::regclass);


--
-- Name: fixtures id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixtures ALTER COLUMN id SET DEFAULT nextval('public.fixtures_id_seq'::regclass);


--
-- Name: leagues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leagues ALTER COLUMN id SET DEFAULT nextval('public.leagues_id_seq'::regclass);


--
-- Name: markets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.markets ALTER COLUMN id SET DEFAULT nextval('public.markets_id_seq'::regclass);


--
-- Name: odds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.odds ALTER COLUMN id SET DEFAULT nextval('public.odds_id_seq'::regclass);


--
-- Name: sports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sports ALTER COLUMN id SET DEFAULT nextval('public.sports_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: wallets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);


--
-- Data for Name: bet_selections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bet_selections (id, bet_id, fixture_id, market, selection, odds) FROM stdin;
1	1	10	Match Result	Home Win	1.8800
2	1	7	Both Teams to Score	Yes	1.8600
3	1	3	Match Result	Home Win	3.0400
4	2	2	Match Result	Draw	3.2600
5	2	5	Match Result	Home Win	1.5100
6	2	3	Match Result	Away Win	2.5700
7	3	7	Match Result	Home Win	3.1000
8	3	7	Both Teams to Score	Yes	1.8600
9	3	7	Over/Under 2.5 Goals	Under 2.5	1.8000
\.


--
-- Data for Name: bets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bets (id, user_id, stake, total_odds, potential_win, status, created_at) FROM stdin;
1	2	50.00	10.6303	531.51	pending	2026-06-07 19:00:36.528718+00
2	2	200.00	12.6511	2530.22	pending	2026-06-07 19:01:31.29185+00
3	1	5.00	10.3788	51.89	void	2026-06-07 19:16:12.432758+00
\.


--
-- Data for Name: fixtures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fixtures (id, league_id, home_team_id, away_team_id, start_time, status, score_home, score_away) FROM stdin;
1	1	1	2	2026-06-07 19:52:39.775+00	live	\N	\N
2	1	3	4	2026-06-07 20:52:39.775+00	live	\N	\N
3	1	13	14	2026-06-08 18:52:39.775+00	upcoming	\N	\N
4	2	5	15	2026-06-08 18:52:39.775+00	upcoming	\N	\N
5	2	6	5	2026-06-09 18:52:39.775+00	upcoming	\N	\N
6	3	1	5	2026-06-09 18:52:39.775+00	upcoming	\N	\N
7	3	3	6	2026-06-10 18:52:39.775+00	upcoming	\N	\N
8	4	7	8	2026-06-07 19:52:39.775+00	live	\N	\N
9	5	9	10	2026-06-10 18:52:39.775+00	upcoming	\N	\N
10	6	11	12	2026-06-11 18:52:39.775+00	upcoming	\N	\N
\.


--
-- Data for Name: leagues; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leagues (id, sport_id, name) FROM stdin;
1	1	Premier League
2	1	La Liga
3	1	UEFA Champions League
4	2	NBA
5	3	Wimbledon
6	5	NFL
\.


--
-- Data for Name: markets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.markets (id, fixture_id, market_type) FROM stdin;
1	1	Match Result
2	1	Over/Under 2.5 Goals
3	1	Both Teams to Score
4	2	Match Result
5	2	Over/Under 2.5 Goals
6	2	Both Teams to Score
7	3	Match Result
8	3	Over/Under 2.5 Goals
9	3	Both Teams to Score
10	4	Match Result
11	4	Over/Under 2.5 Goals
12	4	Both Teams to Score
13	5	Match Result
14	5	Over/Under 2.5 Goals
15	5	Both Teams to Score
16	6	Match Result
17	6	Over/Under 2.5 Goals
18	6	Both Teams to Score
19	7	Match Result
20	7	Over/Under 2.5 Goals
21	7	Both Teams to Score
22	8	Match Result
23	9	Match Result
24	10	Match Result
\.


--
-- Data for Name: odds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.odds (id, market_id, selection, odds_value) FROM stdin;
1	1	Home Win	2.56
2	1	Draw	3.41
3	1	Away Win	2.07
4	2	Over 2.5	1.94
5	2	Under 2.5	1.71
6	3	Yes	1.75
7	3	No	1.83
8	4	Home Win	2.31
9	4	Draw	3.26
10	4	Away Win	3.89
11	5	Over 2.5	2.07
12	5	Under 2.5	1.90
13	6	Yes	1.97
14	6	No	2.06
15	7	Home Win	3.04
16	7	Draw	2.89
17	7	Away Win	2.57
18	8	Over 2.5	2.11
19	8	Under 2.5	1.75
20	9	Yes	1.61
21	9	No	2.15
22	10	Home Win	2.58
23	10	Draw	3.78
24	10	Away Win	2.15
25	11	Over 2.5	1.94
26	11	Under 2.5	1.84
27	12	Yes	1.66
28	12	No	2.05
29	13	Home Win	1.51
30	13	Draw	3.19
31	13	Away Win	1.52
32	14	Over 2.5	2.14
33	14	Under 2.5	1.92
34	15	Yes	1.85
35	15	No	2.07
36	16	Home Win	2.02
37	16	Draw	3.51
38	16	Away Win	2.54
39	17	Over 2.5	1.79
40	17	Under 2.5	1.72
41	18	Yes	1.84
42	18	No	2.03
43	19	Home Win	3.10
44	19	Draw	2.73
45	19	Away Win	2.47
46	20	Over 2.5	2.11
47	20	Under 2.5	1.80
48	21	Yes	1.86
49	21	No	1.93
50	22	Home Win	2.68
51	22	Draw	3.15
52	22	Away Win	2.89
53	23	Home Win	1.34
54	23	Draw	3.73
55	23	Away Win	2.91
56	24	Home Win	1.88
57	24	Draw	3.17
58	24	Away Win	2.44
\.


--
-- Data for Name: sports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sports (id, name, icon) FROM stdin;
1	Football	football
2	Basketball	basketball
3	Tennis	tennis
4	Cricket	cricket
5	American Football	american-football
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teams (id, name, logo) FROM stdin;
1	Manchester City	\N
2	Arsenal	\N
3	Liverpool	\N
4	Chelsea	\N
5	Real Madrid	\N
6	Barcelona	\N
7	Los Angeles Lakers	\N
8	Boston Celtics	\N
9	Novak Djokovic	\N
10	Carlos Alcaraz	\N
11	Kansas City Chiefs	\N
12	San Francisco 49ers	\N
13	Manchester United	\N
14	Tottenham Hotspur	\N
15	Atletico Madrid	\N
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, wallet_id, amount, type, description, created_at) FROM stdin;
1	2	250.00	credit	Deposit — $250.00	2026-06-07 18:56:41.558295+00
2	2	50.00	bet_placed	Bet #1 placed	2026-06-07 19:00:36.556142+00
3	2	200.00	bet_placed	Bet #2 placed	2026-06-07 19:01:31.304713+00
4	2	250.00	credit	Admin credit	2026-06-07 19:14:43.20155+00
5	1	20000000.00	credit	Admin credit	2026-06-07 19:15:35.598069+00
6	1	5.00	bet_placed	Bet #3 placed	2026-06-07 19:16:12.444631+00
7	1	500000.00	debit	Withdrawal — $500000.00	2026-06-07 19:16:30.672176+00
8	1	5000000.00	debit	Admin debit	2026-06-07 19:17:13.073676+00
9	1	500000.00	debit	Admin debit	2026-06-07 19:17:22.779823+00
10	1	13000000.00	debit	Admin debit	2026-06-07 19:17:37.443205+00
11	1	800000.00	debit	Admin debit	2026-06-07 19:17:50.658017+00
12	1	190000.00	debit	Admin debit	2026-06-07 19:18:06.158529+00
13	1	5.00	bet_refund	Bet #3 voided - stake refunded	2026-06-07 19:18:28.568988+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role, created_at) FROM stdin;
1	admin	admin@gowin.com	$2b$10$GxlZOZ5eHnHysiqP8v0jt.OZH35FYWQRWhznDjmncJUOHZ/Kftlxi	admin	2026-06-07 18:53:03.965093+00
2	testuser	user@gowin.com	$2b$10$6ZdDg83QGqZgv1K.RJA9Y.WycFF5SDt9QbOZrlgwmI/P04L/fmiBO	user	2026-06-07 18:54:16.008006+00
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallets (id, user_id, balance) FROM stdin;
2	2	250.00
1	1	10000.00
\.


--
-- Name: bet_selections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bet_selections_id_seq', 9, true);


--
-- Name: bets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bets_id_seq', 3, true);


--
-- Name: fixtures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fixtures_id_seq', 10, true);


--
-- Name: leagues_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leagues_id_seq', 6, true);


--
-- Name: markets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.markets_id_seq', 24, true);


--
-- Name: odds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.odds_id_seq', 58, true);


--
-- Name: sports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sports_id_seq', 5, true);


--
-- Name: teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teams_id_seq', 15, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 13, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: wallets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wallets_id_seq', 2, true);


--
-- Name: bet_selections bet_selections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bet_selections
    ADD CONSTRAINT bet_selections_pkey PRIMARY KEY (id);


--
-- Name: bets bets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_pkey PRIMARY KEY (id);


--
-- Name: fixtures fixtures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_pkey PRIMARY KEY (id);


--
-- Name: leagues leagues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_pkey PRIMARY KEY (id);


--
-- Name: markets markets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.markets
    ADD CONSTRAINT markets_pkey PRIMARY KEY (id);


--
-- Name: odds odds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.odds
    ADD CONSTRAINT odds_pkey PRIMARY KEY (id);


--
-- Name: sports sports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sports
    ADD CONSTRAINT sports_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: bet_selections bet_selections_bet_id_bets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bet_selections
    ADD CONSTRAINT bet_selections_bet_id_bets_id_fk FOREIGN KEY (bet_id) REFERENCES public.bets(id) ON DELETE CASCADE;


--
-- Name: bet_selections bet_selections_fixture_id_fixtures_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bet_selections
    ADD CONSTRAINT bet_selections_fixture_id_fixtures_id_fk FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id);


--
-- Name: bets bets_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: fixtures fixtures_away_team_id_teams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_away_team_id_teams_id_fk FOREIGN KEY (away_team_id) REFERENCES public.teams(id);


--
-- Name: fixtures fixtures_home_team_id_teams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_home_team_id_teams_id_fk FOREIGN KEY (home_team_id) REFERENCES public.teams(id);


--
-- Name: fixtures fixtures_league_id_leagues_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_league_id_leagues_id_fk FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: leagues leagues_sport_id_sports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_sport_id_sports_id_fk FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE CASCADE;


--
-- Name: markets markets_fixture_id_fixtures_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.markets
    ADD CONSTRAINT markets_fixture_id_fixtures_id_fk FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id) ON DELETE CASCADE;


--
-- Name: odds odds_market_id_markets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.odds
    ADD CONSTRAINT odds_market_id_markets_id_fk FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_wallet_id_wallets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_wallet_id_wallets_id_fk FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict mQegBexlNiWVzdg6HMP7CA7QOBOzHTeJ1XqdE2MeclcKXdrG04kowQ9W1c6deb1

