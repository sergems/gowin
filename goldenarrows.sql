--
-- PostgreSQL database dump
--

\restrict DOOAZXUtSZlSF7CyhtlxllnwQn0IVN2hdP7ldvhbPHH8qOkST51cd7N4PXKHqKo

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
    'bet_refund',
    'voucher_redeem'
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

--
-- Name: withdrawal_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.withdrawal_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'paid'
);


ALTER TYPE public.withdrawal_status OWNER TO postgres;

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
    score_away integer,
    external_id text
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
    name text NOT NULL,
    external_id text,
    country_name text,
    country_key text,
    country_logo text,
    league_logo text
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
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

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
    logo text,
    external_id text
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    first_name text,
    last_name text,
    phone_number text,
    public_id integer
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
-- Name: vouchers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vouchers (
    id integer NOT NULL,
    code text NOT NULL,
    value numeric(10,2) NOT NULL,
    is_redeemed boolean DEFAULT false NOT NULL,
    redeemed_by integer,
    redeemed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vouchers OWNER TO postgres;

--
-- Name: vouchers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vouchers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vouchers_id_seq OWNER TO postgres;

--
-- Name: vouchers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vouchers_id_seq OWNED BY public.vouchers.id;


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
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.withdrawals (
    id integer NOT NULL,
    user_id integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    bank_details text NOT NULL,
    status public.withdrawal_status DEFAULT 'pending'::public.withdrawal_status NOT NULL,
    admin_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.withdrawals OWNER TO postgres;

--
-- Name: withdrawals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.withdrawals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.withdrawals_id_seq OWNER TO postgres;

--
-- Name: withdrawals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.withdrawals_id_seq OWNED BY public.withdrawals.id;


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
-- Name: vouchers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vouchers ALTER COLUMN id SET DEFAULT nextval('public.vouchers_id_seq'::regclass);


--
-- Name: wallets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);


--
-- Name: withdrawals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals ALTER COLUMN id SET DEFAULT nextval('public.withdrawals_id_seq'::regclass);


--
-- Data for Name: bet_selections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bet_selections (id, bet_id, fixture_id, market, selection, odds) FROM stdin;
\.


--
-- Data for Name: bets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bets (id, user_id, stake, total_odds, potential_win, status, created_at) FROM stdin;
\.


--
-- Data for Name: fixtures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fixtures (id, league_id, home_team_id, away_team_id, start_time, status, score_home, score_away, external_id) FROM stdin;
12	7	18	19	2026-06-22 00:00:00+00	upcoming	\N	\N	1722472
13	7	20	21	2026-06-22 19:00:00+00	upcoming	\N	\N	1722473
14	7	22	23	2026-06-22 23:00:00+00	upcoming	\N	\N	1771762
15	11	24	25	2026-06-22 20:45:00+00	upcoming	\N	\N	1726496
16	11	26	27	2026-06-22 21:00:00+00	upcoming	\N	\N	1726497
17	13	28	29	2026-06-22 18:00:00+00	upcoming	\N	\N	1728503
18	13	30	31	2026-06-22 18:00:00+00	upcoming	\N	\N	1728685
19	13	32	33	2026-06-22 18:00:00+00	upcoming	\N	\N	1728686
20	13	34	35	2026-06-22 18:00:00+00	upcoming	\N	\N	1728868
21	13	36	37	2026-06-22 17:00:00+00	upcoming	\N	\N	1728871
22	18	38	39	2026-06-22 19:00:00+00	upcoming	\N	\N	1730914
23	18	40	41	2026-06-22 19:05:00+00	upcoming	\N	\N	1730915
24	18	42	43	2026-06-22 19:00:00+00	upcoming	\N	\N	1730918
25	21	44	45	2026-06-22 19:00:00+00	upcoming	\N	\N	1740645
26	21	46	47	2026-06-22 15:00:00+00	upcoming	\N	\N	1740646
27	21	48	49	2026-06-22 16:00:00+00	upcoming	\N	\N	1740647
28	21	50	51	2026-06-22 15:00:00+00	upcoming	\N	\N	1740648
29	21	52	53	2026-06-22 18:00:00+00	upcoming	\N	\N	1740649
30	26	54	55	2026-06-22 21:15:00+00	upcoming	\N	\N	1741446
31	27	56	57	2026-06-22 17:00:00+00	upcoming	\N	\N	1741598
32	27	58	59	2026-06-22 19:00:00+00	upcoming	\N	\N	1741602
33	29	60	61	2026-06-22 19:30:00+00	upcoming	\N	\N	1743477
34	30	62	63	2026-06-22 01:00:00+00	upcoming	\N	\N	1746071
35	30	64	65	2026-06-22 00:00:00+00	upcoming	\N	\N	1746072
36	30	66	67	2026-06-22 01:00:00+00	upcoming	\N	\N	1746073
37	30	68	69	2026-06-22 01:00:00+00	upcoming	\N	\N	1746074
38	30	70	71	2026-06-22 01:00:00+00	upcoming	\N	\N	1746075
39	30	72	73	2026-06-22 02:30:00+00	upcoming	\N	\N	1746076
40	30	74	75	2026-06-22 04:00:00+00	upcoming	\N	\N	1746077
41	37	76	77	2026-06-22 17:00:00+00	upcoming	\N	\N	1747917
42	29	78	79	2026-06-22 19:00:00+00	upcoming	\N	\N	1748251
43	39	80	81	2026-06-22 18:00:00+00	upcoming	\N	\N	1750226
44	39	82	83	2026-06-22 18:00:00+00	upcoming	\N	\N	1750227
45	41	84	85	2026-06-22 16:00:00+00	upcoming	\N	\N	1752751
46	41	86	87	2026-06-22 18:00:00+00	upcoming	\N	\N	1752752
47	41	88	89	2026-06-22 18:00:00+00	upcoming	\N	\N	1752753
48	41	90	91	2026-06-22 18:00:00+00	upcoming	\N	\N	1752754
49	45	92	93	2026-06-22 12:15:00+00	upcoming	\N	\N	1753440
50	46	94	95	2026-06-22 18:00:00+00	upcoming	\N	\N	1754090
51	47	96	97	2026-06-22 02:15:00+00	upcoming	\N	\N	1755383
52	47	98	99	2026-06-22 01:00:00+00	upcoming	\N	\N	1755384
53	47	100	101	2026-06-22 02:00:00+00	upcoming	\N	\N	1755385
54	47	102	103	2026-06-22 03:00:00+00	upcoming	\N	\N	1755386
55	47	104	105	2026-06-22 04:00:00+00	upcoming	\N	\N	1755387
56	47	106	107	2026-06-22 01:30:00+00	upcoming	\N	\N	1755388
57	53	108	109	2026-06-22 14:00:00+00	upcoming	\N	\N	1773254
58	53	110	111	2026-06-22 15:00:00+00	upcoming	\N	\N	1773255
59	55	112	113	2026-06-22 14:00:00+00	upcoming	\N	\N	1774580
60	56	114	115	2026-06-22 02:00:00+00	upcoming	\N	\N	1776163
61	57	116	117	2026-06-22 00:00:00+00	upcoming	\N	\N	1776972
62	57	118	119	2026-06-22 02:30:00+00	upcoming	\N	\N	1776973
63	59	120	121	2026-06-22 19:00:00+00	upcoming	\N	\N	1777280
64	60	122	123	2026-06-22 19:00:00+00	upcoming	\N	\N	1780048
65	61	124	125	2026-06-22 14:00:00+00	upcoming	\N	\N	1780888
66	61	126	127	2026-06-22 14:00:00+00	upcoming	\N	\N	1780889
67	7	128	129	2026-06-21 02:00:00+00	upcoming	\N	\N	1722466
68	7	130	131	2026-06-21 06:00:00+00	upcoming	\N	\N	1722468
69	7	132	133	2026-06-21 21:00:00+00	upcoming	\N	\N	1722469
70	7	134	135	2026-06-21 18:00:00+00	upcoming	\N	\N	1722471
71	67	136	137	2026-06-21 17:00:00+00	upcoming	\N	\N	1758440
72	67	138	139	2026-06-21 16:00:00+00	upcoming	\N	\N	1758442
73	67	140	141	2026-06-21 15:00:00+00	upcoming	\N	\N	1758444
74	67	142	143	2026-06-21 14:00:00+00	upcoming	\N	\N	1758445
75	71	144	145	2026-06-21 16:00:00+00	upcoming	\N	\N	1751923
76	71	146	147	2026-06-21 00:00:00+00	upcoming	\N	\N	1751924
77	71	148	149	2026-06-21 21:00:00+00	upcoming	\N	\N	1751925
78	71	150	151	2026-06-21 23:30:00+00	upcoming	\N	\N	1751926
79	71	152	153	2026-06-21 22:00:00+00	upcoming	\N	\N	1751929
80	71	154	155	2026-06-21 00:00:00+00	upcoming	\N	\N	1751931
81	77	156	157	2026-06-21 17:00:00+00	upcoming	\N	\N	1756559
82	77	158	159	2026-06-21 15:00:00+00	upcoming	\N	\N	1756562
83	77	160	161	2026-06-21 19:00:00+00	upcoming	\N	\N	1756564
84	80	162	163	2026-06-21 21:00:00+00	upcoming	\N	\N	1027899
85	81	164	165	2026-06-21 03:30:00+00	upcoming	\N	\N	1725521
86	81	166	167	2026-06-21 01:00:00+00	upcoming	\N	\N	1725522
87	81	168	169	2026-06-21 02:30:00+00	upcoming	\N	\N	1725523
88	81	170	171	2026-06-21 02:00:00+00	upcoming	\N	\N	1725524
89	81	172	173	2026-06-21 01:00:00+00	upcoming	\N	\N	1725525
90	81	174	175	2026-06-21 01:00:00+00	upcoming	\N	\N	1725526
91	81	176	177	2026-06-21 03:00:00+00	upcoming	\N	\N	1725527
92	81	178	179	2026-06-21 01:30:00+00	upcoming	\N	\N	1725528
93	89	180	181	2026-06-21 02:00:00+00	upcoming	\N	\N	1726020
94	89	182	183	2026-06-21 01:00:00+00	upcoming	\N	\N	1726021
95	89	184	185	2026-06-21 02:30:00+00	upcoming	\N	\N	1726022
96	89	186	187	2026-06-21 01:00:00+00	upcoming	\N	\N	1726023
97	89	188	189	2026-06-21 04:00:00+00	upcoming	\N	\N	1726024
98	89	190	191	2026-06-21 04:30:00+00	upcoming	\N	\N	1726026
99	89	192	193	2026-06-21 05:00:00+00	upcoming	\N	\N	1726027
100	89	194	195	2026-06-21 01:00:00+00	upcoming	\N	\N	1726028
101	89	196	197	2026-06-21 04:30:00+00	upcoming	\N	\N	1726178
102	13	198	199	2026-06-21 13:00:00+00	upcoming	\N	\N	1728325
103	13	200	201	2026-06-21 13:00:00+00	upcoming	\N	\N	1728506
104	13	202	203	2026-06-21 16:00:00+00	upcoming	\N	\N	1728867
105	13	204	205	2026-06-21 16:00:00+00	upcoming	\N	\N	1728870
106	13	206	207	2026-06-21 14:00:00+00	upcoming	\N	\N	1728872
107	13	208	209	2026-06-21 13:00:00+00	upcoming	\N	\N	1728873
108	13	210	211	2026-06-21 15:00:00+00	upcoming	\N	\N	1729050
109	13	212	213	2026-06-21 15:00:00+00	upcoming	\N	\N	1729051
11	7	16	17	2026-06-22 03:00:00+00	upcoming	\N	\N	1722470
112	108	218	219	2026-06-21 14:00:00+00	upcoming	\N	\N	1729404
113	109	220	221	2026-06-21 12:00:00+00	upcoming	\N	\N	1729548
114	109	222	223	2026-06-21 14:00:00+00	upcoming	\N	\N	1729550
115	109	224	225	2026-06-21 17:00:00+00	upcoming	\N	\N	1729730
116	109	226	227	2026-06-21 13:00:00+00	upcoming	\N	\N	1729731
117	109	228	229	2026-06-21 14:00:00+00	upcoming	\N	\N	1729734
118	109	230	231	2026-06-21 14:00:00+00	upcoming	\N	\N	1729736
119	115	232	233	2026-06-21 16:00:00+00	upcoming	\N	\N	1729930
121	115	236	237	2026-06-21 16:00:00+00	upcoming	\N	\N	1729932
122	115	238	239	2026-06-21 16:00:00+00	upcoming	\N	\N	1729933
123	115	240	241	2026-06-21 16:00:00+00	upcoming	\N	\N	1729934
124	115	242	243	2026-06-21 16:00:00+00	upcoming	\N	\N	1729936
125	115	244	245	2026-06-21 16:00:00+00	upcoming	\N	\N	1729937
126	18	246	247	2026-06-21 15:00:00+00	upcoming	\N	\N	1730911
127	18	248	249	2026-06-21 15:00:00+00	upcoming	\N	\N	1730912
128	18	250	251	2026-06-21 17:00:00+00	upcoming	\N	\N	1730913
129	18	252	253	2026-06-21 15:00:00+00	upcoming	\N	\N	1730916
130	18	254	255	2026-06-21 17:00:00+00	upcoming	\N	\N	1730917
131	80	256	257	2026-06-21 20:30:00+00	upcoming	\N	\N	1731512
132	80	258	259	2026-06-21 21:30:00+00	upcoming	\N	\N	1731513
133	80	260	261	2026-06-21 20:30:00+00	upcoming	\N	\N	1731514
134	80	262	263	2026-06-21 21:00:00+00	upcoming	\N	\N	1731517
135	80	264	265	2026-06-21 20:30:00+00	upcoming	\N	\N	1731519
136	80	266	267	2026-06-21 20:00:00+00	upcoming	\N	\N	1731520
137	80	268	269	2026-06-21 21:30:00+00	upcoming	\N	\N	1731521
138	80	270	271	2026-06-21 20:30:00+00	upcoming	\N	\N	1731522
140	80	274	275	2026-06-21 20:30:00+00	upcoming	\N	\N	1731525
141	137	276	277	2026-06-21 16:00:00+00	upcoming	\N	\N	1734454
142	137	278	279	2026-06-21 13:00:00+00	upcoming	\N	\N	1734459
143	137	280	281	2026-06-21 15:00:00+00	upcoming	\N	\N	1734460
144	137	282	281	2026-06-21 13:00:00+00	upcoming	\N	\N	1736476
145	141	284	285	2026-06-21 16:00:00+00	upcoming	\N	\N	1736973
146	141	286	287	2026-06-21 16:00:00+00	upcoming	\N	\N	1736976
147	141	288	289	2026-06-21 17:00:00+00	upcoming	\N	\N	1737839
148	141	290	291	2026-06-21 15:00:00+00	upcoming	\N	\N	1737840
149	141	292	293	2026-06-21 13:00:00+00	upcoming	\N	\N	1737843
150	146	294	295	2026-06-21 15:00:00+00	upcoming	\N	\N	1739544
151	147	296	297	2026-06-21 16:00:00+00	upcoming	\N	\N	1739677
152	147	298	299	2026-06-21 16:00:00+00	upcoming	\N	\N	1739678
153	149	300	301	2026-06-21 15:00:00+00	upcoming	\N	\N	1739932
154	149	302	303	2026-06-21 15:00:00+00	upcoming	\N	\N	1739933
155	149	304	305	2026-06-21 15:00:00+00	upcoming	\N	\N	1739934
156	149	306	307	2026-06-21 15:00:00+00	upcoming	\N	\N	1739935
157	149	308	309	2026-06-21 18:00:00+00	upcoming	\N	\N	1739936
159	149	312	313	2026-06-21 15:00:00+00	upcoming	\N	\N	1739938
160	149	314	315	2026-06-21 15:00:00+00	upcoming	\N	\N	1739939
161	26	316	317	2026-06-21 20:00:00+00	upcoming	\N	\N	1741441
162	26	318	319	2026-06-21 20:00:00+00	upcoming	\N	\N	1741442
163	26	320	321	2026-06-21 20:00:00+00	upcoming	\N	\N	1741443
164	26	322	323	2026-06-21 20:00:00+00	upcoming	\N	\N	1741444
165	26	324	325	2026-06-21 22:15:00+00	upcoming	\N	\N	1741445
166	29	326	327	2026-06-21 16:00:00+00	upcoming	\N	\N	1742930
167	29	328	329	2026-06-21 16:00:00+00	upcoming	\N	\N	1743111
168	29	330	331	2026-06-21 16:00:00+00	upcoming	\N	\N	1743112
169	29	332	333	2026-06-21 16:00:00+00	upcoming	\N	\N	1743114
170	29	334	335	2026-06-21 13:00:00+00	upcoming	\N	\N	1743473
171	29	336	337	2026-06-21 13:00:00+00	upcoming	\N	\N	1743474
172	29	338	339	2026-06-21 12:00:00+00	upcoming	\N	\N	1743475
173	29	340	341	2026-06-21 16:00:00+00	upcoming	\N	\N	1743476
174	29	342	343	2026-06-21 16:00:00+00	upcoming	\N	\N	1743478
175	29	344	345	2026-06-21 13:00:00+00	upcoming	\N	\N	1743479
176	172	346	347	2026-06-21 13:30:00+00	upcoming	\N	\N	1745597
178	30	350	351	2026-06-21 01:00:00+00	upcoming	\N	\N	1746066
179	30	352	353	2026-06-21 02:00:00+00	upcoming	\N	\N	1746067
180	30	354	355	2026-06-21 02:00:00+00	upcoming	\N	\N	1746068
181	30	356	357	2026-06-21 03:00:00+00	upcoming	\N	\N	1746069
182	30	358	359	2026-06-21 18:00:00+00	upcoming	\N	\N	1746070
183	179	360	361	2026-06-21 21:15:00+00	upcoming	\N	\N	1746645
184	179	362	363	2026-06-21 21:15:00+00	upcoming	\N	\N	1746646
185	179	364	365	2026-06-21 18:00:00+00	upcoming	\N	\N	1746648
186	179	366	367	2026-06-21 16:00:00+00	upcoming	\N	\N	1746649
187	179	368	369	2026-06-21 21:15:00+00	upcoming	\N	\N	1746650
188	37	370	371	2026-06-21 15:00:00+00	upcoming	\N	\N	1747914
189	37	372	373	2026-06-21 13:00:00+00	upcoming	\N	\N	1747915
190	37	374	375	2026-06-21 17:00:00+00	upcoming	\N	\N	1747916
191	29	376	377	2026-06-21 14:00:00+00	upcoming	\N	\N	1748252
192	29	378	379	2026-06-21 16:00:00+00	upcoming	\N	\N	1748256
193	39	380	381	2026-06-21 11:30:00+00	upcoming	\N	\N	1750223
194	39	382	383	2026-06-21 11:30:00+00	upcoming	\N	\N	1750224
195	39	384	385	2026-06-21 18:00:00+00	upcoming	\N	\N	1750225
197	192	388	389	2026-06-21 07:00:00+00	upcoming	\N	\N	1751042
198	192	390	391	2026-06-21 07:00:00+00	upcoming	\N	\N	1751043
199	192	392	393	2026-06-21 06:30:00+00	upcoming	\N	\N	1751044
200	196	394	395	2026-06-21 07:00:00+00	upcoming	\N	\N	1751357
201	196	396	397	2026-06-21 11:00:00+00	upcoming	\N	\N	1751359
202	41	398	399	2026-06-21 18:00:00+00	upcoming	\N	\N	1752750
203	29	340	401	2026-06-21 16:00:00+00	upcoming	\N	\N	1752903
204	200	402	403	2026-06-21 07:00:00+00	upcoming	\N	\N	1753615
205	46	404	405	2026-06-21 13:15:00+00	upcoming	\N	\N	1754094
206	47	406	407	2026-06-21 01:30:00+00	upcoming	\N	\N	1755334
207	47	408	409	2026-06-21 01:00:00+00	upcoming	\N	\N	1755336
208	47	410	411	2026-06-21 01:00:00+00	upcoming	\N	\N	1755338
209	47	412	413	2026-06-21 00:00:00+00	upcoming	\N	\N	1755341
210	47	414	415	2026-06-21 00:00:00+00	upcoming	\N	\N	1755342
211	47	416	417	2026-06-21 01:00:00+00	upcoming	\N	\N	1755343
212	47	418	419	2026-06-21 00:00:00+00	upcoming	\N	\N	1755344
213	47	420	421	2026-06-21 03:00:00+00	upcoming	\N	\N	1755345
214	47	422	423	2026-06-21 00:00:00+00	upcoming	\N	\N	1755347
216	47	426	427	2026-06-21 00:00:00+00	upcoming	\N	\N	1755349
111	13	216	217	2026-06-21 15:00:00+00	upcoming	\N	\N	1729235
219	47	432	433	2026-06-21 01:00:00+00	upcoming	\N	\N	1755352
220	47	434	435	2026-06-21 01:00:00+00	upcoming	\N	\N	1755353
221	47	436	437	2026-06-21 01:00:00+00	upcoming	\N	\N	1755354
222	47	438	439	2026-06-21 02:00:00+00	upcoming	\N	\N	1755355
223	47	440	441	2026-06-21 01:00:00+00	upcoming	\N	\N	1755356
224	47	442	443	2026-06-21 01:00:00+00	upcoming	\N	\N	1755357
225	47	444	445	2026-06-21 01:00:00+00	upcoming	\N	\N	1755358
226	47	446	447	2026-06-21 02:00:00+00	upcoming	\N	\N	1755359
228	47	450	451	2026-06-21 02:00:00+00	upcoming	\N	\N	1755361
229	47	452	453	2026-06-21 01:00:00+00	upcoming	\N	\N	1755362
230	47	454	455	2026-06-21 01:00:00+00	upcoming	\N	\N	1755363
231	47	456	457	2026-06-21 01:00:00+00	upcoming	\N	\N	1755364
232	47	458	459	2026-06-21 04:00:00+00	upcoming	\N	\N	1755365
233	47	460	461	2026-06-21 02:00:00+00	upcoming	\N	\N	1755366
234	47	462	463	2026-06-21 01:00:00+00	upcoming	\N	\N	1755367
235	47	464	465	2026-06-21 01:00:00+00	upcoming	\N	\N	1755368
236	47	466	467	2026-06-21 01:00:00+00	upcoming	\N	\N	1755369
237	47	468	469	2026-06-21 04:00:00+00	upcoming	\N	\N	1755370
238	47	470	471	2026-06-21 02:00:00+00	upcoming	\N	\N	1755371
239	47	472	473	2026-06-21 01:00:00+00	upcoming	\N	\N	1755372
240	47	474	475	2026-06-21 01:00:00+00	upcoming	\N	\N	1755373
241	47	476	477	2026-06-21 01:30:00+00	upcoming	\N	\N	1755374
242	47	478	479	2026-06-21 01:40:00+00	upcoming	\N	\N	1755375
243	47	480	481	2026-06-21 02:30:00+00	upcoming	\N	\N	1755376
244	47	482	483	2026-06-21 02:30:00+00	upcoming	\N	\N	1755377
245	47	484	485	2026-06-21 02:30:00+00	upcoming	\N	\N	1755378
247	47	488	489	2026-06-21 02:00:00+00	upcoming	\N	\N	1755380
248	47	490	491	2026-06-21 22:00:00+00	upcoming	\N	\N	1755381
249	47	492	493	2026-06-21 23:30:00+00	upcoming	\N	\N	1755382
250	246	494	495	2026-06-21 08:00:00+00	upcoming	\N	\N	1756163
251	246	496	497	2026-06-21 09:00:00+00	upcoming	\N	\N	1756164
252	248	498	499	2026-06-21 05:00:00+00	upcoming	\N	\N	1756378
253	248	500	501	2026-06-21 07:00:00+00	upcoming	\N	\N	1756379
254	250	502	503	2026-06-21 23:30:00+00	upcoming	\N	\N	1758705
255	250	504	505	2026-06-21 21:00:00+00	upcoming	\N	\N	1758707
256	250	506	507	2026-06-21 23:30:00+00	upcoming	\N	\N	1758709
257	250	508	509	2026-06-21 01:30:00+00	upcoming	\N	\N	1758710
258	250	510	511	2026-06-21 02:00:00+00	upcoming	\N	\N	1758711
259	250	512	513	2026-06-21 00:00:00+00	upcoming	\N	\N	1758712
260	250	514	515	2026-06-21 16:00:00+00	upcoming	\N	\N	1758713
261	257	516	517	2026-06-21 22:00:00+00	upcoming	\N	\N	1759983
262	257	518	519	2026-06-21 22:00:00+00	upcoming	\N	\N	1759985
263	259	520	521	2026-06-21 15:00:00+00	upcoming	\N	\N	1760144
264	259	522	523	2026-06-21 16:00:00+00	upcoming	\N	\N	1760145
266	261	526	527	2026-06-21 22:00:00+00	upcoming	\N	\N	1760872
267	261	528	529	2026-06-21 22:00:00+00	upcoming	\N	\N	1760873
268	261	530	531	2026-06-21 22:00:00+00	upcoming	\N	\N	1760874
269	261	532	533	2026-06-21 22:00:00+00	upcoming	\N	\N	1760875
270	261	534	535	2026-06-21 22:00:00+00	upcoming	\N	\N	1760876
271	261	536	537	2026-06-21 22:00:00+00	upcoming	\N	\N	1760877
272	261	538	539	2026-06-21 22:00:00+00	upcoming	\N	\N	1760878
273	261	540	541	2026-06-21 22:00:00+00	upcoming	\N	\N	1760879
274	261	542	543	2026-06-21 22:00:00+00	upcoming	\N	\N	1760880
275	261	544	545	2026-06-21 22:00:00+00	upcoming	\N	\N	1760881
276	261	546	547	2026-06-21 22:00:00+00	upcoming	\N	\N	1760882
277	261	548	549	2026-06-21 22:00:00+00	upcoming	\N	\N	1760883
278	261	550	551	2026-06-21 22:00:00+00	upcoming	\N	\N	1760884
279	261	552	553	2026-06-21 22:00:00+00	upcoming	\N	\N	1760885
280	261	554	555	2026-06-21 22:00:00+00	upcoming	\N	\N	1760886
281	261	556	557	2026-06-21 22:00:00+00	upcoming	\N	\N	1760887
282	257	558	559	2026-06-21 22:00:00+00	upcoming	\N	\N	1762046
283	279	560	561	2026-06-21 12:00:00+00	upcoming	\N	\N	1764290
285	279	564	565	2026-06-21 14:00:00+00	upcoming	\N	\N	1764293
286	282	566	567	2026-06-21 05:00:00+00	upcoming	\N	\N	1765531
287	282	568	569	2026-06-21 07:00:00+00	upcoming	\N	\N	1765532
288	284	570	571	2026-06-21 05:15:00+00	upcoming	\N	\N	1765756
289	285	572	573	2026-06-21 04:15:00+00	upcoming	\N	\N	1765989
290	285	574	575	2026-06-21 06:30:00+00	upcoming	\N	\N	1765990
291	287	576	577	2026-06-21 15:00:00+00	upcoming	\N	\N	1766188
292	287	578	579	2026-06-21 15:00:00+00	upcoming	\N	\N	1766410
293	287	580	581	2026-06-21 15:00:00+00	upcoming	\N	\N	1766411
294	287	582	583	2026-06-21 15:00:00+00	upcoming	\N	\N	1766412
295	287	584	585	2026-06-21 15:00:00+00	upcoming	\N	\N	1766413
296	287	586	587	2026-06-21 15:00:00+00	upcoming	\N	\N	1766414
297	287	588	589	2026-06-21 15:00:00+00	upcoming	\N	\N	1766415
298	287	590	591	2026-06-21 15:00:00+00	upcoming	\N	\N	1766847
299	287	592	593	2026-06-21 15:00:00+00	upcoming	\N	\N	1766848
300	287	594	595	2026-06-21 15:00:00+00	upcoming	\N	\N	1766849
301	287	596	597	2026-06-21 15:00:00+00	upcoming	\N	\N	1766850
302	287	598	599	2026-06-21 15:00:00+00	upcoming	\N	\N	1766851
304	300	602	603	2026-06-21 14:00:00+00	upcoming	\N	\N	1770393
305	300	604	605	2026-06-21 15:00:00+00	upcoming	\N	\N	1770394
306	300	606	607	2026-06-21 15:30:00+00	upcoming	\N	\N	1770395
307	300	608	609	2026-06-21 16:00:00+00	upcoming	\N	\N	1770396
308	300	610	611	2026-06-21 17:00:00+00	upcoming	\N	\N	1770397
309	53	612	613	2026-06-21 12:00:00+00	upcoming	\N	\N	1773250
310	53	614	615	2026-06-21 14:00:00+00	upcoming	\N	\N	1773251
311	53	616	617	2026-06-21 15:00:00+00	upcoming	\N	\N	1773252
312	53	618	619	2026-06-21 17:00:00+00	upcoming	\N	\N	1773253
313	309	620	621	2026-06-21 01:00:00+00	upcoming	\N	\N	1774508
314	310	622	623	2026-06-21 20:00:00+00	upcoming	\N	\N	1775630
315	310	624	625	2026-06-21 20:00:00+00	upcoming	\N	\N	1775631
316	310	626	627	2026-06-21 20:00:00+00	upcoming	\N	\N	1775632
317	310	628	629	2026-06-21 20:00:00+00	upcoming	\N	\N	1775633
318	310	630	631	2026-06-21 20:00:00+00	upcoming	\N	\N	1775634
319	315	632	633	2026-06-21 20:00:00+00	upcoming	\N	\N	1775751
320	315	634	635	2026-06-21 20:00:00+00	upcoming	\N	\N	1775753
321	315	636	637	2026-06-21 21:00:00+00	upcoming	\N	\N	1775754
323	56	640	641	2026-06-21 00:00:00+00	upcoming	\N	\N	1776155
218	47	430	431	2026-06-21 04:00:00+00	upcoming	\N	\N	1755351
326	56	646	647	2026-06-21 18:30:00+00	upcoming	\N	\N	1776159
327	56	648	649	2026-06-21 21:00:00+00	upcoming	\N	\N	1776160
328	56	650	651	2026-06-21 21:00:00+00	upcoming	\N	\N	1776161
329	56	652	653	2026-06-21 23:30:00+00	upcoming	\N	\N	1776162
330	326	654	655	2026-06-21 21:00:00+00	upcoming	\N	\N	1776320
331	57	656	657	2026-06-21 02:30:00+00	upcoming	\N	\N	1776970
332	57	658	659	2026-06-21 21:00:00+00	upcoming	\N	\N	1776971
333	329	660	661	2026-06-21 13:00:00+00	upcoming	\N	\N	1777071
335	331	664	665	2026-06-21 17:00:00+00	upcoming	\N	\N	1778178
336	331	666	667	2026-06-21 17:00:00+00	upcoming	\N	\N	1778179
337	331	668	669	2026-06-21 17:00:00+00	upcoming	\N	\N	1778180
338	331	670	671	2026-06-21 17:00:00+00	upcoming	\N	\N	1778181
339	61	672	673	2026-06-21 14:00:00+00	upcoming	\N	\N	1779152
340	336	674	675	2026-06-21 16:30:00+00	upcoming	\N	\N	1779806
341	336	676	677	2026-06-21 16:30:00+00	upcoming	\N	\N	1779807
342	336	678	679	2026-06-21 16:30:00+00	upcoming	\N	\N	1779808
343	336	680	681	2026-06-21 16:30:00+00	upcoming	\N	\N	1779809
344	336	682	683	2026-06-21 16:30:00+00	upcoming	\N	\N	1779810
345	336	684	685	2026-06-21 17:00:00+00	upcoming	\N	\N	1779811
346	336	686	687	2026-06-21 18:00:00+00	upcoming	\N	\N	1779812
347	336	688	689	2026-06-21 18:00:00+00	upcoming	\N	\N	1779813
348	336	690	691	2026-06-21 18:00:00+00	upcoming	\N	\N	1779814
349	7	692	693	2026-06-20 02:30:00+00	upcoming	\N	\N	1722463
350	7	694	695	2026-06-20 00:00:00+00	upcoming	\N	\N	1722464
351	7	696	697	2026-06-20 22:00:00+00	upcoming	\N	\N	1722467
352	7	698	699	2026-06-20 05:00:00+00	upcoming	\N	\N	1771556
354	67	702	703	2026-06-20 13:00:00+00	upcoming	\N	\N	1758441
355	67	704	705	2026-06-20 16:00:00+00	upcoming	\N	\N	1758443
356	67	706	707	2026-06-20 17:00:00+00	upcoming	\N	\N	1758446
357	67	708	709	2026-06-20 15:00:00+00	upcoming	\N	\N	1758447
358	71	710	711	2026-06-20 16:00:00+00	upcoming	\N	\N	1751927
359	77	712	713	2026-06-20 13:30:00+00	upcoming	\N	\N	1756560
360	77	714	715	2026-06-20 19:30:00+00	upcoming	\N	\N	1756561
361	77	716	717	2026-06-20 15:30:00+00	upcoming	\N	\N	1756565
362	77	718	719	2026-06-20 17:30:00+00	upcoming	\N	\N	1756566
363	81	720	721	2026-06-20 01:00:00+00	upcoming	\N	\N	1725520
364	13	722	723	2026-06-20 14:00:00+00	upcoming	\N	\N	1728321
365	13	724	725	2026-06-20 13:00:00+00	upcoming	\N	\N	1728322
366	13	726	727	2026-06-20 20:00:00+00	upcoming	\N	\N	1728323
367	13	728	729	2026-06-20 13:00:00+00	upcoming	\N	\N	1728324
368	13	730	731	2026-06-20 13:00:00+00	upcoming	\N	\N	1728326
369	13	732	733	2026-06-20 13:00:00+00	upcoming	\N	\N	1728327
370	13	734	735	2026-06-20 15:30:00+00	upcoming	\N	\N	1728504
371	13	736	737	2026-06-20 14:00:00+00	upcoming	\N	\N	1728507
373	13	740	741	2026-06-20 13:00:00+00	upcoming	\N	\N	1728509
374	13	742	743	2026-06-20 13:00:00+00	upcoming	\N	\N	1728687
375	13	744	745	2026-06-20 14:00:00+00	upcoming	\N	\N	1728688
376	13	746	747	2026-06-20 14:00:00+00	upcoming	\N	\N	1728689
377	13	748	749	2026-06-20 14:00:00+00	upcoming	\N	\N	1728690
378	13	750	751	2026-06-20 13:00:00+00	upcoming	\N	\N	1728691
379	13	752	753	2026-06-20 13:00:00+00	upcoming	\N	\N	1729049
380	13	754	755	2026-06-20 11:00:00+00	upcoming	\N	\N	1729052
381	13	756	757	2026-06-20 15:00:00+00	upcoming	\N	\N	1729053
382	13	758	759	2026-06-20 13:00:00+00	upcoming	\N	\N	1729054
383	13	760	761	2026-06-20 14:00:00+00	upcoming	\N	\N	1729231
384	13	762	763	2026-06-20 14:00:00+00	upcoming	\N	\N	1729232
385	13	764	765	2026-06-20 15:00:00+00	upcoming	\N	\N	1729233
386	13	766	767	2026-06-20 14:00:00+00	upcoming	\N	\N	1729234
387	13	768	769	2026-06-20 14:00:00+00	upcoming	\N	\N	1729236
388	13	770	771	2026-06-20 14:00:00+00	upcoming	\N	\N	1729237
389	108	772	773	2026-06-20 12:00:00+00	upcoming	\N	\N	1729403
390	108	774	775	2026-06-20 14:30:00+00	upcoming	\N	\N	1729405
392	108	778	779	2026-06-20 17:00:00+00	upcoming	\N	\N	1729407
393	108	780	781	2026-06-20 16:00:00+00	upcoming	\N	\N	1729408
394	109	782	783	2026-06-20 15:00:00+00	upcoming	\N	\N	1729549
395	109	784	785	2026-06-20 15:30:00+00	upcoming	\N	\N	1729551
396	109	786	787	2026-06-20 15:00:00+00	upcoming	\N	\N	1729552
397	109	788	789	2026-06-20 14:00:00+00	upcoming	\N	\N	1729553
398	109	790	791	2026-06-20 14:00:00+00	upcoming	\N	\N	1729554
399	109	792	793	2026-06-20 14:00:00+00	upcoming	\N	\N	1729732
400	109	794	795	2026-06-20 14:00:00+00	upcoming	\N	\N	1729733
401	109	796	797	2026-06-20 14:30:00+00	upcoming	\N	\N	1729735
402	80	798	799	2026-06-20 20:30:00+00	upcoming	\N	\N	1731510
403	80	800	801	2026-06-20 20:30:00+00	upcoming	\N	\N	1731511
404	80	802	803	2026-06-20 21:00:00+00	upcoming	\N	\N	1731515
405	80	804	805	2026-06-20 20:00:00+00	upcoming	\N	\N	1731516
406	80	806	807	2026-06-20 20:00:00+00	upcoming	\N	\N	1731518
407	80	808	809	2026-06-20 20:30:00+00	upcoming	\N	\N	1731523
408	80	810	811	2026-06-20 20:00:00+00	upcoming	\N	\N	1731526
409	405	812	813	2026-06-20 22:00:00+00	upcoming	\N	\N	1732343
411	405	816	817	2026-06-20 22:00:00+00	upcoming	\N	\N	1732345
412	405	818	819	2026-06-20 22:00:00+00	upcoming	\N	\N	1732346
413	405	820	821	2026-06-20 22:00:00+00	upcoming	\N	\N	1732347
414	405	822	823	2026-06-20 22:00:00+00	upcoming	\N	\N	1732348
415	405	824	825	2026-06-20 22:00:00+00	upcoming	\N	\N	1732349
416	405	826	827	2026-06-20 22:00:00+00	upcoming	\N	\N	1732350
417	405	828	829	2026-06-20 22:00:00+00	upcoming	\N	\N	1732351
418	405	830	831	2026-06-20 22:00:00+00	upcoming	\N	\N	1732352
419	405	832	833	2026-06-20 22:00:00+00	upcoming	\N	\N	1732353
420	146	834	835	2026-06-20 15:00:00+00	upcoming	\N	\N	1739541
421	146	836	837	2026-06-20 15:00:00+00	upcoming	\N	\N	1739542
422	147	838	839	2026-06-20 19:30:00+00	upcoming	\N	\N	1739676
423	147	840	841	2026-06-20 20:00:00+00	upcoming	\N	\N	1739679
424	172	842	843	2026-06-20 13:30:00+00	upcoming	\N	\N	1745595
425	172	844	845	2026-06-20 16:00:00+00	upcoming	\N	\N	1745596
426	37	846	847	2026-06-20 15:00:00+00	upcoming	\N	\N	1747913
427	423	848	849	2026-06-20 08:30:00+00	upcoming	\N	\N	1750726
428	423	850	851	2026-06-20 09:00:00+00	upcoming	\N	\N	1750727
430	423	854	855	2026-06-20 09:00:00+00	upcoming	\N	\N	1750729
325	56	644	645	2026-06-21 18:30:00+00	upcoming	\N	\N	1776158
433	423	860	861	2026-06-20 11:00:00+00	upcoming	\N	\N	1750732
434	423	862	863	2026-06-20 09:00:00+00	upcoming	\N	\N	1750733
435	192	864	865	2026-06-20 07:00:00+00	upcoming	\N	\N	1751038
436	192	866	867	2026-06-20 09:00:00+00	upcoming	\N	\N	1751039
437	192	868	869	2026-06-20 09:00:00+00	upcoming	\N	\N	1751040
438	192	870	871	2026-06-20 11:15:00+00	upcoming	\N	\N	1751041
439	196	872	873	2026-06-20 12:00:00+00	upcoming	\N	\N	1751353
440	196	874	875	2026-06-20 11:00:00+00	upcoming	\N	\N	1751354
442	196	878	879	2026-06-20 12:00:00+00	upcoming	\N	\N	1751356
443	196	880	881	2026-06-20 10:00:00+00	upcoming	\N	\N	1751358
444	45	882	883	2026-06-20 07:00:00+00	upcoming	\N	\N	1753437
445	45	884	885	2026-06-20 07:15:00+00	upcoming	\N	\N	1753438
446	45	886	887	2026-06-20 10:15:00+00	upcoming	\N	\N	1753439
447	200	888	889	2026-06-20 06:00:00+00	upcoming	\N	\N	1753611
448	200	890	891	2026-06-20 07:00:00+00	upcoming	\N	\N	1753612
449	200	892	893	2026-06-20 07:00:00+00	upcoming	\N	\N	1753613
450	200	894	895	2026-06-20 10:00:00+00	upcoming	\N	\N	1753614
451	447	896	897	2026-06-20 17:00:00+00	upcoming	\N	\N	1753963
452	447	898	899	2026-06-20 17:00:00+00	upcoming	\N	\N	1753964
453	447	900	901	2026-06-20 17:00:00+00	upcoming	\N	\N	1753965
454	447	902	903	2026-06-20 17:00:00+00	upcoming	\N	\N	1753966
455	447	904	905	2026-06-20 17:00:00+00	upcoming	\N	\N	1753967
456	447	906	907	2026-06-20 17:00:00+00	upcoming	\N	\N	1753968
457	447	908	909	2026-06-20 17:00:00+00	upcoming	\N	\N	1753969
458	447	910	911	2026-06-20 17:00:00+00	upcoming	\N	\N	1753970
459	447	912	913	2026-06-20 17:00:00+00	upcoming	\N	\N	1753971
461	46	916	917	2026-06-20 15:30:00+00	upcoming	\N	\N	1754092
462	46	918	919	2026-06-20 17:30:00+00	upcoming	\N	\N	1754093
463	47	920	921	2026-06-20 21:30:00+00	upcoming	\N	\N	1754862
464	47	922	923	2026-06-20 03:00:00+00	upcoming	\N	\N	1755328
465	47	924	925	2026-06-20 02:00:00+00	upcoming	\N	\N	1755329
466	47	926	927	2026-06-20 01:00:00+00	upcoming	\N	\N	1755330
467	47	928	929	2026-06-20 01:00:00+00	upcoming	\N	\N	1755331
468	47	930	931	2026-06-20 01:30:00+00	upcoming	\N	\N	1755332
469	47	932	933	2026-06-20 02:00:00+00	upcoming	\N	\N	1755333
470	47	934	935	2026-06-20 21:00:00+00	upcoming	\N	\N	1755337
471	47	936	937	2026-06-20 22:00:00+00	upcoming	\N	\N	1755339
472	47	938	939	2026-06-20 23:00:00+00	upcoming	\N	\N	1755340
473	47	940	941	2026-06-20 21:00:00+00	upcoming	\N	\N	1755346
474	246	942	943	2026-06-20 07:00:00+00	upcoming	\N	\N	1756160
475	246	944	945	2026-06-20 10:00:00+00	upcoming	\N	\N	1756161
476	246	946	947	2026-06-20 10:00:00+00	upcoming	\N	\N	1756162
477	248	948	949	2026-06-20 06:00:00+00	upcoming	\N	\N	1756374
478	248	950	951	2026-06-20 06:00:00+00	upcoming	\N	\N	1756375
480	248	954	955	2026-06-20 08:30:00+00	upcoming	\N	\N	1756377
481	477	956	957	2026-06-20 06:30:00+00	upcoming	\N	\N	1756807
482	477	958	959	2026-06-20 09:00:00+00	upcoming	\N	\N	1756808
483	477	960	961	2026-06-20 10:30:00+00	upcoming	\N	\N	1756809
484	477	962	963	2026-06-20 10:00:00+00	upcoming	\N	\N	1756810
485	481	964	965	2026-06-20 20:00:00+00	upcoming	\N	\N	1757035
486	481	966	967	2026-06-20 20:00:00+00	upcoming	\N	\N	1757036
487	481	968	969	2026-06-20 21:00:00+00	upcoming	\N	\N	1757037
488	481	970	971	2026-06-20 20:00:00+00	upcoming	\N	\N	1757038
489	481	972	973	2026-06-20 20:00:00+00	upcoming	\N	\N	1757039
490	481	974	975	2026-06-20 21:00:00+00	upcoming	\N	\N	1757040
491	481	976	977	2026-06-20 20:00:00+00	upcoming	\N	\N	1757041
492	481	978	979	2026-06-20 20:00:00+00	upcoming	\N	\N	1757042
493	481	980	981	2026-06-20 20:00:00+00	upcoming	\N	\N	1757043
494	481	982	983	2026-06-20 20:00:00+00	upcoming	\N	\N	1757044
495	250	984	985	2026-06-20 22:00:00+00	upcoming	\N	\N	1758706
496	492	986	987	2026-06-20 11:00:00+00	upcoming	\N	\N	1759126
497	492	988	989	2026-06-20 09:00:00+00	upcoming	\N	\N	1759127
499	492	992	993	2026-06-20 09:00:00+00	upcoming	\N	\N	1759129
500	492	994	995	2026-06-20 09:00:00+00	upcoming	\N	\N	1759130
501	492	996	997	2026-06-20 09:00:00+00	upcoming	\N	\N	1759131
502	498	998	999	2026-06-20 07:30:00+00	upcoming	\N	\N	1759384
503	498	1000	1001	2026-06-20 07:30:00+00	upcoming	\N	\N	1759385
504	498	1002	1003	2026-06-20 07:30:00+00	upcoming	\N	\N	1759386
505	498	1004	1005	2026-06-20 07:30:00+00	upcoming	\N	\N	1759387
506	498	1006	1007	2026-06-20 07:30:00+00	upcoming	\N	\N	1759388
507	498	1008	1009	2026-06-20 07:30:00+00	upcoming	\N	\N	1759389
508	257	1010	1011	2026-06-20 18:00:00+00	upcoming	\N	\N	1759982
509	257	1012	1013	2026-06-20 22:00:00+00	upcoming	\N	\N	1759984
510	257	1014	1015	2026-06-20 22:00:00+00	upcoming	\N	\N	1759986
511	259	1016	1017	2026-06-20 13:00:00+00	upcoming	\N	\N	1760141
512	259	1018	1019	2026-06-20 14:00:00+00	upcoming	\N	\N	1760142
513	259	1020	1021	2026-06-20 18:00:00+00	upcoming	\N	\N	1760143
514	510	1022	1023	2026-06-20 18:00:00+00	upcoming	\N	\N	1760264
515	510	1024	1025	2026-06-20 12:00:00+00	upcoming	\N	\N	1760265
516	510	1026	1027	2026-06-20 12:00:00+00	upcoming	\N	\N	1760266
518	510	1030	1031	2026-06-20 15:30:00+00	upcoming	\N	\N	1760268
519	510	1032	1033	2026-06-20 10:30:00+00	upcoming	\N	\N	1760269
520	516	1034	1035	2026-06-20 14:00:00+00	upcoming	\N	\N	1760992
521	516	1036	1037	2026-06-20 14:00:00+00	upcoming	\N	\N	1760993
522	516	1038	1039	2026-06-20 14:00:00+00	upcoming	\N	\N	1760994
523	519	1040	1041	2026-06-20 17:00:00+00	upcoming	\N	\N	1762527
524	519	1042	1043	2026-06-20 17:00:00+00	upcoming	\N	\N	1762528
525	519	1044	1045	2026-06-20 17:00:00+00	upcoming	\N	\N	1762529
526	519	1046	1047	2026-06-20 17:00:00+00	upcoming	\N	\N	1762530
527	523	1048	1049	2026-06-20 07:30:00+00	upcoming	\N	\N	1762657
528	523	1050	1051	2026-06-20 07:30:00+00	upcoming	\N	\N	1762658
529	523	1052	1053	2026-06-20 07:30:00+00	upcoming	\N	\N	1762659
530	523	1054	1055	2026-06-20 07:30:00+00	upcoming	\N	\N	1762660
531	523	1056	1057	2026-06-20 09:30:00+00	upcoming	\N	\N	1762661
532	523	1058	1059	2026-06-20 11:30:00+00	upcoming	\N	\N	1762662
533	529	1060	1061	2026-06-20 13:00:00+00	upcoming	\N	\N	1762841
534	529	1062	1063	2026-06-20 13:30:00+00	upcoming	\N	\N	1762843
535	529	1064	1065	2026-06-20 14:00:00+00	upcoming	\N	\N	1762844
537	532	1068	1069	2026-06-20 12:00:00+00	upcoming	\N	\N	1763946
432	423	858	859	2026-06-20 10:30:00+00	upcoming	\N	\N	1750731
540	279	1074	1075	2026-06-20 12:00:00+00	upcoming	\N	\N	1764286
541	279	1076	1077	2026-06-20 14:00:00+00	upcoming	\N	\N	1764291
542	279	1078	1079	2026-06-20 16:00:00+00	upcoming	\N	\N	1764294
543	282	1080	1081	2026-06-20 06:00:00+00	upcoming	\N	\N	1765528
544	282	1082	1083	2026-06-20 08:30:00+00	upcoming	\N	\N	1765529
545	282	1084	1085	2026-06-20 08:30:00+00	upcoming	\N	\N	1765530
546	542	1086	1087	2026-06-20 09:00:00+00	upcoming	\N	\N	1765635
547	542	1088	1089	2026-06-20 09:00:00+00	upcoming	\N	\N	1765636
549	542	1092	1093	2026-06-20 09:00:00+00	upcoming	\N	\N	1765638
550	542	1094	1095	2026-06-20 09:00:00+00	upcoming	\N	\N	1765639
551	542	1096	1097	2026-06-20 09:00:00+00	upcoming	\N	\N	1765640
552	284	1098	1099	2026-06-20 06:30:00+00	upcoming	\N	\N	1765752
553	284	1100	1101	2026-06-20 06:30:00+00	upcoming	\N	\N	1765753
554	284	1102	1103	2026-06-20 06:30:00+00	upcoming	\N	\N	1765754
555	284	1104	1105	2026-06-20 06:30:00+00	upcoming	\N	\N	1765755
556	552	1106	1107	2026-06-20 06:30:00+00	upcoming	\N	\N	1765893
557	552	1108	1109	2026-06-20 08:45:00+00	upcoming	\N	\N	1765894
558	552	1110	1111	2026-06-20 08:45:00+00	upcoming	\N	\N	1765895
559	285	1112	1113	2026-06-20 06:30:00+00	upcoming	\N	\N	1765987
560	285	1114	1115	2026-06-20 06:30:00+00	upcoming	\N	\N	1765988
561	287	1116	1117	2026-06-20 15:00:00+00	upcoming	\N	\N	1766181
562	287	1118	1119	2026-06-20 15:00:00+00	upcoming	\N	\N	1766182
563	287	1120	1121	2026-06-20 15:00:00+00	upcoming	\N	\N	1766183
564	287	1122	1123	2026-06-20 15:00:00+00	upcoming	\N	\N	1766184
565	287	1124	1125	2026-06-20 16:00:00+00	upcoming	\N	\N	1766185
566	287	1126	1127	2026-06-20 15:00:00+00	upcoming	\N	\N	1766186
568	287	1130	1131	2026-06-20 15:00:00+00	upcoming	\N	\N	1766409
569	287	1132	1133	2026-06-20 15:00:00+00	upcoming	\N	\N	1766631
570	287	1134	1135	2026-06-20 15:00:00+00	upcoming	\N	\N	1766632
571	287	1136	1137	2026-06-20 16:00:00+00	upcoming	\N	\N	1766633
572	287	1138	1139	2026-06-20 15:00:00+00	upcoming	\N	\N	1766634
573	287	1140	1141	2026-06-20 15:00:00+00	upcoming	\N	\N	1766635
574	287	1142	1143	2026-06-20 15:00:00+00	upcoming	\N	\N	1766636
575	287	1144	1145	2026-06-20 15:00:00+00	upcoming	\N	\N	1766637
576	287	1146	1147	2026-06-20 14:00:00+00	upcoming	\N	\N	1766638
577	300	1148	1149	2026-06-20 17:00:00+00	upcoming	\N	\N	1770392
578	574	1150	1151	2026-06-20 06:30:00+00	upcoming	\N	\N	1770723
579	574	1152	1153	2026-06-20 07:00:00+00	upcoming	\N	\N	1770724
580	574	1154	1155	2026-06-20 07:00:00+00	upcoming	\N	\N	1770725
581	574	1156	1157	2026-06-20 08:30:00+00	upcoming	\N	\N	1770726
582	574	1158	1159	2026-06-20 10:00:00+00	upcoming	\N	\N	1770727
583	53	1160	1161	2026-06-20 12:00:00+00	upcoming	\N	\N	1773246
584	53	1162	1163	2026-06-20 14:00:00+00	upcoming	\N	\N	1773247
585	53	1164	1165	2026-06-20 15:00:00+00	upcoming	\N	\N	1773248
587	583	1168	1169	2026-06-20 20:00:00+00	upcoming	\N	\N	1773833
588	583	1170	1171	2026-06-20 20:00:00+00	upcoming	\N	\N	1773834
589	583	1172	1173	2026-06-20 20:00:00+00	upcoming	\N	\N	1773835
590	583	1174	1175	2026-06-20 20:00:00+00	upcoming	\N	\N	1773836
591	583	1176	1177	2026-06-20 20:00:00+00	upcoming	\N	\N	1773837
592	583	1178	1179	2026-06-20 20:00:00+00	upcoming	\N	\N	1773838
593	583	1180	1181	2026-06-20 20:00:00+00	upcoming	\N	\N	1773839
594	583	1182	1183	2026-06-20 20:00:00+00	upcoming	\N	\N	1773840
595	583	1184	1185	2026-06-20 20:00:00+00	upcoming	\N	\N	1773841
596	583	1186	1187	2026-06-20 20:00:00+00	upcoming	\N	\N	1773842
597	583	1188	1189	2026-06-20 20:00:00+00	upcoming	\N	\N	1773843
598	583	1190	1191	2026-06-20 20:00:00+00	upcoming	\N	\N	1773844
599	309	1192	1193	2026-06-20 23:00:00+00	upcoming	\N	\N	1774507
600	55	1194	1195	2026-06-20 14:00:00+00	upcoming	\N	\N	1774579
601	597	1196	1197	2026-06-20 16:00:00+00	upcoming	\N	\N	1775158
602	597	1198	1199	2026-06-20 18:00:00+00	upcoming	\N	\N	1775159
603	597	1200	1201	2026-06-20 18:00:00+00	upcoming	\N	\N	1775160
604	597	1202	1203	2026-06-20 18:00:00+00	upcoming	\N	\N	1775161
606	315	1206	1207	2026-06-20 21:00:00+00	upcoming	\N	\N	1775752
607	56	1208	1209	2026-06-20 01:00:00+00	upcoming	\N	\N	1776148
608	56	1210	1211	2026-06-20 02:00:00+00	upcoming	\N	\N	1776149
609	56	1212	1213	2026-06-20 18:30:00+00	upcoming	\N	\N	1776150
610	56	1214	1215	2026-06-20 21:00:00+00	upcoming	\N	\N	1776151
611	56	1216	1217	2026-06-20 21:00:00+00	upcoming	\N	\N	1776152
612	56	1218	1219	2026-06-20 23:30:00+00	upcoming	\N	\N	1776153
613	56	1220	1221	2026-06-20 18:30:00+00	upcoming	\N	\N	1776157
614	326	1222	1223	2026-06-20 23:00:00+00	upcoming	\N	\N	1776319
615	57	1224	1225	2026-06-20 02:00:00+00	upcoming	\N	\N	1776967
616	57	1226	1227	2026-06-20 21:00:00+00	upcoming	\N	\N	1776968
617	57	1228	1229	2026-06-20 23:30:00+00	upcoming	\N	\N	1776969
618	329	1230	1231	2026-06-20 13:30:00+00	upcoming	\N	\N	1777059
619	329	1232	1233	2026-06-20 13:00:00+00	upcoming	\N	\N	1777063
620	329	1234	1235	2026-06-20 09:30:00+00	upcoming	\N	\N	1777064
621	329	1236	1237	2026-06-20 13:30:00+00	upcoming	\N	\N	1777067
622	329	1238	1239	2026-06-20 13:30:00+00	upcoming	\N	\N	1777070
623	329	1240	1241	2026-06-20 13:00:00+00	upcoming	\N	\N	1777072
625	61	1244	1245	2026-06-20 14:00:00+00	upcoming	\N	\N	1777720
626	61	1246	1247	2026-06-20 17:30:00+00	upcoming	\N	\N	1777721
627	61	1248	1249	2026-06-20 18:00:00+00	upcoming	\N	\N	1777722
628	61	1250	1251	2026-06-20 18:00:00+00	upcoming	\N	\N	1777970
629	625	1252	1253	2026-06-20 20:00:00+00	upcoming	\N	\N	1778012
630	61	1254	1255	2026-06-20 14:00:00+00	upcoming	\N	\N	1778052
631	61	1256	1257	2026-06-20 14:00:00+00	upcoming	\N	\N	1778053
632	628	1258	1259	2026-06-20 13:00:00+00	upcoming	\N	\N	1778131
633	628	1260	1261	2026-06-20 15:00:00+00	upcoming	\N	\N	1778132
634	628	1262	1263	2026-06-20 13:00:00+00	upcoming	\N	\N	1778133
635	628	1264	1265	2026-06-20 15:00:00+00	upcoming	\N	\N	1778134
636	331	1266	1267	2026-06-20 17:00:00+00	upcoming	\N	\N	1778194
637	331	1268	1269	2026-06-20 17:00:00+00	upcoming	\N	\N	1778195
638	331	1270	1271	2026-06-20 17:00:00+00	upcoming	\N	\N	1778196
639	61	1272	1273	2026-06-20 11:00:00+00	upcoming	\N	\N	1779150
640	61	1274	1275	2026-06-20 11:00:00+00	upcoming	\N	\N	1779151
641	61	1276	1277	2026-06-20 14:00:00+00	upcoming	\N	\N	1779382
642	61	1278	1279	2026-06-20 16:30:00+00	upcoming	\N	\N	1779383
644	61	1282	1283	2026-06-20 14:00:00+00	upcoming	\N	\N	1779605
539	532	1072	1073	2026-06-20 12:00:00+00	upcoming	\N	\N	1763948
647	60	1288	1289	2026-06-20 17:00:00+00	upcoming	\N	\N	1780050
648	60	1290	1291	2026-06-20 17:00:00+00	upcoming	\N	\N	1780051
649	60	1292	1293	2026-06-20 17:30:00+00	upcoming	\N	\N	1780052
650	60	1294	1295	2026-06-20 17:00:00+00	upcoming	\N	\N	1780053
651	61	1296	1297	2026-06-20 16:30:00+00	upcoming	\N	\N	1780062
652	61	1298	1299	2026-06-20 14:00:00+00	upcoming	\N	\N	1780887
653	649	1300	1301	2026-06-20 22:00:00+00	upcoming	\N	\N	1781517
654	649	1302	973	2026-06-20 22:00:00+00	upcoming	\N	\N	1781518
656	649	1306	1307	2026-06-20 22:00:00+00	upcoming	\N	\N	1781520
657	649	1308	1309	2026-06-20 22:00:00+00	upcoming	\N	\N	1781521
658	649	1310	1311	2026-06-20 22:00:00+00	upcoming	\N	\N	1781522
659	655	1312	1313	2026-06-20 20:30:00+00	upcoming	\N	\N	1781558
660	655	1314	1315	2026-06-20 20:30:00+00	upcoming	\N	\N	1781559
661	655	1316	1317	2026-06-20 20:30:00+00	upcoming	\N	\N	1781560
662	655	1318	1319	2026-06-20 20:30:00+00	upcoming	\N	\N	1781561
663	655	1320	1321	2026-06-20 20:30:00+00	upcoming	\N	\N	1781562
664	655	1322	1323	2026-06-20 20:30:00+00	upcoming	\N	\N	1781563
665	655	1324	1325	2026-06-20 20:30:00+00	upcoming	\N	\N	1781564
666	655	1326	1327	2026-06-20 20:30:00+00	upcoming	\N	\N	1781565
667	663	1328	1329	2026-06-20 20:00:00+00	upcoming	\N	\N	1781711
668	663	1330	1331	2026-06-20 20:00:00+00	upcoming	\N	\N	1781712
669	7	1332	1333	2026-06-19 00:00:00+00	upcoming	\N	\N	1722461
670	7	1334	1335	2026-06-19 03:00:00+00	upcoming	\N	\N	1722462
671	7	1336	1337	2026-06-19 21:00:00+00	upcoming	\N	\N	1722465
672	668	652	114	2026-06-19 02:00:00+00	upcoming	\N	\N	1738248
673	71	1340	1341	2026-06-19 02:00:00+00	upcoming	\N	\N	1751930
675	11	25	1345	2026-06-19 20:45:00+00	upcoming	\N	\N	1726476
676	11	1346	24	2026-06-19 20:45:00+00	upcoming	\N	\N	1726477
677	11	1348	27	2026-06-19 20:45:00+00	upcoming	\N	\N	1726478
678	11	1350	1351	2026-06-19 20:45:00+00	upcoming	\N	\N	1726479
679	11	1352	26	2026-06-19 20:45:00+00	upcoming	\N	\N	1726480
680	676	1354	1355	2026-06-19 20:45:00+00	upcoming	\N	\N	1726651
681	676	1356	1357	2026-06-19 20:45:00+00	upcoming	\N	\N	1726652
682	676	1358	1359	2026-06-19 20:45:00+00	upcoming	\N	\N	1726653
683	676	1360	1361	2026-06-19 20:45:00+00	upcoming	\N	\N	1726654
684	676	1362	1363	2026-06-19 20:45:00+00	upcoming	\N	\N	1726655
685	13	1364	1365	2026-06-19 19:00:00+00	upcoming	\N	\N	1728505
686	13	1366	1367	2026-06-19 18:00:00+00	upcoming	\N	\N	1728869
687	115	1368	1369	2026-06-19 19:00:00+00	upcoming	\N	\N	1729935
688	146	1370	1371	2026-06-19 15:00:00+00	upcoming	\N	\N	1739540
689	146	1372	1373	2026-06-19 15:00:00+00	upcoming	\N	\N	1739543
690	147	1374	1375	2026-06-19 19:30:00+00	upcoming	\N	\N	1739675
691	30	1376	1377	2026-06-19 00:00:00+00	upcoming	\N	\N	1746065
692	179	1378	1379	2026-06-19 21:15:00+00	upcoming	\N	\N	1746647
694	41	90	86	2026-06-19 18:00:00+00	upcoming	\N	\N	1752749
695	45	1384	1385	2026-06-19 11:30:00+00	upcoming	\N	\N	1753434
696	45	1386	1387	2026-06-19 12:30:00+00	upcoming	\N	\N	1753435
697	45	1388	1389	2026-06-19 12:30:00+00	upcoming	\N	\N	1753436
698	200	1390	1391	2026-06-19 12:15:00+00	upcoming	\N	\N	1753609
699	200	1392	1393	2026-06-19 11:30:00+00	upcoming	\N	\N	1753610
700	47	97	410	2026-06-19 04:00:00+00	upcoming	\N	\N	1755320
701	47	1396	1397	2026-06-19 01:00:00+00	upcoming	\N	\N	1755321
702	47	457	454	2026-06-19 01:00:00+00	upcoming	\N	\N	1755322
703	47	1400	1401	2026-06-19 04:00:00+00	upcoming	\N	\N	1755323
704	47	1402	483	2026-06-19 02:00:00+00	upcoming	\N	\N	1755324
705	47	1404	102	2026-06-19 03:30:00+00	upcoming	\N	\N	1755325
706	47	416	1407	2026-06-19 03:30:00+00	upcoming	\N	\N	1755326
707	47	1408	1409	2026-06-19 22:30:00+00	upcoming	\N	\N	1755327
708	246	1410	1411	2026-06-19 11:30:00+00	upcoming	\N	\N	1756159
709	477	1412	1413	2026-06-19 12:30:00+00	upcoming	\N	\N	1756805
710	477	1414	1415	2026-06-19 12:30:00+00	upcoming	\N	\N	1756806
711	259	1416	1417	2026-06-19 17:00:00+00	upcoming	\N	\N	1760138
713	529	1420	1421	2026-06-19 13:00:00+00	upcoming	\N	\N	1762836
714	529	1422	1423	2026-06-19 13:00:00+00	upcoming	\N	\N	1762837
715	529	1424	1425	2026-06-19 13:30:00+00	upcoming	\N	\N	1762838
716	529	1426	1427	2026-06-19 13:30:00+00	upcoming	\N	\N	1762839
717	279	1428	1429	2026-06-19 17:30:00+00	upcoming	\N	\N	1764287
718	279	1430	1431	2026-06-19 16:30:00+00	upcoming	\N	\N	1764288
719	279	1432	1433	2026-06-19 15:30:00+00	upcoming	\N	\N	1764289
720	716	1434	1435	2026-06-19 16:00:00+00	upcoming	\N	\N	1765048
721	716	1436	1437	2026-06-19 15:00:00+00	upcoming	\N	\N	1765049
722	718	1438	1439	2026-06-19 21:00:00+00	upcoming	\N	\N	1765365
723	718	1440	1441	2026-06-19 20:45:00+00	upcoming	\N	\N	1765366
724	718	1442	1441	2026-06-19 20:45:00+00	upcoming	\N	\N	1765367
725	718	1444	1445	2026-06-19 21:00:00+00	upcoming	\N	\N	1765368
726	552	1446	1447	2026-06-19 12:15:00+00	upcoming	\N	\N	1765892
727	285	1448	1449	2026-06-19 12:15:00+00	upcoming	\N	\N	1765986
728	597	1450	1451	2026-06-19 21:15:00+00	upcoming	\N	\N	1775156
729	597	1452	1453	2026-06-19 22:00:00+00	upcoming	\N	\N	1775157
730	57	1454	1455	2026-06-19 23:30:00+00	upcoming	\N	\N	1776966
732	329	1458	1459	2026-06-19 13:30:00+00	upcoming	\N	\N	1777058
733	329	1460	1461	2026-06-19 13:30:00+00	upcoming	\N	\N	1777060
734	329	1462	1463	2026-06-19 13:30:00+00	upcoming	\N	\N	1777061
735	329	1464	1465	2026-06-19 13:30:00+00	upcoming	\N	\N	1777062
736	329	1466	1467	2026-06-19 13:00:00+00	upcoming	\N	\N	1777065
737	329	1468	1469	2026-06-19 09:30:00+00	upcoming	\N	\N	1777066
738	329	1470	1471	2026-06-19 09:30:00+00	upcoming	\N	\N	1777068
739	329	1472	1473	2026-06-19 10:00:00+00	upcoming	\N	\N	1777069
740	61	1474	1475	2026-06-19 18:30:00+00	upcoming	\N	\N	1777969
741	61	1476	1477	2026-06-19 14:00:00+00	upcoming	\N	\N	1779603
742	738	1478	1479	2026-06-19 15:00:00+00	upcoming	\N	\N	1781046
743	738	1480	1481	2026-06-19 15:00:00+00	upcoming	\N	\N	1781047
744	738	1482	1483	2026-06-19 15:00:00+00	upcoming	\N	\N	1781048
745	738	1484	1485	2026-06-19 15:00:00+00	upcoming	\N	\N	1781049
746	738	1486	1487	2026-06-19 15:00:00+00	upcoming	\N	\N	1781050
747	738	1488	1489	2026-06-19 15:00:00+00	upcoming	\N	\N	1781051
748	738	1490	1491	2026-06-19 15:00:00+00	upcoming	\N	\N	1781052
749	738	1492	1493	2026-06-19 15:00:00+00	upcoming	\N	\N	1781053
751	7	1496	1497	2026-06-18 01:00:00+00	upcoming	\N	\N	1722459
646	60	1286	1287	2026-06-20 18:00:00+00	upcoming	\N	\N	1780049
754	7	1502	1503	2026-06-18 21:00:00+00	upcoming	\N	\N	1771555
755	751	1504	1505	2026-06-18 17:00:00+00	upcoming	\N	\N	1730467
756	751	1506	1507	2026-06-18 18:00:00+00	upcoming	\N	\N	1730468
757	751	1508	1509	2026-06-18 15:00:00+00	upcoming	\N	\N	1730470
758	751	1510	1511	2026-06-18 18:00:00+00	upcoming	\N	\N	1730471
759	751	1512	1513	2026-06-18 19:00:00+00	upcoming	\N	\N	1730472
760	756	1514	1515	2026-06-18 15:00:00+00	upcoming	\N	\N	1679245
761	756	1516	1517	2026-06-18 13:00:00+00	upcoming	\N	\N	1679250
763	81	170	175	2026-06-18 02:00:00+00	upcoming	\N	\N	1725519
764	89	184	188	2026-06-18 02:30:00+00	upcoming	\N	\N	1726017
765	89	621	182	2026-06-18 01:00:00+00	upcoming	\N	\N	1726018
766	762	1526	1527	2026-06-18 11:59:00+00	upcoming	\N	\N	1730670
767	137	1528	1529	2026-06-18 19:00:00+00	upcoming	\N	\N	1734456
768	137	1530	1531	2026-06-18 18:30:00+00	upcoming	\N	\N	1734457
769	137	1532	1533	2026-06-18 19:00:00+00	upcoming	\N	\N	1734458
770	141	1534	1535	2026-06-18 19:00:00+00	upcoming	\N	\N	1736974
771	141	1536	1537	2026-06-18 19:00:00+00	upcoming	\N	\N	1736975
772	141	1538	1539	2026-06-18 19:00:00+00	upcoming	\N	\N	1736977
773	141	1540	1541	2026-06-18 19:00:00+00	upcoming	\N	\N	1736978
774	141	1542	1543	2026-06-18 19:00:00+00	upcoming	\N	\N	1736979
775	141	1544	1545	2026-06-18 19:30:00+00	upcoming	\N	\N	1737838
776	141	1546	1547	2026-06-18 19:00:00+00	upcoming	\N	\N	1737841
777	141	1548	1549	2026-06-18 19:00:00+00	upcoming	\N	\N	1737842
778	141	1550	1551	2026-06-18 19:30:00+00	upcoming	\N	\N	1737844
779	141	1552	1553	2026-06-18 19:00:00+00	upcoming	\N	\N	1737845
780	27	1554	1555	2026-06-18 18:00:00+00	upcoming	\N	\N	1741594
782	29	1558	1559	2026-06-18 19:00:00+00	upcoming	\N	\N	1742927
783	29	1560	1561	2026-06-18 19:15:00+00	upcoming	\N	\N	1742928
784	29	1562	1563	2026-06-18 19:00:00+00	upcoming	\N	\N	1742929
785	29	1564	1565	2026-06-18 19:30:00+00	upcoming	\N	\N	1742931
786	29	1566	1567	2026-06-18 18:30:00+00	upcoming	\N	\N	1742932
787	29	1568	1569	2026-06-18 19:15:00+00	upcoming	\N	\N	1742933
788	29	663	1571	2026-06-18 12:30:00+00	upcoming	\N	\N	1743110
789	29	1572	1573	2026-06-18 19:00:00+00	upcoming	\N	\N	1743113
790	29	1574	1575	2026-06-18 19:30:00+00	upcoming	\N	\N	1743115
791	29	1576	1577	2026-06-18 19:00:00+00	upcoming	\N	\N	1743292
792	29	1578	1579	2026-06-18 19:00:00+00	upcoming	\N	\N	1743295
793	29	1580	1581	2026-06-18 19:00:00+00	upcoming	\N	\N	1743296
794	29	1582	1583	2026-06-18 19:30:00+00	upcoming	\N	\N	1743655
795	29	121	1585	2026-06-18 19:30:00+00	upcoming	\N	\N	1743656
796	29	1586	1587	2026-06-18 19:30:00+00	upcoming	\N	\N	1743659
797	29	1588	1589	2026-06-18 19:30:00+00	upcoming	\N	\N	1743660
798	29	1590	1591	2026-06-18 19:00:00+00	upcoming	\N	\N	1743661
799	30	1592	358	2026-06-18 03:00:00+00	upcoming	\N	\N	1746063
801	29	1596	1597	2026-06-18 19:30:00+00	upcoming	\N	\N	1748253
802	29	1598	1599	2026-06-18 19:00:00+00	upcoming	\N	\N	1748254
803	29	1600	1601	2026-06-18 19:00:00+00	upcoming	\N	\N	1748255
804	39	380	384	2026-06-18 17:00:00+00	upcoming	\N	\N	1750218
805	39	385	382	2026-06-18 17:00:00+00	upcoming	\N	\N	1750219
806	39	381	81	2026-06-18 18:00:00+00	upcoming	\N	\N	1750220
807	39	82	383	2026-06-18 18:00:00+00	upcoming	\N	\N	1750221
808	39	80	83	2026-06-18 18:00:00+00	upcoming	\N	\N	1750222
809	41	87	84	2026-06-18 18:00:00+00	upcoming	\N	\N	1752745
810	41	89	399	2026-06-18 18:00:00+00	upcoming	\N	\N	1752746
811	41	91	398	2026-06-18 18:00:00+00	upcoming	\N	\N	1752747
812	47	489	488	2026-06-18 01:30:00+00	upcoming	\N	\N	1754747
813	47	443	107	2026-06-18 01:00:00+00	upcoming	\N	\N	1755283
814	47	406	1623	2026-06-18 01:30:00+00	upcoming	\N	\N	1755284
815	47	421	430	2026-06-18 01:00:00+00	upcoming	\N	\N	1755285
816	47	921	491	2026-06-18 00:00:00+00	upcoming	\N	\N	1755287
817	47	1628	424	2026-06-18 00:00:00+00	upcoming	\N	\N	1755288
818	47	935	422	2026-06-18 00:00:00+00	upcoming	\N	\N	1755289
820	47	427	440	2026-06-18 00:30:00+00	upcoming	\N	\N	1755291
821	47	434	418	2026-06-18 01:00:00+00	upcoming	\N	\N	1755292
822	47	104	469	2026-06-18 04:00:00+00	upcoming	\N	\N	1755293
823	47	106	442	2026-06-18 01:00:00+00	upcoming	\N	\N	1755294
824	47	476	1643	2026-06-18 01:00:00+00	upcoming	\N	\N	1755295
825	47	435	930	2026-06-18 01:00:00+00	upcoming	\N	\N	1755296
826	47	1646	1647	2026-06-18 04:00:00+00	upcoming	\N	\N	1755297
827	47	1648	460	2026-06-18 02:00:00+00	upcoming	\N	\N	1755298
828	47	938	1651	2026-06-18 01:00:00+00	upcoming	\N	\N	1755299
829	47	444	1653	2026-06-18 01:00:00+00	upcoming	\N	\N	1755300
830	47	461	451	2026-06-18 02:00:00+00	upcoming	\N	\N	1755301
831	47	450	446	2026-06-18 02:00:00+00	upcoming	\N	\N	1755302
832	47	409	941	2026-06-18 01:00:00+00	upcoming	\N	\N	1755303
833	47	1660	98	2026-06-18 02:00:00+00	upcoming	\N	\N	1755304
834	47	459	458	2026-06-18 04:00:00+00	upcoming	\N	\N	1755305
835	47	425	1665	2026-06-18 01:00:00+00	upcoming	\N	\N	1755306
836	47	1666	1667	2026-06-18 02:00:00+00	upcoming	\N	\N	1755307
837	47	928	477	2026-06-18 01:00:00+00	upcoming	\N	\N	1755308
839	47	445	927	2026-06-18 01:00:00+00	upcoming	\N	\N	1755310
840	47	441	426	2026-06-18 01:00:00+00	upcoming	\N	\N	1755311
841	47	1409	452	2026-06-18 02:00:00+00	upcoming	\N	\N	1755312
842	47	486	407	2026-06-18 01:30:00+00	upcoming	\N	\N	1755313
843	47	478	487	2026-06-18 01:40:00+00	upcoming	\N	\N	1755314
844	47	1682	482	2026-06-18 02:30:00+00	upcoming	\N	\N	1755315
845	47	414	484	2026-06-18 02:30:00+00	upcoming	\N	\N	1755316
846	47	493	1687	2026-06-18 01:30:00+00	upcoming	\N	\N	1755317
847	47	1688	105	2026-06-18 05:00:00+00	upcoming	\N	\N	1755318
848	47	1690	470	2026-06-18 03:00:00+00	upcoming	\N	\N	1755319
849	481	981	970	2026-06-18 00:00:00+00	upcoming	\N	\N	1757034
850	259	1694	1695	2026-06-18 18:00:00+00	upcoming	\N	\N	1760139
851	716	1696	1697	2026-06-18 14:00:00+00	upcoming	\N	\N	1765045
852	716	1698	1699	2026-06-18 15:00:00+00	upcoming	\N	\N	1765046
853	716	1700	1701	2026-06-18 13:00:00+00	upcoming	\N	\N	1765047
854	716	1702	1703	2026-06-18 12:00:00+00	upcoming	\N	\N	1765050
855	716	1704	1705	2026-06-18 17:00:00+00	upcoming	\N	\N	1765051
856	852	1706	1707	2026-06-18 09:00:00+00	upcoming	\N	\N	1774267
858	55	113	1711	2026-06-18 12:00:00+00	upcoming	\N	\N	1774578
753	7	1500	1501	2026-06-18 18:00:00+00	upcoming	\N	\N	1771554
861	61	1716	1717	2026-06-18 17:00:00+00	upcoming	\N	\N	1776358
862	331	665	666	2026-06-18 17:00:00+00	upcoming	\N	\N	1778174
863	331	667	664	2026-06-18 17:00:00+00	upcoming	\N	\N	1778175
864	331	669	670	2026-06-18 17:00:00+00	upcoming	\N	\N	1778176
865	331	671	668	2026-06-18 17:00:00+00	upcoming	\N	\N	1778177
866	7	20	1727	2026-06-17 03:00:00+00	upcoming	\N	\N	1722455
867	7	21	1729	2026-06-17 06:00:00+00	upcoming	\N	\N	1722456
868	7	1730	1731	2026-06-17 22:00:00+00	upcoming	\N	\N	1722458
870	7	23	1735	2026-06-17 00:00:00+00	upcoming	\N	\N	1771761
871	67	141	140	2026-06-17 16:00:00+00	upcoming	\N	\N	1758466
872	751	1738	1739	2026-06-17 19:00:00+00	upcoming	\N	\N	1730466
873	751	1740	1741	2026-06-17 19:00:00+00	upcoming	\N	\N	1730469
874	71	149	1743	2026-06-17 01:00:00+00	upcoming	\N	\N	1751917
875	871	1744	1745	2026-06-17 16:30:00+00	upcoming	\N	\N	1040335
876	756	1746	1747	2026-06-17 15:00:00+00	upcoming	\N	\N	1679248
877	756	1748	1749	2026-06-17 15:00:00+00	upcoming	\N	\N	1679249
878	89	191	180	2026-06-17 21:00:00+00	upcoming	\N	\N	1726019
879	762	1752	1753	2026-06-17 17:00:00+00	upcoming	\N	\N	1730671
880	762	1754	1755	2026-06-17 17:00:00+00	upcoming	\N	\N	1730672
881	762	1756	1757	2026-06-17 17:00:00+00	upcoming	\N	\N	1730673
882	762	1758	1759	2026-06-17 20:00:00+00	upcoming	\N	\N	1730674
883	762	1760	1761	2026-06-17 20:00:00+00	upcoming	\N	\N	1730675
884	80	263	808	2026-06-17 20:00:00+00	upcoming	\N	\N	1731737
885	137	1764	1765	2026-06-17 18:00:00+00	upcoming	\N	\N	1734455
886	141	1766	1767	2026-06-17 19:30:00+00	upcoming	\N	\N	1736980
887	21	53	44	2026-06-17 19:00:00+00	upcoming	\N	\N	1740640
889	21	48	51	2026-06-17 16:00:00+00	upcoming	\N	\N	1740642
890	21	50	45	2026-06-17 15:00:00+00	upcoming	\N	\N	1740643
891	21	52	47	2026-06-17 18:00:00+00	upcoming	\N	\N	1740644
892	27	1778	57	2026-06-17 17:00:00+00	upcoming	\N	\N	1741595
893	27	58	1781	2026-06-17 19:00:00+00	upcoming	\N	\N	1741597
894	29	1782	662	2026-06-17 19:30:00+00	upcoming	\N	\N	1743109
895	29	1784	1785	2026-06-17 19:00:00+00	upcoming	\N	\N	1743291
896	29	1786	1787	2026-06-17 19:00:00+00	upcoming	\N	\N	1743293
897	29	1788	1789	2026-06-17 19:00:00+00	upcoming	\N	\N	1743294
898	29	1790	1791	2026-06-17 19:00:00+00	upcoming	\N	\N	1743297
899	29	334	336	2026-06-17 18:30:00+00	upcoming	\N	\N	1743392
900	29	1794	1795	2026-06-17 19:30:00+00	upcoming	\N	\N	1743657
901	29	120	1797	2026-06-17 19:00:00+00	upcoming	\N	\N	1743658
902	898	1798	1799	2026-06-17 22:00:00+00	upcoming	\N	\N	1744747
903	898	1800	1801	2026-06-17 22:00:00+00	upcoming	\N	\N	1744748
904	898	1802	1803	2026-06-17 22:00:00+00	upcoming	\N	\N	1744749
905	898	1804	1805	2026-06-17 22:00:00+00	upcoming	\N	\N	1744750
906	898	1806	1807	2026-06-17 22:00:00+00	upcoming	\N	\N	1744751
908	898	1810	1811	2026-06-17 22:00:00+00	upcoming	\N	\N	1744753
909	898	1812	1813	2026-06-17 22:00:00+00	upcoming	\N	\N	1744754
910	898	1814	1815	2026-06-17 22:00:00+00	upcoming	\N	\N	1744755
911	898	1816	1817	2026-06-17 22:00:00+00	upcoming	\N	\N	1744756
912	898	1818	1819	2026-06-17 22:00:00+00	upcoming	\N	\N	1744757
913	898	1820	1821	2026-06-17 22:00:00+00	upcoming	\N	\N	1744758
914	898	1822	1823	2026-06-17 22:00:00+00	upcoming	\N	\N	1744759
915	898	1824	1825	2026-06-17 22:00:00+00	upcoming	\N	\N	1744760
916	898	1826	1827	2026-06-17 22:00:00+00	upcoming	\N	\N	1744761
917	898	1828	1829	2026-06-17 22:00:00+00	upcoming	\N	\N	1744762
918	898	1830	1831	2026-06-17 22:00:00+00	upcoming	\N	\N	1744763
919	898	1832	1833	2026-06-17 22:00:00+00	upcoming	\N	\N	1744764
920	172	845	346	2026-06-17 18:00:00+00	upcoming	\N	\N	1745592
921	172	843	844	2026-06-17 18:00:00+00	upcoming	\N	\N	1745593
922	172	349	842	2026-06-17 18:00:00+00	upcoming	\N	\N	1745594
923	179	363	361	2026-06-17 16:00:00+00	upcoming	\N	\N	1746640
924	179	364	360	2026-06-17 16:00:00+00	upcoming	\N	\N	1746641
925	179	366	368	2026-06-17 17:00:00+00	upcoming	\N	\N	1746675
927	37	371	373	2026-06-17 17:00:00+00	upcoming	\N	\N	1747911
928	37	374	76	2026-06-17 18:00:00+00	upcoming	\N	\N	1747912
929	47	940	1853	2026-06-17 00:00:00+00	upcoming	\N	\N	1755273
930	47	931	475	2026-06-17 01:00:00+00	upcoming	\N	\N	1755274
931	47	1856	1857	2026-06-17 01:00:00+00	upcoming	\N	\N	1755275
932	47	924	438	2026-06-17 02:00:00+00	upcoming	\N	\N	1755276
933	47	455	457	2026-06-17 01:00:00+00	upcoming	\N	\N	1755277
934	47	474	1863	2026-06-17 01:00:00+00	upcoming	\N	\N	1755278
935	47	448	492	2026-06-17 01:30:00+00	upcoming	\N	\N	1755279
936	47	932	449	2026-06-17 02:00:00+00	upcoming	\N	\N	1755280
937	47	937	456	2026-06-17 02:30:00+00	upcoming	\N	\N	1755281
938	47	1870	936	2026-06-17 02:30:00+00	upcoming	\N	\N	1755282
939	47	463	462	2026-06-17 23:00:00+00	upcoming	\N	\N	1755286
940	481	977	980	2026-06-17 20:00:00+00	upcoming	\N	\N	1757027
941	481	983	972	2026-06-17 20:00:00+00	upcoming	\N	\N	1757028
942	481	967	982	2026-06-17 20:00:00+00	upcoming	\N	\N	1757029
943	481	979	968	2026-06-17 20:00:00+00	upcoming	\N	\N	1757031
944	481	973	964	2026-06-17 20:00:00+00	upcoming	\N	\N	1757032
946	532	1071	1073	2026-06-17 12:00:00+00	upcoming	\N	\N	1763941
947	532	1067	1068	2026-06-17 12:00:00+00	upcoming	\N	\N	1763942
948	532	1069	1070	2026-06-17 12:00:00+00	upcoming	\N	\N	1763943
949	532	1066	1072	2026-06-17 12:00:00+00	upcoming	\N	\N	1763944
950	282	1082	567	2026-06-17 12:00:00+00	upcoming	\N	\N	1765519
951	852	1896	1897	2026-06-17 09:00:00+00	upcoming	\N	\N	1774265
952	852	1898	1899	2026-06-17 12:00:00+00	upcoming	\N	\N	1774266
953	949	1900	1901	2026-06-17 20:00:00+00	upcoming	\N	\N	1775337
954	949	1902	1903	2026-06-17 20:00:00+00	upcoming	\N	\N	1775338
955	949	1904	1905	2026-06-17 20:00:00+00	upcoming	\N	\N	1775341
956	949	1906	1907	2026-06-17 20:00:00+00	upcoming	\N	\N	1775345
957	949	1908	1909	2026-06-17 20:00:00+00	upcoming	\N	\N	1775346
958	310	625	630	2026-06-17 20:00:00+00	upcoming	\N	\N	1775629
959	955	1912	1913	2026-06-17 20:00:00+00	upcoming	\N	\N	1776300
960	955	1914	1915	2026-06-17 20:00:00+00	upcoming	\N	\N	1776301
961	955	1916	1917	2026-06-17 20:00:00+00	upcoming	\N	\N	1776302
962	955	1918	1919	2026-06-17 20:00:00+00	upcoming	\N	\N	1776303
963	326	1920	1921	2026-06-17 20:30:00+00	upcoming	\N	\N	1776316
965	59	345	290	2026-06-17 19:30:00+00	upcoming	\N	\N	1777278
860	326	1714	1715	2026-06-18 20:30:00+00	upcoming	\N	\N	1776318
968	628	1262	1265	2026-06-17 13:00:00+00	upcoming	\N	\N	1778129
969	628	1264	1261	2026-06-17 15:00:00+00	upcoming	\N	\N	1778130
970	331	1267	1269	2026-06-17 17:00:00+00	upcoming	\N	\N	1778191
971	331	1266	1270	2026-06-17 17:00:00+00	upcoming	\N	\N	1778192
972	331	1271	1268	2026-06-17 17:00:00+00	upcoming	\N	\N	1778193
973	46	95	404	2026-06-17 17:30:00+00	upcoming	\N	\N	1778679
974	46	917	918	2026-06-17 18:00:00+00	upcoming	\N	\N	1778680
975	971	1944	1945	2026-06-17 02:30:00+00	upcoming	\N	\N	1779105
977	972	562	159	2026-06-17 17:00:00+00	upcoming	\N	\N	1779114
978	972	564	161	2026-06-17 17:30:00+00	upcoming	\N	\N	1779115
979	61	1952	1953	2026-06-17 19:30:00+00	upcoming	\N	\N	1779149
980	61	1954	1955	2026-06-17 11:00:00+00	upcoming	\N	\N	1779602
981	61	672	125	2026-06-17 14:00:00+00	upcoming	\N	\N	1780886
982	7	133	16	2026-06-16 03:00:00+00	upcoming	\N	\N	1722452
983	7	135	18	2026-06-16 00:00:00+00	upcoming	\N	\N	1722453
984	7	22	1963	2026-06-16 21:00:00+00	upcoming	\N	\N	1722457
985	71	1964	146	2026-06-16 02:00:00+00	upcoming	\N	\N	1751915
986	71	710	144	2026-06-16 02:00:00+00	upcoming	\N	\N	1751919
987	756	1968	1969	2026-06-16 18:00:00+00	upcoming	\N	\N	1679251
988	756	1970	1971	2026-06-16 15:00:00+00	upcoming	\N	\N	1679252
989	18	43	251	2026-06-16 19:00:00+00	upcoming	\N	\N	1730904
990	18	247	248	2026-06-16 19:00:00+00	upcoming	\N	\N	1730910
991	26	55	320	2026-06-16 21:15:00+00	upcoming	\N	\N	1741435
992	26	323	316	2026-06-16 21:15:00+00	upcoming	\N	\N	1741438
993	26	325	54	2026-06-16 21:15:00+00	upcoming	\N	\N	1741440
994	27	56	59	2026-06-16 18:00:00+00	upcoming	\N	\N	1741593
996	172	1986	347	2026-06-16 18:00:00+00	upcoming	\N	\N	1745591
997	37	846	372	2026-06-16 17:00:00+00	upcoming	\N	\N	1747908
998	37	847	375	2026-06-16 18:00:00+00	upcoming	\N	\N	1747909
999	47	443	106	2026-06-16 01:00:00+00	upcoming	\N	\N	1754859
1000	47	1994	1407	2026-06-16 03:00:00+00	upcoming	\N	\N	1755271
1001	47	933	1997	2026-06-16 23:00:00+00	upcoming	\N	\N	1755272
1002	246	1410	496	2026-06-16 11:30:00+00	upcoming	\N	\N	1756145
1003	246	497	946	2026-06-16 12:30:00+00	upcoming	\N	\N	1756150
1004	477	962	959	2026-06-16 11:30:00+00	upcoming	\N	\N	1756797
1005	481	975	976	2026-06-16 20:00:00+00	upcoming	\N	\N	1757025
1006	481	971	966	2026-06-16 20:00:00+00	upcoming	\N	\N	1757026
1007	481	969	974	2026-06-16 20:00:00+00	upcoming	\N	\N	1757030
1008	250	506	502	2026-06-16 01:30:00+00	upcoming	\N	\N	1758696
1009	250	513	984	2026-06-16 01:30:00+00	upcoming	\N	\N	1758703
1010	1006	2014	2015	2026-06-16 18:30:00+00	upcoming	\N	\N	1761885
1011	1006	2016	2017	2026-06-16 18:30:00+00	upcoming	\N	\N	1761886
1012	1006	2018	2019	2026-06-16 18:30:00+00	upcoming	\N	\N	1761887
1013	1006	2020	2021	2026-06-16 18:30:00+00	upcoming	\N	\N	1761888
1015	1006	2024	2025	2026-06-16 18:30:00+00	upcoming	\N	\N	1761890
1016	1006	2026	2027	2026-06-16 18:30:00+00	upcoming	\N	\N	1761891
1017	1006	2028	2029	2026-06-16 18:30:00+00	upcoming	\N	\N	1761892
1018	57	658	1224	2026-06-16 21:00:00+00	upcoming	\N	\N	1770906
1019	57	659	1225	2026-06-16 01:00:00+00	upcoming	\N	\N	1770910
1020	53	109	616	2026-06-16 12:00:00+00	upcoming	\N	\N	1773243
1021	53	613	108	2026-06-16 15:00:00+00	upcoming	\N	\N	1773244
1022	53	111	614	2026-06-16 15:00:00+00	upcoming	\N	\N	1773245
1023	55	2040	112	2026-06-16 12:00:00+00	upcoming	\N	\N	1774577
1024	949	2042	2043	2026-06-16 20:00:00+00	upcoming	\N	\N	1775339
1025	949	2044	2045	2026-06-16 20:00:00+00	upcoming	\N	\N	1775340
1026	949	2046	2047	2026-06-16 20:00:00+00	upcoming	\N	\N	1775342
1027	949	2048	2049	2026-06-16 20:00:00+00	upcoming	\N	\N	1775343
1028	949	2050	2051	2026-06-16 20:00:00+00	upcoming	\N	\N	1775344
1029	625	2052	2053	2026-06-16 20:30:00+00	upcoming	\N	\N	1778011
1030	331	664	671	2026-06-16 17:00:00+00	upcoming	\N	\N	1778170
1031	331	666	669	2026-06-16 17:00:00+00	upcoming	\N	\N	1778171
1032	331	668	667	2026-06-16 17:00:00+00	upcoming	\N	\N	1778172
1034	46	916	94	2026-06-16 17:00:00+00	upcoming	\N	\N	1778676
1035	46	405	915	2026-06-16 17:30:00+00	upcoming	\N	\N	1778677
1036	46	919	914	2026-06-16 18:30:00+00	upcoming	\N	\N	1778678
1037	971	2068	2069	2026-06-16 02:30:00+00	upcoming	\N	\N	1779104
1038	7	697	128	2026-06-15 01:00:00+00	upcoming	\N	\N	1722449
1039	7	132	17	2026-06-15 21:00:00+00	upcoming	\N	\N	1722451
1040	7	134	19	2026-06-15 18:00:00+00	upcoming	\N	\N	1722454
1041	7	701	130	2026-06-15 04:00:00+00	upcoming	\N	\N	1771552
1042	71	147	151	2026-06-15 00:00:00+00	upcoming	\N	\N	1751914
1043	71	2080	155	2026-06-15 00:00:00+00	upcoming	\N	\N	1751920
1044	756	2082	2083	2026-06-15 15:00:00+00	upcoming	\N	\N	1679246
1045	81	720	172	2026-06-15 01:00:00+00	upcoming	\N	\N	1725518
1046	13	29	734	2026-06-15 19:00:00+00	upcoming	\N	\N	1728500
1047	13	33	748	2026-06-15 19:00:00+00	upcoming	\N	\N	1728678
1048	13	209	36	2026-06-15 18:00:00+00	upcoming	\N	\N	1728863
1049	13	205	206	2026-06-15 18:00:00+00	upcoming	\N	\N	1728864
1050	13	213	758	2026-06-15 20:00:00+00	upcoming	\N	\N	1729045
1051	13	769	764	2026-06-15 18:00:00+00	upcoming	\N	\N	1729226
1053	18	249	252	2026-06-15 19:00:00+00	upcoming	\N	\N	1730909
1054	1050	2102	2103	2026-06-15 17:30:00+00	upcoming	\N	\N	1736786
1055	149	313	304	2026-06-15 16:00:00+00	upcoming	\N	\N	1739924
1056	149	311	312	2026-06-15 18:00:00+00	upcoming	\N	\N	1739925
1057	149	303	308	2026-06-15 15:00:00+00	upcoming	\N	\N	1739926
1058	149	307	310	2026-06-15 15:00:00+00	upcoming	\N	\N	1739927
1059	149	309	306	2026-06-15 15:00:00+00	upcoming	\N	\N	1739928
1060	149	315	302	2026-06-15 15:00:00+00	upcoming	\N	\N	1739929
1061	149	305	300	2026-06-15 15:00:00+00	upcoming	\N	\N	1739930
1062	26	317	324	2026-06-15 20:00:00+00	upcoming	\N	\N	1741439
1063	29	1559	1562	2026-06-15 19:30:00+00	upcoming	\N	\N	1742926
1064	29	61	342	2026-06-15 19:15:00+00	upcoming	\N	\N	1743469
1065	30	1377	64	2026-06-15 00:00:00+00	upcoming	\N	\N	1746061
1066	30	66	68	2026-06-15 01:00:00+00	upcoming	\N	\N	1746062
1067	29	377	2129	2026-06-15 19:45:00+00	upcoming	\N	\N	1748247
1068	1064	2130	2131	2026-06-15 00:00:00+00	upcoming	\N	\N	1748915
1069	39	383	385	2026-06-15 18:00:00+00	upcoming	\N	\N	1750214
1070	41	85	86	2026-06-15 18:00:00+00	upcoming	\N	\N	1752744
1072	47	105	469	2026-06-15 02:00:00+00	upcoming	\N	\N	1755264
967	628	1263	1259	2026-06-17 13:00:00+00	upcoming	\N	\N	1778128
1075	47	465	1665	2026-06-15 01:00:00+00	upcoming	\N	\N	1755267
1076	47	923	97	2026-06-15 04:00:00+00	upcoming	\N	\N	1755268
1077	47	1400	420	2026-06-15 04:00:00+00	upcoming	\N	\N	1755269
1078	47	470	439	2026-06-15 02:00:00+00	upcoming	\N	\N	1755270
1079	250	505	509	2026-06-15 00:30:00+00	upcoming	\N	\N	1758697
1080	250	515	510	2026-06-15 23:30:00+00	upcoming	\N	\N	1758700
1081	250	985	2157	2026-06-15 00:30:00+00	upcoming	\N	\N	1758702
1082	57	657	118	2026-06-15 00:00:00+00	upcoming	\N	\N	1770911
1084	53	1167	1162	2026-06-15 14:00:00+00	upcoming	\N	\N	1773240
1085	53	617	1160	2026-06-15 15:00:00+00	upcoming	\N	\N	1773241
1086	53	615	1166	2026-06-15 17:00:00+00	upcoming	\N	\N	1773242
1087	55	1195	2169	2026-06-15 14:00:00+00	upcoming	\N	\N	1774576
1088	597	1453	1451	2026-06-15 21:15:00+00	upcoming	\N	\N	1775154
1089	597	1197	1450	2026-06-15 21:15:00+00	upcoming	\N	\N	1775155
1090	57	659	1454	2026-06-15 00:00:00+00	cancelled	\N	\N	1776964
1091	57	1227	656	2026-06-15 02:30:00+00	cancelled	\N	\N	1776965
1092	331	1268	1266	2026-06-15 17:00:00+00	upcoming	\N	\N	1778188
1093	331	1269	1271	2026-06-15 17:00:00+00	upcoming	\N	\N	1778189
1094	331	1270	1267	2026-06-15 17:00:00+00	upcoming	\N	\N	1778190
1095	336	689	680	2026-06-15 15:30:00+00	upcoming	\N	\N	1779797
1096	336	677	686	2026-06-15 15:45:00+00	upcoming	\N	\N	1779798
1097	336	685	681	2026-06-15 16:30:00+00	upcoming	\N	\N	1779799
1098	336	683	688	2026-06-15 16:30:00+00	upcoming	\N	\N	1779800
1099	336	675	678	2026-06-15 16:30:00+00	upcoming	\N	\N	1779801
1100	336	687	674	2026-06-15 16:30:00+00	upcoming	\N	\N	1779802
1101	336	691	682	2026-06-15 18:00:00+00	upcoming	\N	\N	1779803
1103	336	690	676	2026-06-15 18:00:00+00	upcoming	\N	\N	1779805
1104	7	692	695	2026-06-14 00:00:00+00	upcoming	\N	\N	1722445
1105	7	693	694	2026-06-14 03:00:00+00	upcoming	\N	\N	1722446
1106	7	696	129	2026-06-14 19:00:00+00	upcoming	\N	\N	1722448
1107	7	700	131	2026-06-14 22:00:00+00	upcoming	\N	\N	1722450
1108	7	1337	698	2026-06-14 06:00:00+00	upcoming	\N	\N	1771551
1109	67	136	702	2026-06-14 17:00:00+00	upcoming	\N	\N	1758432
1110	67	137	709	2026-06-14 16:00:00+00	upcoming	\N	\N	1758433
1111	67	707	704	2026-06-14 16:00:00+00	upcoming	\N	\N	1758435
1112	67	705	708	2026-06-14 14:00:00+00	upcoming	\N	\N	1758437
1113	67	139	706	2026-06-14 15:00:00+00	upcoming	\N	\N	1758438
1114	668	649	1211	2026-06-14 18:30:00+00	upcoming	\N	\N	1738261
1115	668	639	646	2026-06-14 02:00:00+00	upcoming	\N	\N	1738263
1116	668	1217	643	2026-06-14 23:30:00+00	upcoming	\N	\N	1738264
1117	668	650	652	2026-06-14 21:00:00+00	upcoming	\N	\N	1738265
1118	71	711	150	2026-06-14 21:00:00+00	upcoming	\N	\N	1751912
1119	71	145	154	2026-06-14 22:00:00+00	upcoming	\N	\N	1751916
1120	71	153	2235	2026-06-14 16:00:00+00	upcoming	\N	\N	1751918
1122	77	715	157	2026-06-14 17:00:00+00	upcoming	\N	\N	1756554
1123	77	713	716	2026-06-14 19:00:00+00	upcoming	\N	\N	1756558
1124	756	1515	1747	2026-06-14 15:00:00+00	upcoming	\N	\N	1679237
1125	1121	2244	2245	2026-06-14 17:00:00+00	upcoming	\N	\N	1691204
1126	1121	2246	2247	2026-06-14 17:00:00+00	upcoming	\N	\N	1691205
1127	1121	2248	2249	2026-06-14 17:00:00+00	upcoming	\N	\N	1691206
1128	1121	2250	2251	2026-06-14 17:00:00+00	upcoming	\N	\N	1691207
1129	1121	2252	2253	2026-06-14 17:00:00+00	upcoming	\N	\N	1691208
1130	1121	2254	2255	2026-06-14 17:00:00+00	upcoming	\N	\N	1691209
1131	1121	2256	2257	2026-06-14 17:00:00+00	upcoming	\N	\N	1691210
1132	1121	2258	2259	2026-06-14 17:00:00+00	upcoming	\N	\N	1691211
1133	756	1517	1518	2026-06-14 15:00:00+00	upcoming	\N	\N	1700599
1134	1130	2262	2263	2026-06-14 17:30:00+00	upcoming	\N	\N	1721093
1135	1131	2264	2265	2026-06-14 10:15:00+00	upcoming	\N	\N	1721230
1136	1130	2266	2267	2026-06-14 17:00:00+00	upcoming	\N	\N	1723189
1137	81	173	176	2026-06-14 05:00:00+00	upcoming	\N	\N	1725510
1138	81	179	167	2026-06-14 01:00:00+00	upcoming	\N	\N	1725511
1139	81	168	174	2026-06-14 02:30:00+00	upcoming	\N	\N	1725512
1141	81	170	164	2026-06-14 02:00:00+00	upcoming	\N	\N	1725514
1142	81	177	171	2026-06-14 01:00:00+00	upcoming	\N	\N	1725515
1143	81	721	166	2026-06-14 00:30:00+00	upcoming	\N	\N	1725516
1144	81	169	165	2026-06-14 01:30:00+00	upcoming	\N	\N	1725517
1145	89	180	196	2026-06-14 02:00:00+00	upcoming	\N	\N	1726005
1146	89	195	184	2026-06-14 01:30:00+00	upcoming	\N	\N	1726006
1147	89	185	192	2026-06-14 03:00:00+00	upcoming	\N	\N	1726007
1148	89	189	190	2026-06-14 03:00:00+00	upcoming	\N	\N	1726008
1149	89	620	2293	2026-06-14 01:00:00+00	upcoming	\N	\N	1726009
1150	89	181	2295	2026-06-14 00:00:00+00	upcoming	\N	\N	1726010
1151	89	1193	182	2026-06-14 02:00:00+00	upcoming	\N	\N	1726011
1152	89	193	197	2026-06-14 03:30:00+00	upcoming	\N	\N	1726012
1153	89	191	2301	2026-06-14 04:00:00+00	upcoming	\N	\N	1726013
1154	89	187	621	2026-06-14 01:00:00+00	upcoming	\N	\N	1726014
1155	89	194	1192	2026-06-14 01:00:00+00	upcoming	\N	\N	1726015
1156	89	183	186	2026-06-14 01:30:00+00	upcoming	\N	\N	1726016
1157	13	731	722	2026-06-14 16:00:00+00	upcoming	\N	\N	1728318
1158	13	741	1364	2026-06-14 14:00:00+00	upcoming	\N	\N	1728496
1160	13	37	1366	2026-06-14 15:00:00+00	upcoming	\N	\N	1728861
1161	13	757	752	2026-06-14 18:30:00+00	upcoming	\N	\N	1729043
1162	13	753	754	2026-06-14 15:00:00+00	upcoming	\N	\N	1729044
1163	109	223	790	2026-06-14 14:30:00+00	upcoming	\N	\N	1729542
1164	109	791	786	2026-06-14 13:00:00+00	upcoming	\N	\N	1729543
1165	109	785	222	2026-06-14 13:00:00+00	upcoming	\N	\N	1729545
1166	109	221	782	2026-06-14 14:30:00+00	upcoming	\N	\N	1729546
1167	109	227	794	2026-06-14 15:00:00+00	upcoming	\N	\N	1729723
1168	109	225	226	2026-06-14 16:00:00+00	upcoming	\N	\N	1729725
1169	109	231	796	2026-06-14 14:00:00+00	upcoming	\N	\N	1729726
1170	109	795	228	2026-06-14 13:00:00+00	upcoming	\N	\N	1729727
1171	109	797	230	2026-06-14 15:00:00+00	upcoming	\N	\N	1729728
1172	115	233	240	2026-06-14 16:00:00+00	upcoming	\N	\N	1729922
1173	115	235	1368	2026-06-14 16:00:00+00	upcoming	\N	\N	1729923
1174	115	241	236	2026-06-14 16:00:00+00	upcoming	\N	\N	1729924
1175	115	1369	232	2026-06-14 16:00:00+00	upcoming	\N	\N	1729925
1176	115	239	244	2026-06-14 16:00:00+00	upcoming	\N	\N	1729926
1177	115	243	238	2026-06-14 16:00:00+00	upcoming	\N	\N	1729927
1179	115	237	242	2026-06-14 16:00:00+00	upcoming	\N	\N	1729929
1074	47	922	96	2026-06-15 03:00:00+00	upcoming	\N	\N	1755266
1182	18	250	38	2026-06-14 13:00:00+00	upcoming	\N	\N	1730906
1183	18	41	246	2026-06-14 17:00:00+00	upcoming	\N	\N	1730908
1184	80	800	275	2026-06-14 20:30:00+00	upcoming	\N	\N	1731761
1185	80	256	259	2026-06-14 20:30:00+00	upcoming	\N	\N	1731762
1186	80	257	267	2026-06-14 21:00:00+00	upcoming	\N	\N	1731764
1187	80	258	810	2026-06-14 21:30:00+00	upcoming	\N	\N	1731765
1188	80	266	799	2026-06-14 20:00:00+00	upcoming	\N	\N	1731769
1189	80	268	261	2026-06-14 21:30:00+00	upcoming	\N	\N	1731770
1191	80	263	274	2026-06-14 21:00:00+00	upcoming	\N	\N	1731772
1192	80	272	809	2026-06-14 20:30:00+00	upcoming	\N	\N	1731775
1193	80	807	269	2026-06-14 22:00:00+00	upcoming	\N	\N	1731776
1194	80	162	262	2026-06-14 21:00:00+00	upcoming	\N	\N	1731778
1195	137	1530	280	2026-06-14 15:00:00+00	upcoming	\N	\N	1734449
1196	137	1531	1764	2026-06-14 16:00:00+00	upcoming	\N	\N	1734450
1197	137	277	278	2026-06-14 14:00:00+00	upcoming	\N	\N	1734452
1198	137	279	1532	2026-06-14 13:00:00+00	upcoming	\N	\N	1734453
1199	137	1530	282	2026-06-14 15:00:00+00	upcoming	\N	\N	1736475
1200	1050	2394	2395	2026-06-14 17:30:00+00	upcoming	\N	\N	1736785
1201	141	1539	1540	2026-06-14 13:00:00+00	upcoming	\N	\N	1736967
1202	141	1541	1538	2026-06-14 16:00:00+00	upcoming	\N	\N	1736970
1203	141	293	288	2026-06-14 16:00:00+00	upcoming	\N	\N	1737830
1204	141	290	1552	2026-06-14 16:00:00+00	upcoming	\N	\N	1737831
1205	141	1553	1548	2026-06-14 13:00:00+00	upcoming	\N	\N	1737833
1206	141	1547	1551	2026-06-14 16:00:00+00	upcoming	\N	\N	1737835
1207	147	297	299	2026-06-14 18:15:00+00	upcoming	\N	\N	1739672
1208	147	839	1375	2026-06-14 16:00:00+00	upcoming	\N	\N	1739673
1210	149	301	314	2026-06-14 15:00:00+00	upcoming	\N	\N	1739931
1211	26	321	318	2026-06-14 19:00:00+00	upcoming	\N	\N	1741436
1212	26	319	322	2026-06-14 19:00:00+00	upcoming	\N	\N	1741437
1213	27	1557	1554	2026-06-14 18:00:00+00	upcoming	\N	\N	1741589
1214	29	1567	1568	2026-06-14 13:00:00+00	upcoming	\N	\N	1742924
1215	29	1575	1572	2026-06-14 13:00:00+00	upcoming	\N	\N	1743105
1216	29	333	328	2026-06-14 13:00:00+00	upcoming	\N	\N	1743106
1217	29	330	332	2026-06-14 15:45:00+00	upcoming	\N	\N	1743108
1218	29	1581	1576	2026-06-14 14:00:00+00	upcoming	\N	\N	1743288
1219	29	341	338	2026-06-14 13:00:00+00	upcoming	\N	\N	1743471
1220	29	344	334	2026-06-14 17:00:00+00	upcoming	\N	\N	1743472
1221	29	1587	120	2026-06-14 13:00:00+00	upcoming	\N	\N	1743651
1222	29	1591	1582	2026-06-14 13:00:00+00	upcoming	\N	\N	1743652
1223	29	1583	1590	2026-06-14 13:00:00+00	upcoming	\N	\N	1743654
1224	172	845	349	2026-06-14 13:30:00+00	upcoming	\N	\N	1745588
1225	30	351	355	2026-06-14 02:00:00+00	upcoming	\N	\N	1746051
1226	30	356	72	2026-06-14 21:00:00+00	upcoming	\N	\N	1746052
1227	30	65	63	2026-06-14 01:00:00+00	upcoming	\N	\N	1746054
1229	30	354	70	2026-06-14 02:00:00+00	upcoming	\N	\N	1746056
1230	30	71	62	2026-06-14 21:00:00+00	upcoming	\N	\N	1746058
1231	30	69	1376	2026-06-14 21:00:00+00	upcoming	\N	\N	1746059
1232	30	67	350	2026-06-14 22:00:00+00	upcoming	\N	\N	1746060
1233	29	1601	1598	2026-06-14 13:00:00+00	upcoming	\N	\N	1748248
1234	29	379	1600	2026-06-14 13:00:00+00	upcoming	\N	\N	1748249
1235	29	2464	378	2026-06-14 15:00:00+00	upcoming	\N	\N	1748250
1236	1232	2466	2467	2026-06-14 13:00:00+00	upcoming	\N	\N	1749354
1237	39	81	382	2026-06-14 11:30:00+00	upcoming	\N	\N	1750216
1238	39	380	83	2026-06-14 18:00:00+00	upcoming	\N	\N	1750217
1239	423	853	856	2026-06-14 12:00:00+00	upcoming	\N	\N	1750718
1240	423	851	848	2026-06-14 07:00:00+00	upcoming	\N	\N	1750725
1241	192	869	393	2026-06-14 08:30:00+00	upcoming	\N	\N	1751034
1242	41	84	89	2026-06-14 14:00:00+00	upcoming	\N	\N	1752740
1243	41	87	91	2026-06-14 11:30:00+00	upcoming	\N	\N	1752743
1244	29	401	338	2026-06-14 15:00:00+00	upcoming	\N	\N	1752902
1245	46	95	917	2026-06-14 13:15:00+00	upcoming	\N	\N	1754089
1246	47	490	920	2026-06-14 00:00:00+00	upcoming	\N	\N	1755208
1248	47	104	468	2026-06-14 00:00:00+00	upcoming	\N	\N	1755213
1249	47	459	2493	2026-06-14 02:00:00+00	upcoming	\N	\N	1755219
1250	47	418	1863	2026-06-14 00:00:00+00	upcoming	\N	\N	1755220
1251	47	426	1643	2026-06-14 00:00:00+00	upcoming	\N	\N	1755221
1252	47	1660	412	2026-06-14 01:00:00+00	upcoming	\N	\N	1755222
1253	47	427	928	2026-06-14 00:30:00+00	upcoming	\N	\N	1755223
1254	47	929	477	2026-06-14 01:00:00+00	upcoming	\N	\N	1755224
1255	47	475	434	2026-06-14 01:00:00+00	upcoming	\N	\N	1755226
1256	47	452	1408	2026-06-14 01:00:00+00	upcoming	\N	\N	1755227
1257	47	937	454	2026-06-14 01:00:00+00	upcoming	\N	\N	1755228
1258	47	1404	1994	2026-06-14 03:00:00+00	upcoming	\N	\N	1755229
1259	47	451	447	2026-06-14 02:00:00+00	upcoming	\N	\N	1755230
1260	47	449	1997	2026-06-14 01:00:00+00	upcoming	\N	\N	1755231
1261	47	934	466	2026-06-14 01:00:00+00	upcoming	\N	\N	1755232
1262	47	1396	472	2026-06-14 01:00:00+00	upcoming	\N	\N	1755233
1263	47	444	107	2026-06-14 01:00:00+00	upcoming	\N	\N	1755234
1264	47	471	924	2026-06-14 02:00:00+00	upcoming	\N	\N	1755235
1265	47	941	432	2026-06-14 01:00:00+00	upcoming	\N	\N	1755236
1267	47	481	1682	2026-06-14 02:00:00+00	upcoming	\N	\N	1755238
1268	47	1667	414	2026-06-14 02:00:00+00	upcoming	\N	\N	1755239
1269	47	1623	407	2026-06-14 02:00:00+00	upcoming	\N	\N	1755240
1270	47	473	1651	2026-06-14 01:00:00+00	upcoming	\N	\N	1755241
1271	47	456	1857	2026-06-14 01:00:00+00	upcoming	\N	\N	1755242
1272	47	457	936	2026-06-14 01:00:00+00	upcoming	\N	\N	1755243
1273	47	455	1870	2026-06-14 01:00:00+00	upcoming	\N	\N	1755244
1274	47	460	450	2026-06-14 02:00:00+00	upcoming	\N	\N	1755245
1275	47	462	440	2026-06-14 01:00:00+00	upcoming	\N	\N	1755246
1276	47	425	424	2026-06-14 01:00:00+00	upcoming	\N	\N	1755247
1277	47	99	921	2026-06-14 02:00:00+00	upcoming	\N	\N	1755248
1278	47	1666	485	2026-06-14 02:00:00+00	upcoming	\N	\N	1755249
1279	47	474	2553	2026-06-14 01:00:00+00	upcoming	\N	\N	1755250
1280	47	445	489	2026-06-14 01:00:00+00	upcoming	\N	\N	1755251
1281	47	927	926	2026-06-14 01:30:00+00	upcoming	\N	\N	1755252
1282	47	463	476	2026-06-14 01:30:00+00	upcoming	\N	\N	1755253
1283	47	488	442	2026-06-14 01:30:00+00	upcoming	\N	\N	1755254
1284	47	480	1402	2026-06-14 02:30:00+00	upcoming	\N	\N	1755255
1286	47	484	415	2026-06-14 02:30:00+00	upcoming	\N	\N	1755257
1181	18	39	254	2026-06-14 15:00:00+00	upcoming	\N	\N	1730905
1289	47	416	102	2026-06-14 04:00:00+00	upcoming	\N	\N	1755260
1290	47	101	925	2026-06-14 19:00:00+00	upcoming	\N	\N	1755261
1291	47	421	431	2026-06-14 20:00:00+00	upcoming	\N	\N	1755262
1292	248	501	950	2026-06-14 03:00:00+00	upcoming	\N	\N	1756372
1293	248	499	500	2026-06-14 03:00:00+00	upcoming	\N	\N	1756373
1294	1290	2582	2583	2026-06-14 15:00:00+00	upcoming	\N	\N	1757979
1295	1290	2584	2585	2026-06-14 15:00:00+00	upcoming	\N	\N	1757980
1296	1290	2586	2587	2026-06-14 15:00:00+00	upcoming	\N	\N	1757981
1298	1290	2590	2591	2026-06-14 15:00:00+00	upcoming	\N	\N	1757983
1299	1295	2592	2593	2026-06-14 16:00:00+00	upcoming	\N	\N	1758176
1300	1295	2594	2595	2026-06-14 16:00:00+00	upcoming	\N	\N	1758177
1301	250	504	512	2026-06-14 16:00:00+00	upcoming	\N	\N	1758695
1302	250	2598	508	2026-06-14 21:30:00+00	upcoming	\N	\N	1758699
1303	250	511	507	2026-06-14 21:00:00+00	upcoming	\N	\N	1758701
1304	1300	1472	1230	2026-06-14 13:00:00+00	upcoming	\N	\N	1759658
1305	1300	1240	2605	2026-06-14 13:00:00+00	upcoming	\N	\N	1759659
1306	1300	2606	1466	2026-06-14 13:30:00+00	upcoming	\N	\N	1759660
1307	1300	2608	2609	2026-06-14 13:30:00+00	upcoming	\N	\N	1759661
1308	259	523	1419	2026-06-14 16:00:00+00	upcoming	\N	\N	1760137
1309	1305	2612	123	2026-06-14 13:00:00+00	upcoming	\N	\N	1760523
1310	1305	2614	2615	2026-06-14 14:00:00+00	upcoming	\N	\N	1760524
1311	1305	1288	1286	2026-06-14 16:00:00+00	upcoming	\N	\N	1760525
1312	1305	2618	122	2026-06-14 17:00:00+00	upcoming	\N	\N	1760526
1313	1305	2620	1292	2026-06-14 17:00:00+00	upcoming	\N	\N	1760527
1314	261	533	524	2026-06-14 22:00:00+00	upcoming	\N	\N	1760854
1315	261	557	550	2026-06-14 22:00:00+00	upcoming	\N	\N	1760855
1317	261	531	534	2026-06-14 22:00:00+00	upcoming	\N	\N	1760857
1318	261	535	546	2026-06-14 22:00:00+00	upcoming	\N	\N	1760858
1319	261	525	540	2026-06-14 22:00:00+00	upcoming	\N	\N	1760859
1320	261	547	2635	2026-06-14 22:00:00+00	upcoming	\N	\N	1760860
1321	261	553	530	2026-06-14 22:00:00+00	upcoming	\N	\N	1760861
1322	261	537	542	2026-06-14 22:00:00+00	upcoming	\N	\N	1760862
1323	261	529	2641	2026-06-14 22:00:00+00	upcoming	\N	\N	1760863
1324	261	549	526	2026-06-14 22:00:00+00	upcoming	\N	\N	1760864
1325	261	551	538	2026-06-14 22:00:00+00	upcoming	\N	\N	1760865
1326	261	539	528	2026-06-14 22:00:00+00	upcoming	\N	\N	1760866
1327	261	545	548	2026-06-14 22:00:00+00	upcoming	\N	\N	1760867
1328	261	541	536	2026-06-14 22:00:00+00	upcoming	\N	\N	1760868
1329	261	543	532	2026-06-14 22:00:00+00	upcoming	\N	\N	1760869
1330	261	555	2655	2026-06-14 22:00:00+00	upcoming	\N	\N	1760870
1331	1327	2656	2657	2026-06-14 16:00:00+00	upcoming	\N	\N	1761262
1332	257	1012	558	2026-06-14 22:00:00+00	upcoming	\N	\N	1762037
1333	529	1234	2661	2026-06-14 10:00:00+00	upcoming	\N	\N	1762829
1334	529	1424	1062	2026-06-14 13:30:00+00	upcoming	\N	\N	1762830
1336	529	1423	1063	2026-06-14 13:30:00+00	upcoming	\N	\N	1762832
1337	279	565	1428	2026-06-14 16:00:00+00	upcoming	\N	\N	1764277
1338	279	1431	560	2026-06-14 13:00:00+00	upcoming	\N	\N	1764279
1339	279	1075	1432	2026-06-14 14:00:00+00	upcoming	\N	\N	1764283
1340	282	1083	1081	2026-06-14 03:00:00+00	upcoming	\N	\N	1765526
1341	282	569	1082	2026-06-14 03:00:00+00	upcoming	\N	\N	1765527
1342	284	1104	570	2026-06-14 06:30:00+00	upcoming	\N	\N	1765750
1343	284	1101	1103	2026-06-14 06:30:00+00	upcoming	\N	\N	1765751
1344	287	589	582	2026-06-14 17:00:00+00	upcoming	\N	\N	1766404
1345	287	579	2685	2026-06-14 19:00:00+00	upcoming	\N	\N	1766405
1346	287	581	578	2026-06-14 12:00:00+00	upcoming	\N	\N	1766406
1347	287	1131	588	2026-06-14 15:00:00+00	upcoming	\N	\N	1766407
1348	287	585	1130	2026-06-14 16:00:00+00	upcoming	\N	\N	1766408
1349	287	1135	1136	2026-06-14 13:00:00+00	upcoming	\N	\N	1766630
1350	287	601	596	2026-06-14 12:00:00+00	upcoming	\N	\N	1766841
1351	287	591	592	2026-06-14 14:00:00+00	upcoming	\N	\N	1766842
1352	287	597	594	2026-06-14 12:00:00+00	upcoming	\N	\N	1766843
1353	287	595	590	2026-06-14 17:00:00+00	upcoming	\N	\N	1766844
1355	287	593	598	2026-06-14 10:00:00+00	upcoming	\N	\N	1766846
1356	1352	2706	2707	2026-06-14 21:00:00+00	upcoming	\N	\N	1770202
1357	1352	2708	2709	2026-06-14 20:00:00+00	upcoming	\N	\N	1770290
1358	1352	2710	2711	2026-06-14 23:00:00+00	upcoming	\N	\N	1770294
1359	1352	2712	2713	2026-06-14 21:00:00+00	upcoming	\N	\N	1770296
1360	1352	2714	2715	2026-06-14 20:00:00+00	upcoming	\N	\N	1770299
1361	1352	2716	2717	2026-06-14 21:00:00+00	upcoming	\N	\N	1770300
1362	1352	2718	2719	2026-06-14 21:00:00+00	upcoming	\N	\N	1770301
1363	1352	2720	2721	2026-06-14 21:00:00+00	upcoming	\N	\N	1770304
1364	1352	2722	2723	2026-06-14 23:00:00+00	upcoming	\N	\N	1770308
1365	1352	2724	2725	2026-06-14 21:00:00+00	upcoming	\N	\N	1770309
1366	1352	2726	2727	2026-06-14 21:00:00+00	upcoming	\N	\N	1770310
1367	1352	2728	2729	2026-06-14 21:00:00+00	upcoming	\N	\N	1770313
1368	1352	2730	2731	2026-06-14 21:00:00+00	upcoming	\N	\N	1770316
1369	1352	2732	2733	2026-06-14 23:00:00+00	upcoming	\N	\N	1770321
1370	1352	2734	2735	2026-06-14 22:00:00+00	upcoming	\N	\N	1770324
1371	1352	2736	2737	2026-06-14 21:00:00+00	upcoming	\N	\N	1770325
1372	1352	2738	2739	2026-06-14 22:00:00+00	upcoming	\N	\N	1770326
1374	1352	2742	2743	2026-06-14 20:00:00+00	upcoming	\N	\N	1770332
1375	1352	2744	1330	2026-06-14 22:00:00+00	upcoming	\N	\N	1770334
1376	1352	2746	2747	2026-06-14 21:00:00+00	upcoming	\N	\N	1770336
1377	300	607	608	2026-06-14 14:00:00+00	upcoming	\N	\N	1770388
1378	300	611	604	2026-06-14 14:00:00+00	upcoming	\N	\N	1770389
1379	300	1149	606	2026-06-14 15:00:00+00	upcoming	\N	\N	1770390
1380	300	605	602	2026-06-14 15:00:00+00	upcoming	\N	\N	1770391
1381	574	2756	1158	2026-06-14 07:00:00+00	upcoming	\N	\N	1770722
1382	57	1455	656	2026-06-14 00:00:00+00	upcoming	\N	\N	1770905
1383	57	1227	1228	2026-06-14 21:00:00+00	upcoming	\N	\N	1770908
1384	53	1161	1164	2026-06-14 14:00:00+00	upcoming	\N	\N	1773236
1385	53	1163	618	2026-06-14 14:00:00+00	upcoming	\N	\N	1773237
1386	53	619	110	2026-06-14 17:00:00+00	upcoming	\N	\N	1773238
1387	1383	2768	2769	2026-06-14 15:00:00+00	upcoming	\N	\N	1773676
1388	1383	2770	2771	2026-06-14 15:00:00+00	upcoming	\N	\N	1773677
1389	1383	2772	2773	2026-06-14 17:30:00+00	upcoming	\N	\N	1773678
1390	1383	2774	2775	2026-06-14 18:00:00+00	upcoming	\N	\N	1773679
1391	583	1183	1178	2026-06-14 20:00:00+00	upcoming	\N	\N	1773822
1393	583	1191	1182	2026-06-14 15:00:00+00	upcoming	\N	\N	1773829
1288	47	483	482	2026-06-14 02:30:00+00	upcoming	\N	\N	1755259
1396	583	1175	1172	2026-06-14 20:00:00+00	upcoming	\N	\N	1773832
1397	852	1709	1896	2026-06-14 09:00:00+00	upcoming	\N	\N	1774263
1398	852	1897	1898	2026-06-14 12:00:00+00	upcoming	\N	\N	1774264
1399	55	2792	1194	2026-06-14 14:00:00+00	upcoming	\N	\N	1774575
1400	597	1452	1200	2026-06-14 16:00:00+00	upcoming	\N	\N	1775151
1401	597	1203	1198	2026-06-14 18:00:00+00	upcoming	\N	\N	1775152
1402	597	1199	1196	2026-06-14 18:00:00+00	upcoming	\N	\N	1775153
1403	310	629	626	2026-06-14 20:00:00+00	upcoming	\N	\N	1775625
1405	310	623	628	2026-06-14 20:00:00+00	upcoming	\N	\N	1775627
1406	315	633	634	2026-06-14 20:00:00+00	upcoming	\N	\N	1775747
1407	315	637	1207	2026-06-14 20:00:00+00	upcoming	\N	\N	1775749
1408	955	1917	1918	2026-06-14 20:00:00+00	upcoming	\N	\N	1776296
1409	326	654	2813	2026-06-14 21:00:00+00	upcoming	\N	\N	1776315
1410	57	1455	1224	2026-06-14 00:00:00+00	cancelled	\N	\N	1776961
1411	57	117	118	2026-06-14 02:30:00+00	cancelled	\N	\N	1776962
1412	57	658	1226	2026-06-14 21:00:00+00	cancelled	\N	\N	1776963
1413	1409	2820	2821	2026-06-14 16:00:00+00	upcoming	\N	\N	1776987
1414	1409	2822	2823	2026-06-14 16:00:00+00	upcoming	\N	\N	1776988
1415	628	1259	1262	2026-06-14 15:00:00+00	upcoming	\N	\N	1778123
1416	628	1265	1258	2026-06-14 14:00:00+00	upcoming	\N	\N	1778124
1417	628	1261	1263	2026-06-14 12:00:00+00	upcoming	\N	\N	1778125
1418	628	1260	1264	2026-06-14 15:00:00+00	upcoming	\N	\N	1778126
1419	1415	2832	2833	2026-06-14 15:00:00+00	upcoming	\N	\N	1778814
1420	1416	2834	2835	2026-06-14 21:30:00+00	upcoming	\N	\N	1779376
1421	1417	2836	2837	2026-06-14 15:00:00+00	upcoming	\N	\N	1779449
1422	1417	2838	2839	2026-06-14 15:00:00+00	upcoming	\N	\N	1779450
1424	1417	2842	2843	2026-06-14 15:00:00+00	upcoming	\N	\N	1779452
1425	1421	2844	2845	2026-06-14 18:00:00+00	upcoming	\N	\N	1779782
1426	1421	2846	2847	2026-06-14 18:00:00+00	upcoming	\N	\N	1779786
1427	1421	2848	2849	2026-06-14 18:00:00+00	upcoming	\N	\N	1779787
1428	1421	2850	2851	2026-06-14 18:00:00+00	upcoming	\N	\N	1779788
1429	1425	2852	2853	2026-06-14 20:00:00+00	upcoming	\N	\N	1780725
1430	738	1485	1486	2026-06-14 15:00:00+00	upcoming	\N	\N	1781043
1431	738	1493	1484	2026-06-14 15:00:00+00	upcoming	\N	\N	1781044
1432	738	1491	1488	2026-06-14 15:00:00+00	upcoming	\N	\N	1781045
1433	1429	2860	2861	2026-06-14 15:00:00+00	upcoming	\N	\N	1781664
1434	1429	2862	2863	2026-06-14 15:00:00+00	upcoming	\N	\N	1781665
1435	1431	2864	2865	2026-06-14 01:30:00+00	upcoming	\N	\N	1781693
1436	1431	2866	2867	2026-06-14 16:00:00+00	upcoming	\N	\N	1781694
1437	1431	2868	2869	2026-06-14 20:00:00+00	upcoming	\N	\N	1781695
1438	1431	2870	2871	2026-06-14 23:00:00+00	upcoming	\N	\N	1781696
1439	7	1336	699	2026-06-13 03:00:00+00	upcoming	\N	\N	1722444
1440	7	1333	1502	2026-06-13 21:00:00+00	upcoming	\N	\N	1722447
1441	67	141	138	2026-06-13 15:00:00+00	upcoming	\N	\N	1758434
1443	67	703	142	2026-06-13 14:00:00+00	upcoming	\N	\N	1758439
1444	751	1741	1738	2026-06-13 13:00:00+00	upcoming	\N	\N	1730459
1445	751	1504	1739	2026-06-13 14:00:00+00	upcoming	\N	\N	1730460
1446	751	1740	1506	2026-06-13 15:00:00+00	upcoming	\N	\N	1730461
1447	751	1505	1508	2026-06-13 12:30:00+00	upcoming	\N	\N	1730462
1448	751	1507	1512	2026-06-13 13:00:00+00	upcoming	\N	\N	1730463
1449	751	1513	1511	2026-06-13 16:00:00+00	upcoming	\N	\N	1730464
1450	668	1208	645	2026-06-13 02:00:00+00	upcoming	\N	\N	1738258
1451	668	1219	1215	2026-06-13 23:30:00+00	upcoming	\N	\N	1738259
1452	668	1220	114	2026-06-13 18:30:00+00	upcoming	\N	\N	1738260
1453	668	640	1213	2026-06-13 21:00:00+00	upcoming	\N	\N	1738262
1454	71	1341	148	2026-06-13 00:00:00+00	upcoming	\N	\N	1751913
1455	77	1343	158	2026-06-13 14:00:00+00	upcoming	\N	\N	1756551
1456	77	161	714	2026-06-13 18:00:00+00	upcoming	\N	\N	1756553
1457	77	719	160	2026-06-13 20:00:00+00	upcoming	\N	\N	1756555
1458	77	159	718	2026-06-13 16:00:00+00	upcoming	\N	\N	1756557
1459	1455	2912	2913	2026-06-13 15:00:00+00	upcoming	\N	\N	1777856
1460	1456	2914	2915	2026-06-13 17:00:00+00	upcoming	\N	\N	1643704
1462	1456	2918	2919	2026-06-13 18:00:00+00	upcoming	\N	\N	1643706
1463	1456	2920	2921	2026-06-13 17:00:00+00	upcoming	\N	\N	1643707
1464	1456	2922	2923	2026-06-13 17:00:00+00	upcoming	\N	\N	1643708
1465	1456	2924	2925	2026-06-13 17:00:00+00	upcoming	\N	\N	1643710
1466	1456	2926	2927	2026-06-13 17:00:00+00	upcoming	\N	\N	1643711
1467	756	1516	1519	2026-06-13 13:00:00+00	upcoming	\N	\N	1679239
1468	756	1969	1749	2026-06-13 15:15:00+00	upcoming	\N	\N	1679240
1469	756	1514	1746	2026-06-13 17:30:00+00	upcoming	\N	\N	1679243
1470	1121	2934	2935	2026-06-13 17:00:00+00	upcoming	\N	\N	1690123
1471	1121	2936	2937	2026-06-13 17:00:00+00	upcoming	\N	\N	1690124
1472	1121	2938	2939	2026-06-13 17:00:00+00	upcoming	\N	\N	1690125
1473	1121	2940	2941	2026-06-13 17:00:00+00	upcoming	\N	\N	1690126
1474	1121	2942	2943	2026-06-13 17:00:00+00	upcoming	\N	\N	1690127
1475	1121	2944	2945	2026-06-13 17:00:00+00	upcoming	\N	\N	1690128
1476	1121	2946	2947	2026-06-13 17:00:00+00	upcoming	\N	\N	1690129
1477	1121	2948	2949	2026-06-13 17:00:00+00	upcoming	\N	\N	1690130
1478	1121	2950	2951	2026-06-13 17:00:00+00	upcoming	\N	\N	1690360
1479	1121	2952	2953	2026-06-13 17:00:00+00	upcoming	\N	\N	1690361
1481	1121	2956	2957	2026-06-13 17:00:00+00	upcoming	\N	\N	1690363
1482	1121	2958	2959	2026-06-13 17:00:00+00	upcoming	\N	\N	1690364
1483	1121	2960	2961	2026-06-13 17:00:00+00	upcoming	\N	\N	1690365
1484	1121	2962	2963	2026-06-13 17:00:00+00	upcoming	\N	\N	1690366
1485	1121	2964	2965	2026-06-13 17:00:00+00	upcoming	\N	\N	1690367
1486	1121	2966	2967	2026-06-13 17:00:00+00	upcoming	\N	\N	1690783
1487	1121	2968	2969	2026-06-13 17:00:00+00	upcoming	\N	\N	1690784
1488	1121	2970	2971	2026-06-13 17:00:00+00	upcoming	\N	\N	1690785
1489	1121	2972	2973	2026-06-13 17:00:00+00	upcoming	\N	\N	1690786
1490	1121	2974	2975	2026-06-13 17:00:00+00	upcoming	\N	\N	1690787
1491	1121	2976	2977	2026-06-13 17:00:00+00	upcoming	\N	\N	1690788
1492	1121	2978	2979	2026-06-13 17:00:00+00	upcoming	\N	\N	1690789
1493	1121	2980	2981	2026-06-13 17:00:00+00	upcoming	\N	\N	1690965
1494	1121	2982	2983	2026-06-13 17:00:00+00	upcoming	\N	\N	1690966
1495	1121	2984	2985	2026-06-13 17:00:00+00	upcoming	\N	\N	1690967
1496	1121	2986	2987	2026-06-13 17:00:00+00	upcoming	\N	\N	1690968
1497	1121	2988	2989	2026-06-13 17:00:00+00	upcoming	\N	\N	1690969
1498	1121	2990	2991	2026-06-13 17:00:00+00	upcoming	\N	\N	1690970
1500	1130	2994	2995	2026-06-13 10:30:00+00	upcoming	\N	\N	1720867
1395	583	1169	1170	2026-06-14 20:00:00+00	upcoming	\N	\N	1773831
1503	1130	3000	3001	2026-06-13 15:00:00+00	upcoming	\N	\N	1720871
1504	1130	3002	3003	2026-06-13 15:00:00+00	upcoming	\N	\N	1720872
1505	1130	3004	3005	2026-06-13 15:30:00+00	upcoming	\N	\N	1720873
1506	1130	3006	3007	2026-06-13 17:00:00+00	upcoming	\N	\N	1720973
1507	1130	3008	3009	2026-06-13 17:30:00+00	upcoming	\N	\N	1720976
1508	1130	3010	3011	2026-06-13 10:15:00+00	upcoming	\N	\N	1721092
1509	1130	3012	3013	2026-06-13 16:30:00+00	upcoming	\N	\N	1721095
1510	1130	3014	3015	2026-06-13 10:15:00+00	upcoming	\N	\N	1721097
1512	1131	3018	3019	2026-06-13 17:00:00+00	upcoming	\N	\N	1721225
1513	1131	3020	3021	2026-06-13 14:00:00+00	upcoming	\N	\N	1721233
1514	1510	3022	3023	2026-06-13 11:00:00+00	upcoming	\N	\N	1722770
1515	1510	3024	3025	2026-06-13 10:15:00+00	upcoming	\N	\N	1722772
1516	1510	3026	3027	2026-06-13 12:15:00+00	upcoming	\N	\N	1722774
1517	1510	3028	3029	2026-06-13 10:30:00+00	upcoming	\N	\N	1722777
1518	1130	3030	3031	2026-06-13 10:30:00+00	upcoming	\N	\N	1722944
1519	1130	3032	3033	2026-06-13 14:00:00+00	upcoming	\N	\N	1722945
1520	1130	3034	3035	2026-06-13 10:30:00+00	upcoming	\N	\N	1722946
1521	1130	3036	3037	2026-06-13 10:15:00+00	upcoming	\N	\N	1722947
1522	1130	3038	3039	2026-06-13 15:30:00+00	upcoming	\N	\N	1722949
1523	1130	3040	3041	2026-06-13 10:30:00+00	upcoming	\N	\N	1722950
1524	1130	3042	3043	2026-06-13 17:00:00+00	upcoming	\N	\N	1723063
1525	1130	3044	3045	2026-06-13 13:30:00+00	upcoming	\N	\N	1723064
1526	1130	3046	3047	2026-06-13 10:15:00+00	upcoming	\N	\N	1723066
1527	1130	3048	3049	2026-06-13 17:00:00+00	upcoming	\N	\N	1723067
1528	1130	3050	3051	2026-06-13 17:00:00+00	upcoming	\N	\N	1723068
1529	1130	3052	3053	2026-06-13 17:00:00+00	upcoming	\N	\N	1723069
1531	1130	3056	3057	2026-06-13 14:00:00+00	upcoming	\N	\N	1723183
1532	1130	3058	3059	2026-06-13 10:15:00+00	upcoming	\N	\N	1723184
1533	1130	3060	3061	2026-06-13 13:30:00+00	upcoming	\N	\N	1723185
1534	1130	3062	3063	2026-06-13 10:30:00+00	upcoming	\N	\N	1723186
1535	1130	3064	3065	2026-06-13 16:00:00+00	upcoming	\N	\N	1723187
1536	1130	3066	3067	2026-06-13 17:00:00+00	upcoming	\N	\N	1723188
1537	1130	3068	3069	2026-06-13 15:30:00+00	upcoming	\N	\N	1723190
1538	676	1357	1358	2026-06-13 20:30:00+00	upcoming	\N	\N	1726650
1539	13	729	726	2026-06-13 13:00:00+00	upcoming	\N	\N	1728314
1540	13	727	724	2026-06-13 16:00:00+00	upcoming	\N	\N	1728315
1541	13	725	730	2026-06-13 13:00:00+00	upcoming	\N	\N	1728316
1542	13	733	198	2026-06-13 12:00:00+00	upcoming	\N	\N	1728317
1543	13	723	732	2026-06-13 13:00:00+00	upcoming	\N	\N	1728319
1544	13	735	736	2026-06-13 15:30:00+00	upcoming	\N	\N	1728497
1545	13	737	28	2026-06-13 18:30:00+00	upcoming	\N	\N	1728498
1546	13	739	740	2026-06-13 13:00:00+00	upcoming	\N	\N	1728499
1547	13	1365	200	2026-06-13 15:00:00+00	upcoming	\N	\N	1728501
1548	13	201	738	2026-06-13 15:00:00+00	upcoming	\N	\N	1728502
1550	13	32	750	2026-06-13 13:00:00+00	upcoming	\N	\N	1728681
1551	13	742	30	2026-06-13 15:00:00+00	upcoming	\N	\N	1728682
1552	13	31	743	2026-06-13 13:00:00+00	upcoming	\N	\N	1728683
1553	13	749	744	2026-06-13 14:00:00+00	upcoming	\N	\N	1728684
1554	13	1367	204	2026-06-13 14:00:00+00	upcoming	\N	\N	1728860
1555	13	35	202	2026-06-13 14:00:00+00	upcoming	\N	\N	1728862
1556	13	203	34	2026-06-13 13:00:00+00	upcoming	\N	\N	1728866
1557	13	215	756	2026-06-13 14:30:00+00	upcoming	\N	\N	1729046
1558	13	211	212	2026-06-13 14:00:00+00	upcoming	\N	\N	1729047
1559	13	767	765	2026-06-13 15:00:00+00	upcoming	\N	\N	1729224
1560	13	217	768	2026-06-13 15:00:00+00	upcoming	\N	\N	1729225
1561	13	763	216	2026-06-13 14:00:00+00	upcoming	\N	\N	1729227
1562	13	771	762	2026-06-13 15:00:00+00	upcoming	\N	\N	1729228
1563	13	761	766	2026-06-13 15:00:00+00	upcoming	\N	\N	1729229
1564	13	770	760	2026-06-13 14:00:00+00	upcoming	\N	\N	1729230
1565	108	777	773	2026-06-13 13:30:00+00	upcoming	\N	\N	1729397
1566	108	219	772	2026-06-13 13:30:00+00	upcoming	\N	\N	1729398
1567	108	775	778	2026-06-13 13:30:00+00	upcoming	\N	\N	1729399
1569	108	780	776	2026-06-13 13:30:00+00	upcoming	\N	\N	1729401
1570	108	779	218	2026-06-13 16:00:00+00	upcoming	\N	\N	1729402
1571	109	789	220	2026-06-13 15:00:00+00	upcoming	\N	\N	1729541
1572	109	787	784	2026-06-13 15:00:00+00	upcoming	\N	\N	1729544
1573	109	783	788	2026-06-13 14:00:00+00	upcoming	\N	\N	1729547
1574	109	793	224	2026-06-13 14:00:00+00	upcoming	\N	\N	1729729
1575	762	1754	1756	2026-06-13 14:00:00+00	upcoming	\N	\N	1730664
1576	762	1753	1526	2026-06-13 14:00:00+00	upcoming	\N	\N	1730665
1577	762	1755	1752	2026-06-13 16:00:00+00	upcoming	\N	\N	1730666
1578	762	1761	1757	2026-06-13 16:00:00+00	upcoming	\N	\N	1730667
1579	762	1759	1760	2026-06-13 18:00:00+00	upcoming	\N	\N	1730668
1580	762	1527	1758	2026-06-13 18:00:00+00	upcoming	\N	\N	1730669
1581	80	805	265	2026-06-13 20:30:00+00	upcoming	\N	\N	1731763
1582	80	804	271	2026-06-13 21:00:00+00	upcoming	\N	\N	1731766
1583	80	806	163	2026-06-13 20:00:00+00	upcoming	\N	\N	1731767
1584	80	264	803	2026-06-13 20:30:00+00	upcoming	\N	\N	1731768
1585	80	273	801	2026-06-13 21:00:00+00	upcoming	\N	\N	1731773
1586	80	808	260	2026-06-13 20:30:00+00	upcoming	\N	\N	1731774
1588	405	817	818	2026-06-13 22:00:00+00	upcoming	\N	\N	1732332
1589	405	829	824	2026-06-13 22:00:00+00	upcoming	\N	\N	1732333
1590	405	825	816	2026-06-13 22:00:00+00	upcoming	\N	\N	1732334
1591	405	815	812	2026-06-13 22:00:00+00	upcoming	\N	\N	1732335
1592	405	821	814	2026-06-13 22:00:00+00	upcoming	\N	\N	1732336
1593	405	813	828	2026-06-13 22:00:00+00	upcoming	\N	\N	1732337
1594	405	819	822	2026-06-13 22:00:00+00	upcoming	\N	\N	1732338
1595	405	823	826	2026-06-13 22:00:00+00	upcoming	\N	\N	1732339
1596	405	831	832	2026-06-13 22:00:00+00	upcoming	\N	\N	1732340
1597	405	833	820	2026-06-13 22:00:00+00	upcoming	\N	\N	1732341
1598	405	827	830	2026-06-13 22:00:00+00	upcoming	\N	\N	1732342
1599	1595	3192	3193	2026-06-13 22:00:00+00	upcoming	\N	\N	1733092
1600	1595	3194	3195	2026-06-13 22:00:00+00	upcoming	\N	\N	1733093
1601	1595	3196	3197	2026-06-13 22:00:00+00	upcoming	\N	\N	1733094
1602	1595	3198	3199	2026-06-13 22:00:00+00	upcoming	\N	\N	1733095
1603	1595	3200	3201	2026-06-13 22:00:00+00	upcoming	\N	\N	1733096
1604	1595	3202	3203	2026-06-13 22:00:00+00	upcoming	\N	\N	1733097
1605	1595	3204	3205	2026-06-13 22:00:00+00	upcoming	\N	\N	1733098
1607	1595	3208	3209	2026-06-13 22:00:00+00	upcoming	\N	\N	1733100
1502	1130	2998	2999	2026-06-13 10:30:00+00	upcoming	\N	\N	1720870
1610	1595	3214	3215	2026-06-13 22:00:00+00	upcoming	\N	\N	1733103
1611	1595	3216	3217	2026-06-13 22:00:00+00	upcoming	\N	\N	1733104
1612	1595	3218	3219	2026-06-13 22:00:00+00	upcoming	\N	\N	1733105
1613	137	1533	1765	2026-06-13 13:00:00+00	upcoming	\N	\N	1734447
1614	137	1529	276	2026-06-13 13:00:00+00	upcoming	\N	\N	1734448
1615	137	281	1528	2026-06-13 14:00:00+00	upcoming	\N	\N	1734451
1616	1050	3226	3227	2026-06-13 15:00:00+00	upcoming	\N	\N	1736784
1617	141	1543	1766	2026-06-13 13:00:00+00	upcoming	\N	\N	1736965
1619	141	285	287	2026-06-13 13:00:00+00	upcoming	\N	\N	1736969
1620	141	1535	286	2026-06-13 16:00:00+00	upcoming	\N	\N	1736971
1621	141	1542	1536	2026-06-13 13:00:00+00	upcoming	\N	\N	1736972
1622	141	1549	1544	2026-06-13 16:00:00+00	upcoming	\N	\N	1737832
1623	141	289	1546	2026-06-13 16:00:00+00	upcoming	\N	\N	1737834
1624	141	1545	1550	2026-06-13 16:00:00+00	upcoming	\N	\N	1737836
1625	146	834	1372	2026-06-13 15:00:00+00	upcoming	\N	\N	1739536
1626	146	836	1370	2026-06-13 15:00:00+00	upcoming	\N	\N	1739537
1627	146	837	294	2026-06-13 15:00:00+00	upcoming	\N	\N	1739538
1628	146	1373	1371	2026-06-13 15:00:00+00	upcoming	\N	\N	1739539
1629	147	296	1374	2026-06-13 16:00:00+00	upcoming	\N	\N	1739670
1630	147	840	298	2026-06-13 20:00:00+00	upcoming	\N	\N	1739671
1631	21	44	50	2026-06-13 19:00:00+00	upcoming	\N	\N	1740635
1632	21	51	46	2026-06-13 18:00:00+00	upcoming	\N	\N	1740636
1633	21	47	53	2026-06-13 15:00:00+00	upcoming	\N	\N	1740637
1634	21	45	48	2026-06-13 15:00:00+00	upcoming	\N	\N	1740638
1635	21	49	52	2026-06-13 18:00:00+00	upcoming	\N	\N	1740639
1636	27	57	1556	2026-06-13 17:00:00+00	upcoming	\N	\N	1741590
1638	29	1565	326	2026-06-13 13:00:00+00	upcoming	\N	\N	1742920
1639	29	1561	1566	2026-06-13 14:00:00+00	upcoming	\N	\N	1742923
1640	29	662	1574	2026-06-13 16:00:00+00	upcoming	\N	\N	1743102
1641	29	1782	1573	2026-06-13 13:00:00+00	upcoming	\N	\N	1743103
1642	29	329	1571	2026-06-13 16:00:00+00	upcoming	\N	\N	1743104
1643	29	331	663	2026-06-13 15:00:00+00	upcoming	\N	\N	1743107
1644	29	1785	1790	2026-06-13 14:00:00+00	upcoming	\N	\N	1743284
1645	29	1789	1784	2026-06-13 14:00:00+00	upcoming	\N	\N	1743286
1646	29	60	345	2026-06-13 13:00:00+00	upcoming	\N	\N	1743466
1647	29	335	336	2026-06-13 14:00:00+00	upcoming	\N	\N	1743467
1648	29	343	340	2026-06-13 13:00:00+00	upcoming	\N	\N	1743468
1649	29	337	339	2026-06-13 16:00:00+00	upcoming	\N	\N	1743470
1650	29	1589	1794	2026-06-13 15:00:00+00	upcoming	\N	\N	1743648
1651	29	1797	1588	2026-06-13 16:00:00+00	upcoming	\N	\N	1743650
1652	172	842	1986	2026-06-13 11:30:00+00	upcoming	\N	\N	1745585
1653	172	348	844	2026-06-13 18:00:00+00	upcoming	\N	\N	1745586
1654	172	346	1984	2026-06-13 16:00:00+00	upcoming	\N	\N	1745587
1655	172	347	843	2026-06-13 13:30:00+00	upcoming	\N	\N	1745589
1657	179	1379	366	2026-06-13 16:00:00+00	upcoming	\N	\N	1746643
1658	179	365	1378	2026-06-13 18:00:00+00	upcoming	\N	\N	1746644
1659	37	77	374	2026-06-13 13:00:00+00	upcoming	\N	\N	1747905
1660	37	847	76	2026-06-13 15:00:00+00	upcoming	\N	\N	1747906
1661	37	373	370	2026-06-13 17:00:00+00	upcoming	\N	\N	1747907
1662	29	78	376	2026-06-13 13:00:00+00	upcoming	\N	\N	1748245
1663	29	79	1596	2026-06-13 14:00:00+00	upcoming	\N	\N	1748246
1664	1232	3322	3323	2026-06-13 16:00:00+00	upcoming	\N	\N	1749352
1665	1232	3324	3325	2026-06-13 17:30:00+00	upcoming	\N	\N	1749353
1666	39	384	381	2026-06-13 19:00:00+00	upcoming	\N	\N	1750215
1667	423	855	852	2026-06-13 08:30:00+00	upcoming	\N	\N	1750720
1668	423	849	862	2026-06-13 08:30:00+00	upcoming	\N	\N	1750721
1669	423	859	854	2026-06-13 09:00:00+00	upcoming	\N	\N	1750722
1670	423	861	863	2026-06-13 09:00:00+00	upcoming	\N	\N	1750723
1671	423	860	858	2026-06-13 11:00:00+00	upcoming	\N	\N	1750724
1672	192	864	870	2026-06-13 07:00:00+00	upcoming	\N	\N	1751029
1673	192	391	867	2026-06-13 07:00:00+00	upcoming	\N	\N	1751030
1674	192	871	868	2026-06-13 09:30:00+00	upcoming	\N	\N	1751031
1676	192	386	389	2026-06-13 10:00:00+00	upcoming	\N	\N	1751035
1677	41	398	88	2026-06-13 18:00:00+00	upcoming	\N	\N	1752741
1678	41	399	90	2026-06-13 18:00:00+00	upcoming	\N	\N	1752742
1679	45	1384	884	2026-06-13 07:00:00+00	upcoming	\N	\N	1753428
1680	45	882	886	2026-06-13 07:00:00+00	upcoming	\N	\N	1753429
1681	45	885	883	2026-06-13 09:00:00+00	upcoming	\N	\N	1753430
1682	45	1387	92	2026-06-13 10:30:00+00	upcoming	\N	\N	1753431
1683	45	1389	1385	2026-06-13 06:00:00+00	upcoming	\N	\N	1753432
1684	447	905	900	2026-06-13 17:00:00+00	upcoming	\N	\N	1753954
1685	447	911	906	2026-06-13 17:00:00+00	upcoming	\N	\N	1753955
1686	447	909	912	2026-06-13 17:00:00+00	upcoming	\N	\N	1753956
1687	447	899	904	2026-06-13 17:00:00+00	upcoming	\N	\N	1753957
1688	447	903	898	2026-06-13 17:00:00+00	upcoming	\N	\N	1753958
1689	447	907	910	2026-06-13 17:00:00+00	upcoming	\N	\N	1753959
1690	447	913	896	2026-06-13 17:00:00+00	upcoming	\N	\N	1753960
1691	447	901	908	2026-06-13 17:00:00+00	upcoming	\N	\N	1753961
1692	447	897	902	2026-06-13 17:00:00+00	upcoming	\N	\N	1753962
1693	46	405	918	2026-06-13 13:15:00+00	upcoming	\N	\N	1754087
1695	47	103	417	2026-06-13 03:00:00+00	upcoming	\N	\N	1755205
1696	47	428	411	2026-06-13 04:00:00+00	upcoming	\N	\N	1755206
1697	47	492	932	2026-06-13 01:00:00+00	upcoming	\N	\N	1755207
1698	47	487	486	2026-06-13 22:00:00+00	upcoming	\N	\N	1755209
1699	47	479	406	2026-06-13 19:00:00+00	upcoming	\N	\N	1755211
1700	47	1632	350	2026-06-13 22:00:00+00	upcoming	\N	\N	1755212
1701	47	939	1397	2026-06-13 21:00:00+00	upcoming	\N	\N	1755214
1702	47	433	1853	2026-06-13 21:00:00+00	upcoming	\N	\N	1755215
1703	47	467	423	2026-06-13 22:00:00+00	upcoming	\N	\N	1755216
1704	47	1628	464	2026-06-13 23:00:00+00	upcoming	\N	\N	1755217
1705	47	408	940	2026-06-13 23:00:00+00	upcoming	\N	\N	1755218
1706	246	942	945	2026-06-13 07:00:00+00	upcoming	\N	\N	1756139
1707	246	1410	944	2026-06-13 10:00:00+00	upcoming	\N	\N	1756149
1708	248	951	953	2026-06-13 06:00:00+00	upcoming	\N	\N	1756368
1709	248	949	952	2026-06-13 06:00:00+00	upcoming	\N	\N	1756369
1710	248	955	948	2026-06-13 08:30:00+00	upcoming	\N	\N	1756370
1711	248	498	954	2026-06-13 08:30:00+00	upcoming	\N	\N	1756371
1712	477	956	1414	2026-06-13 06:30:00+00	upcoming	\N	\N	1756774
1714	1290	3422	3423	2026-06-13 15:00:00+00	upcoming	\N	\N	1757899
1609	1595	3212	3213	2026-06-13 22:00:00+00	upcoming	\N	\N	1733102
1717	1290	3428	3429	2026-06-13 15:00:00+00	upcoming	\N	\N	1757902
1718	1290	3430	3431	2026-06-13 15:00:00+00	upcoming	\N	\N	1757903
1719	1295	3432	3433	2026-06-13 16:00:00+00	upcoming	\N	\N	1758174
1720	1295	3434	3435	2026-06-13 16:00:00+00	upcoming	\N	\N	1758175
1721	250	503	3437	2026-06-13 21:00:00+00	upcoming	\N	\N	1758694
1722	250	3438	514	2026-06-13 16:00:00+00	upcoming	\N	\N	1758698
1723	492	995	997	2026-06-13 09:00:00+00	upcoming	\N	\N	1759120
1724	492	989	996	2026-06-13 09:00:00+00	upcoming	\N	\N	1759121
1726	492	992	987	2026-06-13 09:00:00+00	upcoming	\N	\N	1759124
1727	492	991	994	2026-06-13 09:00:00+00	upcoming	\N	\N	1759125
1728	498	1000	1004	2026-06-13 07:30:00+00	upcoming	\N	\N	1759379
1729	498	999	1005	2026-06-13 07:30:00+00	upcoming	\N	\N	1759380
1730	498	1009	1007	2026-06-13 07:30:00+00	upcoming	\N	\N	1759381
1731	498	1006	998	2026-06-13 07:30:00+00	upcoming	\N	\N	1759382
1732	498	1003	1008	2026-06-13 09:30:00+00	upcoming	\N	\N	1759383
1733	1300	3460	3461	2026-06-13 09:30:00+00	upcoming	\N	\N	1759654
1734	1300	3462	1232	2026-06-13 13:30:00+00	upcoming	\N	\N	1759655
1735	1300	1238	660	2026-06-13 13:30:00+00	upcoming	\N	\N	1759656
1736	1300	3466	1458	2026-06-13 14:00:00+00	upcoming	\N	\N	1759657
1737	259	1019	1020	2026-06-13 16:00:00+00	upcoming	\N	\N	1760135
1738	259	520	1418	2026-06-13 18:00:00+00	upcoming	\N	\N	1760136
1739	1305	1293	1287	2026-06-13 17:00:00+00	upcoming	\N	\N	1760521
1740	1305	1290	3475	2026-06-13 18:00:00+00	upcoming	\N	\N	1760522
1741	516	3476	1035	2026-06-13 14:00:00+00	upcoming	\N	\N	1760989
1742	516	1037	1039	2026-06-13 14:00:00+00	upcoming	\N	\N	1760990
1743	516	1036	1034	2026-06-13 14:00:00+00	upcoming	\N	\N	1760991
1745	519	1045	1046	2026-06-13 17:00:00+00	upcoming	\N	\N	1762524
1746	519	1043	1040	2026-06-13 17:00:00+00	upcoming	\N	\N	1762525
1747	519	1047	1042	2026-06-13 17:00:00+00	upcoming	\N	\N	1762526
1748	523	1055	1050	2026-06-13 07:00:00+00	upcoming	\N	\N	1762653
1749	523	1053	1056	2026-06-13 07:30:00+00	upcoming	\N	\N	1762654
1750	523	1059	1052	2026-06-13 09:45:00+00	upcoming	\N	\N	1762655
1751	523	1048	1058	2026-06-13 12:00:00+00	upcoming	\N	\N	1762656
1752	529	1456	3499	2026-06-13 10:00:00+00	upcoming	\N	\N	1762821
1753	529	1468	1060	2026-06-13 10:00:00+00	upcoming	\N	\N	1762822
1754	529	3502	1420	2026-06-13 13:00:00+00	upcoming	\N	\N	1762823
1755	529	1061	1421	2026-06-13 13:00:00+00	upcoming	\N	\N	1762824
1756	529	1425	1460	2026-06-13 13:30:00+00	upcoming	\N	\N	1762825
1757	529	1462	1064	2026-06-13 13:30:00+00	upcoming	\N	\N	1762826
1758	529	1464	1470	2026-06-13 13:30:00+00	upcoming	\N	\N	1762827
1759	529	1065	1427	2026-06-13 13:30:00+00	upcoming	\N	\N	1762828
1760	532	1071	1066	2026-06-13 09:30:00+00	upcoming	\N	\N	1763939
1761	532	1072	1067	2026-06-13 09:30:00+00	upcoming	\N	\N	1763940
1762	1758	3518	3519	2026-06-13 11:00:00+00	upcoming	\N	\N	1764052
1764	279	1429	1079	2026-06-13 14:00:00+00	upcoming	\N	\N	1764280
1765	279	561	562	2026-06-13 15:00:00+00	upcoming	\N	\N	1764281
1766	279	1077	1430	2026-06-13 12:00:00+00	upcoming	\N	\N	1764282
1767	279	563	564	2026-06-13 18:30:00+00	upcoming	\N	\N	1764284
1768	279	1433	1076	2026-06-13 16:00:00+00	upcoming	\N	\N	1764285
1769	1765	3532	3533	2026-06-13 14:00:00+00	upcoming	\N	\N	1764643
1770	1765	3534	3535	2026-06-13 14:00:00+00	upcoming	\N	\N	1764644
1771	1765	3536	3537	2026-06-13 14:00:00+00	upcoming	\N	\N	1764645
1772	1765	3538	3539	2026-06-13 14:00:00+00	upcoming	\N	\N	1764673
1773	1765	3540	3541	2026-06-13 14:00:00+00	upcoming	\N	\N	1764674
1774	1765	3542	3543	2026-06-13 14:00:00+00	upcoming	\N	\N	1764675
1775	1758	3544	3545	2026-06-13 17:00:00+00	upcoming	\N	\N	1764710
1776	1758	3546	3547	2026-06-13 16:30:00+00	upcoming	\N	\N	1764711
1777	282	566	1084	2026-06-13 06:00:00+00	upcoming	\N	\N	1765523
1778	282	567	568	2026-06-13 06:00:00+00	upcoming	\N	\N	1765524
1779	282	1085	1080	2026-06-13 06:00:00+00	upcoming	\N	\N	1765525
1780	542	1088	1095	2026-06-13 09:00:00+00	upcoming	\N	\N	1765629
1781	542	1092	1091	2026-06-13 09:00:00+00	upcoming	\N	\N	1765630
1783	542	1096	1086	2026-06-13 09:00:00+00	upcoming	\N	\N	1765632
1784	542	1097	1090	2026-06-13 11:00:00+00	upcoming	\N	\N	1765633
1785	542	1087	1093	2026-06-13 12:00:00+00	upcoming	\N	\N	1765634
1786	284	1099	571	2026-06-13 06:30:00+00	upcoming	\N	\N	1765747
1787	284	1105	1102	2026-06-13 08:45:00+00	upcoming	\N	\N	1765748
1788	284	1100	1098	2026-06-13 08:45:00+00	upcoming	\N	\N	1765749
1789	552	1110	1447	2026-06-13 06:30:00+00	upcoming	\N	\N	1765888
1790	552	1106	1111	2026-06-13 06:30:00+00	upcoming	\N	\N	1765889
1791	552	1109	1446	2026-06-13 06:30:00+00	upcoming	\N	\N	1765890
1792	552	1107	1108	2026-06-13 06:30:00+00	upcoming	\N	\N	1765891
1793	285	1112	575	2026-06-13 06:30:00+00	upcoming	\N	\N	1765982
1794	285	1115	573	2026-06-13 06:30:00+00	upcoming	\N	\N	1765983
1795	285	1114	1113	2026-06-13 06:30:00+00	upcoming	\N	\N	1765984
1796	285	572	1449	2026-06-13 08:45:00+00	upcoming	\N	\N	1765985
1797	287	1119	1120	2026-06-13 15:00:00+00	upcoming	\N	\N	1766173
1798	287	1125	1126	2026-06-13 16:00:00+00	upcoming	\N	\N	1766174
1799	287	577	1122	2026-06-13 16:00:00+00	upcoming	\N	\N	1766175
1800	287	1129	1116	2026-06-13 16:00:00+00	upcoming	\N	\N	1766176
1802	287	1117	1128	2026-06-13 17:00:00+00	upcoming	\N	\N	1766178
1803	287	1123	576	2026-06-13 15:00:00+00	upcoming	\N	\N	1766179
1804	287	1127	1124	2026-06-13 15:00:00+00	upcoming	\N	\N	1766180
1805	287	583	580	2026-06-13 13:00:00+00	upcoming	\N	\N	1766402
1806	287	587	584	2026-06-13 16:00:00+00	upcoming	\N	\N	1766403
1807	287	1139	1132	2026-06-13 16:00:00+00	upcoming	\N	\N	1766623
1808	287	1143	1134	2026-06-13 17:00:00+00	upcoming	\N	\N	1766624
1809	287	1147	1140	2026-06-13 12:00:00+00	upcoming	\N	\N	1766625
1810	287	1137	1145	2026-06-13 15:00:00+00	upcoming	\N	\N	1766626
1811	287	1144	1146	2026-06-13 16:00:00+00	upcoming	\N	\N	1766627
1812	287	1133	1142	2026-06-13 06:00:00+00	upcoming	\N	\N	1766628
1813	287	1141	1138	2026-06-13 17:00:00+00	upcoming	\N	\N	1766629
1814	1810	3622	3623	2026-06-13 15:00:00+00	upcoming	\N	\N	1767033
1815	1810	3624	3625	2026-06-13 20:00:00+00	upcoming	\N	\N	1767035
1816	1810	3626	3627	2026-06-13 20:00:00+00	upcoming	\N	\N	1767036
1817	1352	3628	3629	2026-06-13 21:00:00+00	upcoming	\N	\N	1770291
1818	1352	3630	3631	2026-06-13 21:00:00+00	upcoming	\N	\N	1770302
1819	1352	3632	3633	2026-06-13 21:00:00+00	upcoming	\N	\N	1770320
1821	300	609	1148	2026-06-13 15:00:00+00	upcoming	\N	\N	1770387
1716	1290	3426	3427	2026-06-13 15:00:00+00	upcoming	\N	\N	1757901
1824	574	1153	1154	2026-06-13 07:00:00+00	upcoming	\N	\N	1770720
1825	574	1157	1151	2026-06-13 07:00:00+00	upcoming	\N	\N	1770721
1826	57	117	1454	2026-06-13 21:00:00+00	upcoming	\N	\N	1770907
1827	57	119	116	2026-06-13 01:00:00+00	upcoming	\N	\N	1770909
1828	1824	3650	3651	2026-06-13 14:00:00+00	upcoming	\N	\N	1772796
1829	1824	3652	3653	2026-06-13 14:00:00+00	upcoming	\N	\N	1772797
1830	1824	3654	3655	2026-06-13 14:00:00+00	upcoming	\N	\N	1772798
1831	1824	3656	3657	2026-06-13 14:00:00+00	upcoming	\N	\N	1772823
1833	1824	3660	3661	2026-06-13 14:00:00+00	upcoming	\N	\N	1772825
1834	1383	3662	3663	2026-06-13 14:00:00+00	upcoming	\N	\N	1773497
1835	1383	3664	3665	2026-06-13 15:00:00+00	upcoming	\N	\N	1773498
1836	1383	3666	3667	2026-06-13 16:00:00+00	upcoming	\N	\N	1773499
1837	1383	3668	3669	2026-06-13 16:00:00+00	upcoming	\N	\N	1773586
1838	1383	3670	3671	2026-06-13 16:00:00+00	upcoming	\N	\N	1773587
1839	1383	3672	3673	2026-06-13 16:00:00+00	upcoming	\N	\N	1773588
1840	583	1189	1168	2026-06-13 00:00:00+00	upcoming	\N	\N	1773821
1841	583	1173	1184	2026-06-13 20:00:00+00	upcoming	\N	\N	1773823
1842	583	1179	1190	2026-06-13 20:00:00+00	upcoming	\N	\N	1773824
1843	583	1181	1186	2026-06-13 20:00:00+00	upcoming	\N	\N	1773825
1844	583	1187	1176	2026-06-13 20:00:00+00	upcoming	\N	\N	1773826
1845	583	1185	1174	2026-06-13 20:00:00+00	upcoming	\N	\N	1773827
1846	852	1899	1706	2026-06-13 09:00:00+00	upcoming	\N	\N	1774261
1847	852	3688	1708	2026-06-13 12:00:00+00	upcoming	\N	\N	1774262
1848	55	3690	3691	2026-06-13 12:00:00+00	upcoming	\N	\N	1774574
1849	597	1201	1202	2026-06-13 18:00:00+00	upcoming	\N	\N	1775150
1850	315	1205	1206	2026-06-13 20:00:00+00	upcoming	\N	\N	1775745
1852	1848	3698	3699	2026-06-13 19:45:00+00	upcoming	\N	\N	1776372
1853	1848	3700	3701	2026-06-13 19:45:00+00	upcoming	\N	\N	1776373
1854	57	657	1229	2026-06-13 01:30:00+00	cancelled	\N	\N	1776959
1855	57	1225	116	2026-06-13 21:00:00+00	cancelled	\N	\N	1776960
1856	1852	361	360	2026-06-13 16:00:00+00	upcoming	\N	\N	1777571
1857	331	665	668	2026-06-13 17:00:00+00	upcoming	\N	\N	1778166
1858	331	667	670	2026-06-13 17:00:00+00	upcoming	\N	\N	1778167
1859	331	669	664	2026-06-13 17:00:00+00	upcoming	\N	\N	1778168
1860	331	671	666	2026-06-13 17:00:00+00	upcoming	\N	\N	1778169
1861	61	3716	3717	2026-06-13 15:00:00+00	upcoming	\N	\N	1778244
1862	1415	967	3719	2026-06-13 20:00:00+00	upcoming	\N	\N	1778810
1863	1415	974	3721	2026-06-13 20:00:00+00	upcoming	\N	\N	1778811
1864	1415	978	3723	2026-06-13 20:00:00+00	upcoming	\N	\N	1778813
1865	1861	3724	3725	2026-06-13 14:30:00+00	upcoming	\N	\N	1779442
1866	1417	3726	3727	2026-06-13 15:00:00+00	upcoming	\N	\N	1779444
1867	1417	3728	3688	2026-06-13 15:00:00+00	upcoming	\N	\N	1779445
1868	1417	3730	3731	2026-06-13 15:00:00+00	upcoming	\N	\N	1779446
1869	1417	3732	3733	2026-06-13 15:00:00+00	upcoming	\N	\N	1779447
1871	1867	3736	3737	2026-06-13 14:00:00+00	upcoming	\N	\N	1779586
1872	1421	3738	3739	2026-06-13 18:00:00+00	upcoming	\N	\N	1779781
1873	1421	3740	3741	2026-06-13 18:00:00+00	upcoming	\N	\N	1779783
1874	1421	3742	3743	2026-06-13 18:00:00+00	upcoming	\N	\N	1779784
1875	1421	3744	3745	2026-06-13 20:00:00+00	upcoming	\N	\N	1779785
1876	1425	3746	3747	2026-06-13 14:00:00+00	upcoming	\N	\N	1780718
1877	1425	3748	3749	2026-06-13 14:00:00+00	upcoming	\N	\N	1780719
1878	1425	982	3751	2026-06-13 14:00:00+00	upcoming	\N	\N	1780720
1879	1425	977	3753	2026-06-13 20:00:00+00	upcoming	\N	\N	1780721
1880	1425	3754	3755	2026-06-13 20:00:00+00	upcoming	\N	\N	1780722
1881	1425	3756	3757	2026-06-13 20:00:00+00	upcoming	\N	\N	1780723
1882	1425	3758	3759	2026-06-13 20:00:00+00	upcoming	\N	\N	1780724
1883	738	1481	1482	2026-06-13 15:00:00+00	upcoming	\N	\N	1781039
1884	738	1487	1490	2026-06-13 15:00:00+00	upcoming	\N	\N	1781040
1885	738	1489	1478	2026-06-13 15:00:00+00	upcoming	\N	\N	1781041
1886	738	1483	1492	2026-06-13 15:00:00+00	upcoming	\N	\N	1781042
1887	655	1317	1319	2026-06-13 20:30:00+00	upcoming	\N	\N	1781550
1888	655	1315	1312	2026-06-13 20:30:00+00	upcoming	\N	\N	1781551
1890	655	1316	1314	2026-06-13 20:30:00+00	upcoming	\N	\N	1781553
1891	655	3776	1322	2026-06-13 20:30:00+00	upcoming	\N	\N	1781554
1892	655	1327	1320	2026-06-13 20:30:00+00	upcoming	\N	\N	1781555
1893	655	1323	1326	2026-06-13 20:30:00+00	upcoming	\N	\N	1781556
1894	655	1321	1324	2026-06-13 20:30:00+00	upcoming	\N	\N	1781557
1895	1431	3784	3785	2026-06-13 15:00:00+00	upcoming	\N	\N	1781690
1896	1431	3786	3787	2026-06-13 18:00:00+00	upcoming	\N	\N	1781691
1897	1431	3788	3789	2026-06-13 21:00:00+00	upcoming	\N	\N	1781692
1898	663	1329	1328	2026-06-13 20:00:00+00	upcoming	\N	\N	1781709
1899	663	1331	1330	2026-06-13 20:00:00+00	upcoming	\N	\N	1781710
1900	1896	3794	3795	2026-06-13 15:00:00+00	upcoming	\N	\N	1781718
1901	7	1335	1500	2026-06-12 04:00:00+00	upcoming	\N	\N	1771549
1902	7	1332	1503	2026-06-12 21:00:00+00	upcoming	\N	\N	1771550
1903	751	1509	1510	2026-06-12 19:00:00+00	upcoming	\N	\N	1730465
1904	77	712	156	2026-06-12 18:00:00+00	upcoming	\N	\N	1756552
1905	77	717	1342	2026-06-12 16:00:00+00	upcoming	\N	\N	1756556
1906	1456	3806	3807	2026-06-12 19:30:00+00	upcoming	\N	\N	1643709
1907	756	2082	1971	2026-06-12 17:30:00+00	upcoming	\N	\N	1679238
1909	756	2083	1970	2026-06-12 15:00:00+00	upcoming	\N	\N	1679244
1910	1121	3814	3815	2026-06-12 19:00:00+00	upcoming	\N	\N	1689885
1911	1121	3816	3817	2026-06-12 19:00:00+00	upcoming	\N	\N	1689886
1912	1121	3818	3819	2026-06-12 19:00:00+00	upcoming	\N	\N	1689887
1913	1121	3820	3821	2026-06-12 19:00:00+00	upcoming	\N	\N	1689888
1914	1121	3822	3823	2026-06-12 19:00:00+00	upcoming	\N	\N	1689889
1915	1121	3824	3825	2026-06-12 19:00:00+00	upcoming	\N	\N	1689890
1916	1130	3826	3827	2026-06-12 17:30:00+00	upcoming	\N	\N	1720866
1917	1130	3828	3829	2026-06-12 18:00:00+00	upcoming	\N	\N	1720869
1918	1130	3830	3831	2026-06-12 18:00:00+00	upcoming	\N	\N	1720972
1919	1130	3832	3833	2026-06-12 17:30:00+00	upcoming	\N	\N	1720974
1920	1130	3834	3835	2026-06-12 18:00:00+00	upcoming	\N	\N	1720978
1921	1130	3836	3837	2026-06-12 17:30:00+00	upcoming	\N	\N	1721091
1922	1130	3838	3839	2026-06-12 17:30:00+00	upcoming	\N	\N	1721096
1923	1131	3840	3841	2026-06-12 16:30:00+00	upcoming	\N	\N	1721226
1924	1131	3842	3843	2026-06-12 17:30:00+00	upcoming	\N	\N	1721227
1925	1131	3844	3845	2026-06-12 18:00:00+00	upcoming	\N	\N	1721228
1926	1510	3846	3847	2026-06-12 11:00:00+00	upcoming	\N	\N	1722771
1928	11	27	25	2026-06-12 20:45:00+00	upcoming	\N	\N	1726471
1823	574	1155	1159	2026-06-13 07:00:00+00	upcoming	\N	\N	1770719
1931	11	1350	1346	2026-06-12 20:45:00+00	upcoming	\N	\N	1726474
1932	11	1352	1351	2026-06-12 20:45:00+00	upcoming	\N	\N	1726475
1933	676	1359	1362	2026-06-12 20:45:00+00	upcoming	\N	\N	1726646
1934	676	1363	1354	2026-06-12 20:45:00+00	upcoming	\N	\N	1726647
1935	676	1361	1356	2026-06-12 20:45:00+00	upcoming	\N	\N	1726648
1936	676	1355	1360	2026-06-12 20:45:00+00	upcoming	\N	\N	1726649
1937	13	207	208	2026-06-12 19:00:00+00	upcoming	\N	\N	1728865
1938	13	759	214	2026-06-12 18:30:00+00	upcoming	\N	\N	1729042
1940	1050	3874	3875	2026-06-12 17:30:00+00	upcoming	\N	\N	1736782
1941	1050	3876	3877	2026-06-12 17:30:00+00	upcoming	\N	\N	1736783
1942	141	1537	284	2026-06-12 19:00:00+00	upcoming	\N	\N	1736968
1943	141	291	292	2026-06-12 19:00:00+00	upcoming	\N	\N	1737837
1944	625	3882	3883	2026-06-12 15:00:00+00	upcoming	\N	\N	1739230
1945	625	2053	1253	2026-06-12 20:30:00+00	upcoming	\N	\N	1739231
1946	625	3886	3887	2026-06-12 15:00:00+00	upcoming	\N	\N	1739232
1947	146	835	295	2026-06-12 15:00:00+00	upcoming	\N	\N	1739535
1948	27	1781	56	2026-06-12 19:00:00+00	upcoming	\N	\N	1741588
1949	27	1778	59	2026-06-12 17:00:00+00	upcoming	\N	\N	1741592
1950	29	1563	1558	2026-06-12 19:30:00+00	upcoming	\N	\N	1742921
1951	29	1569	1560	2026-06-12 19:00:00+00	upcoming	\N	\N	1742925
1952	29	1787	1580	2026-06-12 19:00:00+00	upcoming	\N	\N	1743285
1953	29	1577	1578	2026-06-12 19:00:00+00	upcoming	\N	\N	1743287
1954	29	1791	1786	2026-06-12 19:00:00+00	upcoming	\N	\N	1743289
1955	29	1579	1788	2026-06-12 19:00:00+00	upcoming	\N	\N	1743290
1956	179	369	362	2026-06-12 21:15:00+00	upcoming	\N	\N	1746642
1957	37	371	846	2026-06-12 17:00:00+00	upcoming	\N	\N	1747903
1959	1232	3912	3913	2026-06-12 17:30:00+00	upcoming	\N	\N	1749350
1960	1232	3914	3915	2026-06-12 17:30:00+00	upcoming	\N	\N	1749351
1961	423	857	850	2026-06-12 12:15:00+00	upcoming	\N	\N	1750719
1962	192	390	387	2026-06-12 12:00:00+00	upcoming	\N	\N	1751033
1963	192	866	392	2026-06-12 11:30:00+00	upcoming	\N	\N	1751036
1964	45	93	1388	2026-06-12 11:30:00+00	upcoming	\N	\N	1753427
1965	45	887	1386	2026-06-12 12:30:00+00	upcoming	\N	\N	1753433
1966	46	404	915	2026-06-12 18:00:00+00	upcoming	\N	\N	1754085
1967	46	919	94	2026-06-12 19:00:00+00	upcoming	\N	\N	1754086
1968	46	914	916	2026-06-12 17:30:00+00	upcoming	\N	\N	1754088
1969	47	416	1404	2026-06-12 01:00:00+00	upcoming	\N	\N	1755199
1970	47	1688	468	2026-06-12 05:00:00+00	upcoming	\N	\N	1755200
1971	47	1396	938	2026-06-12 01:00:00+00	upcoming	\N	\N	1755201
1972	47	1400	431	2026-06-12 04:00:00+00	upcoming	\N	\N	1755202
1973	47	470	101	2026-06-12 03:00:00+00	upcoming	\N	\N	1755203
1974	481	974	976	2026-06-12 00:00:00+00	upcoming	\N	\N	1757021
1975	1971	3944	3945	2026-06-12 16:00:00+00	upcoming	\N	\N	1758080
1976	1971	3946	3947	2026-06-12 16:00:00+00	upcoming	\N	\N	1758081
1978	1971	3950	3951	2026-06-12 16:00:00+00	upcoming	\N	\N	1758083
1979	1971	3952	3953	2026-06-12 16:00:00+00	upcoming	\N	\N	1758084
1980	1971	3954	3955	2026-06-12 16:00:00+00	upcoming	\N	\N	1758085
1981	1971	3956	3957	2026-06-12 16:00:00+00	upcoming	\N	\N	1758086
1982	1971	3958	3959	2026-06-12 16:00:00+00	upcoming	\N	\N	1758087
1983	1295	3960	3961	2026-06-12 16:00:00+00	upcoming	\N	\N	1758172
1984	1295	3962	3963	2026-06-12 16:00:00+00	upcoming	\N	\N	1758173
1985	498	1001	1002	2026-06-12 12:15:00+00	upcoming	\N	\N	1759378
1986	259	1417	1016	2026-06-12 17:30:00+00	upcoming	\N	\N	1760131
1987	259	1021	1416	2026-06-12 17:30:00+00	upcoming	\N	\N	1760132
1988	259	521	1018	2026-06-12 18:00:00+00	upcoming	\N	\N	1760133
1989	259	1695	522	2026-06-12 18:00:00+00	upcoming	\N	\N	1760134
1990	523	1051	1057	2026-06-12 12:00:00+00	upcoming	\N	\N	1762651
1991	523	1049	1054	2026-06-12 13:00:00+00	upcoming	\N	\N	1762652
1992	532	1073	1069	2026-06-12 12:00:00+00	upcoming	\N	\N	1763938
1993	716	1703	1698	2026-06-12 14:00:00+00	upcoming	\N	\N	1765039
1994	716	1701	1702	2026-06-12 14:00:00+00	upcoming	\N	\N	1765040
1995	716	1434	1436	2026-06-12 16:00:00+00	upcoming	\N	\N	1765042
1997	718	1438	1445	2026-06-12 21:00:00+00	upcoming	\N	\N	1765363
1998	718	1442	1441	2026-06-12 20:45:00+00	upcoming	\N	\N	1765364
1999	285	1448	574	2026-06-12 12:15:00+00	upcoming	\N	\N	1765981
2000	1810	3994	3995	2026-06-12 15:00:00+00	upcoming	\N	\N	1767032
2001	1810	3996	3997	2026-06-12 15:00:00+00	upcoming	\N	\N	1767034
2002	57	1226	1229	2026-06-12 21:00:00+00	upcoming	\N	\N	1770904
2003	1383	4000	4001	2026-06-12 18:00:00+00	upcoming	\N	\N	1773496
2004	1383	4002	4003	2026-06-12 17:30:00+00	upcoming	\N	\N	1773584
2005	1383	4004	4005	2026-06-12 18:30:00+00	upcoming	\N	\N	1773585
2006	1383	4006	4007	2026-06-12 17:30:00+00	upcoming	\N	\N	1773675
2007	315	632	636	2026-06-12 20:00:00+00	upcoming	\N	\N	1775748
2008	1848	4010	4011	2026-06-12 19:45:00+00	upcoming	\N	\N	1776374
2009	1848	4012	4013	2026-06-12 19:45:00+00	upcoming	\N	\N	1776375
2010	57	119	1228	2026-06-12 23:00:00+00	cancelled	\N	\N	1776958
2011	1852	55	325	2026-06-12 22:15:00+00	upcoming	\N	\N	1777573
2012	1852	368	316	2026-06-12 19:30:00+00	upcoming	\N	\N	1777574
2013	331	1267	1268	2026-06-12 17:00:00+00	upcoming	\N	\N	1778185
2014	331	1266	1271	2026-06-12 17:00:00+00	upcoming	\N	\N	1778186
2016	1415	4026	4027	2026-06-12 20:00:00+00	upcoming	\N	\N	1778795
2017	1415	4028	4029	2026-06-12 20:00:00+00	upcoming	\N	\N	1778796
2018	1415	4030	4031	2026-06-12 20:00:00+00	upcoming	\N	\N	1778797
2019	1415	4032	4033	2026-06-12 20:00:00+00	upcoming	\N	\N	1778798
2020	1415	4034	4035	2026-06-12 20:00:00+00	upcoming	\N	\N	1778799
2021	1415	4036	4037	2026-06-12 20:00:00+00	upcoming	\N	\N	1778800
2022	1415	4038	4039	2026-06-12 20:00:00+00	upcoming	\N	\N	1778801
2023	1415	4040	4041	2026-06-12 20:00:00+00	upcoming	\N	\N	1778802
2024	1415	4042	4043	2026-06-12 00:00:00+00	upcoming	\N	\N	1778804
2025	1415	4044	4045	2026-06-12 20:00:00+00	upcoming	\N	\N	1778805
2026	1415	4046	4047	2026-06-12 20:00:00+00	upcoming	\N	\N	1778806
2027	1415	4048	4049	2026-06-12 20:00:00+00	upcoming	\N	\N	1778807
2028	1415	4050	4051	2026-06-12 20:00:00+00	upcoming	\N	\N	1778808
2029	1415	4052	4053	2026-06-12 20:00:00+00	upcoming	\N	\N	1778809
2030	1415	976	4055	2026-06-12 20:00:00+00	upcoming	\N	\N	1778812
2031	1861	4056	4057	2026-06-12 20:00:00+00	upcoming	\N	\N	1779441
2032	738	1479	1480	2026-06-12 15:00:00+00	upcoming	\N	\N	1781038
2033	7	1334	1501	2026-06-11 21:00:00+00	upcoming	\N	\N	1722443
2035	71	150	2080	2026-06-11 01:00:00+00	upcoming	\N	\N	1751906
1930	11	24	26	2026-06-12 20:45:00+00	upcoming	\N	\N	1726473
2038	1510	4070	4071	2026-06-11 12:00:00+00	upcoming	\N	\N	1722773
2039	1510	4072	4073	2026-06-11 13:00:00+00	upcoming	\N	\N	1722776
2040	81	173	169	2026-06-11 05:00:00+00	upcoming	\N	\N	1725506
2041	81	164	174	2026-06-11 03:30:00+00	upcoming	\N	\N	1725507
2042	81	179	165	2026-06-11 01:30:00+00	upcoming	\N	\N	1725508
2043	81	720	175	2026-06-11 01:00:00+00	upcoming	\N	\N	1725509
2044	89	1192	189	2026-06-11 01:30:00+00	upcoming	\N	\N	1726001
2045	89	188	194	2026-06-11 04:00:00+00	upcoming	\N	\N	1726002
2047	89	183	195	2026-06-11 01:00:00+00	upcoming	\N	\N	1726004
2048	13	755	210	2026-06-11 19:00:00+00	upcoming	\N	\N	1729048
2049	1417	2839	2836	2026-06-11 15:00:00+00	upcoming	\N	\N	1730229
2050	1417	2842	3735	2026-06-11 15:00:00+00	upcoming	\N	\N	1730232
2051	18	248	43	2026-06-11 19:00:00+00	upcoming	\N	\N	1730896
2052	625	4098	4099	2026-06-11 14:30:00+00	upcoming	\N	\N	1739233
2053	29	327	1564	2026-06-11 19:00:00+00	upcoming	\N	\N	1742922
2054	29	1585	1586	2026-06-11 19:30:00+00	upcoming	\N	\N	1743649
2055	29	1795	121	2026-06-11 19:00:00+00	upcoming	\N	\N	1743653
2056	30	1592	4107	2026-06-11 03:00:00+00	upcoming	\N	\N	1746050
2057	29	1601	1599	2026-06-11 19:00:00+00	upcoming	\N	\N	1748243
2058	29	1600	2464	2026-06-11 19:00:00+00	upcoming	\N	\N	1748244
2059	1064	4112	4113	2026-06-11 01:00:00+00	upcoming	\N	\N	1748913
2060	1064	4114	4115	2026-06-11 01:30:00+00	upcoming	\N	\N	1748914
2061	1232	4116	4117	2026-06-11 17:30:00+00	upcoming	\N	\N	1749349
2062	39	80	82	2026-06-11 18:00:00+00	upcoming	\N	\N	1750213
2063	47	1647	1401	2026-06-11 02:30:00+00	upcoming	\N	\N	1754918
2064	47	487	479	2026-06-11 01:00:00+00	upcoming	\N	\N	1755150
2066	47	489	1653	2026-06-11 01:30:00+00	upcoming	\N	\N	1755153
2067	47	490	99	2026-06-11 00:00:00+00	upcoming	\N	\N	1755155
2068	47	418	474	2026-06-11 01:00:00+00	upcoming	\N	\N	1755157
2069	47	105	2493	2026-06-11 03:00:00+00	upcoming	\N	\N	1755158
2070	47	922	97	2026-06-11 03:00:00+00	upcoming	\N	\N	1755159
2071	47	433	409	2026-06-11 00:00:00+00	upcoming	\N	\N	1755160
2072	47	98	1660	2026-06-11 01:00:00+00	upcoming	\N	\N	1755161
2073	47	476	427	2026-06-11 00:30:00+00	upcoming	\N	\N	1755162
2074	47	430	420	2026-06-11 04:00:00+00	upcoming	\N	\N	1755163
2075	47	477	1643	2026-06-11 01:00:00+00	upcoming	\N	\N	1755164
2076	47	419	434	2026-06-11 01:00:00+00	upcoming	\N	\N	1755165
2077	47	1408	453	2026-06-11 01:00:00+00	upcoming	\N	\N	1755166
2078	47	436	493	2026-06-11 01:00:00+00	upcoming	\N	\N	1755167
2079	47	435	931	2026-06-11 01:00:00+00	upcoming	\N	\N	1755168
2080	47	422	934	2026-06-11 01:00:00+00	upcoming	\N	\N	1755169
2081	47	1651	939	2026-06-11 01:00:00+00	upcoming	\N	\N	1755170
2082	47	451	460	2026-06-11 02:00:00+00	upcoming	\N	\N	1755171
2083	47	439	100	2026-06-11 02:00:00+00	upcoming	\N	\N	1755172
2085	47	1648	446	2026-06-11 02:00:00+00	upcoming	\N	\N	1755174
2086	47	452	1409	2026-06-11 01:00:00+00	upcoming	\N	\N	1755175
2087	47	2553	1863	2026-06-11 01:00:00+00	upcoming	\N	\N	1755176
2088	47	1665	1628	2026-06-11 01:00:00+00	upcoming	\N	\N	1755177
2089	47	426	441	2026-06-11 01:00:00+00	upcoming	\N	\N	1755178
2090	47	423	466	2026-06-11 01:00:00+00	upcoming	\N	\N	1755179
2091	47	456	1856	2026-06-11 01:00:00+00	upcoming	\N	\N	1755180
2092	47	455	454	2026-06-11 01:00:00+00	upcoming	\N	\N	1755181
2093	47	1994	103	2026-06-11 03:00:00+00	upcoming	\N	\N	1755182
2094	47	920	413	2026-06-11 02:00:00+00	upcoming	\N	\N	1755183
2095	47	921	412	2026-06-11 02:00:00+00	upcoming	\N	\N	1755184
2096	47	415	1667	2026-06-11 02:00:00+00	upcoming	\N	\N	1755186
2097	47	462	928	2026-06-11 01:00:00+00	upcoming	\N	\N	1755187
2098	47	425	464	2026-06-11 01:00:00+00	upcoming	\N	\N	1755188
2099	47	1666	414	2026-06-11 02:00:00+00	upcoming	\N	\N	1755189
2100	47	469	458	2026-06-11 04:00:00+00	upcoming	\N	\N	1755190
2101	47	445	442	2026-06-11 01:00:00+00	upcoming	\N	\N	1755191
2102	47	926	106	2026-06-11 01:30:00+00	upcoming	\N	\N	1755192
2104	47	482	481	2026-06-11 02:30:00+00	upcoming	\N	\N	1755194
2105	47	483	1402	2026-06-11 02:30:00+00	upcoming	\N	\N	1755195
2106	47	448	437	2026-06-11 02:00:00+00	upcoming	\N	\N	1755196
2107	47	1397	473	2026-06-11 02:00:00+00	upcoming	\N	\N	1755197
2108	47	475	930	2026-06-11 02:30:00+00	upcoming	\N	\N	1755198
2109	481	966	973	2026-06-11 20:00:00+00	upcoming	\N	\N	1757017
2110	481	978	981	2026-06-11 20:00:00+00	upcoming	\N	\N	1757022
2111	481	980	968	2026-06-11 20:00:00+00	upcoming	\N	\N	1757023
2112	2108	4218	4219	2026-06-11 02:00:00+00	upcoming	\N	\N	1757526
2113	1290	2585	2590	2026-06-11 15:00:00+00	upcoming	\N	\N	1757976
2114	1006	2021	2018	2026-06-11 18:30:00+00	upcoming	\N	\N	1761880
2115	1006	2019	2026	2026-06-11 18:30:00+00	upcoming	\N	\N	1761881
2116	1006	2023	2028	2026-06-11 18:30:00+00	upcoming	\N	\N	1761882
2117	1006	2027	2014	2026-06-11 18:30:00+00	upcoming	\N	\N	1761883
2118	1006	2020	2024	2026-06-11 18:30:00+00	upcoming	\N	\N	1761884
2119	716	1705	1696	2026-06-11 15:00:00+00	upcoming	\N	\N	1765038
2120	716	1435	1700	2026-06-11 14:00:00+00	upcoming	\N	\N	1765043
2121	716	1697	1437	2026-06-11 14:00:00+00	upcoming	\N	\N	1765044
2123	2118	4240	4241	2026-06-11 13:00:00+00	upcoming	\N	\N	1766075
2124	1383	4242	4243	2026-06-11 18:00:00+00	upcoming	\N	\N	1773495
2125	2121	21	4245	2026-06-11 06:00:00+00	cancelled	\N	\N	1774090
2126	309	172	181	2026-06-11 01:00:00+00	upcoming	\N	\N	1774505
2127	309	177	166	2026-06-11 01:00:00+00	upcoming	\N	\N	1774506
2128	949	2045	2043	2026-06-11 20:00:00+00	upcoming	\N	\N	1775333
2129	310	622	629	2026-06-11 01:00:00+00	upcoming	\N	\N	1775621
2130	315	635	1204	2026-06-11 20:00:00+00	upcoming	\N	\N	1775746
2131	955	1919	1916	2026-06-11 20:00:00+00	upcoming	\N	\N	1776297
2132	955	1915	1912	2026-06-11 00:30:00+00	upcoming	\N	\N	1776298
2133	955	1913	1914	2026-06-11 01:00:00+00	upcoming	\N	\N	1776299
2134	326	1923	1920	2026-06-11 20:30:00+00	upcoming	\N	\N	1776313
2135	1848	4264	4265	2026-06-11 19:45:00+00	upcoming	\N	\N	1776371
2136	2132	4266	4267	2026-06-11 13:30:00+00	upcoming	\N	\N	1777049
2137	2132	4268	4269	2026-06-11 19:00:00+00	upcoming	\N	\N	1777050
2138	59	1591	1583	2026-06-11 19:00:00+00	upcoming	\N	\N	1777276
2139	59	401	4273	2026-06-11 19:00:00+00	upcoming	\N	\N	1777277
2140	628	1260	1259	2026-06-11 15:00:00+00	upcoming	\N	\N	1778121
2142	331	664	668	2026-06-11 17:00:00+00	upcoming	\N	\N	1778162
2037	1131	4068	4069	2026-06-11 17:30:00+00	upcoming	\N	\N	1721232
2145	331	671	667	2026-06-11 17:00:00+00	upcoming	\N	\N	1778165
2146	1415	4286	4287	2026-06-11 20:00:00+00	upcoming	\N	\N	1778803
2147	1415	4288	4289	2026-06-11 20:00:00+00	upcoming	\N	\N	1778815
2148	971	1944	2068	2026-06-11 02:30:00+00	upcoming	\N	\N	1779103
2149	2145	4292	4293	2026-06-10 21:00:00+00	upcoming	\N	\N	1779408
2150	71	155	149	2026-06-10 00:00:00+00	upcoming	\N	\N	1751907
2151	71	2235	145	2026-06-10 00:00:00+00	upcoming	\N	\N	1751909
2152	1455	4298	2912	2026-06-10 15:00:00+00	upcoming	\N	\N	1777855
2154	1130	4302	4303	2026-06-10 18:00:00+00	upcoming	\N	\N	1721094
2155	1131	4304	4305	2026-06-10 17:30:00+00	upcoming	\N	\N	1721229
2156	1510	3029	3022	2026-06-10 13:00:00+00	upcoming	\N	\N	1722734
2157	1510	4308	4309	2026-06-10 13:00:00+00	upcoming	\N	\N	1722775
2158	1130	4310	4311	2026-06-10 18:00:00+00	upcoming	\N	\N	1722943
2159	1130	4312	4313	2026-06-10 18:00:00+00	upcoming	\N	\N	1723065
2160	1417	3726	2837	2026-06-10 15:00:00+00	upcoming	\N	\N	1730227
2161	1417	2840	3688	2026-06-10 15:00:00+00	upcoming	\N	\N	1730228
2162	1417	3728	3733	2026-06-10 15:00:00+00	upcoming	\N	\N	1730230
2163	1417	3730	2843	2026-06-10 15:00:00+00	upcoming	\N	\N	1730231
2164	1417	3732	3731	2026-06-10 15:00:00+00	upcoming	\N	\N	1730233
2165	1417	3734	3727	2026-06-10 15:00:00+00	upcoming	\N	\N	1730234
2166	18	40	249	2026-06-10 19:00:00+00	upcoming	\N	\N	1730899
2167	18	42	250	2026-06-10 19:00:00+00	upcoming	\N	\N	1730902
2168	898	1815	1804	2026-06-10 20:00:00+00	upcoming	\N	\N	1744730
2169	898	1811	1808	2026-06-10 00:00:00+00	upcoming	\N	\N	1744732
2170	898	1809	1818	2026-06-10 20:00:00+00	upcoming	\N	\N	1744735
2171	898	1813	1806	2026-06-10 20:00:00+00	upcoming	\N	\N	1744739
2173	898	1833	1822	2026-06-10 20:00:00+00	upcoming	\N	\N	1744742
2174	898	1827	1810	2026-06-10 20:00:00+00	upcoming	\N	\N	1744743
2175	898	1805	1830	2026-06-10 20:00:00+00	upcoming	\N	\N	1744744
2176	898	1829	1832	2026-06-10 20:00:00+00	upcoming	\N	\N	1744746
2177	2173	4348	4349	2026-06-10 15:00:00+00	upcoming	\N	\N	1746505
2178	2173	4350	4351	2026-06-10 15:00:00+00	upcoming	\N	\N	1746506
2179	2173	4352	4353	2026-06-10 15:00:00+00	upcoming	\N	\N	1746507
2180	2173	4354	4355	2026-06-10 15:00:00+00	upcoming	\N	\N	1746508
2181	2173	4356	4357	2026-06-10 15:00:00+00	upcoming	\N	\N	1746509
2182	2173	4358	4359	2026-06-10 15:00:00+00	upcoming	\N	\N	1746510
2183	2173	4360	4361	2026-06-10 15:00:00+00	upcoming	\N	\N	1746511
2184	29	1598	379	2026-06-10 19:30:00+00	upcoming	\N	\N	1748242
2185	1064	4364	4365	2026-06-10 01:00:00+00	upcoming	\N	\N	1748912
2186	192	868	393	2026-06-10 11:30:00+00	upcoming	\N	\N	1751015
2187	47	940	432	2026-06-10 00:00:00+00	upcoming	\N	\N	1755145
2188	47	937	1870	2026-06-10 01:00:00+00	upcoming	\N	\N	1755146
2189	47	1857	936	2026-06-10 01:00:00+00	upcoming	\N	\N	1755147
2190	47	407	478	2026-06-10 01:30:00+00	upcoming	\N	\N	1755148
2192	47	107	488	2026-06-10 01:00:00+00	upcoming	\N	\N	1755152
2193	47	463	929	2026-06-10 23:00:00+00	upcoming	\N	\N	1755154
2194	47	1853	408	2026-06-10 23:00:00+00	upcoming	\N	\N	1755156
2195	246	947	944	2026-06-10 11:30:00+00	upcoming	\N	\N	1756135
2196	2121	1730	4387	2026-06-10 22:00:00+00	upcoming	\N	\N	1756420
2197	481	983	969	2026-06-10 20:00:00+00	upcoming	\N	\N	1757015
2198	481	967	964	2026-06-10 20:00:00+00	upcoming	\N	\N	1757016
2199	481	972	970	2026-06-10 20:00:00+00	upcoming	\N	\N	1757019
2200	481	965	977	2026-06-10 20:00:00+00	upcoming	\N	\N	1757020
2201	481	982	975	2026-06-10 20:00:00+00	upcoming	\N	\N	1757024
2202	2108	4398	4399	2026-06-10 22:30:00+00	upcoming	\N	\N	1757527
2203	2108	4400	4401	2026-06-10 22:30:00+00	upcoming	\N	\N	1757528
2204	2108	4402	4403	2026-06-10 02:00:00+00	upcoming	\N	\N	1757530
2205	259	1694	1419	2026-06-10 18:00:00+00	upcoming	\N	\N	1761034
2206	1327	4406	4407	2026-06-10 14:30:00+00	upcoming	\N	\N	1761260
2207	1327	4408	4409	2026-06-10 15:00:00+00	upcoming	\N	\N	1761261
2208	1006	2025	2022	2026-06-10 18:30:00+00	upcoming	\N	\N	1761877
2209	1006	2029	2016	2026-06-10 18:30:00+00	upcoming	\N	\N	1761878
2211	282	1082	1080	2026-06-10 12:00:00+00	upcoming	\N	\N	1765514
2212	282	1081	1085	2026-06-10 12:00:00+00	upcoming	\N	\N	1765520
2213	282	569	1084	2026-06-10 12:00:00+00	upcoming	\N	\N	1765522
2214	2210	4422	4423	2026-06-10 01:00:00+00	upcoming	\N	\N	1768377
2215	2210	4424	4425	2026-06-10 01:00:00+00	upcoming	\N	\N	1768378
2216	2210	4426	4427	2026-06-10 01:00:00+00	upcoming	\N	\N	1768379
2217	2210	4428	4429	2026-06-10 01:00:00+00	upcoming	\N	\N	1768380
2218	574	1156	1155	2026-06-10 11:30:00+00	upcoming	\N	\N	1770713
2219	574	1159	1157	2026-06-10 11:30:00+00	upcoming	\N	\N	1770714
2220	574	1150	2756	2026-06-10 11:30:00+00	upcoming	\N	\N	1770715
2221	574	1153	1158	2026-06-10 11:30:00+00	upcoming	\N	\N	1770716
2222	574	1154	1151	2026-06-10 11:30:00+00	upcoming	\N	\N	1770717
2223	2121	20	4441	2026-06-10 03:00:00+00	upcoming	\N	\N	1772539
2224	2121	1732	4443	2026-06-10 21:45:00+00	upcoming	\N	\N	1772540
2225	309	180	168	2026-06-10 02:00:00+00	upcoming	\N	\N	1774504
2226	1867	4446	4447	2026-06-10 02:30:00+00	upcoming	\N	\N	1774601
2227	597	1198	1201	2026-06-10 21:15:00+00	upcoming	\N	\N	1775144
2228	597	1451	1197	2026-06-10 21:15:00+00	upcoming	\N	\N	1775145
2230	597	1202	1452	2026-06-10 21:15:00+00	upcoming	\N	\N	1775147
2231	597	1196	1203	2026-06-10 21:15:00+00	upcoming	\N	\N	1775148
2232	597	1450	1199	2026-06-10 21:15:00+00	upcoming	\N	\N	1775149
2233	949	1909	2050	2026-06-10 20:00:00+00	upcoming	\N	\N	1775330
2234	949	1901	1904	2026-06-10 20:00:00+00	upcoming	\N	\N	1775331
2235	310	630	623	2026-06-10 20:00:00+00	upcoming	\N	\N	1775620
2236	2121	135	1963	2026-06-10 01:00:00+00	upcoming	\N	\N	1775937
2237	326	1921	1714	2026-06-10 20:30:00+00	upcoming	\N	\N	1776311
2238	326	1922	1715	2026-06-10 20:30:00+00	upcoming	\N	\N	1776312
2239	2132	4472	4473	2026-06-10 13:30:00+00	upcoming	\N	\N	1777047
2240	2132	4474	4475	2026-06-10 19:00:00+00	upcoming	\N	\N	1777048
2241	59	1571	1546	2026-06-10 18:00:00+00	upcoming	\N	\N	1777269
2242	59	4478	1534	2026-06-10 19:00:00+00	upcoming	\N	\N	1777270
2243	59	339	289	2026-06-10 19:00:00+00	upcoming	\N	\N	1777271
2244	59	1566	1538	2026-06-10 19:00:00+00	upcoming	\N	\N	1777272
2245	59	4484	1567	2026-06-10 19:00:00+00	upcoming	\N	\N	1777273
2246	59	4486	1553	2026-06-10 20:00:00+00	upcoming	\N	\N	1777274
2247	59	4488	1576	2026-06-10 19:30:00+00	upcoming	\N	\N	1777275
2249	2121	23	4493	2026-06-10 03:00:00+00	upcoming	\N	\N	1777584
2144	331	669	665	2026-06-11 17:00:00+00	upcoming	\N	\N	1778164
2252	628	1261	1262	2026-06-10 14:00:00+00	upcoming	\N	\N	1778120
2253	2121	4500	1727	2026-06-10 22:00:00+00	upcoming	\N	\N	1778241
2254	971	1945	2069	2026-06-10 02:30:00+00	upcoming	\N	\N	1779102
2255	2251	4504	4505	2026-06-10 17:00:00+00	cancelled	\N	\N	1779404
2256	2252	4506	4507	2026-06-10 00:30:00+00	upcoming	\N	\N	1779504
2257	1867	3736	3737	2026-06-10 14:00:00+00	upcoming	\N	\N	1779585
2258	61	1540	252	2026-06-10 15:30:00+00	upcoming	\N	\N	1779601
2259	2255	4512	4513	2026-06-10 15:45:00+00	upcoming	\N	\N	1779770
2261	2256	1754	1759	2026-06-10 17:00:00+00	upcoming	\N	\N	1779827
2262	2256	1760	1753	2026-06-10 17:00:00+00	upcoming	\N	\N	1779828
2263	1425	2853	2852	2026-06-10 20:00:00+00	upcoming	\N	\N	1780717
2264	1429	2863	2861	2026-06-10 15:00:00+00	upcoming	\N	\N	1781662
2265	1429	2862	2860	2026-06-10 17:30:00+00	upcoming	\N	\N	1781663
2266	1896	4526	4527	2026-06-10 18:30:00+00	upcoming	\N	\N	1781667
2267	2263	4528	4529	2026-06-10 18:15:00+00	upcoming	\N	\N	1781672
2268	2263	4530	4531	2026-06-10 18:15:00+00	upcoming	\N	\N	1781673
2269	2263	4532	4533	2026-06-10 18:15:00+00	upcoming	\N	\N	1781674
2270	2121	4534	4535	2026-06-10 01:00:00+00	upcoming	\N	\N	1781680
2271	1896	3795	3794	2026-06-10 20:00:00+00	upcoming	\N	\N	1781717
2272	2268	4538	4539	2026-06-09 17:00:00+00	upcoming	\N	\N	1779088
2273	2268	4540	4541	2026-06-09 14:30:00+00	upcoming	\N	\N	1779454
2274	2270	4542	4543	2026-06-09 00:00:00+00	upcoming	\N	\N	1777899
2275	2145	4544	4545	2026-06-09 21:00:00+00	upcoming	\N	\N	1779407
2276	71	1743	1341	2026-06-09 01:00:00+00	upcoming	\N	\N	1751902
2277	71	154	147	2026-06-09 01:00:00+00	upcoming	\N	\N	1751911
2278	2274	4550	4551	2026-06-09 00:00:00+00	upcoming	\N	\N	1778356
2280	2275	4554	4555	2026-06-09 20:00:00+00	upcoming	\N	\N	1779794
2281	2275	4556	4557	2026-06-09 20:00:00+00	upcoming	\N	\N	1779795
2282	2275	4558	4559	2026-06-09 22:00:00+00	upcoming	\N	\N	1779796
2283	2279	4560	4561	2026-06-09 17:00:00+00	upcoming	\N	\N	1724625
2284	1417	2838	2841	2026-06-09 15:00:00+00	upcoming	\N	\N	1730226
2285	18	246	39	2026-06-09 19:00:00+00	upcoming	\N	\N	1730895
2286	18	251	254	2026-06-09 19:00:00+00	upcoming	\N	\N	1730897
2287	18	38	255	2026-06-09 19:00:00+00	upcoming	\N	\N	1730898
2288	18	252	247	2026-06-09 19:00:00+00	upcoming	\N	\N	1730900
2289	18	41	253	2026-06-09 19:00:00+00	upcoming	\N	\N	1730901
2290	1050	2102	3226	2026-06-09 18:00:00+00	upcoming	\N	\N	1736781
2291	2287	648	638	2026-06-09 01:30:00+00	upcoming	\N	\N	1744308
2292	2287	115	651	2026-06-09 01:30:00+00	upcoming	\N	\N	1744312
2293	898	1817	1814	2026-06-09 20:00:00+00	upcoming	\N	\N	1744729
2294	898	1821	1798	2026-06-09 20:00:00+00	upcoming	\N	\N	1744731
2295	898	1799	1824	2026-06-09 20:00:00+00	upcoming	\N	\N	1744734
2296	898	1807	1820	2026-06-09 20:00:00+00	upcoming	\N	\N	1744738
2297	30	356	73	2026-06-09 02:00:00+00	upcoming	\N	\N	1746045
2299	2121	4592	4593	2026-06-09 19:00:00+00	upcoming	\N	\N	1756419
2300	477	963	956	2026-06-09 11:30:00+00	upcoming	\N	\N	1756795
2301	481	979	971	2026-06-09 20:00:00+00	upcoming	\N	\N	1757018
2302	2298	4598	4599	2026-06-09 21:00:00+00	upcoming	\N	\N	1757318
2303	2298	4600	4601	2026-06-09 21:00:00+00	upcoming	\N	\N	1757319
2304	2298	4602	4603	2026-06-09 21:00:00+00	upcoming	\N	\N	1757320
2305	2298	4604	4605	2026-06-09 18:00:00+00	upcoming	\N	\N	1757321
2306	2298	4606	4607	2026-06-09 19:00:00+00	upcoming	\N	\N	1757322
2307	2298	4608	4609	2026-06-09 18:00:00+00	upcoming	\N	\N	1757323
2308	2298	4610	4611	2026-06-09 19:00:00+00	upcoming	\N	\N	1757324
2309	2298	4612	4613	2026-06-09 19:00:00+00	upcoming	\N	\N	1757325
2310	2298	4614	4615	2026-06-09 19:00:00+00	upcoming	\N	\N	1757326
2311	2298	4616	4617	2026-06-09 19:00:00+00	upcoming	\N	\N	1757327
2312	2298	4618	4619	2026-06-09 19:00:00+00	upcoming	\N	\N	1757328
2313	2298	4620	4621	2026-06-09 19:00:00+00	upcoming	\N	\N	1757329
2314	2298	4622	4623	2026-06-09 19:00:00+00	upcoming	\N	\N	1757330
2315	2298	4624	4625	2026-06-09 19:00:00+00	upcoming	\N	\N	1757331
2316	2298	4626	4627	2026-06-09 19:00:00+00	upcoming	\N	\N	1757332
2318	2298	4630	4631	2026-06-09 19:00:00+00	upcoming	\N	\N	1757334
2319	2298	4632	4633	2026-06-09 19:00:00+00	upcoming	\N	\N	1757335
2320	2298	4634	4635	2026-06-09 19:00:00+00	upcoming	\N	\N	1757336
2321	2298	4636	4637	2026-06-09 19:00:00+00	upcoming	\N	\N	1757337
2322	2298	4638	4639	2026-06-09 19:00:00+00	upcoming	\N	\N	1757338
2323	2298	4640	4641	2026-06-09 19:00:00+00	upcoming	\N	\N	1757339
2324	2298	4642	4643	2026-06-09 19:00:00+00	upcoming	\N	\N	1757340
2325	2298	4644	4645	2026-06-09 19:00:00+00	upcoming	\N	\N	1757341
2326	2298	4646	4647	2026-06-09 21:00:00+00	upcoming	\N	\N	1757342
2327	2108	4648	4649	2026-06-09 22:30:00+00	upcoming	\N	\N	1757525
2328	2108	4650	4651	2026-06-09 22:30:00+00	upcoming	\N	\N	1757529
2329	1327	4652	4653	2026-06-09 14:30:00+00	upcoming	\N	\N	1761257
2330	282	566	1083	2026-06-09 12:00:00+00	upcoming	\N	\N	1765518
2331	2121	4656	4657	2026-06-09 17:00:00+00	upcoming	\N	\N	1769819
2332	2328	4658	4659	2026-06-09 17:00:00+00	upcoming	\N	\N	1771634
2333	2328	4660	4661	2026-06-09 17:00:00+00	upcoming	\N	\N	1771635
2334	2328	4662	4663	2026-06-09 17:00:00+00	upcoming	\N	\N	1771671
2335	2121	4664	134	2026-06-09 04:00:00+00	upcoming	\N	\N	1772538
2337	336	680	683	2026-06-09 15:30:00+00	upcoming	\N	\N	1774126
2338	336	674	677	2026-06-09 16:00:00+00	upcoming	\N	\N	1774127
2339	336	686	690	2026-06-09 17:00:00+00	upcoming	\N	\N	1774128
2340	336	682	685	2026-06-09 16:00:00+00	upcoming	\N	\N	1774129
2341	336	678	691	2026-06-09 16:30:00+00	upcoming	\N	\N	1774130
2342	336	681	689	2026-06-09 16:30:00+00	upcoming	\N	\N	1774131
2343	336	684	675	2026-06-09 17:15:00+00	upcoming	\N	\N	1774132
2344	336	688	679	2026-06-09 17:15:00+00	upcoming	\N	\N	1774133
2345	1867	4684	4685	2026-06-09 08:30:00+00	upcoming	\N	\N	1774600
2346	949	1903	2042	2026-06-09 20:00:00+00	upcoming	\N	\N	1775327
2347	949	2049	2046	2026-06-09 20:00:00+00	upcoming	\N	\N	1775328
2348	949	2047	1906	2026-06-09 20:00:00+00	upcoming	\N	\N	1775329
2349	949	2051	1900	2026-06-09 20:00:00+00	upcoming	\N	\N	1775332
2350	949	1908	2048	2026-06-09 20:00:00+00	upcoming	\N	\N	1775334
2351	949	1905	1902	2026-06-09 20:00:00+00	upcoming	\N	\N	1775335
2352	949	1907	2044	2026-06-09 20:00:00+00	upcoming	\N	\N	1775336
2353	2121	4700	4701	2026-06-09 14:00:00+00	upcoming	\N	\N	1775806
2354	2121	4702	4703	2026-06-09 19:00:00+00	upcoming	\N	\N	1775807
2356	2121	4706	4707	2026-06-09 12:00:00+00	upcoming	\N	\N	1775932
2251	628	1265	1263	2026-06-10 16:00:00+00	upcoming	\N	\N	1778119
2359	2121	4712	4713	2026-06-09 16:00:00+00	upcoming	\N	\N	1775935
2360	2121	1733	4715	2026-06-09 17:00:00+00	upcoming	\N	\N	1775936
2361	1867	4716	4717	2026-06-09 18:00:00+00	upcoming	\N	\N	1776130
2362	2121	4718	4719	2026-06-09 20:00:00+00	upcoming	\N	\N	1776218
2363	2121	4720	4721	2026-06-09 18:00:00+00	cancelled	\N	\N	1776806
2364	1867	4722	4723	2026-06-09 03:00:00+00	upcoming	\N	\N	1776928
2365	1867	4724	4725	2026-06-09 23:00:00+00	upcoming	\N	\N	1776929
2366	2121	4726	4727	2026-06-09 18:00:00+00	upcoming	\N	\N	1776951
2368	2121	4730	4731	2026-06-09 14:00:00+00	upcoming	\N	\N	1777084
2369	1867	4732	4733	2026-06-09 10:30:00+00	upcoming	\N	\N	1777192
2370	1867	4734	4735	2026-06-09 14:00:00+00	cancelled	\N	\N	1777198
2371	1867	4736	4737	2026-06-09 14:00:00+00	upcoming	\N	\N	1777199
2372	59	4738	293	2026-06-09 19:30:00+00	upcoming	\N	\N	1777265
2373	59	1579	1539	2026-06-09 19:00:00+00	upcoming	\N	\N	1777266
2374	59	4742	343	2026-06-09 19:00:00+00	upcoming	\N	\N	1777267
2375	59	4744	1551	2026-06-09 19:30:00+00	upcoming	\N	\N	1777268
2376	2121	4746	4747	2026-06-09 13:35:00+00	upcoming	\N	\N	1777582
2377	2121	4748	4749	2026-06-09 16:30:00+00	upcoming	\N	\N	1777583
2378	2121	4750	4751	2026-06-09 12:00:00+00	upcoming	\N	\N	1777716
2379	2121	4752	4753	2026-06-09 14:00:00+00	upcoming	\N	\N	1777717
2380	2121	4754	4755	2026-06-09 15:00:00+00	upcoming	\N	\N	1777718
2381	2377	4756	4757	2026-06-09 00:30:00+00	upcoming	\N	\N	1777993
2382	1867	4758	4759	2026-06-09 12:30:00+00	upcoming	\N	\N	1778041
2383	2121	4760	4761	2026-06-09 14:00:00+00	upcoming	\N	\N	1778049
2384	2121	4762	4763	2026-06-09 14:00:00+00	cancelled	\N	\N	1778050
2385	2381	4764	4765	2026-06-09 15:00:00+00	upcoming	\N	\N	1778151
2387	331	1268	1270	2026-06-09 17:00:00+00	upcoming	\N	\N	1778183
2388	331	1271	1267	2026-06-09 17:00:00+00	upcoming	\N	\N	1778184
2389	2121	4772	4773	2026-06-09 13:35:00+00	upcoming	\N	\N	1778237
2390	2121	4774	4775	2026-06-09 14:00:00+00	upcoming	\N	\N	1778238
2391	2121	4776	4777	2026-06-09 16:00:00+00	upcoming	\N	\N	1778239
2392	2121	4778	4779	2026-06-09 17:00:00+00	upcoming	\N	\N	1778240
2393	2121	4780	4781	2026-06-09 08:00:00+00	upcoming	\N	\N	1779086
2394	1867	4782	4783	2026-06-09 17:00:00+00	upcoming	\N	\N	1779112
2395	2121	4763	4785	2026-06-09 18:00:00+00	upcoming	\N	\N	1779381
2396	1867	4786	4787	2026-06-09 12:00:00+00	upcoming	\N	\N	1779581
2397	1867	4788	4789	2026-06-09 12:00:00+00	upcoming	\N	\N	1779582
2398	1867	4790	4791	2026-06-09 16:30:00+00	upcoming	\N	\N	1779583
2399	1867	4792	4793	2026-06-09 20:30:00+00	upcoming	\N	\N	1779584
2400	2121	4794	4795	2026-06-09 16:45:00+00	upcoming	\N	\N	1779599
2401	2255	4796	4797	2026-06-09 15:45:00+00	upcoming	\N	\N	1779768
2402	2255	4798	4799	2026-06-09 15:45:00+00	upcoming	\N	\N	1779769
2403	2255	4800	4801	2026-06-09 15:45:00+00	upcoming	\N	\N	1779771
2404	2256	3673	1752	2026-06-09 17:30:00+00	upcoming	\N	\N	1779825
2406	2402	4806	4807	2026-06-09 17:30:00+00	upcoming	\N	\N	1780194
2407	2402	4808	4809	2026-06-09 19:00:00+00	upcoming	\N	\N	1780195
2408	1867	4810	4811	2026-06-09 13:00:00+00	upcoming	\N	\N	1780855
2409	2121	4812	4813	2026-06-09 16:30:00+00	upcoming	\N	\N	1780881
2410	2121	4814	4815	2026-06-09 19:00:00+00	upcoming	\N	\N	1780882
2411	2121	4816	4817	2026-06-09 19:00:00+00	upcoming	\N	\N	1780883
2412	2408	4818	4819	2026-06-09 17:00:00+00	upcoming	\N	\N	1781658
2413	2408	4820	4821	2026-06-09 17:00:00+00	upcoming	\N	\N	1781659
2414	2263	4822	4823	2026-06-09 18:00:00+00	upcoming	\N	\N	1781668
2415	2263	4824	4825	2026-06-09 18:30:00+00	upcoming	\N	\N	1781669
2416	2263	4826	4827	2026-06-09 18:30:00+00	upcoming	\N	\N	1781670
2417	2263	4828	4829	2026-06-09 20:30:00+00	upcoming	\N	\N	1781671
2418	1867	4830	4831	2026-06-09 14:30:00+00	upcoming	\N	\N	1781722
2419	1867	4832	4833	2026-06-09 20:00:00+00	upcoming	\N	\N	1781723
2420	2275	4834	4835	2026-06-08 18:00:00+00	upcoming	\N	\N	1779789
2421	2275	4836	4837	2026-06-08 20:00:00+00	upcoming	\N	\N	1779790
2422	2275	4838	4839	2026-06-08 18:00:00+00	upcoming	\N	\N	1779791
2423	2275	4840	4841	2026-06-08 22:00:00+00	upcoming	\N	\N	1779792
2425	1595	3201	3208	2026-06-08 20:30:00+00	upcoming	\N	\N	1733080
2426	1050	3876	2103	2026-06-08 17:30:00+00	upcoming	\N	\N	1736732
2427	141	1543	285	2026-06-08 19:00:00+00	upcoming	\N	\N	1736957
2428	141	1766	1541	2026-06-08 19:30:00+00	upcoming	\N	\N	1736964
2429	141	1549	1545	2026-06-08 19:30:00+00	upcoming	\N	\N	1737826
2430	141	1547	1552	2026-06-08 19:00:00+00	upcoming	\N	\N	1737829
2431	898	1819	1812	2026-06-08 20:00:00+00	upcoming	\N	\N	1744733
2432	898	1801	1816	2026-06-08 20:00:00+00	upcoming	\N	\N	1744736
2433	898	1825	1826	2026-06-08 20:00:00+00	upcoming	\N	\N	1744737
2434	898	1831	1802	2026-06-08 20:00:00+00	upcoming	\N	\N	1744740
2435	898	1823	1800	2026-06-08 20:00:00+00	upcoming	\N	\N	1744745
2436	30	64	1376	2026-06-08 21:00:00+00	upcoming	\N	\N	1746039
2437	30	358	75	2026-06-08 02:00:00+00	finished	3	0	1746046
2438	30	1377	66	2026-06-08 00:00:00+00	finished	0	1	1746047
2439	30	70	351	2026-06-08 01:00:00+00	finished	3	2	1746048
2440	30	72	4875	2026-06-08 02:30:00+00	finished	2	0	1746049
2441	2173	4357	4348	2026-06-08 16:30:00+00	upcoming	\N	\N	1746487
2442	29	1597	377	2026-06-08 19:00:00+00	upcoming	\N	\N	1748241
2444	47	489	443	2026-06-08 01:30:00+00	finished	0	0	1755130
2445	47	1401	421	2026-06-08 00:00:00+00	finished	0	0	1755132
2446	47	922	428	2026-06-08 00:00:00+00	finished	5	0	1755133
2447	47	411	410	2026-06-08 01:00:00+00	finished	0	0	1755135
2448	47	492	437	2026-06-08 00:00:00+00	finished	2	1	1755138
2449	47	491	99	2026-06-08 01:00:00+00	finished	0	0	1755139
2450	47	929	441	2026-06-08 00:30:00+00	finished	2	0	1755140
2451	47	102	1994	2026-06-08 03:00:00+00	finished	0	0	1755141
2452	47	926	444	2026-06-08 01:30:00+00	finished	0	0	1755142
2453	47	104	2493	2026-06-08 05:00:00+00	finished	0	0	1755143
2454	47	417	1404	2026-06-08 21:00:00+00	upcoming	\N	\N	1756464
2455	2121	1499	1729	2026-06-08 01:00:00+00	finished	2	0	1758855
2456	257	518	1014	2026-06-08 21:30:00+00	upcoming	\N	\N	1759978
2457	259	522	1418	2026-06-08 18:00:00+00	upcoming	\N	\N	1761035
2458	1327	4910	4911	2026-06-08 15:00:00+00	upcoming	\N	\N	1761256
2459	1327	4912	4913	2026-06-08 16:00:00+00	upcoming	\N	\N	1761258
2460	1327	4914	4915	2026-06-08 15:00:00+00	upcoming	\N	\N	1761259
2461	1867	4916	4917	2026-06-08 20:15:00+00	upcoming	\N	\N	1762355
2463	2459	1211	640	2026-06-08 00:00:00+00	finished	0	1	1772516
2358	2121	4710	4711	2026-06-09 14:00:00+00	upcoming	\N	\N	1775934
2466	2121	22	4927	2026-06-08 21:10:00+00	upcoming	\N	\N	1774089
2467	955	1916	1918	2026-06-08 20:00:00+00	upcoming	\N	\N	1776294
2468	2121	700	1498	2026-06-08 20:45:00+00	upcoming	\N	\N	1776357
2469	2132	4932	4269	2026-06-08 15:00:00+00	upcoming	\N	\N	1777045
2470	2132	4266	4268	2026-06-08 18:30:00+00	upcoming	\N	\N	1777046
2471	1867	4936	4937	2026-06-08 18:00:00+00	upcoming	\N	\N	1777196
2472	1867	4938	4939	2026-06-08 00:00:00+00	finished	1	0	1777504
2473	2121	4940	4941	2026-06-08 14:00:00+00	cancelled	\N	\N	1777714
2475	1867	4944	4945	2026-06-08 21:00:00+00	upcoming	\N	\N	1777961
2476	2377	4946	4947	2026-06-08 22:00:00+00	upcoming	\N	\N	1777992
2477	2121	4761	4762	2026-06-08 21:00:00+00	upcoming	\N	\N	1778048
2478	2381	4950	4951	2026-06-08 15:00:00+00	upcoming	\N	\N	1778149
2479	2381	4952	4953	2026-06-08 15:00:00+00	upcoming	\N	\N	1778150
2480	331	665	671	2026-06-08 17:00:00+00	upcoming	\N	\N	1778158
2481	331	667	669	2026-06-08 17:00:00+00	upcoming	\N	\N	1778159
2482	331	668	666	2026-06-08 17:00:00+00	upcoming	\N	\N	1778160
2483	331	664	670	2026-06-08 14:30:00+00	upcoming	\N	\N	1778161
2484	2121	4962	4963	2026-06-08 17:00:00+00	upcoming	\N	\N	1778235
2485	2121	4964	4965	2026-06-08 18:00:00+00	upcoming	\N	\N	1778236
2486	2121	4966	4967	2026-06-08 16:00:00+00	upcoming	\N	\N	1779085
2487	2121	4968	4969	2026-06-08 15:00:00+00	upcoming	\N	\N	1779380
2488	2484	4970	4971	2026-06-08 00:00:00+00	finished	2	0	1779502
2489	2485	4972	4973	2026-06-08 16:00:00+00	upcoming	\N	\N	1779547
2490	2485	4974	4975	2026-06-08 19:30:00+00	upcoming	\N	\N	1779548
2491	1867	4976	4977	2026-06-08 17:00:00+00	upcoming	\N	\N	1779578
2492	1867	4978	4979	2026-06-08 18:30:00+00	upcoming	\N	\N	1779579
2494	2490	4982	4983	2026-06-08 00:00:00+00	finished	2	1	1779757
2495	1431	3785	2864	2026-06-08 02:00:00+00	finished	2	2	1779764
2496	2121	4986	4987	2026-06-08 16:00:00+00	upcoming	\N	\N	1780060
2497	2121	4988	4989	2026-06-08 17:00:00+00	upcoming	\N	\N	1780061
2498	2494	4990	4991	2026-06-08 17:30:00+00	upcoming	\N	\N	1780848
2499	1867	4992	4993	2026-06-08 13:00:00+00	upcoming	\N	\N	1780854
2500	2121	4560	4995	2026-06-08 10:00:00+00	upcoming	\N	\N	1780877
2501	2121	4996	4997	2026-06-08 11:00:00+00	upcoming	\N	\N	1780878
2502	2121	4998	4999	2026-06-08 14:00:00+00	upcoming	\N	\N	1780879
2503	2121	5000	5001	2026-06-08 18:00:00+00	upcoming	\N	\N	1780880
2504	649	1304	973	2026-06-08 20:00:00+00	upcoming	\N	\N	1781515
110	13	214	215	2026-06-21 12:30:00+00	upcoming	\N	\N	1729055
120	115	234	235	2026-06-21 16:00:00+00	upcoming	\N	\N	1729931
139	80	272	273	2026-06-21 20:30:00+00	upcoming	\N	\N	1731524
158	149	310	311	2026-06-21 15:00:00+00	upcoming	\N	\N	1739937
177	172	348	349	2026-06-21 16:00:00+00	upcoming	\N	\N	1745598
196	192	386	387	2026-06-21 07:00:00+00	upcoming	\N	\N	1751037
215	47	424	425	2026-06-21 00:00:00+00	upcoming	\N	\N	1755348
227	47	448	449	2026-06-21 01:00:00+00	upcoming	\N	\N	1755360
246	47	486	487	2026-06-21 02:00:00+00	upcoming	\N	\N	1755379
265	261	524	525	2026-06-21 22:00:00+00	upcoming	\N	\N	1760871
284	279	562	563	2026-06-21 16:00:00+00	upcoming	\N	\N	1764292
303	287	600	601	2026-06-21 15:00:00+00	upcoming	\N	\N	1766852
322	56	638	639	2026-06-21 22:00:00+00	upcoming	\N	\N	1776154
324	56	642	643	2026-06-21 00:00:00+00	upcoming	\N	\N	1776156
334	59	662	663	2026-06-21 15:00:00+00	upcoming	\N	\N	1777279
353	7	700	701	2026-06-20 19:00:00+00	upcoming	\N	\N	1771557
372	13	738	739	2026-06-20 15:30:00+00	upcoming	\N	\N	1728508
391	108	776	777	2026-06-20 14:30:00+00	upcoming	\N	\N	1729406
410	405	814	815	2026-06-20 22:00:00+00	upcoming	\N	\N	1732344
429	423	852	853	2026-06-20 09:00:00+00	upcoming	\N	\N	1750728
431	423	856	857	2026-06-20 09:00:00+00	upcoming	\N	\N	1750730
441	196	876	877	2026-06-20 12:00:00+00	upcoming	\N	\N	1751355
460	46	914	915	2026-06-20 13:15:00+00	upcoming	\N	\N	1754091
479	248	952	953	2026-06-20 08:30:00+00	upcoming	\N	\N	1756376
498	492	990	991	2026-06-20 09:00:00+00	upcoming	\N	\N	1759128
536	532	1066	1067	2026-06-20 12:00:00+00	upcoming	\N	\N	1763945
538	532	1070	1071	2026-06-20 12:00:00+00	upcoming	\N	\N	1763947
548	542	1090	1091	2026-06-20 09:00:00+00	upcoming	\N	\N	1765637
567	287	1128	1129	2026-06-20 15:00:00+00	upcoming	\N	\N	1766187
586	53	1166	1167	2026-06-20 17:00:00+00	upcoming	\N	\N	1773249
605	315	1204	1205	2026-06-20 20:00:00+00	upcoming	\N	\N	1775750
624	61	1242	1243	2026-06-20 13:30:00+00	upcoming	\N	\N	1777228
643	61	1280	1281	2026-06-20 14:00:00+00	upcoming	\N	\N	1779604
645	61	1284	1285	2026-06-20 15:00:00+00	upcoming	\N	\N	1779606
655	649	1304	1305	2026-06-20 22:00:00+00	upcoming	\N	\N	1781519
674	77	1342	1343	2026-06-19 17:00:00+00	upcoming	\N	\N	1756563
693	41	85	88	2026-06-19 18:00:00+00	upcoming	\N	\N	1752748
712	259	1418	1419	2026-06-19 18:30:00+00	upcoming	\N	\N	1760140
731	329	1456	1457	2026-06-19 09:30:00+00	upcoming	\N	\N	1777057
750	649	1494	1495	2026-06-19 22:00:00+00	upcoming	\N	\N	1781516
752	7	1498	1499	2026-06-18 04:00:00+00	upcoming	\N	\N	1722460
762	756	1518	1519	2026-06-18 15:00:00+00	upcoming	\N	\N	1700600
781	27	1556	1557	2026-06-18 15:30:00+00	upcoming	\N	\N	1741596
819	47	1632	453	2026-06-18 00:00:00+00	upcoming	\N	\N	1755290
838	47	466	934	2026-06-18 01:00:00+00	upcoming	\N	\N	1755309
857	852	1708	1709	2026-06-18 12:00:00+00	upcoming	\N	\N	1774268
859	310	627	624	2026-06-18 00:30:00+00	upcoming	\N	\N	1775628
869	7	1732	1733	2026-06-17 19:00:00+00	upcoming	\N	\N	1771553
888	21	46	49	2026-06-17 15:00:00+00	upcoming	\N	\N	1740641
907	898	1808	1809	2026-06-17 22:00:00+00	upcoming	\N	\N	1744752
926	37	370	77	2026-06-17 17:00:00+00	upcoming	\N	\N	1747910
945	481	965	978	2026-06-17 20:00:00+00	upcoming	\N	\N	1757033
964	326	1922	1923	2026-06-17 20:30:00+00	upcoming	\N	\N	1776317
966	628	1258	1260	2026-06-17 15:00:00+00	upcoming	\N	\N	1778127
976	972	561	156	2026-06-17 15:00:00+00	upcoming	\N	\N	1779113
995	172	1984	348	2026-06-16 18:00:00+00	upcoming	\N	\N	1745590
1014	1006	2022	2023	2026-06-16 18:30:00+00	upcoming	\N	\N	1761889
1033	331	670	665	2026-06-16 17:00:00+00	upcoming	\N	\N	1778173
1052	18	255	42	2026-06-15 19:05:00+00	upcoming	\N	\N	1730907
1071	47	410	428	2026-06-15 01:00:00+00	upcoming	\N	\N	1755263
1073	47	491	413	2026-06-15 01:00:00+00	upcoming	\N	\N	1755265
1102	336	679	684	2026-06-15 18:00:00+00	upcoming	\N	\N	1779804
2465	1383	4001	3666	2026-06-08 18:00:00+00	upcoming	\N	\N	1773494
217	47	428	429	2026-06-21 03:30:00+00	upcoming	\N	\N	1755350
517	510	1028	1029	2026-06-20 13:00:00+00	upcoming	\N	\N	1760267
800	30	74	1595	2026-06-18 04:00:00+00	upcoming	\N	\N	1746064
1083	53	1165	612	2026-06-15 12:00:00+00	upcoming	\N	\N	1773239
1121	71	152	1340	2026-06-14 16:00:00+00	upcoming	\N	\N	1751921
1140	81	175	178	2026-06-14 01:30:00+00	upcoming	\N	\N	1725513
1159	13	751	747	2026-06-14 14:00:00+00	upcoming	\N	\N	1728680
1178	115	245	234	2026-06-14 16:00:00+00	upcoming	\N	\N	1729928
1180	18	253	40	2026-06-14 15:00:00+00	upcoming	\N	\N	1730903
1190	80	270	798	2026-06-14 20:30:00+00	upcoming	\N	\N	1731771
1209	147	838	841	2026-06-14 16:00:00+00	upcoming	\N	\N	1739674
1228	30	359	352	2026-06-14 04:00:00+00	upcoming	\N	\N	1746055
1247	47	443	1653	2026-06-14 01:00:00+00	upcoming	\N	\N	1755210
1266	47	461	446	2026-06-14 02:00:00+00	upcoming	\N	\N	1755237
1285	47	1687	436	2026-06-14 01:30:00+00	upcoming	\N	\N	1755256
1287	47	493	448	2026-06-14 01:30:00+00	upcoming	\N	\N	1755258
1297	1290	2588	2589	2026-06-14 15:00:00+00	upcoming	\N	\N	1757982
1316	261	527	554	2026-06-14 22:00:00+00	upcoming	\N	\N	1760856
1335	529	1426	1422	2026-06-14 13:30:00+00	upcoming	\N	\N	1762831
1354	287	599	600	2026-06-14 14:00:00+00	upcoming	\N	\N	1766845
1373	1352	2740	2741	2026-06-14 21:00:00+00	upcoming	\N	\N	1770331
1392	583	1177	1180	2026-06-14 15:00:00+00	upcoming	\N	\N	1773828
1394	583	1171	1188	2026-06-14 15:00:00+00	upcoming	\N	\N	1773830
1404	310	631	622	2026-06-14 20:00:00+00	upcoming	\N	\N	1775626
1423	1417	2840	2841	2026-06-14 15:00:00+00	upcoming	\N	\N	1779451
1442	67	143	140	2026-06-13 13:00:00+00	upcoming	\N	\N	1758436
1461	1456	2916	2917	2026-06-13 17:00:00+00	upcoming	\N	\N	1643705
1480	1121	2954	2955	2026-06-13 17:00:00+00	upcoming	\N	\N	1690362
1499	1121	2992	2993	2026-06-13 17:00:00+00	upcoming	\N	\N	1690971
1501	1130	2996	2997	2026-06-13 17:00:00+00	upcoming	\N	\N	1720868
1511	1130	3016	3017	2026-06-13 15:00:00+00	upcoming	\N	\N	1721098
1530	1130	3054	3055	2026-06-13 10:15:00+00	upcoming	\N	\N	1723070
1549	13	745	746	2026-06-13 14:00:00+00	upcoming	\N	\N	1728679
1568	108	781	774	2026-06-13 13:30:00+00	upcoming	\N	\N	1729400
1587	80	811	802	2026-06-13 02:00:00+00	upcoming	\N	\N	1731777
1606	1595	3206	3207	2026-06-13 22:00:00+00	upcoming	\N	\N	1733099
1608	1595	3210	3211	2026-06-13 22:00:00+00	upcoming	\N	\N	1733101
1618	141	1767	1534	2026-06-13 16:00:00+00	upcoming	\N	\N	1736966
1637	27	1555	58	2026-06-13 19:00:00+00	upcoming	\N	\N	1741591
1656	30	75	353	2026-06-13 23:30:00+00	upcoming	\N	\N	1746053
1675	192	865	388	2026-06-13 09:30:00+00	upcoming	\N	\N	1751032
1694	47	429	96	2026-06-13 01:00:00+00	upcoming	\N	\N	1755204
1713	477	961	1415	2026-06-13 11:15:00+00	upcoming	\N	\N	1756798
1715	1290	3424	3425	2026-06-13 15:00:00+00	upcoming	\N	\N	1757900
1725	492	988	986	2026-06-13 09:00:00+00	upcoming	\N	\N	1759122
1744	519	1041	1044	2026-06-13 17:00:00+00	upcoming	\N	\N	1762523
1763	279	1074	1078	2026-06-13 13:00:00+00	upcoming	\N	\N	1764278
1782	542	1094	1089	2026-06-13 09:00:00+00	upcoming	\N	\N	1765631
1801	287	1121	1118	2026-06-13 16:00:00+00	upcoming	\N	\N	1766177
1820	300	603	610	2026-06-13 13:00:00+00	upcoming	\N	\N	1770386
1822	574	1152	1156	2026-06-13 07:00:00+00	upcoming	\N	\N	1770718
1832	1824	3658	3659	2026-06-13 14:00:00+00	upcoming	\N	\N	1772824
1851	326	1222	3697	2026-06-13 23:00:00+00	upcoming	\N	\N	1776314
1870	1417	3734	3735	2026-06-13 15:00:00+00	upcoming	\N	\N	1779448
1889	655	1313	1318	2026-06-13 20:30:00+00	upcoming	\N	\N	1781552
1908	756	1748	1968	2026-06-12 15:00:00+00	upcoming	\N	\N	1679241
1927	1130	3848	3849	2026-06-12 17:00:00+00	upcoming	\N	\N	1722948
1929	11	1348	1345	2026-06-12 20:45:00+00	upcoming	\N	\N	1726472
1939	109	229	792	2026-06-12 18:00:00+00	upcoming	\N	\N	1729724
1958	37	375	372	2026-06-12 18:00:00+00	upcoming	\N	\N	1747904
1977	1971	3948	3949	2026-06-12 16:00:00+00	upcoming	\N	\N	1758082
1996	716	1704	1699	2026-06-12 17:00:00+00	upcoming	\N	\N	1765128
2015	331	1270	1269	2026-06-12 17:00:00+00	upcoming	\N	\N	1778187
2034	71	146	144	2026-06-11 01:00:00+00	upcoming	\N	\N	1751903
2036	71	1340	711	2026-06-11 02:00:00+00	upcoming	\N	\N	1751910
2046	89	190	1193	2026-06-11 04:30:00+00	upcoming	\N	\N	1726003
2065	47	443	927	2026-06-11 01:00:00+00	upcoming	\N	\N	1755151
2084	47	925	438	2026-06-11 02:00:00+00	upcoming	\N	\N	1755173
2103	47	1687	933	2026-06-11 01:30:00+00	upcoming	\N	\N	1755193
2122	2118	4238	4239	2026-06-11 13:00:00+00	upcoming	\N	\N	1766074
2141	628	1264	1258	2026-06-11 15:00:00+00	upcoming	\N	\N	1778122
2143	331	666	670	2026-06-11 17:00:00+00	upcoming	\N	\N	1778163
2153	1130	4300	4301	2026-06-10 17:30:00+00	upcoming	\N	\N	1720975
2172	898	1803	1828	2026-06-10 00:00:00+00	upcoming	\N	\N	1744741
2191	47	1690	471	2026-06-10 03:00:00+00	upcoming	\N	\N	1755149
2210	1006	2017	2015	2026-06-10 18:30:00+00	upcoming	\N	\N	1761879
2229	597	1200	1453	2026-06-10 21:15:00+00	upcoming	\N	\N	1775146
2248	1852	367	323	2026-06-10 21:30:00+00	upcoming	\N	\N	1777572
2250	1867	4494	4495	2026-06-10 03:30:00+00	upcoming	\N	\N	1777962
2260	2256	1757	1761	2026-06-10 16:00:00+00	upcoming	\N	\N	1779826
2279	2275	4552	4553	2026-06-09 18:00:00+00	upcoming	\N	\N	1779793
2298	47	465	425	2026-06-09 01:00:00+00	upcoming	\N	\N	1755144
2317	2298	4628	4629	2026-06-09 19:00:00+00	upcoming	\N	\N	1757333
2336	336	676	687	2026-06-09 15:30:00+00	upcoming	\N	\N	1774125
2355	1867	4704	4705	2026-06-09 11:00:00+00	upcoming	\N	\N	1775922
2357	2121	4708	4709	2026-06-09 18:30:00+00	upcoming	\N	\N	1775933
2367	2121	4728	4729	2026-06-09 13:30:00+00	upcoming	\N	\N	1777083
2386	331	1266	1269	2026-06-09 17:00:00+00	upcoming	\N	\N	1778182
2405	1867	4804	4805	2026-06-09 15:00:00+00	upcoming	\N	\N	1780047
2424	405	830	823	2026-06-08 20:30:00+00	upcoming	\N	\N	1732330
2443	45	92	1386	2026-06-08 12:15:00+00	upcoming	\N	\N	1753426
2462	57	1227	1455	2026-06-08 01:30:00+00	cancelled	\N	\N	1770899
2464	2459	114	1213	2026-06-08 00:00:00+00	finished	2	1	1772517
2474	2121	4942	4943	2026-06-08 18:15:00+00	upcoming	\N	\N	1777715
2493	1867	4980	4981	2026-06-08 18:30:00+00	upcoming	\N	\N	1779580
\.


--
-- Data for Name: leagues; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leagues (id, sport_id, name, external_id, country_name, country_key, country_logo, league_logo) FROM stdin;
309	1	USL Cup - Group Stage	11502	USA	114	https://apiv2.allsportsapi.com/logo/logo_country/114_usa.png	\N
1409	1	Shield Cup - Final	10217	Kenya	67	https://apiv2.allsportsapi.com/logo/logo_country/67_kenya.png	\N
1121	1	Landesliga - Niederösterreich	52	Austria	18	https://apiv2.allsportsapi.com/logo/logo_country/18_austria.png	\N
45	1	Victoria NPL 2	679	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
326	1	Maranhense 2	11716	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
41	1	Esiliiga B	11527	Estonia	45	https://apiv2.allsportsapi.com/logo/logo_country/45_estonia.png	\N
1327	1	Pro Liga	11486	Uzbekistan	116	https://apiv2.allsportsapi.com/logo/logo_country/116_uzbekistan.png	\N
1425	1	Baiano U20 - 1/8-finals	10805	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
336	1	Azadegan League	196	Iran	60	https://apiv2.allsportsapi.com/logo/logo_country/60_iran.png	\N
1131	1	Liga 3 - 3. MSFL	131	Czech Republic	39	https://apiv2.allsportsapi.com/logo/logo_country/39_czech-republic.png	\N
871	1	Championnat D1	10239	Gabon	294	\N	\N
447	1	Championnat National	549	Benin	145	https://apiv2.allsportsapi.com/logo/logo_country/145_benin.png	\N
146	1	1 Delid	158	Faroe Islands	46	https://apiv2.allsportsapi.com/logo/logo_country/46_faroe-islands.png	\N
663	1	Copa Espírito Santo - Semi-finals	11504	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
625	1	Premier League - Regular season	224	Lebanon	71	https://apiv2.allsportsapi.com/logo/logo_country/71_lebanon.png	https://apiv2.allsportsapi.com/logo/logo_leagues/224_premier-league.png
284	1	Tasmania	608	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/608_tasmania-npl.png
1290	1	FNL 2 Division A - Division A Silver	10226	Russia	95	https://apiv2.allsportsapi.com/logo/logo_country/95_russia.png	\N
498	1	South Australia State League 1	680	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
200	1	Victorian	581	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
21	1	Pirveli Liga	169	Georgia	49	https://apiv2.allsportsapi.com/logo/logo_country/49_georgia.png	\N
30	1	Mls Next Pro - Group Stage	7097	USA	114	https://apiv2.allsportsapi.com/logo/logo_country/114_usa.png	\N
13	1	3 Divisjon - Group 5	641	Norway	87	https://apiv2.allsportsapi.com/logo/logo_country/87_norway.png	\N
1416	1	Cearense 2 - Final	492	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
1050	1	Ykkosliiga - Group Stage	11501	Finland	48	https://apiv2.allsportsapi.com/logo/logo_country/48_finland.png	\N
1232	1	Ykkonen - Group Stage	353	Finland	48	https://apiv2.allsportsapi.com/logo/logo_country/48_finland.png	https://apiv2.allsportsapi.com/logo/logo_leagues/353_ykkönen.png
81	1	USL League One - Group Stage	653	USA	114	https://apiv2.allsportsapi.com/logo/logo_country/114_usa.png	\N
898	1	Reserve League	7096	Argentina	14	https://apiv2.allsportsapi.com/logo/logo_country/14_argentina.png	\N
583	1	Paulista Série B	10613	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
971	1	Division di Honor - Final Group	47	Aruba	16	https://apiv2.allsportsapi.com/logo/logo_country/16_aruba.png	\N
1006	1	GFA League	552	Gambia	148	https://apiv2.allsportsapi.com/logo/logo_country/148_gambia.png	\N
542	1	Wa State League	11495	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
519	1	Yokary Liga	582	Turkmenistan	130	https://apiv2.allsportsapi.com/logo/logo_country/130_turkmenistan.png	\N
718	1	Premiership Women - Group Stage	11507	Northern Ireland	86	https://apiv2.allsportsapi.com/logo/logo_country/86_northern-ireland.png	\N
1295	1	Vysshaya Liga	569	Tajikistan	159	https://apiv2.allsportsapi.com/logo/logo_country/159_tajikistan.png	\N
852	1	Premier League	446	Mongolia	129	https://apiv2.allsportsapi.com/logo/logo_country/129_mongolia.png	\N
756	1	Ligi kuu Bara	551	Tanzania	147	https://apiv2.allsportsapi.com/logo/logo_country/147_tanzania.png	\N
481	1	Brasileiro U20	433	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
949	1	Brasileiro U17	11528	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
149	1	Liga 3	11509	Georgia	49	https://apiv2.allsportsapi.com/logo/logo_country/49_georgia.png	\N
1415	1	Paulista U20	11493	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
248	1	Northern Nsw	375	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
597	1	2. Deild	494	Iceland	57	https://apiv2.allsportsapi.com/logo/logo_country/57_iceland.png	\N
405	1	Prim B Metro	40	Argentina	14	https://apiv2.allsportsapi.com/logo/logo_country/14_argentina.png	https://apiv2.allsportsapi.com/logo/logo_leagues/40_prim-b-metro.png
89	1	USL 1 - Group Stage	330	USA	114	https://apiv2.allsportsapi.com/logo/logo_country/114_usa.png	\N
282	1	Northern Nsw State League	11497	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
649	1	Cearense U20	11516	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
331	1	Elite Two - Relegation Group	444	Cameroon	29	https://apiv2.allsportsapi.com/logo/logo_country/29_cameroon.png	\N
574	1	Capital Territory NPL	421	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
510	1	Supreme Division Women	663	Russia	95	https://apiv2.allsportsapi.com/logo/logo_country/95_russia.png	\N
29	1	Division 2 - Norrland	367	Sweden	7	https://apiv2.allsportsapi.com/logo/logo_country/7_sweden.png	https://apiv2.allsportsapi.com/logo/logo_leagues/367_division-2.png
109	1	Division 2 - Group 2	363	Norway	87	https://apiv2.allsportsapi.com/logo/logo_country/87_norway.png	https://apiv2.allsportsapi.com/logo/logo_leagues/363_2.-division.png
1305	1	1 Liga	222	Latvia	70	https://apiv2.allsportsapi.com/logo/logo_country/70_latvia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/222_1.-liga.png
2210	1	Conmebol Nations League Women	13740	intl	2	https://apiv2.allsportsapi.com/logo/logo_country/2_intl.png	\N
285	1	Tasmania Southern Championship	11498	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
2494	1	Iraqi League - Final	495	Iraq	138	https://apiv2.allsportsapi.com/logo/logo_country/138_iraq.png	\N
1867	1	Friendlies Women - Group Stage	440	intl	2	https://apiv2.allsportsapi.com/logo/logo_country/2_intl.png	\N
628	1	Super Ligue - Championship Group	417	Congo DR	127	https://apiv2.allsportsapi.com/logo/logo_country/127_congo-dr.png	\N
2173	1	Elite One	112	Cameroon	29	https://apiv2.allsportsapi.com/logo/logo_country/29_cameroon.png	https://apiv2.allsportsapi.com/logo/logo_leagues/112_elite-one.png
2279	1	Euro U17 Qualification - Group Stage	706	intl	2	https://apiv2.allsportsapi.com/logo/logo_country/2_intl.png	\N
2270	1	Primera Division - Apertura - Play Offs	120	Colombia	34	https://apiv2.allsportsapi.com/logo/logo_country/34_colombia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/120_primera-a.png
2274	1	Primera - Torneo Intermedio	333	Uruguay	115	https://apiv2.allsportsapi.com/logo/logo_country/115_uruguay.png	https://apiv2.allsportsapi.com/logo/logo_leagues/333_primera-división.png
2484	1	Matogrossense 2 - Final	11503	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
1431	1	Segunda Division - Regular season	334	Uruguay	115	https://apiv2.allsportsapi.com/logo/logo_country/115_uruguay.png	\N
1429	1	Premier League - Relegation	668	Eswatini	167	https://apiv2.allsportsapi.com/logo/logo_country/167_eswatini.png	\N
1852	1	Cup - Quarter-finals	413	Iceland	57	https://apiv2.allsportsapi.com/logo/logo_country/57_iceland.png	https://apiv2.allsportsapi.com/logo/logo_leagues/413_cup.png
2381	1	ASEAN U19 Championship	7550	intl	2	https://apiv2.allsportsapi.com/logo/logo_country/2_intl.png	\N
1824	1	3rd Division - Relegation Group	698	Denmark	40	https://apiv2.allsportsapi.com/logo/logo_country/40_denmark.png	\N
2402	1	II Liga - Final	261	Poland	91	https://apiv2.allsportsapi.com/logo/logo_country/91_poland.png	https://apiv2.allsportsapi.com/logo/logo_leagues/261_ii-liga.png
115	1	Adeccoligaen	362	Norway	87	https://apiv2.allsportsapi.com/logo/logo_country/87_norway.png	https://apiv2.allsportsapi.com/logo/logo_leagues/362_1.-division.png
2328	1	Euro U19 Qualification - Qualification - Round 1 - League B	707	eurocups	1	\N	\N
27	1	Umaglesi Liga	170	Georgia	49	https://apiv2.allsportsapi.com/logo/logo_country/49_georgia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/170_erovnuli-liga.png
137	1	Elittan Women	607	Sweden	7	https://apiv2.allsportsapi.com/logo/logo_country/7_sweden.png	https://apiv2.allsportsapi.com/logo/logo_leagues/607_elitettan.png
196	1	K League 3	217	Korea Republic	68	https://apiv2.allsportsapi.com/logo/logo_country/68_korea-republic.png	https://apiv2.allsportsapi.com/logo/logo_leagues/217_k3-league.png
2408	1	Baltic Cup - Final	687	intl	2	https://apiv2.allsportsapi.com/logo/logo_country/2_intl.png	\N
1810	1	Mineiro U20	11511	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
1861	1	Goiano U20 - Semi-finals	10800	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
423	1	New South Wales League One	681	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
2298	1	World Cup Women Europe Qualification - Group Stage	704	Worldcup	8	https://apiv2.allsportsapi.com/logo/logo_country/8_worldcup.png	\N
2108	1	Primera B	139	Ecuador	41	https://apiv2.allsportsapi.com/logo/logo_country/41_ecuador.png	\N
2263	1	Premiere Division	558	Mali	154	https://apiv2.allsportsapi.com/logo/logo_country/154_mali.png	\N
2251	1	Persha Liga - Final	324	Ukraine	112	https://apiv2.allsportsapi.com/logo/logo_country/112_ukraine.png	https://apiv2.allsportsapi.com/logo/logo_leagues/324_persha-liga.png
2459	1	Copa De La Liga	13753	Chile	31	https://apiv2.allsportsapi.com/logo/logo_country/31_chile.png	\N
39	1	Esiliiga	155	Estonia	45	https://apiv2.allsportsapi.com/logo/logo_country/45_estonia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/155_esiliiga-a.png
516	1	Premier League	575	Crimea	310	\N	https://apiv2.allsportsapi.com/logo/logo_leagues/575_premier-league-(crimea).png
1971	1	Top Liga	583	Kyrgyzstan	161	https://apiv2.allsportsapi.com/logo/logo_country/161_kyrgyzstan.png	\N
523	1	South Australian	48	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/48_south-australia-npl.png
2252	1	Paranaense U20 - Semi-finals	10801	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
1758	1	National League Women - Championship Group	462	Slovakia	101	https://apiv2.allsportsapi.com/logo/logo_country/101_slovakia.png	\N
56	1	Cup	414	Chile	31	https://apiv2.allsportsapi.com/logo/logo_country/31_chile.png	https://apiv2.allsportsapi.com/logo/logo_leagues/414_copa-chile.png
172	1	Meistriliiga	156	Estonia	45	https://apiv2.allsportsapi.com/logo/logo_country/45_estonia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/156_meistriliiga.png
972	1	Belarus Cup - 1/16-finals	416	Belarus	22	https://apiv2.allsportsapi.com/logo/logo_country/22_belarus.png	https://apiv2.allsportsapi.com/logo/logo_leagues/416_coppa.png
2118	1	Vietnam Cup - Semi-finals	401	Vietnam	118	https://apiv2.allsportsapi.com/logo/logo_country/118_vietnam.png	\N
287	1	FNL 2 Division B - Division B - Group 3	273	Russia	95	https://apiv2.allsportsapi.com/logo/logo_country/95_russia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/273_pfl.png
80	1	Argentino B	41	Argentina	14	https://apiv2.allsportsapi.com/logo/logo_country/14_argentina.png	https://apiv2.allsportsapi.com/logo/logo_leagues/41_primera-nacional.png
532	1	WK-League Women	639	Korea Republic	68	https://apiv2.allsportsapi.com/logo/logo_country/68_korea-republic.png	\N
179	1	1 Delid Karla	395	Iceland	57	https://apiv2.allsportsapi.com/logo/logo_country/57_iceland.png	https://apiv2.allsportsapi.com/logo/logo_leagues/395_1.-deild.png
250	1	Serie C	79	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	https://apiv2.allsportsapi.com/logo/logo_leagues/79_serie-c.png
141	1	Division 1 - Norra	366	Sweden	7	https://apiv2.allsportsapi.com/logo/logo_country/7_sweden.png	https://apiv2.allsportsapi.com/logo/logo_leagues/366_ettan.png
1455	1	Premier League - Group Stage	297	South Africa	103	https://apiv2.allsportsapi.com/logo/logo_country/103_south-africa.png	https://apiv2.allsportsapi.com/logo/logo_leagues/297_psl.png
2377	1	Division Intermedia	256	Paraguay	89	https://apiv2.allsportsapi.com/logo/logo_country/89_paraguay.png	https://apiv2.allsportsapi.com/logo/logo_leagues/256_division-intermedia.png
11	1	Premier League	200	Ireland	61	https://apiv2.allsportsapi.com/logo/logo_country/61_ireland.png	https://apiv2.allsportsapi.com/logo/logo_leagues/200_premier-division.png
1896	1	Tweede Divisie - Final	584	Netherlands	82	https://apiv2.allsportsapi.com/logo/logo_country/82_netherlands.png	https://apiv2.allsportsapi.com/logo/logo_leagues/584_tweede-divisie.png
147	1	Formuladeildin	157	Faroe Islands	46	https://apiv2.allsportsapi.com/logo/logo_country/46_faroe-islands.png	\N
61	1	Club Friendlies - Group Stage	355	intl	2	https://apiv2.allsportsapi.com/logo/logo_country/2_intl.png	https://apiv2.allsportsapi.com/logo/logo_leagues/355_club-friendlies.png
46	1	A Lyga	227	Lithuania	73	https://apiv2.allsportsapi.com/logo/logo_country/73_lithuania.png	https://apiv2.allsportsapi.com/logo/logo_leagues/227_a-lyga.png
257	1	Segunda Division	599	Chile	31	https://apiv2.allsportsapi.com/logo/logo_country/31_chile.png	\N
246	1	Queensland	486	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
315	1	Baiano 2	94	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	https://apiv2.allsportsapi.com/logo/logo_leagues/94_baiano-2.png
552	1	Tasmania Northern Championship	11500	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
2256	1	Suomen Cup - Quarter-finals	161	Finland	48	https://apiv2.allsportsapi.com/logo/logo_country/48_finland.png	https://apiv2.allsportsapi.com/logo/logo_leagues/161_suomen-cup.png
2275	1	GNEF 1	239	Morocco	80	https://apiv2.allsportsapi.com/logo/logo_country/80_morocco.png	https://apiv2.allsportsapi.com/logo/logo_leagues/239_botola-pro.png
47	1	USL League Two - Group Stage	329	USA	114	https://apiv2.allsportsapi.com/logo/logo_country/114_usa.png	\N
67	1	Premier League	214	Kazakhstan	66	https://apiv2.allsportsapi.com/logo/logo_country/66_kazakhstan.png	https://apiv2.allsportsapi.com/logo/logo_leagues/214_premier-league.png
1421	1	GNEF 2	241	Morocco	80	https://apiv2.allsportsapi.com/logo/logo_country/80_morocco.png	https://apiv2.allsportsapi.com/logo/logo_leagues/241_botola-2.png
60	1	Latvia Cup - 1/16-finals	422	Latvia	70	https://apiv2.allsportsapi.com/logo/logo_country/70_latvia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/422_cup.png
192	1	New South Wales	50	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/50_new-south-wales-npl.png
492	1	Western Australia	51	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/51_western-australia-npl.png
77	1	Premier League	61	Belarus	22	https://apiv2.allsportsapi.com/logo/logo_country/22_belarus.png	https://apiv2.allsportsapi.com/logo/logo_leagues/61_premier-league.png
55	1	A Division - Group Stage	489	Bhutan	135	https://apiv2.allsportsapi.com/logo/logo_country/135_bhutan.png	https://apiv2.allsportsapi.com/logo/logo_leagues/489_super-league.png
259	1	1 Lyga	226	Lithuania	73	https://apiv2.allsportsapi.com/logo/logo_country/73_lithuania.png	https://apiv2.allsportsapi.com/logo/logo_leagues/226_1-lyga.png
37	1	Virsliga	223	Latvia	70	https://apiv2.allsportsapi.com/logo/logo_country/70_latvia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/223_virsliga.png
1595	1	Primera C Metro	42	Argentina	14	https://apiv2.allsportsapi.com/logo/logo_country/14_argentina.png	https://apiv2.allsportsapi.com/logo/logo_leagues/42_primera-c.png
310	1	Catarinense 2	11515	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
108	1	Toppserien Women	498	Norway	87	https://apiv2.allsportsapi.com/logo/logo_country/87_norway.png	https://apiv2.allsportsapi.com/logo/logo_leagues/498_toppserien.png
26	1	Urvalsdeild	192	Iceland	57	https://apiv2.allsportsapi.com/logo/logo_country/57_iceland.png	https://apiv2.allsportsapi.com/logo/logo_leagues/192_Úrvalsdeild.png
261	1	Argentino A	39	Argentina	14	https://apiv2.allsportsapi.com/logo/logo_country/14_argentina.png	https://apiv2.allsportsapi.com/logo/logo_leagues/39_torneo-federal-a.png
529	1	Yi League	7546	China	32	https://apiv2.allsportsapi.com/logo/logo_country/32_china.png	\N
53	1	Premier League	556	Ethiopia	152	https://apiv2.allsportsapi.com/logo/logo_country/152_ethiopia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/556_premier-league.png
329	1	FA Cup - 1/16-finals	520	China PR	309	\N	https://apiv2.allsportsapi.com/logo/logo_leagues/520_fa-cup.png
1848	1	Premier League	220	Kuwait	69	https://apiv2.allsportsapi.com/logo/logo_country/69_kuwait.png	https://apiv2.allsportsapi.com/logo/logo_leagues/220_premier-league.png
300	1	1. Division Women	7539	Norway	87	https://apiv2.allsportsapi.com/logo/logo_country/87_norway.png	\N
477	1	Queensland Premier League	678	Australia	17	https://apiv2.allsportsapi.com/logo/logo_country/17_australia.png	\N
655	1	Torneo Promocional Amateur	10798	Argentina	14	https://apiv2.allsportsapi.com/logo/logo_country/14_argentina.png	\N
2287	1	Primera B	116	Chile	31	https://apiv2.allsportsapi.com/logo/logo_country/31_chile.png	https://apiv2.allsportsapi.com/logo/logo_leagues/116_primera-b.png
1456	1	Regionalliga - West	55	Austria	18	https://apiv2.allsportsapi.com/logo/logo_country/18_austria.png	https://apiv2.allsportsapi.com/logo/logo_leagues/55_regionalliga.png
1352	1	Serie D	80	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	https://apiv2.allsportsapi.com/logo/logo_leagues/80_serie-d.png
716	1	1st Division	215	Kazakhstan	66	https://apiv2.allsportsapi.com/logo/logo_country/66_kazakhstan.png	https://apiv2.allsportsapi.com/logo/logo_leagues/215_1.-division.png
955	1	Copa Fgf	12590	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	\N
1064	1	Canadian Premier League - Group Stage	659	Canada	30	https://apiv2.allsportsapi.com/logo/logo_country/30_canada.png	https://apiv2.allsportsapi.com/logo/logo_leagues/659_canadian-premier-league.png
2485	1	League Cup - Final	7092	Egypt	42	https://apiv2.allsportsapi.com/logo/logo_country/42_egypt.png	\N
738	1	1st Division	313	Syria	107	https://apiv2.allsportsapi.com/logo/logo_country/107_syria.png	https://apiv2.allsportsapi.com/logo/logo_leagues/313_premier-league.png
7	1	World Cup - World Championship	28	Worldcup	8	https://apiv2.allsportsapi.com/logo/logo_country/8_worldcup.png	https://apiv2.allsportsapi.com/logo/logo_leagues/28_world-cup.png
668	1	Liga De Primera	115	Chile	31	https://apiv2.allsportsapi.com/logo/logo_country/31_chile.png	https://apiv2.allsportsapi.com/logo/logo_leagues/115_primera-división.png
2490	1	Primera Division - Apertura - Final	337	Venezuela	117	https://apiv2.allsportsapi.com/logo/logo_country/117_venezuela.png	https://apiv2.allsportsapi.com/logo/logo_leagues/337_primera-división.png
762	1	Veikkausliiga	352	Finland	48	https://apiv2.allsportsapi.com/logo/logo_country/48_finland.png	https://apiv2.allsportsapi.com/logo/logo_leagues/352_veikkausliiga.png
59	1	Cup - Semi-finals	306	Sweden	7	https://apiv2.allsportsapi.com/logo/logo_country/7_sweden.png	https://apiv2.allsportsapi.com/logo/logo_leagues/306_svenska-cupen.png
1300	1	League One	117	China	32	https://apiv2.allsportsapi.com/logo/logo_country/32_china.png	https://apiv2.allsportsapi.com/logo/logo_leagues/117_china-league-one.png
2268	1	Premier League - Final	325	Ukraine	112	https://apiv2.allsportsapi.com/logo/logo_country/112_ukraine.png	https://apiv2.allsportsapi.com/logo/logo_leagues/325_premier-league.png
2145	1	Segunda - Semi-finals	301	Spain	6	https://apiv2.allsportsapi.com/logo/logo_country/6_spain.png	https://apiv2.allsportsapi.com/logo/logo_leagues/301_segunda-división.png
2132	1	Tournoi Maurice Revello - Group Stage	7535	intl	2	https://apiv2.allsportsapi.com/logo/logo_country/2_intl.png	\N
2255	1	Premier League - Championship Group	303	Sudan	104	https://apiv2.allsportsapi.com/logo/logo_country/104_sudan.png	https://apiv2.allsportsapi.com/logo/logo_leagues/303_sudani-premier-league.png
676	1	1st Division	198	Ireland	61	https://apiv2.allsportsapi.com/logo/logo_country/61_ireland.png	https://apiv2.allsportsapi.com/logo/logo_leagues/198_first-division.png
71	1	Serie B	75	Brazil	27	https://apiv2.allsportsapi.com/logo/logo_country/27_brazil.png	https://apiv2.allsportsapi.com/logo/logo_leagues/75_serie-b.png
1510	1	League U19	588	Czech Republic	39	https://apiv2.allsportsapi.com/logo/logo_country/39_czech-republic.png	https://apiv2.allsportsapi.com/logo/logo_leagues/588_1.-liga-u19.png
279	1	Division 1	62	Belarus	22	https://apiv2.allsportsapi.com/logo/logo_country/22_belarus.png	\N
1417	1	Premier Soccer League	343	Zimbabwe	121	https://apiv2.allsportsapi.com/logo/logo_country/121_zimbabwe.png	\N
1130	1	Liga 4 - Group B	132	Czech Republic	39	https://apiv2.allsportsapi.com/logo/logo_country/39_czech-republic.png	https://apiv2.allsportsapi.com/logo/logo_leagues/132_4.-liga.png
751	1	Damallsvenskan Women	14	Sweden	7	https://apiv2.allsportsapi.com/logo/logo_country/7_sweden.png	https://apiv2.allsportsapi.com/logo/logo_leagues/14_damallsvenskan.png
1765	1	Elitedivisionen Women - Relegation	482	Denmark	40	https://apiv2.allsportsapi.com/logo/logo_country/40_denmark.png	\N
2121	1	Friendlies - Group Stage	356	intl	2	https://apiv2.allsportsapi.com/logo/logo_country/2_intl.png	https://apiv2.allsportsapi.com/logo/logo_leagues/356_friendlies.png
18	1	Superettan	305	Sweden	7	https://apiv2.allsportsapi.com/logo/logo_country/7_sweden.png	https://apiv2.allsportsapi.com/logo/logo_leagues/305_superettan.png
57	1	Primera Division	69	Bolivia	25	https://apiv2.allsportsapi.com/logo/logo_country/25_bolivia.png	https://apiv2.allsportsapi.com/logo/logo_leagues/69_primera-división.png
1383	1	Kakkonen - Group A	160	Finland	48	https://apiv2.allsportsapi.com/logo/logo_country/48_finland.png	https://apiv2.allsportsapi.com/logo/logo_leagues/160_kakkonen.png
\.


--
-- Data for Name: markets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.markets (id, fixture_id, market_type) FROM stdin;
25	11	1X2
26	12	1X2
27	13	1X2
28	14	1X2
29	15	1X2
30	16	1X2
31	17	1X2
32	18	1X2
33	19	1X2
34	20	1X2
35	21	1X2
36	22	1X2
37	23	1X2
38	24	1X2
39	25	1X2
40	26	1X2
41	27	1X2
42	28	1X2
43	29	1X2
44	30	1X2
45	31	1X2
46	32	1X2
47	33	1X2
48	34	1X2
49	35	1X2
50	36	1X2
51	37	1X2
52	38	1X2
53	39	1X2
54	40	1X2
55	41	1X2
56	42	1X2
57	43	1X2
58	44	1X2
59	45	1X2
60	46	1X2
61	47	1X2
62	48	1X2
63	49	1X2
64	50	1X2
65	51	1X2
66	52	1X2
67	53	1X2
68	54	1X2
69	55	1X2
70	56	1X2
71	57	1X2
72	58	1X2
73	59	1X2
74	60	1X2
75	61	1X2
76	62	1X2
77	63	1X2
78	64	1X2
79	65	1X2
80	66	1X2
81	67	1X2
82	68	1X2
83	69	1X2
84	70	1X2
85	71	1X2
86	72	1X2
87	73	1X2
88	74	1X2
89	75	1X2
90	76	1X2
91	77	1X2
92	78	1X2
93	79	1X2
94	80	1X2
95	81	1X2
96	82	1X2
97	83	1X2
98	84	1X2
99	85	1X2
100	86	1X2
101	87	1X2
102	88	1X2
103	89	1X2
104	90	1X2
105	91	1X2
106	92	1X2
107	93	1X2
108	94	1X2
109	95	1X2
110	96	1X2
111	97	1X2
112	98	1X2
113	99	1X2
114	100	1X2
115	101	1X2
116	102	1X2
117	103	1X2
118	104	1X2
119	105	1X2
120	106	1X2
121	107	1X2
122	108	1X2
123	109	1X2
124	110	1X2
125	111	1X2
126	112	1X2
127	113	1X2
128	114	1X2
129	115	1X2
130	116	1X2
131	117	1X2
132	118	1X2
133	119	1X2
134	120	1X2
135	121	1X2
136	122	1X2
137	123	1X2
138	124	1X2
139	125	1X2
140	126	1X2
141	127	1X2
142	128	1X2
143	129	1X2
144	130	1X2
145	131	1X2
146	132	1X2
147	133	1X2
148	134	1X2
149	135	1X2
150	136	1X2
151	137	1X2
152	138	1X2
153	139	1X2
154	140	1X2
155	141	1X2
156	142	1X2
157	143	1X2
158	144	1X2
159	145	1X2
160	146	1X2
161	147	1X2
162	148	1X2
163	149	1X2
164	150	1X2
165	151	1X2
166	152	1X2
167	153	1X2
168	154	1X2
169	155	1X2
170	156	1X2
171	157	1X2
172	158	1X2
173	159	1X2
174	160	1X2
175	161	1X2
176	162	1X2
177	163	1X2
178	164	1X2
179	165	1X2
180	166	1X2
181	167	1X2
182	168	1X2
183	169	1X2
184	170	1X2
185	171	1X2
186	172	1X2
187	173	1X2
188	174	1X2
189	175	1X2
190	176	1X2
191	177	1X2
192	178	1X2
193	179	1X2
194	180	1X2
195	181	1X2
196	182	1X2
197	183	1X2
198	184	1X2
199	185	1X2
200	186	1X2
201	187	1X2
202	188	1X2
203	189	1X2
204	190	1X2
205	191	1X2
206	192	1X2
207	193	1X2
208	194	1X2
209	195	1X2
210	196	1X2
211	197	1X2
212	198	1X2
213	199	1X2
214	200	1X2
215	201	1X2
216	202	1X2
217	203	1X2
218	204	1X2
219	205	1X2
220	206	1X2
221	207	1X2
222	208	1X2
223	209	1X2
224	210	1X2
225	211	1X2
226	212	1X2
227	213	1X2
228	214	1X2
229	215	1X2
230	216	1X2
231	217	1X2
232	218	1X2
233	219	1X2
234	220	1X2
235	221	1X2
236	222	1X2
237	223	1X2
238	224	1X2
239	225	1X2
240	226	1X2
241	227	1X2
242	228	1X2
243	229	1X2
244	230	1X2
245	231	1X2
246	232	1X2
247	233	1X2
248	234	1X2
249	235	1X2
250	236	1X2
251	237	1X2
252	238	1X2
253	239	1X2
254	240	1X2
255	241	1X2
256	242	1X2
257	243	1X2
258	244	1X2
259	245	1X2
260	246	1X2
261	247	1X2
262	248	1X2
263	249	1X2
264	250	1X2
265	251	1X2
266	252	1X2
267	253	1X2
268	254	1X2
269	255	1X2
270	256	1X2
271	257	1X2
272	258	1X2
273	259	1X2
274	260	1X2
275	261	1X2
276	262	1X2
277	263	1X2
278	264	1X2
279	265	1X2
280	266	1X2
281	267	1X2
282	268	1X2
283	269	1X2
284	270	1X2
285	271	1X2
286	272	1X2
287	273	1X2
288	274	1X2
289	275	1X2
290	276	1X2
291	277	1X2
292	278	1X2
293	279	1X2
294	280	1X2
295	281	1X2
296	282	1X2
297	283	1X2
298	284	1X2
299	285	1X2
300	286	1X2
301	287	1X2
302	288	1X2
303	289	1X2
304	290	1X2
305	291	1X2
306	292	1X2
307	293	1X2
308	294	1X2
309	295	1X2
310	296	1X2
311	297	1X2
312	298	1X2
313	299	1X2
314	300	1X2
315	301	1X2
316	302	1X2
317	303	1X2
318	304	1X2
319	305	1X2
320	306	1X2
321	307	1X2
322	308	1X2
323	309	1X2
324	310	1X2
325	311	1X2
326	312	1X2
327	313	1X2
328	314	1X2
329	315	1X2
330	316	1X2
331	317	1X2
332	318	1X2
333	319	1X2
334	320	1X2
335	321	1X2
336	322	1X2
337	323	1X2
338	324	1X2
339	325	1X2
340	326	1X2
341	327	1X2
342	328	1X2
343	329	1X2
344	330	1X2
345	331	1X2
346	332	1X2
347	333	1X2
348	334	1X2
349	335	1X2
350	336	1X2
351	337	1X2
352	338	1X2
353	339	1X2
354	340	1X2
355	341	1X2
356	342	1X2
357	343	1X2
358	344	1X2
359	345	1X2
360	346	1X2
361	347	1X2
362	348	1X2
363	349	1X2
364	350	1X2
365	351	1X2
366	352	1X2
367	353	1X2
368	354	1X2
369	355	1X2
370	356	1X2
371	357	1X2
372	358	1X2
373	359	1X2
374	360	1X2
375	361	1X2
376	362	1X2
377	363	1X2
378	364	1X2
379	365	1X2
380	366	1X2
381	367	1X2
382	368	1X2
383	369	1X2
384	370	1X2
385	371	1X2
386	372	1X2
387	373	1X2
388	374	1X2
389	375	1X2
390	376	1X2
391	377	1X2
392	378	1X2
393	379	1X2
394	380	1X2
395	381	1X2
396	382	1X2
397	383	1X2
398	384	1X2
399	385	1X2
400	386	1X2
401	387	1X2
402	388	1X2
403	389	1X2
404	390	1X2
405	391	1X2
406	392	1X2
407	393	1X2
408	394	1X2
409	395	1X2
410	396	1X2
411	397	1X2
412	398	1X2
413	399	1X2
414	400	1X2
415	401	1X2
416	402	1X2
417	403	1X2
418	404	1X2
419	405	1X2
420	406	1X2
421	407	1X2
422	408	1X2
423	409	1X2
424	410	1X2
425	411	1X2
426	412	1X2
427	413	1X2
428	414	1X2
429	415	1X2
430	416	1X2
431	417	1X2
432	418	1X2
433	419	1X2
434	420	1X2
435	421	1X2
436	422	1X2
437	423	1X2
438	424	1X2
439	425	1X2
440	426	1X2
441	427	1X2
442	428	1X2
443	429	1X2
444	430	1X2
445	431	1X2
446	432	1X2
447	433	1X2
448	434	1X2
449	435	1X2
450	436	1X2
451	437	1X2
452	438	1X2
453	439	1X2
454	440	1X2
455	441	1X2
456	442	1X2
457	443	1X2
458	444	1X2
459	445	1X2
460	446	1X2
461	447	1X2
462	448	1X2
463	449	1X2
464	450	1X2
465	451	1X2
466	452	1X2
467	453	1X2
468	454	1X2
469	455	1X2
470	456	1X2
471	457	1X2
472	458	1X2
473	459	1X2
474	460	1X2
475	461	1X2
476	462	1X2
477	463	1X2
478	464	1X2
479	465	1X2
480	466	1X2
481	467	1X2
482	468	1X2
483	469	1X2
484	470	1X2
485	471	1X2
486	472	1X2
487	473	1X2
488	474	1X2
489	475	1X2
490	476	1X2
491	477	1X2
492	478	1X2
493	479	1X2
494	480	1X2
495	481	1X2
496	482	1X2
497	483	1X2
498	484	1X2
499	485	1X2
500	486	1X2
501	487	1X2
502	488	1X2
503	489	1X2
504	490	1X2
505	491	1X2
506	492	1X2
507	493	1X2
508	494	1X2
509	495	1X2
510	496	1X2
511	497	1X2
512	498	1X2
513	499	1X2
514	500	1X2
515	501	1X2
516	502	1X2
517	503	1X2
518	504	1X2
519	505	1X2
520	506	1X2
521	507	1X2
522	508	1X2
523	509	1X2
524	510	1X2
525	511	1X2
526	512	1X2
527	513	1X2
528	514	1X2
529	515	1X2
530	516	1X2
531	517	1X2
532	518	1X2
533	519	1X2
534	520	1X2
535	521	1X2
536	522	1X2
537	523	1X2
538	524	1X2
539	525	1X2
540	526	1X2
541	527	1X2
542	528	1X2
543	529	1X2
544	530	1X2
545	531	1X2
546	532	1X2
547	533	1X2
548	534	1X2
549	535	1X2
550	536	1X2
551	537	1X2
552	538	1X2
553	539	1X2
554	540	1X2
555	541	1X2
556	542	1X2
557	543	1X2
558	544	1X2
559	545	1X2
560	546	1X2
561	547	1X2
562	548	1X2
563	549	1X2
564	550	1X2
565	551	1X2
566	552	1X2
567	553	1X2
568	554	1X2
569	555	1X2
570	556	1X2
571	557	1X2
572	558	1X2
573	559	1X2
574	560	1X2
575	561	1X2
576	562	1X2
577	563	1X2
578	564	1X2
579	565	1X2
580	566	1X2
581	567	1X2
582	568	1X2
583	569	1X2
584	570	1X2
585	571	1X2
586	572	1X2
587	573	1X2
588	574	1X2
589	575	1X2
590	576	1X2
591	577	1X2
592	578	1X2
593	579	1X2
594	580	1X2
595	581	1X2
596	582	1X2
597	583	1X2
598	584	1X2
599	585	1X2
600	586	1X2
601	587	1X2
602	588	1X2
603	589	1X2
604	590	1X2
605	591	1X2
606	592	1X2
607	593	1X2
608	594	1X2
609	595	1X2
610	596	1X2
611	597	1X2
612	598	1X2
613	599	1X2
614	600	1X2
615	601	1X2
616	602	1X2
617	603	1X2
618	604	1X2
619	605	1X2
620	606	1X2
621	607	1X2
622	608	1X2
623	609	1X2
624	610	1X2
625	611	1X2
626	612	1X2
627	613	1X2
628	614	1X2
629	615	1X2
630	616	1X2
631	617	1X2
632	618	1X2
633	619	1X2
634	620	1X2
635	621	1X2
636	622	1X2
637	623	1X2
638	624	1X2
639	625	1X2
640	626	1X2
641	627	1X2
642	628	1X2
643	629	1X2
644	630	1X2
645	631	1X2
646	632	1X2
647	633	1X2
648	634	1X2
649	635	1X2
650	636	1X2
651	637	1X2
652	638	1X2
653	639	1X2
654	640	1X2
655	641	1X2
656	642	1X2
657	643	1X2
658	644	1X2
659	645	1X2
660	646	1X2
661	647	1X2
662	648	1X2
663	649	1X2
664	650	1X2
665	651	1X2
666	652	1X2
667	653	1X2
668	654	1X2
669	655	1X2
670	656	1X2
671	657	1X2
672	658	1X2
673	659	1X2
674	660	1X2
675	661	1X2
676	662	1X2
677	663	1X2
678	664	1X2
679	665	1X2
680	666	1X2
681	667	1X2
682	668	1X2
683	669	1X2
684	670	1X2
685	671	1X2
686	672	1X2
687	673	1X2
688	674	1X2
689	675	1X2
690	676	1X2
691	677	1X2
692	678	1X2
693	679	1X2
694	680	1X2
695	681	1X2
696	682	1X2
697	683	1X2
698	684	1X2
699	685	1X2
700	686	1X2
701	687	1X2
702	688	1X2
703	689	1X2
704	690	1X2
705	691	1X2
706	692	1X2
707	693	1X2
708	694	1X2
709	695	1X2
710	696	1X2
711	697	1X2
712	698	1X2
713	699	1X2
714	700	1X2
715	701	1X2
716	702	1X2
717	703	1X2
718	704	1X2
719	705	1X2
720	706	1X2
721	707	1X2
722	708	1X2
723	709	1X2
724	710	1X2
725	711	1X2
726	712	1X2
727	713	1X2
728	714	1X2
729	715	1X2
730	716	1X2
731	717	1X2
732	718	1X2
733	719	1X2
734	720	1X2
735	721	1X2
736	722	1X2
737	723	1X2
738	724	1X2
739	725	1X2
740	726	1X2
741	727	1X2
742	728	1X2
743	729	1X2
744	730	1X2
745	731	1X2
746	732	1X2
747	733	1X2
748	734	1X2
749	735	1X2
750	736	1X2
751	737	1X2
752	738	1X2
753	739	1X2
754	740	1X2
755	741	1X2
756	742	1X2
757	743	1X2
758	744	1X2
759	745	1X2
760	746	1X2
761	747	1X2
762	748	1X2
763	749	1X2
764	750	1X2
765	751	1X2
766	752	1X2
767	753	1X2
768	754	1X2
769	755	1X2
770	756	1X2
771	757	1X2
772	758	1X2
773	759	1X2
774	760	1X2
775	761	1X2
776	762	1X2
777	763	1X2
778	764	1X2
779	765	1X2
780	766	1X2
781	767	1X2
782	768	1X2
783	769	1X2
784	770	1X2
785	771	1X2
786	772	1X2
787	773	1X2
788	774	1X2
789	775	1X2
790	776	1X2
791	777	1X2
792	778	1X2
793	779	1X2
794	780	1X2
795	781	1X2
796	782	1X2
797	783	1X2
798	784	1X2
799	785	1X2
800	786	1X2
801	787	1X2
802	788	1X2
803	789	1X2
804	790	1X2
805	791	1X2
806	792	1X2
807	793	1X2
808	794	1X2
809	795	1X2
810	796	1X2
811	797	1X2
812	798	1X2
813	799	1X2
814	800	1X2
815	801	1X2
816	802	1X2
817	803	1X2
818	804	1X2
819	805	1X2
820	806	1X2
821	807	1X2
822	808	1X2
823	809	1X2
824	810	1X2
825	811	1X2
826	812	1X2
827	813	1X2
828	814	1X2
829	815	1X2
830	816	1X2
831	817	1X2
832	818	1X2
833	819	1X2
834	820	1X2
835	821	1X2
836	822	1X2
837	823	1X2
838	824	1X2
839	825	1X2
840	826	1X2
841	827	1X2
842	828	1X2
843	829	1X2
844	830	1X2
845	831	1X2
846	832	1X2
847	833	1X2
848	834	1X2
849	835	1X2
850	836	1X2
851	837	1X2
852	838	1X2
853	839	1X2
854	840	1X2
855	841	1X2
856	842	1X2
857	843	1X2
858	844	1X2
859	845	1X2
860	846	1X2
861	847	1X2
862	848	1X2
863	849	1X2
864	850	1X2
865	851	1X2
866	852	1X2
867	853	1X2
868	854	1X2
869	855	1X2
870	856	1X2
871	857	1X2
872	858	1X2
873	859	1X2
874	860	1X2
875	861	1X2
876	862	1X2
877	863	1X2
878	864	1X2
879	865	1X2
880	866	1X2
881	867	1X2
882	868	1X2
883	869	1X2
884	870	1X2
885	871	1X2
886	872	1X2
887	873	1X2
888	874	1X2
889	875	1X2
890	876	1X2
891	877	1X2
892	878	1X2
893	879	1X2
894	880	1X2
895	881	1X2
896	882	1X2
897	883	1X2
898	884	1X2
899	885	1X2
900	886	1X2
901	887	1X2
902	888	1X2
903	889	1X2
904	890	1X2
905	891	1X2
906	892	1X2
907	893	1X2
908	894	1X2
909	895	1X2
910	896	1X2
911	897	1X2
912	898	1X2
913	899	1X2
914	900	1X2
915	901	1X2
916	902	1X2
917	903	1X2
918	904	1X2
919	905	1X2
920	906	1X2
921	907	1X2
922	908	1X2
923	909	1X2
924	910	1X2
925	911	1X2
926	912	1X2
927	913	1X2
928	914	1X2
929	915	1X2
930	916	1X2
931	917	1X2
932	918	1X2
933	919	1X2
934	920	1X2
935	921	1X2
936	922	1X2
937	923	1X2
938	924	1X2
939	925	1X2
940	926	1X2
941	927	1X2
942	928	1X2
943	929	1X2
944	930	1X2
945	931	1X2
946	932	1X2
947	933	1X2
948	934	1X2
949	935	1X2
950	936	1X2
951	937	1X2
952	938	1X2
953	939	1X2
954	940	1X2
955	941	1X2
956	942	1X2
957	943	1X2
958	944	1X2
959	945	1X2
960	946	1X2
961	947	1X2
962	948	1X2
963	949	1X2
964	950	1X2
965	951	1X2
966	952	1X2
967	953	1X2
968	954	1X2
969	955	1X2
970	956	1X2
971	957	1X2
972	958	1X2
973	959	1X2
974	960	1X2
975	961	1X2
976	962	1X2
977	963	1X2
978	964	1X2
979	965	1X2
980	966	1X2
981	967	1X2
982	968	1X2
983	969	1X2
984	970	1X2
985	971	1X2
986	972	1X2
987	973	1X2
988	974	1X2
989	975	1X2
990	976	1X2
991	977	1X2
992	978	1X2
993	979	1X2
994	980	1X2
995	981	1X2
996	982	1X2
997	983	1X2
998	984	1X2
999	985	1X2
1000	986	1X2
1001	987	1X2
1002	988	1X2
1003	989	1X2
1004	990	1X2
1005	991	1X2
1006	992	1X2
1007	993	1X2
1008	994	1X2
1009	995	1X2
1010	996	1X2
1011	997	1X2
1012	998	1X2
1013	999	1X2
1014	1000	1X2
1015	1001	1X2
1016	1002	1X2
1017	1003	1X2
1018	1004	1X2
1019	1005	1X2
1020	1006	1X2
1021	1007	1X2
1022	1008	1X2
1023	1009	1X2
1024	1010	1X2
1025	1011	1X2
1026	1012	1X2
1027	1013	1X2
1028	1014	1X2
1029	1015	1X2
1030	1016	1X2
1031	1017	1X2
1032	1018	1X2
1033	1019	1X2
1034	1020	1X2
1035	1021	1X2
1036	1022	1X2
1037	1023	1X2
1038	1024	1X2
1039	1025	1X2
1040	1026	1X2
1041	1027	1X2
1042	1028	1X2
1043	1029	1X2
1044	1030	1X2
1045	1031	1X2
1046	1032	1X2
1047	1033	1X2
1048	1034	1X2
1049	1035	1X2
1050	1036	1X2
1051	1037	1X2
1052	1038	1X2
1053	1039	1X2
1054	1040	1X2
1055	1041	1X2
1056	1042	1X2
1057	1043	1X2
1058	1044	1X2
1059	1045	1X2
1060	1046	1X2
1061	1047	1X2
1062	1048	1X2
1063	1049	1X2
1064	1050	1X2
1065	1051	1X2
1066	1052	1X2
1067	1053	1X2
1068	1054	1X2
1069	1055	1X2
1070	1056	1X2
1071	1057	1X2
1072	1058	1X2
1073	1059	1X2
1074	1060	1X2
1075	1061	1X2
1076	1062	1X2
1077	1063	1X2
1078	1064	1X2
1079	1065	1X2
1080	1066	1X2
1081	1067	1X2
1082	1068	1X2
1083	1069	1X2
1084	1070	1X2
1085	1071	1X2
1086	1072	1X2
1087	1073	1X2
1088	1074	1X2
1089	1075	1X2
1090	1076	1X2
1091	1077	1X2
1092	1078	1X2
1093	1079	1X2
1094	1080	1X2
1095	1081	1X2
1096	1082	1X2
1097	1083	1X2
1098	1084	1X2
1099	1085	1X2
1100	1086	1X2
1101	1087	1X2
1102	1088	1X2
1103	1089	1X2
1104	1092	1X2
1105	1093	1X2
1106	1094	1X2
1107	1095	1X2
1108	1096	1X2
1109	1097	1X2
1110	1098	1X2
1111	1099	1X2
1112	1100	1X2
1113	1101	1X2
1114	1102	1X2
1115	1103	1X2
1116	1104	1X2
1117	1105	1X2
1118	1106	1X2
1119	1107	1X2
1120	1108	1X2
1121	1109	1X2
1122	1110	1X2
1123	1111	1X2
1124	1112	1X2
1125	1113	1X2
1126	1114	1X2
1127	1115	1X2
1128	1116	1X2
1129	1117	1X2
1130	1118	1X2
1131	1119	1X2
1132	1120	1X2
1133	1121	1X2
1134	1122	1X2
1135	1123	1X2
1136	1124	1X2
1137	1125	1X2
1138	1126	1X2
1139	1127	1X2
1140	1128	1X2
1141	1129	1X2
1142	1130	1X2
1143	1131	1X2
1144	1132	1X2
1145	1133	1X2
1146	1134	1X2
1147	1135	1X2
1148	1136	1X2
1149	1137	1X2
1150	1138	1X2
1151	1139	1X2
1152	1140	1X2
1153	1141	1X2
1154	1142	1X2
1155	1143	1X2
1156	1144	1X2
1157	1145	1X2
1158	1146	1X2
1159	1147	1X2
1160	1148	1X2
1161	1149	1X2
1162	1150	1X2
1163	1151	1X2
1164	1152	1X2
1165	1153	1X2
1166	1154	1X2
1167	1155	1X2
1168	1156	1X2
1169	1157	1X2
1170	1158	1X2
1171	1159	1X2
1172	1160	1X2
1173	1161	1X2
1174	1162	1X2
1175	1163	1X2
1176	1164	1X2
1177	1165	1X2
1178	1166	1X2
1179	1167	1X2
1180	1168	1X2
1181	1169	1X2
1182	1170	1X2
1183	1171	1X2
1184	1172	1X2
1185	1173	1X2
1186	1174	1X2
1187	1175	1X2
1188	1176	1X2
1189	1177	1X2
1190	1178	1X2
1191	1179	1X2
1192	1180	1X2
1193	1181	1X2
1194	1182	1X2
1195	1183	1X2
1196	1184	1X2
1197	1185	1X2
1198	1186	1X2
1199	1187	1X2
1200	1188	1X2
1201	1189	1X2
1202	1190	1X2
1203	1191	1X2
1204	1192	1X2
1205	1193	1X2
1206	1194	1X2
1207	1195	1X2
1208	1196	1X2
1209	1197	1X2
1210	1198	1X2
1211	1199	1X2
1212	1200	1X2
1213	1201	1X2
1214	1202	1X2
1215	1203	1X2
1216	1204	1X2
1217	1205	1X2
1218	1206	1X2
1219	1207	1X2
1220	1208	1X2
1221	1209	1X2
1222	1210	1X2
1223	1211	1X2
1224	1212	1X2
1225	1213	1X2
1226	1214	1X2
1227	1215	1X2
1228	1216	1X2
1229	1217	1X2
1230	1218	1X2
1231	1219	1X2
1232	1220	1X2
1233	1221	1X2
1234	1222	1X2
1235	1223	1X2
1236	1224	1X2
1237	1225	1X2
1238	1226	1X2
1239	1227	1X2
1240	1228	1X2
1241	1229	1X2
1242	1230	1X2
1243	1231	1X2
1244	1232	1X2
1245	1233	1X2
1246	1234	1X2
1247	1235	1X2
1248	1236	1X2
1249	1237	1X2
1250	1238	1X2
1251	1239	1X2
1252	1240	1X2
1253	1241	1X2
1254	1242	1X2
1255	1243	1X2
1256	1244	1X2
1257	1245	1X2
1258	1246	1X2
1259	1247	1X2
1260	1248	1X2
1261	1249	1X2
1262	1250	1X2
1263	1251	1X2
1264	1252	1X2
1265	1253	1X2
1266	1254	1X2
1267	1255	1X2
1268	1256	1X2
1269	1257	1X2
1270	1258	1X2
1271	1259	1X2
1272	1260	1X2
1273	1261	1X2
1274	1262	1X2
1275	1263	1X2
1276	1264	1X2
1277	1265	1X2
1278	1266	1X2
1279	1267	1X2
1280	1268	1X2
1281	1269	1X2
1282	1270	1X2
1283	1271	1X2
1284	1272	1X2
1285	1273	1X2
1286	1274	1X2
1287	1275	1X2
1288	1276	1X2
1289	1277	1X2
1290	1278	1X2
1291	1279	1X2
1292	1280	1X2
1293	1281	1X2
1294	1282	1X2
1295	1283	1X2
1296	1284	1X2
1297	1285	1X2
1298	1286	1X2
1299	1287	1X2
1300	1288	1X2
1301	1289	1X2
1302	1290	1X2
1303	1291	1X2
1304	1292	1X2
1305	1293	1X2
1306	1294	1X2
1307	1295	1X2
1308	1296	1X2
1309	1297	1X2
1310	1298	1X2
1311	1299	1X2
1312	1300	1X2
1313	1301	1X2
1314	1302	1X2
1315	1303	1X2
1316	1304	1X2
1317	1305	1X2
1318	1306	1X2
1319	1307	1X2
1320	1308	1X2
1321	1309	1X2
1322	1310	1X2
1323	1311	1X2
1324	1312	1X2
1325	1313	1X2
1326	1314	1X2
1327	1315	1X2
1328	1316	1X2
1329	1317	1X2
1330	1318	1X2
1331	1319	1X2
1332	1320	1X2
1333	1321	1X2
1334	1322	1X2
1335	1323	1X2
1336	1324	1X2
1337	1325	1X2
1338	1326	1X2
1339	1327	1X2
1340	1328	1X2
1341	1329	1X2
1342	1330	1X2
1343	1331	1X2
1344	1332	1X2
1345	1333	1X2
1346	1334	1X2
1347	1335	1X2
1348	1336	1X2
1349	1337	1X2
1350	1338	1X2
1351	1339	1X2
1352	1340	1X2
1353	1341	1X2
1354	1342	1X2
1355	1343	1X2
1356	1344	1X2
1357	1345	1X2
1358	1346	1X2
1359	1347	1X2
1360	1348	1X2
1361	1349	1X2
1362	1350	1X2
1363	1351	1X2
1364	1352	1X2
1365	1353	1X2
1366	1354	1X2
1367	1355	1X2
1368	1356	1X2
1369	1357	1X2
1370	1358	1X2
1371	1359	1X2
1372	1360	1X2
1373	1361	1X2
1374	1362	1X2
1375	1363	1X2
1376	1364	1X2
1377	1365	1X2
1378	1366	1X2
1379	1367	1X2
1380	1368	1X2
1381	1369	1X2
1382	1370	1X2
1383	1371	1X2
1384	1372	1X2
1385	1373	1X2
1386	1374	1X2
1387	1375	1X2
1388	1376	1X2
1389	1377	1X2
1390	1378	1X2
1391	1379	1X2
1392	1380	1X2
1393	1381	1X2
1394	1382	1X2
1395	1383	1X2
1396	1384	1X2
1397	1385	1X2
1398	1386	1X2
1399	1387	1X2
1400	1388	1X2
1401	1389	1X2
1402	1390	1X2
1403	1391	1X2
1404	1392	1X2
1405	1393	1X2
1406	1394	1X2
1407	1395	1X2
1408	1396	1X2
1409	1397	1X2
1410	1398	1X2
1411	1399	1X2
1412	1400	1X2
1413	1401	1X2
1414	1402	1X2
1415	1403	1X2
1416	1404	1X2
1417	1405	1X2
1418	1406	1X2
1419	1407	1X2
1420	1408	1X2
1421	1409	1X2
1422	1413	1X2
1423	1414	1X2
1424	1415	1X2
1425	1416	1X2
1426	1417	1X2
1427	1418	1X2
1428	1419	1X2
1429	1420	1X2
1430	1421	1X2
1431	1422	1X2
1432	1423	1X2
1433	1424	1X2
1434	1425	1X2
1435	1426	1X2
1436	1427	1X2
1437	1428	1X2
1438	1429	1X2
1439	1430	1X2
1440	1431	1X2
1441	1432	1X2
1442	1433	1X2
1443	1434	1X2
1444	1435	1X2
1445	1436	1X2
1446	1437	1X2
1447	1438	1X2
1448	1439	1X2
1449	1440	1X2
1450	1441	1X2
1451	1442	1X2
1452	1443	1X2
1453	1444	1X2
1454	1445	1X2
1455	1446	1X2
1456	1447	1X2
1457	1448	1X2
1458	1449	1X2
1459	1450	1X2
1460	1451	1X2
1461	1452	1X2
1462	1453	1X2
1463	1454	1X2
1464	1455	1X2
1465	1456	1X2
1466	1457	1X2
1467	1458	1X2
1468	1459	1X2
1469	1460	1X2
1470	1461	1X2
1471	1462	1X2
1472	1463	1X2
1473	1464	1X2
1474	1465	1X2
1475	1466	1X2
1476	1467	1X2
1477	1468	1X2
1478	1469	1X2
1479	1470	1X2
1480	1471	1X2
1481	1472	1X2
1482	1473	1X2
1483	1474	1X2
1484	1475	1X2
1485	1476	1X2
1486	1477	1X2
1487	1478	1X2
1488	1479	1X2
1489	1480	1X2
1490	1481	1X2
1491	1482	1X2
1492	1483	1X2
1493	1484	1X2
1494	1485	1X2
1495	1486	1X2
1496	1487	1X2
1497	1488	1X2
1498	1489	1X2
1499	1490	1X2
1500	1491	1X2
1501	1492	1X2
1502	1493	1X2
1503	1494	1X2
1504	1495	1X2
1505	1496	1X2
1506	1497	1X2
1507	1498	1X2
1508	1499	1X2
1509	1500	1X2
1510	1501	1X2
1511	1502	1X2
1512	1503	1X2
1513	1504	1X2
1514	1505	1X2
1515	1506	1X2
1516	1507	1X2
1517	1508	1X2
1518	1509	1X2
1519	1510	1X2
1520	1511	1X2
1521	1512	1X2
1522	1513	1X2
1523	1514	1X2
1524	1515	1X2
1525	1516	1X2
1526	1517	1X2
1527	1518	1X2
1528	1519	1X2
1529	1520	1X2
1530	1521	1X2
1531	1522	1X2
1532	1523	1X2
1533	1524	1X2
1534	1525	1X2
1535	1526	1X2
1536	1527	1X2
1537	1528	1X2
1538	1529	1X2
1539	1530	1X2
1540	1531	1X2
1541	1532	1X2
1542	1533	1X2
1543	1534	1X2
1544	1535	1X2
1545	1536	1X2
1546	1537	1X2
1547	1538	1X2
1548	1539	1X2
1549	1540	1X2
1550	1541	1X2
1551	1542	1X2
1552	1543	1X2
1553	1544	1X2
1554	1545	1X2
1555	1546	1X2
1556	1547	1X2
1557	1548	1X2
1558	1549	1X2
1559	1550	1X2
1560	1551	1X2
1561	1552	1X2
1562	1553	1X2
1563	1554	1X2
1564	1555	1X2
1565	1556	1X2
1566	1557	1X2
1567	1558	1X2
1568	1559	1X2
1569	1560	1X2
1570	1561	1X2
1571	1562	1X2
1572	1563	1X2
1573	1564	1X2
1574	1565	1X2
1575	1566	1X2
1576	1567	1X2
1577	1568	1X2
1578	1569	1X2
1579	1570	1X2
1580	1571	1X2
1581	1572	1X2
1582	1573	1X2
1583	1574	1X2
1584	1575	1X2
1585	1576	1X2
1586	1577	1X2
1587	1578	1X2
1588	1579	1X2
1589	1580	1X2
1590	1581	1X2
1591	1582	1X2
1592	1583	1X2
1593	1584	1X2
1594	1585	1X2
1595	1586	1X2
1596	1587	1X2
1597	1588	1X2
1598	1589	1X2
1599	1590	1X2
1600	1591	1X2
1601	1592	1X2
1602	1593	1X2
1603	1594	1X2
1604	1595	1X2
1605	1596	1X2
1606	1597	1X2
1607	1598	1X2
1608	1599	1X2
1609	1600	1X2
1610	1601	1X2
1611	1602	1X2
1612	1603	1X2
1613	1604	1X2
1614	1605	1X2
1615	1606	1X2
1616	1607	1X2
1617	1608	1X2
1618	1609	1X2
1619	1610	1X2
1620	1611	1X2
1621	1612	1X2
1622	1613	1X2
1623	1614	1X2
1624	1615	1X2
1625	1616	1X2
1626	1617	1X2
1627	1618	1X2
1628	1619	1X2
1629	1620	1X2
1630	1621	1X2
1631	1622	1X2
1632	1623	1X2
1633	1624	1X2
1634	1625	1X2
1635	1626	1X2
1636	1627	1X2
1637	1628	1X2
1638	1629	1X2
1639	1630	1X2
1640	1631	1X2
1641	1632	1X2
1642	1633	1X2
1643	1634	1X2
1644	1635	1X2
1645	1636	1X2
1646	1637	1X2
1647	1638	1X2
1648	1639	1X2
1649	1640	1X2
1650	1641	1X2
1651	1642	1X2
1652	1643	1X2
1653	1644	1X2
1654	1645	1X2
1655	1646	1X2
1656	1647	1X2
1657	1648	1X2
1658	1649	1X2
1659	1650	1X2
1660	1651	1X2
1661	1652	1X2
1662	1653	1X2
1663	1654	1X2
1664	1655	1X2
1665	1656	1X2
1666	1657	1X2
1667	1658	1X2
1668	1659	1X2
1669	1660	1X2
1670	1661	1X2
1671	1662	1X2
1672	1663	1X2
1673	1664	1X2
1674	1665	1X2
1675	1666	1X2
1676	1667	1X2
1677	1668	1X2
1678	1669	1X2
1679	1670	1X2
1680	1671	1X2
1681	1672	1X2
1682	1673	1X2
1683	1674	1X2
1684	1675	1X2
1685	1676	1X2
1686	1677	1X2
1687	1678	1X2
1688	1679	1X2
1689	1680	1X2
1690	1681	1X2
1691	1682	1X2
1692	1683	1X2
1693	1684	1X2
1694	1685	1X2
1695	1686	1X2
1696	1687	1X2
1697	1688	1X2
1698	1689	1X2
1699	1690	1X2
1700	1691	1X2
1701	1692	1X2
1702	1693	1X2
1703	1694	1X2
1704	1695	1X2
1705	1696	1X2
1706	1697	1X2
1707	1698	1X2
1708	1699	1X2
1709	1700	1X2
1710	1701	1X2
1711	1702	1X2
1712	1703	1X2
1713	1704	1X2
1714	1705	1X2
1715	1706	1X2
1716	1707	1X2
1717	1708	1X2
1718	1709	1X2
1719	1710	1X2
1720	1711	1X2
1721	1712	1X2
1722	1713	1X2
1723	1714	1X2
1724	1715	1X2
1725	1716	1X2
1726	1717	1X2
1727	1718	1X2
1728	1719	1X2
1729	1720	1X2
1730	1721	1X2
1731	1722	1X2
1732	1723	1X2
1733	1724	1X2
1734	1725	1X2
1735	1726	1X2
1736	1727	1X2
1737	1728	1X2
1738	1729	1X2
1739	1730	1X2
1740	1731	1X2
1741	1732	1X2
1742	1733	1X2
1743	1734	1X2
1744	1735	1X2
1745	1736	1X2
1746	1737	1X2
1747	1738	1X2
1748	1739	1X2
1749	1740	1X2
1750	1741	1X2
1751	1742	1X2
1752	1743	1X2
1753	1744	1X2
1754	1745	1X2
1755	1746	1X2
1756	1747	1X2
1757	1748	1X2
1758	1749	1X2
1759	1750	1X2
1760	1751	1X2
1761	1752	1X2
1762	1753	1X2
1763	1754	1X2
1764	1755	1X2
1765	1756	1X2
1766	1757	1X2
1767	1758	1X2
1768	1759	1X2
1769	1760	1X2
1770	1761	1X2
1771	1762	1X2
1772	1763	1X2
1773	1764	1X2
1774	1765	1X2
1775	1766	1X2
1776	1767	1X2
1777	1768	1X2
1778	1769	1X2
1779	1770	1X2
1780	1771	1X2
1781	1772	1X2
1782	1773	1X2
1783	1774	1X2
1784	1775	1X2
1785	1776	1X2
1786	1777	1X2
1787	1778	1X2
1788	1779	1X2
1789	1780	1X2
1790	1781	1X2
1791	1782	1X2
1792	1783	1X2
1793	1784	1X2
1794	1785	1X2
1795	1786	1X2
1796	1787	1X2
1797	1788	1X2
1798	1789	1X2
1799	1790	1X2
1800	1791	1X2
1801	1792	1X2
1802	1793	1X2
1803	1794	1X2
1804	1795	1X2
1805	1796	1X2
1806	1797	1X2
1807	1798	1X2
1808	1799	1X2
1809	1800	1X2
1810	1801	1X2
1811	1802	1X2
1812	1803	1X2
1813	1804	1X2
1814	1805	1X2
1815	1806	1X2
1816	1807	1X2
1817	1808	1X2
1818	1809	1X2
1819	1810	1X2
1820	1811	1X2
1821	1812	1X2
1822	1813	1X2
1823	1814	1X2
1824	1815	1X2
1825	1816	1X2
1826	1817	1X2
1827	1818	1X2
1828	1819	1X2
1829	1820	1X2
1830	1821	1X2
1831	1822	1X2
1832	1823	1X2
1833	1824	1X2
1834	1825	1X2
1835	1826	1X2
1836	1827	1X2
1837	1828	1X2
1838	1829	1X2
1839	1830	1X2
1840	1831	1X2
1841	1832	1X2
1842	1833	1X2
1843	1834	1X2
1844	1835	1X2
1845	1836	1X2
1846	1837	1X2
1847	1838	1X2
1848	1839	1X2
1849	1840	1X2
1850	1841	1X2
1851	1842	1X2
1852	1843	1X2
1853	1844	1X2
1854	1845	1X2
1855	1846	1X2
1856	1847	1X2
1857	1848	1X2
1858	1849	1X2
1859	1850	1X2
1860	1851	1X2
1861	1852	1X2
1862	1853	1X2
1863	1856	1X2
1864	1857	1X2
1865	1858	1X2
1866	1859	1X2
1867	1860	1X2
1868	1861	1X2
1869	1862	1X2
1870	1863	1X2
1871	1864	1X2
1872	1865	1X2
1873	1866	1X2
1874	1867	1X2
1875	1868	1X2
1876	1869	1X2
1877	1870	1X2
1878	1871	1X2
1879	1872	1X2
1880	1873	1X2
1881	1874	1X2
1882	1875	1X2
1883	1876	1X2
1884	1877	1X2
1885	1878	1X2
1886	1879	1X2
1887	1880	1X2
1888	1881	1X2
1889	1882	1X2
1890	1883	1X2
1891	1884	1X2
1892	1885	1X2
1893	1886	1X2
1894	1887	1X2
1895	1888	1X2
1896	1889	1X2
1897	1890	1X2
1898	1891	1X2
1899	1892	1X2
1900	1893	1X2
1901	1894	1X2
1902	1895	1X2
1903	1896	1X2
1904	1897	1X2
1905	1898	1X2
1906	1899	1X2
1907	1900	1X2
1908	1901	1X2
1909	1902	1X2
1910	1903	1X2
1911	1904	1X2
1912	1905	1X2
1913	1906	1X2
1914	1907	1X2
1915	1908	1X2
1916	1909	1X2
1917	1910	1X2
1918	1911	1X2
1919	1912	1X2
1920	1913	1X2
1921	1914	1X2
1922	1915	1X2
1923	1916	1X2
1924	1917	1X2
1925	1918	1X2
1926	1919	1X2
1927	1920	1X2
1928	1921	1X2
1929	1922	1X2
1930	1923	1X2
1931	1924	1X2
1932	1925	1X2
1933	1926	1X2
1934	1927	1X2
1935	1928	1X2
1936	1929	1X2
1937	1930	1X2
1938	1931	1X2
1939	1932	1X2
1940	1933	1X2
1941	1934	1X2
1942	1935	1X2
1943	1936	1X2
1944	1937	1X2
1945	1938	1X2
1946	1939	1X2
1947	1940	1X2
1948	1941	1X2
1949	1942	1X2
1950	1943	1X2
1951	1944	1X2
1952	1945	1X2
1953	1946	1X2
1954	1947	1X2
1955	1948	1X2
1956	1949	1X2
1957	1950	1X2
1958	1951	1X2
1959	1952	1X2
1960	1953	1X2
1961	1954	1X2
1962	1955	1X2
1963	1956	1X2
1964	1957	1X2
1965	1958	1X2
1966	1959	1X2
1967	1960	1X2
1968	1961	1X2
1969	1962	1X2
1970	1963	1X2
1971	1964	1X2
1972	1965	1X2
1973	1966	1X2
1974	1967	1X2
1975	1968	1X2
1976	1969	1X2
1977	1970	1X2
1978	1971	1X2
1979	1972	1X2
1980	1973	1X2
1981	1974	1X2
1982	1975	1X2
1983	1976	1X2
1984	1977	1X2
1985	1978	1X2
1986	1979	1X2
1987	1980	1X2
1988	1981	1X2
1989	1982	1X2
1990	1983	1X2
1991	1984	1X2
1992	1985	1X2
1993	1986	1X2
1994	1987	1X2
1995	1988	1X2
1996	1989	1X2
1997	1990	1X2
1998	1991	1X2
1999	1992	1X2
2000	1993	1X2
2001	1994	1X2
2002	1995	1X2
2003	1996	1X2
2004	1997	1X2
2005	1998	1X2
2006	1999	1X2
2007	2000	1X2
2008	2001	1X2
2009	2002	1X2
2010	2003	1X2
2011	2004	1X2
2012	2005	1X2
2013	2006	1X2
2014	2007	1X2
2015	2008	1X2
2016	2009	1X2
2017	2011	1X2
2018	2012	1X2
2019	2013	1X2
2020	2014	1X2
2021	2015	1X2
2022	2016	1X2
2023	2017	1X2
2024	2018	1X2
2025	2019	1X2
2026	2020	1X2
2027	2021	1X2
2028	2022	1X2
2029	2023	1X2
2030	2024	1X2
2031	2025	1X2
2032	2026	1X2
2033	2027	1X2
2034	2028	1X2
2035	2029	1X2
2036	2030	1X2
2037	2031	1X2
2038	2032	1X2
2039	2033	1X2
2040	2034	1X2
2041	2035	1X2
2042	2036	1X2
2043	2037	1X2
2044	2038	1X2
2045	2039	1X2
2046	2040	1X2
2047	2041	1X2
2048	2042	1X2
2049	2043	1X2
2050	2044	1X2
2051	2045	1X2
2052	2046	1X2
2053	2047	1X2
2054	2048	1X2
2055	2049	1X2
2056	2050	1X2
2057	2051	1X2
2058	2052	1X2
2059	2053	1X2
2060	2054	1X2
2061	2055	1X2
2062	2056	1X2
2063	2057	1X2
2064	2058	1X2
2065	2059	1X2
2066	2060	1X2
2067	2061	1X2
2068	2062	1X2
2069	2063	1X2
2070	2064	1X2
2071	2065	1X2
2072	2066	1X2
2073	2067	1X2
2074	2068	1X2
2075	2069	1X2
2076	2070	1X2
2077	2071	1X2
2078	2072	1X2
2079	2073	1X2
2080	2074	1X2
2081	2075	1X2
2082	2076	1X2
2083	2077	1X2
2084	2078	1X2
2085	2079	1X2
2086	2080	1X2
2087	2081	1X2
2088	2082	1X2
2089	2083	1X2
2090	2084	1X2
2091	2085	1X2
2092	2086	1X2
2093	2087	1X2
2094	2088	1X2
2095	2089	1X2
2096	2090	1X2
2097	2091	1X2
2098	2092	1X2
2099	2093	1X2
2100	2094	1X2
2101	2095	1X2
2102	2096	1X2
2103	2097	1X2
2104	2098	1X2
2105	2099	1X2
2106	2100	1X2
2107	2101	1X2
2108	2102	1X2
2109	2103	1X2
2110	2104	1X2
2111	2105	1X2
2112	2106	1X2
2113	2107	1X2
2114	2108	1X2
2115	2109	1X2
2116	2110	1X2
2117	2111	1X2
2118	2112	1X2
2119	2113	1X2
2120	2114	1X2
2121	2115	1X2
2122	2116	1X2
2123	2117	1X2
2124	2118	1X2
2125	2119	1X2
2126	2120	1X2
2127	2121	1X2
2128	2122	1X2
2129	2123	1X2
2130	2124	1X2
2131	2126	1X2
2132	2127	1X2
2133	2128	1X2
2134	2129	1X2
2135	2130	1X2
2136	2131	1X2
2137	2132	1X2
2138	2133	1X2
2139	2134	1X2
2140	2135	1X2
2141	2136	1X2
2142	2137	1X2
2143	2138	1X2
2144	2139	1X2
2145	2140	1X2
2146	2141	1X2
2147	2142	1X2
2148	2143	1X2
2149	2144	1X2
2150	2145	1X2
2151	2146	1X2
2152	2147	1X2
2153	2148	1X2
2154	2149	1X2
2155	2150	1X2
2156	2151	1X2
2157	2152	1X2
2158	2153	1X2
2159	2154	1X2
2160	2155	1X2
2161	2156	1X2
2162	2157	1X2
2163	2158	1X2
2164	2159	1X2
2165	2160	1X2
2166	2161	1X2
2167	2162	1X2
2168	2163	1X2
2169	2164	1X2
2170	2165	1X2
2171	2166	1X2
2172	2167	1X2
2173	2168	1X2
2174	2169	1X2
2175	2170	1X2
2176	2171	1X2
2177	2172	1X2
2178	2173	1X2
2179	2174	1X2
2180	2175	1X2
2181	2176	1X2
2182	2177	1X2
2183	2178	1X2
2184	2179	1X2
2185	2180	1X2
2186	2181	1X2
2187	2182	1X2
2188	2183	1X2
2189	2184	1X2
2190	2185	1X2
2191	2186	1X2
2192	2187	1X2
2193	2188	1X2
2194	2189	1X2
2195	2190	1X2
2196	2191	1X2
2197	2192	1X2
2198	2193	1X2
2199	2194	1X2
2200	2195	1X2
2201	2196	1X2
2202	2197	1X2
2203	2198	1X2
2204	2199	1X2
2205	2200	1X2
2206	2201	1X2
2207	2202	1X2
2208	2203	1X2
2209	2204	1X2
2210	2205	1X2
2211	2206	1X2
2212	2207	1X2
2213	2208	1X2
2214	2209	1X2
2215	2210	1X2
2216	2211	1X2
2217	2212	1X2
2218	2213	1X2
2219	2214	1X2
2220	2215	1X2
2221	2216	1X2
2222	2217	1X2
2223	2218	1X2
2224	2219	1X2
2225	2220	1X2
2226	2221	1X2
2227	2222	1X2
2228	2223	1X2
2229	2224	1X2
2230	2225	1X2
2231	2226	1X2
2232	2227	1X2
2233	2228	1X2
2234	2229	1X2
2235	2230	1X2
2236	2231	1X2
2237	2232	1X2
2238	2233	1X2
2239	2234	1X2
2240	2235	1X2
2241	2236	1X2
2242	2237	1X2
2243	2238	1X2
2244	2239	1X2
2245	2240	1X2
2246	2241	1X2
2247	2242	1X2
2248	2243	1X2
2249	2244	1X2
2250	2245	1X2
2251	2246	1X2
2252	2247	1X2
2253	2248	1X2
2254	2249	1X2
2255	2250	1X2
2256	2251	1X2
2257	2252	1X2
2258	2253	1X2
2259	2254	1X2
2260	2256	1X2
2261	2257	1X2
2262	2258	1X2
2263	2259	1X2
2264	2260	1X2
2265	2261	1X2
2266	2262	1X2
2267	2263	1X2
2268	2264	1X2
2269	2265	1X2
2270	2266	1X2
2271	2267	1X2
2272	2268	1X2
2273	2269	1X2
2274	2270	1X2
2275	2271	1X2
2276	2272	1X2
2277	2273	1X2
2278	2274	1X2
2279	2275	1X2
2280	2276	1X2
2281	2277	1X2
2282	2278	1X2
2283	2279	1X2
2284	2280	1X2
2285	2281	1X2
2286	2282	1X2
2287	2283	1X2
2288	2284	1X2
2289	2285	1X2
2290	2286	1X2
2291	2287	1X2
2292	2288	1X2
2293	2289	1X2
2294	2290	1X2
2295	2291	1X2
2296	2292	1X2
2297	2293	1X2
2298	2294	1X2
2299	2295	1X2
2300	2296	1X2
2301	2297	1X2
2302	2298	1X2
2303	2299	1X2
2304	2300	1X2
2305	2301	1X2
2306	2302	1X2
2307	2303	1X2
2308	2304	1X2
2309	2305	1X2
2310	2306	1X2
2311	2307	1X2
2312	2308	1X2
2313	2309	1X2
2314	2310	1X2
2315	2311	1X2
2316	2312	1X2
2317	2313	1X2
2318	2314	1X2
2319	2315	1X2
2320	2316	1X2
2321	2317	1X2
2322	2318	1X2
2323	2319	1X2
2324	2320	1X2
2325	2321	1X2
2326	2322	1X2
2327	2323	1X2
2328	2324	1X2
2329	2325	1X2
2330	2326	1X2
2331	2327	1X2
2332	2328	1X2
2333	2329	1X2
2334	2330	1X2
2335	2331	1X2
2336	2332	1X2
2337	2333	1X2
2338	2334	1X2
2339	2335	1X2
2340	2336	1X2
2341	2337	1X2
2342	2338	1X2
2343	2339	1X2
2344	2340	1X2
2345	2341	1X2
2346	2342	1X2
2347	2343	1X2
2348	2344	1X2
2349	2345	1X2
2350	2346	1X2
2351	2347	1X2
2352	2348	1X2
2353	2349	1X2
2354	2350	1X2
2355	2351	1X2
2356	2352	1X2
2357	2353	1X2
2358	2354	1X2
2359	2355	1X2
2360	2356	1X2
2361	2357	1X2
2362	2358	1X2
2363	2359	1X2
2364	2360	1X2
2365	2361	1X2
2366	2362	1X2
2367	2364	1X2
2368	2365	1X2
2369	2366	1X2
2370	2367	1X2
2371	2368	1X2
2372	2369	1X2
2373	2371	1X2
2374	2372	1X2
2375	2373	1X2
2376	2374	1X2
2377	2375	1X2
2378	2376	1X2
2379	2377	1X2
2380	2378	1X2
2381	2379	1X2
2382	2380	1X2
2383	2381	1X2
2384	2382	1X2
2385	2383	1X2
2386	2385	1X2
2387	2386	1X2
2388	2387	1X2
2389	2388	1X2
2390	2389	1X2
2391	2390	1X2
2392	2391	1X2
2393	2392	1X2
2394	2393	1X2
2395	2394	1X2
2396	2395	1X2
2397	2396	1X2
2398	2397	1X2
2399	2398	1X2
2400	2399	1X2
2401	2400	1X2
2402	2401	1X2
2403	2402	1X2
2404	2403	1X2
2405	2404	1X2
2406	2405	1X2
2407	2406	1X2
2408	2407	1X2
2409	2408	1X2
2410	2409	1X2
2411	2410	1X2
2412	2411	1X2
2413	2412	1X2
2414	2413	1X2
2415	2414	1X2
2416	2415	1X2
2417	2416	1X2
2418	2417	1X2
2419	2418	1X2
2420	2419	1X2
2421	2420	1X2
2422	2421	1X2
2423	2422	1X2
2424	2423	1X2
2425	2424	1X2
2426	2425	1X2
2427	2426	1X2
2428	2427	1X2
2429	2428	1X2
2430	2429	1X2
2431	2430	1X2
2432	2431	1X2
2433	2432	1X2
2434	2433	1X2
2435	2434	1X2
2436	2435	1X2
2437	2436	1X2
2438	2441	1X2
2439	2442	1X2
2440	2443	1X2
2441	2454	1X2
2442	2456	1X2
2443	2457	1X2
2444	2458	1X2
2445	2459	1X2
2446	2460	1X2
2447	2461	1X2
2448	2465	1X2
2449	2466	1X2
2450	2467	1X2
2451	2468	1X2
2452	2469	1X2
2453	2470	1X2
2454	2471	1X2
2455	2474	1X2
2456	2475	1X2
2457	2476	1X2
2458	2477	1X2
2459	2478	1X2
2460	2479	1X2
2461	2480	1X2
2462	2481	1X2
2463	2482	1X2
2464	2483	1X2
2465	2484	1X2
2466	2485	1X2
2467	2486	1X2
2468	2487	1X2
2469	2489	1X2
2470	2490	1X2
2471	2491	1X2
2472	2492	1X2
2473	2493	1X2
2474	2496	1X2
2475	2497	1X2
2476	2498	1X2
2477	2499	1X2
2478	2500	1X2
2479	2501	1X2
2480	2502	1X2
2481	2503	1X2
2482	2504	1X2
\.


--
-- Data for Name: odds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.odds (id, market_id, selection, odds_value) FROM stdin;
59	25	Home	2.29
60	25	Draw	3.21
61	25	Away	4.43
62	26	Home	4.75
63	26	Draw	3.58
64	26	Away	2.59
65	27	Home	3.61
66	27	Draw	3.72
67	27	Away	4.03
68	28	Home	4.69
69	28	Draw	3.92
70	28	Away	3.41
71	29	Home	4.40
72	29	Draw	3.01
73	29	Away	2.18
74	30	Home	1.87
75	30	Draw	2.96
76	30	Away	1.79
77	31	Home	3.78
78	31	Draw	2.84
79	31	Away	3.41
80	32	Home	1.99
81	32	Draw	3.73
82	32	Away	3.69
83	33	Home	2.12
84	33	Draw	2.97
85	33	Away	3.17
86	34	Home	2.89
87	34	Draw	2.88
88	34	Away	1.74
89	35	Home	4.75
90	35	Draw	3.14
91	35	Away	1.70
92	36	Home	4.88
93	36	Draw	3.16
94	36	Away	4.42
95	37	Home	4.53
96	37	Draw	3.57
97	37	Away	1.72
98	38	Home	3.34
99	38	Draw	3.46
100	38	Away	3.88
101	39	Home	1.66
102	39	Draw	3.59
103	39	Away	3.64
104	40	Home	4.59
105	40	Draw	2.87
106	40	Away	3.60
107	41	Home	3.90
108	41	Draw	2.86
109	41	Away	3.89
110	42	Home	4.13
111	42	Draw	3.45
112	42	Away	2.71
113	43	Home	1.52
114	43	Draw	2.87
115	43	Away	1.82
116	44	Home	4.19
117	44	Draw	3.98
118	44	Away	2.58
119	45	Home	2.79
120	45	Draw	3.59
121	45	Away	2.57
122	46	Home	3.71
123	46	Draw	3.42
124	46	Away	3.05
125	47	Home	3.92
126	47	Draw	2.96
127	47	Away	3.10
128	48	Home	1.76
129	48	Draw	2.81
130	48	Away	2.66
131	49	Home	1.95
132	49	Draw	3.47
133	49	Away	3.31
134	50	Home	2.94
135	50	Draw	3.15
136	50	Away	1.56
137	51	Home	4.25
138	51	Draw	3.52
139	51	Away	3.57
140	52	Home	4.87
141	52	Draw	3.46
142	52	Away	4.59
143	53	Home	2.28
144	53	Draw	3.74
145	53	Away	2.19
146	54	Home	1.72
147	54	Draw	3.30
148	54	Away	1.52
149	55	Home	3.64
150	55	Draw	3.83
151	55	Away	3.10
152	56	Home	4.46
153	56	Draw	2.93
154	56	Away	3.57
155	57	Home	2.49
156	57	Draw	2.90
157	57	Away	4.23
158	58	Home	4.61
159	58	Draw	3.01
160	58	Away	3.77
161	59	Home	4.70
162	59	Draw	2.83
163	59	Away	2.50
164	60	Home	2.08
165	60	Draw	3.42
166	60	Away	4.13
167	61	Home	4.41
168	61	Draw	3.89
169	61	Away	2.77
170	62	Home	3.54
171	62	Draw	3.21
172	62	Away	2.56
173	63	Home	2.59
174	63	Draw	2.94
175	63	Away	4.49
176	64	Home	1.67
177	64	Draw	2.89
178	64	Away	4.65
179	65	Home	1.79
180	65	Draw	2.90
181	65	Away	2.78
182	66	Home	3.53
183	66	Draw	3.86
184	66	Away	1.65
185	67	Home	4.32
186	67	Draw	3.64
187	67	Away	1.78
188	68	Home	4.14
189	68	Draw	2.92
190	68	Away	2.33
191	69	Home	3.21
192	69	Draw	3.59
193	69	Away	4.28
194	70	Home	1.92
195	70	Draw	3.20
196	70	Away	3.84
197	71	Home	1.89
198	71	Draw	3.70
199	71	Away	2.01
200	72	Home	3.53
201	72	Draw	3.83
202	72	Away	4.43
203	73	Home	3.05
204	73	Draw	3.28
205	73	Away	1.87
206	74	Home	3.72
207	74	Draw	3.38
208	74	Away	2.65
209	75	Home	1.95
210	75	Draw	3.72
211	75	Away	4.31
212	76	Home	1.87
213	76	Draw	3.63
214	76	Away	2.83
215	77	Home	4.15
216	77	Draw	3.36
217	77	Away	2.25
218	78	Home	3.35
219	78	Draw	3.02
220	78	Away	1.95
221	79	Home	2.55
222	79	Draw	3.96
223	79	Away	2.31
224	80	Home	4.55
225	80	Draw	3.90
226	80	Away	1.67
227	81	Home	4.70
228	81	Draw	3.70
229	81	Away	4.82
230	82	Home	1.60
231	82	Draw	3.23
232	82	Away	3.02
233	83	Home	4.64
234	83	Draw	3.16
235	83	Away	4.23
236	84	Home	2.92
237	84	Draw	3.68
238	84	Away	3.64
239	85	Home	1.47
240	85	Draw	3.46
241	85	Away	3.31
242	86	Home	4.70
243	86	Draw	3.33
244	86	Away	3.44
245	87	Home	1.75
246	87	Draw	3.51
247	87	Away	4.15
248	88	Home	2.78
249	88	Draw	3.71
250	88	Away	2.44
251	89	Home	3.78
252	89	Draw	2.92
253	89	Away	2.65
254	90	Home	1.87
255	90	Draw	3.88
256	90	Away	2.40
257	91	Home	3.77
258	91	Draw	3.90
259	91	Away	3.36
260	92	Home	4.34
261	92	Draw	3.14
262	92	Away	3.83
263	93	Home	2.29
264	93	Draw	3.17
265	93	Away	1.42
266	94	Home	2.20
267	94	Draw	3.85
268	94	Away	3.44
269	95	Home	1.60
270	95	Draw	2.94
271	95	Away	2.70
272	96	Home	1.51
273	96	Draw	3.62
274	96	Away	4.43
275	97	Home	4.52
276	97	Draw	3.23
277	97	Away	1.78
278	98	Home	4.22
279	98	Draw	3.04
280	98	Away	4.49
281	99	Home	2.14
282	99	Draw	3.77
283	99	Away	2.12
284	100	Home	4.77
285	100	Draw	3.47
286	100	Away	4.53
287	101	Home	2.29
288	101	Draw	3.44
289	101	Away	2.67
290	102	Home	1.51
291	102	Draw	3.57
292	102	Away	2.34
293	103	Home	3.90
294	103	Draw	3.63
295	103	Away	3.21
296	104	Home	4.22
297	104	Draw	2.82
298	104	Away	4.25
299	105	Home	4.79
300	105	Draw	3.95
301	105	Away	3.87
302	106	Home	1.84
303	106	Draw	3.49
304	106	Away	2.22
305	107	Home	2.54
306	107	Draw	3.16
307	107	Away	4.16
308	108	Home	2.47
309	108	Draw	3.86
310	108	Away	3.50
311	109	Home	2.40
312	109	Draw	3.50
313	109	Away	4.53
314	110	Home	3.11
315	110	Draw	3.82
316	110	Away	4.67
317	111	Home	2.56
318	111	Draw	3.45
319	111	Away	3.44
320	112	Home	4.56
321	112	Draw	3.29
322	112	Away	4.02
323	113	Home	2.04
324	113	Draw	3.33
325	113	Away	2.71
326	114	Home	3.31
327	114	Draw	3.92
328	114	Away	4.64
329	115	Home	2.82
330	115	Draw	3.99
331	115	Away	3.11
332	116	Home	3.69
333	116	Draw	3.44
334	116	Away	4.00
335	117	Home	2.09
336	117	Draw	3.23
337	117	Away	2.20
338	118	Home	2.85
339	118	Draw	3.39
340	118	Away	3.61
341	119	Home	1.48
342	119	Draw	3.67
343	119	Away	4.28
344	120	Home	2.55
345	120	Draw	3.55
346	120	Away	4.75
347	121	Home	1.69
348	121	Draw	3.83
349	121	Away	3.41
350	122	Home	2.36
351	122	Draw	2.82
352	122	Away	4.42
353	123	Home	4.60
354	123	Draw	2.86
355	123	Away	4.65
356	124	Home	2.54
357	124	Draw	2.92
358	124	Away	4.35
359	125	Home	2.03
360	125	Draw	3.61
361	125	Away	1.96
362	126	Home	3.95
363	126	Draw	3.84
364	126	Away	2.82
365	127	Home	4.02
366	127	Draw	3.04
367	127	Away	3.81
368	128	Home	2.16
369	128	Draw	3.45
370	128	Away	4.52
371	129	Home	4.70
372	129	Draw	3.13
373	129	Away	4.61
374	130	Home	3.90
375	130	Draw	3.63
376	130	Away	3.55
377	131	Home	2.91
378	131	Draw	3.03
379	131	Away	2.61
380	132	Home	4.87
381	132	Draw	3.40
382	132	Away	1.87
383	133	Home	1.54
384	133	Draw	3.29
385	133	Away	1.56
386	134	Home	3.98
387	134	Draw	3.16
388	134	Away	2.55
389	135	Home	3.61
390	135	Draw	3.47
391	135	Away	4.35
392	136	Home	1.52
393	136	Draw	3.60
394	136	Away	4.65
395	137	Home	3.48
396	137	Draw	3.56
397	137	Away	3.24
398	138	Home	1.61
399	138	Draw	3.05
400	138	Away	3.33
401	139	Home	3.20
402	139	Draw	3.70
403	139	Away	4.37
404	140	Home	1.41
405	140	Draw	2.85
406	140	Away	1.71
407	141	Home	4.21
408	141	Draw	3.84
409	141	Away	2.43
410	142	Home	3.94
411	142	Draw	3.29
412	142	Away	2.82
413	143	Home	2.56
414	143	Draw	3.45
415	143	Away	2.67
416	144	Home	1.78
417	144	Draw	3.78
418	144	Away	4.25
419	145	Home	3.15
420	145	Draw	3.34
421	145	Away	4.55
422	146	Home	4.32
423	146	Draw	3.50
424	146	Away	4.33
425	147	Home	3.18
426	147	Draw	2.93
427	147	Away	1.94
428	148	Home	4.06
429	148	Draw	3.43
430	148	Away	2.44
431	149	Home	1.77
432	149	Draw	3.53
433	149	Away	2.14
434	150	Home	1.65
435	150	Draw	3.84
436	150	Away	4.35
437	151	Home	2.81
438	151	Draw	3.54
439	151	Away	4.83
440	152	Home	3.62
441	152	Draw	2.88
442	152	Away	3.26
443	153	Home	2.10
444	153	Draw	3.57
445	153	Away	2.56
446	154	Home	1.61
447	154	Draw	3.66
448	154	Away	4.39
449	155	Home	3.11
450	155	Draw	3.81
451	155	Away	1.54
452	156	Home	3.48
453	156	Draw	3.20
454	156	Away	2.95
455	157	Home	4.90
456	157	Draw	2.82
457	157	Away	3.43
458	158	Home	3.85
459	158	Draw	3.65
460	158	Away	3.63
461	159	Home	3.90
462	159	Draw	2.85
463	159	Away	1.50
464	160	Home	4.16
465	160	Draw	3.86
466	160	Away	3.37
467	161	Home	3.28
468	161	Draw	3.83
469	161	Away	4.56
470	162	Home	2.33
471	162	Draw	3.67
472	162	Away	4.59
473	163	Home	2.08
474	163	Draw	3.83
475	163	Away	1.66
476	164	Home	2.92
477	164	Draw	2.94
478	164	Away	4.47
479	165	Home	2.12
480	165	Draw	3.27
481	165	Away	2.09
482	166	Home	4.40
483	166	Draw	3.01
484	166	Away	4.40
485	167	Home	3.30
486	167	Draw	3.21
487	167	Away	4.65
488	168	Home	4.24
489	168	Draw	3.98
490	168	Away	3.60
491	169	Home	2.72
492	169	Draw	3.94
493	169	Away	3.03
494	170	Home	3.85
495	170	Draw	3.00
496	170	Away	4.85
497	171	Home	4.80
498	171	Draw	3.16
499	171	Away	2.51
500	172	Home	4.89
501	172	Draw	3.41
502	172	Away	3.87
503	173	Home	2.68
504	173	Draw	3.67
505	173	Away	4.15
506	174	Home	4.42
507	174	Draw	3.57
508	174	Away	1.42
509	175	Home	3.96
510	175	Draw	3.89
511	175	Away	3.15
512	176	Home	4.16
513	176	Draw	2.96
514	176	Away	2.92
515	177	Home	4.52
516	177	Draw	3.35
517	177	Away	4.80
518	178	Home	4.48
519	178	Draw	3.81
520	178	Away	2.40
521	179	Home	4.86
522	179	Draw	3.29
523	179	Away	3.13
524	180	Home	4.38
525	180	Draw	2.89
526	180	Away	2.58
527	181	Home	2.61
528	181	Draw	3.79
529	181	Away	3.46
530	182	Home	3.92
531	182	Draw	3.12
532	182	Away	3.96
533	183	Home	2.41
534	183	Draw	3.61
535	183	Away	3.49
536	184	Home	2.70
537	184	Draw	3.83
538	184	Away	3.69
539	185	Home	2.12
540	185	Draw	3.87
541	185	Away	3.54
542	186	Home	1.75
543	186	Draw	3.96
544	186	Away	3.72
545	187	Home	2.06
546	187	Draw	2.90
547	187	Away	2.75
548	188	Home	4.43
549	188	Draw	3.64
550	188	Away	2.25
551	189	Home	2.98
552	189	Draw	3.25
553	189	Away	3.22
554	190	Home	3.11
555	190	Draw	3.78
556	190	Away	2.19
557	191	Home	3.09
558	191	Draw	3.03
559	191	Away	3.19
560	192	Home	3.28
561	192	Draw	2.91
562	192	Away	3.93
563	193	Home	4.73
564	193	Draw	3.31
565	193	Away	3.85
566	194	Home	3.32
567	194	Draw	2.88
568	194	Away	2.63
569	195	Home	1.44
570	195	Draw	3.92
571	195	Away	2.53
572	196	Home	2.98
573	196	Draw	3.12
574	196	Away	4.25
575	197	Home	4.38
576	197	Draw	2.98
577	197	Away	3.37
578	198	Home	1.80
579	198	Draw	3.66
580	198	Away	4.12
581	199	Home	4.71
582	199	Draw	3.82
583	199	Away	3.29
584	200	Home	3.96
585	200	Draw	3.63
586	200	Away	3.73
587	201	Home	1.78
588	201	Draw	3.91
589	201	Away	3.07
590	202	Home	1.66
591	202	Draw	3.22
592	202	Away	1.56
593	203	Home	4.72
594	203	Draw	3.76
595	203	Away	3.04
596	204	Home	3.42
597	204	Draw	3.59
598	204	Away	4.54
599	205	Home	4.84
600	205	Draw	3.56
601	205	Away	3.92
602	206	Home	3.76
603	206	Draw	3.50
604	206	Away	3.21
605	207	Home	2.72
606	207	Draw	3.94
607	207	Away	2.23
608	208	Home	3.15
609	208	Draw	3.95
610	208	Away	4.77
611	209	Home	3.35
612	209	Draw	3.30
613	209	Away	2.37
614	210	Home	2.80
615	210	Draw	3.91
616	210	Away	4.80
617	211	Home	2.46
618	211	Draw	3.91
619	211	Away	1.72
620	212	Home	3.51
621	212	Draw	3.06
622	212	Away	2.56
623	213	Home	1.78
624	213	Draw	3.23
625	213	Away	4.11
626	214	Home	4.74
627	214	Draw	3.65
628	214	Away	1.92
629	215	Home	1.80
630	215	Draw	3.02
631	215	Away	3.97
632	216	Home	3.17
633	216	Draw	3.54
634	216	Away	3.70
635	217	Home	3.78
636	217	Draw	3.37
637	217	Away	4.48
638	218	Home	4.04
639	218	Draw	3.61
640	218	Away	2.18
641	219	Home	4.56
642	219	Draw	3.71
643	219	Away	1.70
644	220	Home	4.62
645	220	Draw	3.80
646	220	Away	3.99
647	221	Home	2.24
648	221	Draw	3.18
649	221	Away	2.25
650	222	Home	2.25
651	222	Draw	3.40
652	222	Away	2.20
653	223	Home	2.28
654	223	Draw	3.34
655	223	Away	3.90
656	224	Home	2.11
657	224	Draw	3.37
658	224	Away	2.71
659	225	Home	3.20
660	225	Draw	3.73
661	225	Away	4.42
662	226	Home	2.25
663	226	Draw	3.48
664	226	Away	4.69
665	227	Home	2.80
666	227	Draw	3.61
667	227	Away	4.66
668	228	Home	4.65
669	228	Draw	3.33
670	228	Away	4.11
671	229	Home	4.86
672	229	Draw	3.99
673	229	Away	1.73
674	230	Home	3.64
675	230	Draw	3.18
676	230	Away	2.06
677	231	Home	1.79
678	231	Draw	3.58
679	231	Away	4.01
680	232	Home	2.91
681	232	Draw	2.89
682	232	Away	4.21
683	233	Home	4.17
684	233	Draw	3.89
685	233	Away	1.42
686	234	Home	3.75
687	234	Draw	3.49
688	234	Away	3.38
689	235	Home	2.24
690	235	Draw	3.94
691	235	Away	2.44
692	236	Home	2.03
693	236	Draw	3.93
694	236	Away	2.05
695	237	Home	1.41
696	237	Draw	3.34
697	237	Away	3.92
698	238	Home	4.02
699	238	Draw	3.69
700	238	Away	3.84
701	239	Home	3.65
702	239	Draw	3.33
703	239	Away	3.90
704	240	Home	4.02
705	240	Draw	2.95
706	240	Away	1.41
707	241	Home	4.17
708	241	Draw	2.89
709	241	Away	3.09
710	242	Home	2.31
711	242	Draw	3.32
712	242	Away	4.04
713	243	Home	2.64
714	243	Draw	3.39
715	243	Away	3.24
716	244	Home	2.97
717	244	Draw	3.97
718	244	Away	2.52
719	245	Home	1.90
720	245	Draw	3.82
721	245	Away	4.17
722	246	Home	2.04
723	246	Draw	3.28
724	246	Away	3.86
725	247	Home	4.70
726	247	Draw	3.59
727	247	Away	3.39
728	248	Home	4.19
729	248	Draw	2.91
730	248	Away	1.87
731	249	Home	1.76
732	249	Draw	3.51
733	249	Away	4.44
734	250	Home	2.03
735	250	Draw	3.44
736	250	Away	2.35
737	251	Home	4.84
738	251	Draw	3.57
739	251	Away	1.41
740	252	Home	2.42
741	252	Draw	3.66
742	252	Away	1.72
743	253	Home	2.97
744	253	Draw	2.81
745	253	Away	3.81
746	254	Home	4.87
747	254	Draw	3.30
748	254	Away	1.84
749	255	Home	1.89
750	255	Draw	3.95
751	255	Away	4.13
752	256	Home	2.13
753	256	Draw	3.14
754	256	Away	1.67
755	257	Home	3.23
756	257	Draw	3.30
757	257	Away	4.27
758	258	Home	2.73
759	258	Draw	3.21
760	258	Away	2.08
761	259	Home	4.85
762	259	Draw	2.89
763	259	Away	1.45
764	260	Home	1.49
765	260	Draw	3.91
766	260	Away	2.63
767	261	Home	2.82
768	261	Draw	2.90
769	261	Away	4.72
770	262	Home	2.08
771	262	Draw	3.93
772	262	Away	4.79
773	263	Home	1.54
774	263	Draw	2.83
775	263	Away	1.82
776	264	Home	2.48
777	264	Draw	3.30
778	264	Away	1.56
779	265	Home	2.68
780	265	Draw	3.07
781	265	Away	2.86
782	266	Home	3.65
783	266	Draw	3.45
784	266	Away	2.06
785	267	Home	4.70
786	267	Draw	3.73
787	267	Away	3.99
788	268	Home	4.00
789	268	Draw	3.07
790	268	Away	4.64
791	269	Home	3.13
792	269	Draw	3.07
793	269	Away	1.92
794	270	Home	2.68
795	270	Draw	2.94
796	270	Away	3.34
797	271	Home	2.93
798	271	Draw	3.28
799	271	Away	3.34
800	272	Home	2.28
801	272	Draw	3.44
802	272	Away	3.43
803	273	Home	4.71
804	273	Draw	3.23
805	273	Away	2.11
806	274	Home	4.69
807	274	Draw	3.24
808	274	Away	2.27
809	275	Home	3.27
810	275	Draw	3.08
811	275	Away	3.68
812	276	Home	1.93
813	276	Draw	3.24
814	276	Away	2.94
815	277	Home	2.14
816	277	Draw	3.92
817	277	Away	1.71
818	278	Home	3.07
819	278	Draw	3.47
820	278	Away	4.68
821	279	Home	4.65
822	279	Draw	3.89
823	279	Away	2.94
824	280	Home	1.71
825	280	Draw	2.82
826	280	Away	1.76
827	281	Home	3.11
828	281	Draw	3.54
829	281	Away	1.67
830	282	Home	2.06
831	282	Draw	3.11
832	282	Away	4.53
833	283	Home	3.57
834	283	Draw	3.70
835	283	Away	3.58
836	284	Home	1.82
837	284	Draw	3.99
838	284	Away	4.28
839	285	Home	2.29
840	285	Draw	2.98
841	285	Away	1.64
842	286	Home	3.60
843	286	Draw	3.63
844	286	Away	3.72
845	287	Home	4.15
846	287	Draw	2.85
847	287	Away	4.36
848	288	Home	4.23
849	288	Draw	2.86
850	288	Away	4.65
851	289	Home	1.54
852	289	Draw	3.13
853	289	Away	1.45
854	290	Home	1.90
855	290	Draw	3.60
856	290	Away	3.14
857	291	Home	3.65
858	291	Draw	3.13
859	291	Away	4.68
860	292	Home	3.49
861	292	Draw	2.99
862	292	Away	1.71
863	293	Home	3.36
864	293	Draw	3.21
865	293	Away	1.74
866	294	Home	2.00
867	294	Draw	2.81
868	294	Away	4.76
869	295	Home	2.31
870	295	Draw	3.33
871	295	Away	3.05
872	296	Home	4.76
873	296	Draw	3.37
874	296	Away	3.53
875	297	Home	4.38
876	297	Draw	2.95
877	297	Away	3.09
878	298	Home	4.72
879	298	Draw	3.33
880	298	Away	2.21
881	299	Home	4.27
882	299	Draw	2.93
883	299	Away	3.50
884	300	Home	3.13
885	300	Draw	3.69
886	300	Away	1.85
887	301	Home	2.64
888	301	Draw	2.94
889	301	Away	4.21
890	302	Home	1.85
891	302	Draw	3.72
892	302	Away	2.95
893	303	Home	4.41
894	303	Draw	3.48
895	303	Away	3.15
896	304	Home	4.47
897	304	Draw	3.88
898	304	Away	4.31
899	305	Home	4.67
900	305	Draw	3.46
901	305	Away	1.56
902	306	Home	2.38
903	306	Draw	3.51
904	306	Away	3.32
905	307	Home	3.13
906	307	Draw	3.75
907	307	Away	2.11
908	308	Home	1.72
909	308	Draw	3.21
910	308	Away	2.44
911	309	Home	4.38
912	309	Draw	3.00
913	309	Away	2.87
914	310	Home	3.24
915	310	Draw	3.53
916	310	Away	4.89
917	311	Home	2.93
918	311	Draw	3.54
919	311	Away	3.01
920	312	Home	2.10
921	312	Draw	3.90
922	312	Away	3.11
923	313	Home	1.89
924	313	Draw	3.12
925	313	Away	2.58
926	314	Home	3.43
927	314	Draw	3.03
928	314	Away	1.63
929	315	Home	1.82
930	315	Draw	3.85
931	315	Away	3.55
932	316	Home	3.81
933	316	Draw	3.46
934	316	Away	3.63
935	317	Home	2.93
936	317	Draw	3.15
937	317	Away	3.85
938	318	Home	2.13
939	318	Draw	3.22
940	318	Away	2.47
941	319	Home	4.75
942	319	Draw	2.81
943	319	Away	3.76
944	320	Home	2.07
945	320	Draw	3.24
946	320	Away	3.54
947	321	Home	2.75
948	321	Draw	3.37
949	321	Away	4.20
950	322	Home	4.64
951	322	Draw	3.46
952	322	Away	4.89
953	323	Home	3.19
954	323	Draw	2.95
955	323	Away	4.57
956	324	Home	4.39
957	324	Draw	3.61
958	324	Away	1.44
959	325	Home	4.06
960	325	Draw	3.06
961	325	Away	3.21
962	326	Home	4.58
963	326	Draw	3.07
964	326	Away	3.26
965	327	Home	2.33
966	327	Draw	3.88
967	327	Away	2.77
968	328	Home	2.27
969	328	Draw	3.66
970	328	Away	3.69
971	329	Home	1.56
972	329	Draw	3.23
973	329	Away	3.63
974	330	Home	3.20
975	330	Draw	3.40
976	330	Away	3.14
977	331	Home	2.08
978	331	Draw	3.69
979	331	Away	1.84
980	332	Home	1.83
981	332	Draw	3.74
982	332	Away	2.08
983	333	Home	3.62
984	333	Draw	3.51
985	333	Away	3.34
986	334	Home	1.90
987	334	Draw	3.93
988	334	Away	2.79
989	335	Home	4.12
990	335	Draw	3.00
991	335	Away	3.29
992	336	Home	2.95
993	336	Draw	2.87
994	336	Away	3.06
995	337	Home	3.74
996	337	Draw	2.91
997	337	Away	3.53
998	338	Home	4.69
999	338	Draw	3.62
1000	338	Away	4.56
1001	339	Home	1.91
1002	339	Draw	3.33
1003	339	Away	3.90
1004	340	Home	2.91
1005	340	Draw	3.09
1006	340	Away	2.10
1007	341	Home	1.48
1008	341	Draw	3.37
1009	341	Away	2.44
1010	342	Home	1.56
1011	342	Draw	3.39
1012	342	Away	3.00
1013	343	Home	4.61
1014	343	Draw	3.22
1015	343	Away	2.83
1016	344	Home	3.28
1017	344	Draw	3.55
1018	344	Away	3.51
1019	345	Home	2.42
1020	345	Draw	3.45
1021	345	Away	2.13
1022	346	Home	1.95
1023	346	Draw	3.19
1024	346	Away	2.97
1025	347	Home	4.39
1026	347	Draw	3.28
1027	347	Away	2.65
1028	348	Home	2.52
1029	348	Draw	3.56
1030	348	Away	4.67
1031	349	Home	2.29
1032	349	Draw	3.02
1033	349	Away	1.59
1034	350	Home	4.57
1035	350	Draw	3.61
1036	350	Away	2.18
1037	351	Home	4.70
1038	351	Draw	3.83
1039	351	Away	2.67
1040	352	Home	3.48
1041	352	Draw	3.92
1042	352	Away	3.82
1043	353	Home	2.68
1044	353	Draw	3.60
1045	353	Away	1.94
1046	354	Home	2.80
1047	354	Draw	3.99
1048	354	Away	2.52
1049	355	Home	1.68
1050	355	Draw	3.52
1051	355	Away	3.81
1052	356	Home	2.79
1053	356	Draw	3.21
1054	356	Away	3.03
1055	357	Home	1.50
1056	357	Draw	2.96
1057	357	Away	2.04
1058	358	Home	1.49
1059	358	Draw	3.39
1060	358	Away	2.65
1061	359	Home	3.10
1062	359	Draw	3.75
1063	359	Away	2.56
1064	360	Home	2.42
1065	360	Draw	3.36
1066	360	Away	3.37
1067	361	Home	4.46
1068	361	Draw	3.34
1069	361	Away	1.86
1070	362	Home	1.82
1071	362	Draw	3.81
1072	362	Away	4.90
1073	363	Home	2.82
1074	363	Draw	3.63
1075	363	Away	1.41
1076	364	Home	3.13
1077	364	Draw	3.30
1078	364	Away	4.64
1079	365	Home	2.75
1080	365	Draw	3.12
1081	365	Away	3.71
1082	366	Home	3.48
1083	366	Draw	3.61
1084	366	Away	3.35
1085	367	Home	2.51
1086	367	Draw	3.64
1087	367	Away	3.52
1088	368	Home	3.40
1089	368	Draw	3.75
1090	368	Away	2.42
1091	369	Home	4.48
1092	369	Draw	3.65
1093	369	Away	4.68
1094	370	Home	1.52
1095	370	Draw	2.90
1096	370	Away	2.95
1097	371	Home	3.11
1098	371	Draw	2.82
1099	371	Away	4.34
1100	372	Home	2.09
1101	372	Draw	3.45
1102	372	Away	1.93
1103	373	Home	2.50
1104	373	Draw	2.92
1105	373	Away	3.80
1106	374	Home	4.18
1107	374	Draw	3.14
1108	374	Away	1.86
1109	375	Home	2.78
1110	375	Draw	2.86
1111	375	Away	1.84
1112	376	Home	2.63
1113	376	Draw	3.40
1114	376	Away	4.62
1115	377	Home	3.68
1116	377	Draw	3.36
1117	377	Away	4.36
1118	378	Home	4.23
1119	378	Draw	3.84
1120	378	Away	2.53
1121	379	Home	2.33
1122	379	Draw	2.87
1123	379	Away	4.65
1124	380	Home	4.44
1125	380	Draw	3.68
1126	380	Away	1.91
1127	381	Home	4.60
1128	381	Draw	3.37
1129	381	Away	3.12
1130	382	Home	3.34
1131	382	Draw	3.92
1132	382	Away	2.27
1133	383	Home	2.17
1134	383	Draw	3.77
1135	383	Away	3.32
1136	384	Home	2.13
1137	384	Draw	2.84
1138	384	Away	4.46
1139	385	Home	2.59
1140	385	Draw	3.19
1141	385	Away	1.48
1142	386	Home	1.84
1143	386	Draw	3.11
1144	386	Away	3.07
1145	387	Home	1.49
1146	387	Draw	3.03
1147	387	Away	2.92
1148	388	Home	4.34
1149	388	Draw	3.10
1150	388	Away	1.78
1151	389	Home	3.14
1152	389	Draw	3.20
1153	389	Away	2.26
1154	390	Home	4.28
1155	390	Draw	3.80
1156	390	Away	1.86
1157	391	Home	4.52
1158	391	Draw	3.51
1159	391	Away	1.71
1160	392	Home	2.55
1161	392	Draw	3.58
1162	392	Away	2.51
1163	393	Home	4.57
1164	393	Draw	3.74
1165	393	Away	4.81
1166	394	Home	3.59
1167	394	Draw	3.02
1168	394	Away	1.50
1169	395	Home	3.40
1170	395	Draw	2.88
1171	395	Away	3.27
1172	396	Home	2.97
1173	396	Draw	3.32
1174	396	Away	3.64
1175	397	Home	3.98
1176	397	Draw	3.75
1177	397	Away	3.95
1178	398	Home	3.48
1179	398	Draw	3.36
1180	398	Away	1.54
1181	399	Home	4.58
1182	399	Draw	3.66
1183	399	Away	3.43
1184	400	Home	4.82
1185	400	Draw	3.71
1186	400	Away	3.02
1187	401	Home	3.73
1188	401	Draw	2.96
1189	401	Away	3.02
1190	402	Home	4.22
1191	402	Draw	3.71
1192	402	Away	2.02
1193	403	Home	2.99
1194	403	Draw	2.97
1195	403	Away	3.51
1196	404	Home	4.07
1197	404	Draw	3.83
1198	404	Away	1.98
1199	405	Home	3.43
1200	405	Draw	3.60
1201	405	Away	2.62
1202	406	Home	4.13
1203	406	Draw	3.72
1204	406	Away	4.37
1205	407	Home	3.13
1206	407	Draw	2.90
1207	407	Away	2.83
1208	408	Home	4.89
1209	408	Draw	3.73
1210	408	Away	3.61
1211	409	Home	3.76
1212	409	Draw	3.40
1213	409	Away	4.32
1214	410	Home	4.27
1215	410	Draw	3.72
1216	410	Away	3.92
1217	411	Home	2.65
1218	411	Draw	3.31
1219	411	Away	1.62
1220	412	Home	3.98
1221	412	Draw	3.03
1222	412	Away	3.73
1223	413	Home	3.34
1224	413	Draw	2.96
1225	413	Away	3.68
1226	414	Home	3.15
1227	414	Draw	3.47
1228	414	Away	1.83
1229	415	Home	2.20
1230	415	Draw	3.18
1231	415	Away	4.65
1232	416	Home	2.22
1233	416	Draw	3.69
1234	416	Away	2.99
1235	417	Home	2.95
1236	417	Draw	3.34
1237	417	Away	3.21
1238	418	Home	1.68
1239	418	Draw	3.00
1240	418	Away	3.82
1241	419	Home	1.70
1242	419	Draw	3.05
1243	419	Away	3.83
1244	420	Home	2.55
1245	420	Draw	3.26
1246	420	Away	1.87
1247	421	Home	2.30
1248	421	Draw	3.45
1249	421	Away	3.26
1250	422	Home	4.50
1251	422	Draw	3.37
1252	422	Away	3.99
1253	423	Home	1.48
1254	423	Draw	3.10
1255	423	Away	1.81
1256	424	Home	4.07
1257	424	Draw	3.86
1258	424	Away	3.08
1259	425	Home	1.90
1260	425	Draw	3.62
1261	425	Away	4.84
1262	426	Home	4.13
1263	426	Draw	3.75
1264	426	Away	3.57
1265	427	Home	3.08
1266	427	Draw	3.31
1267	427	Away	1.84
1268	428	Home	2.53
1269	428	Draw	3.23
1270	428	Away	2.34
1271	429	Home	1.43
1272	429	Draw	3.41
1273	429	Away	3.49
1274	430	Home	4.79
1275	430	Draw	3.76
1276	430	Away	1.82
1277	431	Home	3.22
1278	431	Draw	3.29
1279	431	Away	3.41
1280	432	Home	3.39
1281	432	Draw	2.81
1282	432	Away	3.77
1283	433	Home	1.78
1284	433	Draw	3.72
1285	433	Away	2.29
1286	434	Home	2.16
1287	434	Draw	3.34
1288	434	Away	3.63
1289	435	Home	2.13
1290	435	Draw	3.56
1291	435	Away	2.94
1292	436	Home	2.52
1293	436	Draw	3.75
1294	436	Away	1.84
1295	437	Home	3.02
1296	437	Draw	3.70
1297	437	Away	3.79
1298	438	Home	4.59
1299	438	Draw	3.11
1300	438	Away	4.53
1301	439	Home	4.22
1302	439	Draw	3.18
1303	439	Away	3.52
1304	440	Home	4.63
1305	440	Draw	3.71
1306	440	Away	2.14
1307	441	Home	3.77
1308	441	Draw	3.91
1309	441	Away	2.77
1310	442	Home	2.42
1311	442	Draw	3.12
1312	442	Away	3.05
1313	443	Home	2.55
1314	443	Draw	3.71
1315	443	Away	4.29
1316	444	Home	4.88
1317	444	Draw	3.56
1318	444	Away	4.11
1319	445	Home	2.89
1320	445	Draw	3.20
1321	445	Away	3.82
1322	446	Home	2.35
1323	446	Draw	3.04
1324	446	Away	1.57
1325	447	Home	2.23
1326	447	Draw	3.51
1327	447	Away	3.05
1328	448	Home	3.75
1329	448	Draw	3.72
1330	448	Away	2.34
1331	449	Home	2.39
1332	449	Draw	3.13
1333	449	Away	2.75
1334	450	Home	1.54
1335	450	Draw	3.25
1336	450	Away	1.79
1337	451	Home	4.56
1338	451	Draw	2.86
1339	451	Away	4.46
1340	452	Home	2.53
1341	452	Draw	3.94
1342	452	Away	4.13
1343	453	Home	4.46
1344	453	Draw	2.98
1345	453	Away	2.47
1346	454	Home	3.97
1347	454	Draw	3.88
1348	454	Away	3.91
1349	455	Home	4.16
1350	455	Draw	2.94
1351	455	Away	3.60
1352	456	Home	4.67
1353	456	Draw	3.00
1354	456	Away	2.39
1355	457	Home	1.70
1356	457	Draw	3.65
1357	457	Away	2.30
1358	458	Home	4.68
1359	458	Draw	3.65
1360	458	Away	2.53
1361	459	Home	2.96
1362	459	Draw	3.75
1363	459	Away	4.21
1364	460	Home	1.83
1365	460	Draw	3.67
1366	460	Away	1.87
1367	461	Home	2.00
1368	461	Draw	3.80
1369	461	Away	2.65
1370	462	Home	2.29
1371	462	Draw	3.19
1372	462	Away	2.89
1373	463	Home	4.70
1374	463	Draw	3.76
1375	463	Away	3.21
1376	464	Home	3.71
1377	464	Draw	3.96
1378	464	Away	2.22
1379	465	Home	1.90
1380	465	Draw	3.24
1381	465	Away	4.78
1382	466	Home	1.81
1383	466	Draw	3.40
1384	466	Away	2.51
1385	467	Home	4.07
1386	467	Draw	3.56
1387	467	Away	3.19
1388	468	Home	1.61
1389	468	Draw	3.11
1390	468	Away	4.57
1391	469	Home	3.66
1392	469	Draw	3.75
1393	469	Away	2.33
1394	470	Home	4.19
1395	470	Draw	2.85
1396	470	Away	3.91
1397	471	Home	2.23
1398	471	Draw	3.83
1399	471	Away	4.58
1400	472	Home	3.02
1401	472	Draw	2.89
1402	472	Away	2.67
1403	473	Home	1.67
1404	473	Draw	3.66
1405	473	Away	2.48
1406	474	Home	2.29
1407	474	Draw	3.34
1408	474	Away	3.92
1409	475	Home	2.89
1410	475	Draw	2.81
1411	475	Away	3.07
1412	476	Home	1.85
1413	476	Draw	3.45
1414	476	Away	4.84
1415	477	Home	2.65
1416	477	Draw	2.99
1417	477	Away	1.51
1418	478	Home	2.74
1419	478	Draw	3.02
1420	478	Away	4.87
1421	479	Home	4.15
1422	479	Draw	3.48
1423	479	Away	4.03
1424	480	Home	3.71
1425	480	Draw	3.16
1426	480	Away	2.55
1427	481	Home	4.81
1428	481	Draw	2.93
1429	481	Away	2.40
1430	482	Home	4.83
1431	482	Draw	2.90
1432	482	Away	2.79
1433	483	Home	4.54
1434	483	Draw	2.93
1435	483	Away	3.23
1436	484	Home	4.37
1437	484	Draw	3.18
1438	484	Away	3.72
1439	485	Home	3.09
1440	485	Draw	3.19
1441	485	Away	4.26
1442	486	Home	3.61
1443	486	Draw	3.60
1444	486	Away	1.94
1445	487	Home	4.60
1446	487	Draw	3.97
1447	487	Away	4.03
1448	488	Home	2.64
1449	488	Draw	3.76
1450	488	Away	2.46
1451	489	Home	4.85
1452	489	Draw	2.83
1453	489	Away	1.40
1454	490	Home	1.57
1455	490	Draw	3.04
1456	490	Away	3.58
1457	491	Home	3.54
1458	491	Draw	3.05
1459	491	Away	3.41
1460	492	Home	3.25
1461	492	Draw	3.21
1462	492	Away	4.88
1463	493	Home	2.23
1464	493	Draw	3.38
1465	493	Away	3.60
1466	494	Home	2.31
1467	494	Draw	3.64
1468	494	Away	4.70
1469	495	Home	3.89
1470	495	Draw	3.33
1471	495	Away	4.16
1472	496	Home	3.97
1473	496	Draw	3.43
1474	496	Away	3.02
1475	497	Home	2.03
1476	497	Draw	3.73
1477	497	Away	1.46
1478	498	Home	4.85
1479	498	Draw	3.76
1480	498	Away	3.06
1481	499	Home	4.02
1482	499	Draw	3.49
1483	499	Away	4.30
1484	500	Home	2.18
1485	500	Draw	3.28
1486	500	Away	1.73
1487	501	Home	3.18
1488	501	Draw	3.99
1489	501	Away	1.86
1490	502	Home	4.80
1491	502	Draw	3.38
1492	502	Away	3.60
1493	503	Home	3.82
1494	503	Draw	3.87
1495	503	Away	4.41
1496	504	Home	2.44
1497	504	Draw	3.97
1498	504	Away	2.40
1499	505	Home	4.38
1500	505	Draw	3.37
1501	505	Away	3.80
1502	506	Home	1.91
1503	506	Draw	3.05
1504	506	Away	2.66
1505	507	Home	2.88
1506	507	Draw	3.18
1507	507	Away	2.17
1508	508	Home	3.05
1509	508	Draw	3.58
1510	508	Away	3.48
1511	509	Home	3.79
1512	509	Draw	3.17
1513	509	Away	4.10
1514	510	Home	3.02
1515	510	Draw	3.58
1516	510	Away	4.67
1517	511	Home	1.55
1518	511	Draw	2.85
1519	511	Away	2.24
1520	512	Home	3.19
1521	512	Draw	2.81
1522	512	Away	3.79
1523	513	Home	4.31
1524	513	Draw	3.70
1525	513	Away	2.94
1526	514	Home	4.73
1527	514	Draw	3.68
1528	514	Away	2.79
1529	515	Home	4.24
1530	515	Draw	3.56
1531	515	Away	1.67
1532	516	Home	2.90
1533	516	Draw	3.30
1534	516	Away	4.59
1535	517	Home	3.28
1536	517	Draw	3.67
1537	517	Away	4.06
1538	518	Home	2.89
1539	518	Draw	2.85
1540	518	Away	3.56
1541	519	Home	3.12
1542	519	Draw	3.88
1543	519	Away	2.46
1544	520	Home	3.18
1545	520	Draw	3.87
1546	520	Away	2.63
1547	521	Home	2.65
1548	521	Draw	3.20
1549	521	Away	2.45
1550	522	Home	3.79
1551	522	Draw	2.99
1552	522	Away	4.29
1553	523	Home	1.68
1554	523	Draw	3.59
1555	523	Away	2.20
1556	524	Home	2.60
1557	524	Draw	2.93
1558	524	Away	4.00
1559	525	Home	3.69
1560	525	Draw	3.30
1561	525	Away	1.68
1562	526	Home	4.16
1563	526	Draw	3.05
1564	526	Away	2.21
1565	527	Home	3.22
1566	527	Draw	3.25
1567	527	Away	3.13
1568	528	Home	2.48
1569	528	Draw	3.50
1570	528	Away	4.03
1571	529	Home	1.73
1572	529	Draw	3.18
1573	529	Away	4.29
1574	530	Home	2.07
1575	530	Draw	3.87
1576	530	Away	2.48
1577	531	Home	4.45
1578	531	Draw	3.43
1579	531	Away	2.28
1580	532	Home	2.09
1581	532	Draw	3.59
1582	532	Away	2.27
1583	533	Home	1.86
1584	533	Draw	3.56
1585	533	Away	2.08
1586	534	Home	1.66
1587	534	Draw	2.91
1588	534	Away	3.57
1589	535	Home	1.42
1590	535	Draw	3.29
1591	535	Away	1.95
1592	536	Home	2.50
1593	536	Draw	3.44
1594	536	Away	4.51
1595	537	Home	3.05
1596	537	Draw	3.03
1597	537	Away	4.32
1598	538	Home	4.88
1599	538	Draw	3.55
1600	538	Away	2.81
1601	539	Home	1.95
1602	539	Draw	3.24
1603	539	Away	4.05
1604	540	Home	1.96
1605	540	Draw	3.21
1606	540	Away	3.17
1607	541	Home	3.37
1608	541	Draw	3.87
1609	541	Away	2.34
1610	542	Home	4.42
1611	542	Draw	3.89
1612	542	Away	2.02
1613	543	Home	2.80
1614	543	Draw	3.39
1615	543	Away	2.80
1616	544	Home	1.59
1617	544	Draw	3.02
1618	544	Away	3.66
1619	545	Home	3.83
1620	545	Draw	3.79
1621	545	Away	3.90
1622	546	Home	1.52
1623	546	Draw	3.18
1624	546	Away	2.76
1625	547	Home	2.49
1626	547	Draw	2.81
1627	547	Away	3.86
1628	548	Home	1.44
1629	548	Draw	3.09
1630	548	Away	4.68
1631	549	Home	3.40
1632	549	Draw	3.12
1633	549	Away	3.37
1634	550	Home	2.71
1635	550	Draw	2.94
1636	550	Away	1.90
1637	551	Home	1.88
1638	551	Draw	3.98
1639	551	Away	3.40
1640	552	Home	2.22
1641	552	Draw	3.47
1642	552	Away	1.84
1643	553	Home	1.76
1644	553	Draw	3.30
1645	553	Away	4.57
1646	554	Home	3.12
1647	554	Draw	3.66
1648	554	Away	4.02
1649	555	Home	3.43
1650	555	Draw	3.10
1651	555	Away	3.51
1652	556	Home	2.10
1653	556	Draw	3.72
1654	556	Away	2.38
1655	557	Home	1.58
1656	557	Draw	3.66
1657	557	Away	4.74
1658	558	Home	2.80
1659	558	Draw	3.00
1660	558	Away	1.92
1661	559	Home	2.09
1662	559	Draw	3.41
1663	559	Away	2.97
1664	560	Home	2.13
1665	560	Draw	3.23
1666	560	Away	2.22
1667	561	Home	2.75
1668	561	Draw	3.13
1669	561	Away	3.95
1670	562	Home	4.79
1671	562	Draw	3.27
1672	562	Away	4.00
1673	563	Home	3.30
1674	563	Draw	3.43
1675	563	Away	4.86
1676	564	Home	3.55
1677	564	Draw	3.71
1678	564	Away	3.06
1679	565	Home	2.84
1680	565	Draw	2.86
1681	565	Away	2.30
1682	566	Home	3.45
1683	566	Draw	3.26
1684	566	Away	4.40
1685	567	Home	2.18
1686	567	Draw	3.73
1687	567	Away	3.97
1688	568	Home	2.46
1689	568	Draw	3.32
1690	568	Away	4.11
1691	569	Home	4.70
1692	569	Draw	3.06
1693	569	Away	1.49
1694	570	Home	3.50
1695	570	Draw	3.32
1696	570	Away	3.77
1697	571	Home	3.50
1698	571	Draw	3.18
1699	571	Away	1.44
1700	572	Home	1.84
1701	572	Draw	3.04
1702	572	Away	1.53
1703	573	Home	3.77
1704	573	Draw	3.23
1705	573	Away	3.88
1706	574	Home	2.52
1707	574	Draw	3.01
1708	574	Away	1.60
1709	575	Home	2.73
1710	575	Draw	3.00
1711	575	Away	2.83
1712	576	Home	2.00
1713	576	Draw	3.73
1714	576	Away	4.21
1715	577	Home	4.79
1716	577	Draw	3.82
1717	577	Away	1.53
1718	578	Home	1.96
1719	578	Draw	3.26
1720	578	Away	2.58
1721	579	Home	2.91
1722	579	Draw	3.16
1723	579	Away	1.67
1724	580	Home	1.49
1725	580	Draw	3.81
1726	580	Away	4.32
1727	581	Home	1.53
1728	581	Draw	3.43
1729	581	Away	2.00
1730	582	Home	3.80
1731	582	Draw	3.63
1732	582	Away	2.94
1733	583	Home	3.87
1734	583	Draw	3.53
1735	583	Away	3.05
1736	584	Home	2.98
1737	584	Draw	3.08
1738	584	Away	3.51
1739	585	Home	2.71
1740	585	Draw	2.95
1741	585	Away	2.04
1742	586	Home	1.89
1743	586	Draw	3.90
1744	586	Away	1.90
1745	587	Home	3.81
1746	587	Draw	3.29
1747	587	Away	4.28
1748	588	Home	4.01
1749	588	Draw	3.38
1750	588	Away	4.58
1751	589	Home	1.56
1752	589	Draw	3.79
1753	589	Away	4.60
1754	590	Home	1.45
1755	590	Draw	3.21
1756	590	Away	2.56
1757	591	Home	2.10
1758	591	Draw	3.93
1759	591	Away	2.10
1760	592	Home	3.27
1761	592	Draw	3.06
1762	592	Away	3.66
1763	593	Home	2.04
1764	593	Draw	3.83
1765	593	Away	2.12
1766	594	Home	2.71
1767	594	Draw	3.51
1768	594	Away	3.20
1769	595	Home	4.02
1770	595	Draw	3.77
1771	595	Away	3.62
1772	596	Home	1.52
1773	596	Draw	3.66
1774	596	Away	1.77
1775	597	Home	2.23
1776	597	Draw	3.14
1777	597	Away	1.87
1778	598	Home	3.36
1779	598	Draw	3.34
1780	598	Away	1.59
1781	599	Home	4.52
1782	599	Draw	3.89
1783	599	Away	3.16
1784	600	Home	2.63
1785	600	Draw	3.96
1786	600	Away	1.64
1787	601	Home	2.27
1788	601	Draw	2.85
1789	601	Away	2.64
1790	602	Home	2.21
1791	602	Draw	3.93
1792	602	Away	4.17
1793	603	Home	1.57
1794	603	Draw	3.61
1795	603	Away	2.60
1796	604	Home	3.04
1797	604	Draw	3.19
1798	604	Away	2.32
1799	605	Home	3.88
1800	605	Draw	3.09
1801	605	Away	1.49
1802	606	Home	4.57
1803	606	Draw	2.91
1804	606	Away	3.58
1805	607	Home	4.25
1806	607	Draw	3.34
1807	607	Away	3.59
1808	608	Home	2.99
1809	608	Draw	3.79
1810	608	Away	1.84
1811	609	Home	2.50
1812	609	Draw	3.82
1813	609	Away	3.23
1814	610	Home	4.25
1815	610	Draw	3.52
1816	610	Away	4.21
1817	611	Home	2.79
1818	611	Draw	3.06
1819	611	Away	4.08
1820	612	Home	3.92
1821	612	Draw	3.37
1822	612	Away	2.95
1823	613	Home	3.09
1824	613	Draw	3.40
1825	613	Away	1.81
1826	614	Home	2.76
1827	614	Draw	3.26
1828	614	Away	3.11
1829	615	Home	3.93
1830	615	Draw	3.95
1831	615	Away	4.34
1832	616	Home	3.77
1833	616	Draw	3.05
1834	616	Away	3.37
1835	617	Home	2.45
1836	617	Draw	3.52
1837	617	Away	1.74
1838	618	Home	3.60
1839	618	Draw	2.86
1840	618	Away	2.26
1841	619	Home	4.70
1842	619	Draw	3.96
1843	619	Away	2.74
1844	620	Home	1.96
1845	620	Draw	3.53
1846	620	Away	3.90
1847	621	Home	2.55
1848	621	Draw	3.61
1849	621	Away	4.85
1850	622	Home	4.24
1851	622	Draw	3.42
1852	622	Away	1.77
1853	623	Home	4.25
1854	623	Draw	2.90
1855	623	Away	2.71
1856	624	Home	3.49
1857	624	Draw	3.11
1858	624	Away	1.64
1859	625	Home	3.23
1860	625	Draw	3.55
1861	625	Away	4.25
1862	626	Home	1.72
1863	626	Draw	3.88
1864	626	Away	3.70
1865	627	Home	1.85
1866	627	Draw	3.54
1867	627	Away	4.37
1868	628	Home	1.71
1869	628	Draw	2.94
1870	628	Away	2.45
1871	629	Home	2.03
1872	629	Draw	3.73
1873	629	Away	4.63
1874	630	Home	4.26
1875	630	Draw	3.46
1876	630	Away	1.62
1877	631	Home	1.92
1878	631	Draw	3.52
1879	631	Away	3.80
1880	632	Home	3.15
1881	632	Draw	2.97
1882	632	Away	3.65
1883	633	Home	4.35
1884	633	Draw	3.81
1885	633	Away	3.80
1886	634	Home	4.67
1887	634	Draw	3.78
1888	634	Away	4.14
1889	635	Home	2.65
1890	635	Draw	3.56
1891	635	Away	2.73
1892	636	Home	3.31
1893	636	Draw	3.46
1894	636	Away	2.82
1895	637	Home	4.30
1896	637	Draw	3.74
1897	637	Away	1.49
1898	638	Home	4.12
1899	638	Draw	3.27
1900	638	Away	3.92
1901	639	Home	1.44
1902	639	Draw	3.44
1903	639	Away	4.77
1904	640	Home	2.98
1905	640	Draw	3.68
1906	640	Away	3.08
1907	641	Home	3.59
1908	641	Draw	3.48
1909	641	Away	1.64
1910	642	Home	4.14
1911	642	Draw	3.55
1912	642	Away	4.06
1913	643	Home	3.21
1914	643	Draw	3.54
1915	643	Away	4.72
1916	644	Home	2.58
1917	644	Draw	3.78
1918	644	Away	3.13
1919	645	Home	1.64
1920	645	Draw	3.62
1921	645	Away	3.92
1922	646	Home	2.03
1923	646	Draw	2.92
1924	646	Away	4.75
1925	647	Home	3.39
1926	647	Draw	3.46
1927	647	Away	1.71
1928	648	Home	3.78
1929	648	Draw	3.02
1930	648	Away	1.56
1931	649	Home	1.76
1932	649	Draw	3.66
1933	649	Away	4.35
1934	650	Home	1.54
1935	650	Draw	3.74
1936	650	Away	4.54
1937	651	Home	2.65
1938	651	Draw	3.22
1939	651	Away	2.62
1940	652	Home	2.19
1941	652	Draw	3.56
1942	652	Away	2.25
1943	653	Home	4.83
1944	653	Draw	3.00
1945	653	Away	2.37
1946	654	Home	1.77
1947	654	Draw	3.85
1948	654	Away	4.60
1949	655	Home	1.98
1950	655	Draw	3.37
1951	655	Away	3.91
1952	656	Home	4.18
1953	656	Draw	3.26
1954	656	Away	4.66
1955	657	Home	4.11
1956	657	Draw	3.61
1957	657	Away	4.02
1958	658	Home	1.90
1959	658	Draw	3.35
1960	658	Away	3.67
1961	659	Home	3.84
1962	659	Draw	3.86
1963	659	Away	3.79
1964	660	Home	2.21
1965	660	Draw	3.56
1966	660	Away	3.48
1967	661	Home	1.64
1968	661	Draw	2.93
1969	661	Away	1.63
1970	662	Home	1.72
1971	662	Draw	2.98
1972	662	Away	2.93
1973	663	Home	2.66
1974	663	Draw	2.90
1975	663	Away	3.51
1976	664	Home	4.68
1977	664	Draw	3.28
1978	664	Away	2.33
1979	665	Home	1.78
1980	665	Draw	3.05
1981	665	Away	4.17
1982	666	Home	2.79
1983	666	Draw	3.48
1984	666	Away	1.76
1985	667	Home	3.93
1986	667	Draw	3.58
1987	667	Away	4.24
1988	668	Home	2.91
1989	668	Draw	3.74
1990	668	Away	3.79
1991	669	Home	1.48
1992	669	Draw	3.79
1993	669	Away	2.20
1994	670	Home	1.96
1995	670	Draw	3.60
1996	670	Away	3.13
1997	671	Home	4.66
1998	671	Draw	3.37
1999	671	Away	4.39
2000	672	Home	3.47
2001	672	Draw	3.24
2002	672	Away	4.00
2003	673	Home	4.74
2004	673	Draw	3.74
2005	673	Away	1.61
2006	674	Home	3.78
2007	674	Draw	3.76
2008	674	Away	2.05
2009	675	Home	4.49
2010	675	Draw	3.42
2011	675	Away	3.31
2012	676	Home	1.74
2013	676	Draw	3.74
2014	676	Away	4.13
2015	677	Home	2.01
2016	677	Draw	2.99
2017	677	Away	2.71
2018	678	Home	1.60
2019	678	Draw	2.94
2020	678	Away	4.45
2021	679	Home	1.90
2022	679	Draw	3.66
2023	679	Away	3.04
2024	680	Home	2.51
2025	680	Draw	3.44
2026	680	Away	4.57
2027	681	Home	3.37
2028	681	Draw	2.98
2029	681	Away	3.63
2030	682	Home	1.92
2031	682	Draw	3.96
2032	682	Away	4.34
2033	683	Home	4.25
2034	683	Draw	3.80
2035	683	Away	3.88
2036	684	Home	2.11
2037	684	Draw	2.90
2038	684	Away	3.11
2039	685	Home	2.83
2040	685	Draw	3.45
2041	685	Away	2.65
2042	686	Home	4.70
2043	686	Draw	2.95
2044	686	Away	2.13
2045	687	Home	3.08
2046	687	Draw	2.80
2047	687	Away	2.86
2048	688	Home	2.83
2049	688	Draw	3.42
2050	688	Away	2.36
2051	689	Home	3.68
2052	689	Draw	3.66
2053	689	Away	3.90
2054	690	Home	2.75
2055	690	Draw	3.69
2056	690	Away	2.11
2057	691	Home	4.48
2058	691	Draw	3.44
2059	691	Away	4.87
2060	692	Home	4.35
2061	692	Draw	3.59
2062	692	Away	3.41
2063	693	Home	3.98
2064	693	Draw	3.77
2065	693	Away	2.58
2066	694	Home	4.13
2067	694	Draw	3.72
2068	694	Away	3.94
2069	695	Home	2.65
2070	695	Draw	3.13
2071	695	Away	1.70
2072	696	Home	4.03
2073	696	Draw	3.28
2074	696	Away	4.46
2075	697	Home	3.11
2076	697	Draw	2.97
2077	697	Away	2.16
2078	698	Home	4.44
2079	698	Draw	3.19
2080	698	Away	2.61
2081	699	Home	1.46
2082	699	Draw	3.61
2083	699	Away	4.67
2084	700	Home	1.56
2085	700	Draw	3.94
2086	700	Away	3.32
2087	701	Home	2.01
2088	701	Draw	2.80
2089	701	Away	4.11
2090	702	Home	3.86
2091	702	Draw	3.63
2092	702	Away	3.67
2093	703	Home	3.21
2094	703	Draw	3.95
2095	703	Away	3.22
2096	704	Home	3.40
2097	704	Draw	3.34
2098	704	Away	3.88
2099	705	Home	3.45
2100	705	Draw	3.68
2101	705	Away	2.41
2102	706	Home	4.28
2103	706	Draw	2.86
2104	706	Away	2.20
2105	707	Home	1.57
2106	707	Draw	3.16
2107	707	Away	2.99
2108	708	Home	2.43
2109	708	Draw	2.96
2110	708	Away	4.17
2111	709	Home	2.49
2112	709	Draw	3.07
2113	709	Away	4.46
2114	710	Home	1.50
2115	710	Draw	3.17
2116	710	Away	4.82
2117	711	Home	1.55
2118	711	Draw	3.15
2119	711	Away	2.99
2120	712	Home	4.03
2121	712	Draw	3.51
2122	712	Away	4.62
2123	713	Home	3.19
2124	713	Draw	3.96
2125	713	Away	4.43
2126	714	Home	4.68
2127	714	Draw	3.59
2128	714	Away	2.43
2129	715	Home	3.71
2130	715	Draw	2.97
2131	715	Away	3.26
2132	716	Home	4.08
2133	716	Draw	3.92
2134	716	Away	4.21
2135	717	Home	2.59
2136	717	Draw	2.97
2137	717	Away	2.43
2138	718	Home	3.47
2139	718	Draw	3.62
2140	718	Away	2.51
2141	719	Home	2.20
2142	719	Draw	2.87
2143	719	Away	2.50
2144	720	Home	2.53
2145	720	Draw	3.55
2146	720	Away	4.51
2147	721	Home	2.65
2148	721	Draw	3.23
2149	721	Away	1.97
2150	722	Home	2.42
2151	722	Draw	3.02
2152	722	Away	2.19
2153	723	Home	1.51
2154	723	Draw	3.91
2155	723	Away	2.21
2156	724	Home	2.55
2157	724	Draw	3.86
2158	724	Away	4.75
2159	725	Home	3.29
2160	725	Draw	3.10
2161	725	Away	4.07
2162	726	Home	2.00
2163	726	Draw	3.94
2164	726	Away	3.05
2165	727	Home	3.58
2166	727	Draw	3.00
2167	727	Away	3.77
2168	728	Home	3.52
2169	728	Draw	3.65
2170	728	Away	2.69
2171	729	Home	2.64
2172	729	Draw	2.90
2173	729	Away	3.79
2174	730	Home	2.47
2175	730	Draw	2.89
2176	730	Away	2.40
2177	731	Home	4.58
2178	731	Draw	3.03
2179	731	Away	4.13
2180	732	Home	4.08
2181	732	Draw	3.70
2182	732	Away	2.08
2183	733	Home	4.83
2184	733	Draw	3.63
2185	733	Away	4.01
2186	734	Home	1.71
2187	734	Draw	3.44
2188	734	Away	1.62
2189	735	Home	2.42
2190	735	Draw	3.73
2191	735	Away	1.92
2192	736	Home	2.49
2193	736	Draw	3.05
2194	736	Away	2.11
2195	737	Home	4.37
2196	737	Draw	3.86
2197	737	Away	2.23
2198	738	Home	2.64
2199	738	Draw	3.97
2200	738	Away	3.19
2201	739	Home	2.96
2202	739	Draw	3.36
2203	739	Away	2.53
2204	740	Home	2.20
2205	740	Draw	3.39
2206	740	Away	2.30
2207	741	Home	4.72
2208	741	Draw	3.16
2209	741	Away	3.79
2210	742	Home	2.67
2211	742	Draw	3.31
2212	742	Away	3.22
2213	743	Home	4.79
2214	743	Draw	2.97
2215	743	Away	1.62
2216	744	Home	2.10
2217	744	Draw	3.70
2218	744	Away	2.34
2219	745	Home	3.22
2220	745	Draw	3.04
2221	745	Away	3.90
2222	746	Home	4.14
2223	746	Draw	3.78
2224	746	Away	3.29
2225	747	Home	4.54
2226	747	Draw	3.12
2227	747	Away	4.41
2228	748	Home	3.13
2229	748	Draw	3.73
2230	748	Away	4.45
2231	749	Home	2.46
2232	749	Draw	2.83
2233	749	Away	4.02
2234	750	Home	3.59
2235	750	Draw	3.06
2236	750	Away	1.84
2237	751	Home	1.56
2238	751	Draw	3.21
2239	751	Away	1.97
2240	752	Home	1.44
2241	752	Draw	3.38
2242	752	Away	2.44
2243	753	Home	3.15
2244	753	Draw	3.53
2245	753	Away	3.41
2246	754	Home	1.84
2247	754	Draw	3.58
2248	754	Away	1.90
2249	755	Home	3.48
2250	755	Draw	3.08
2251	755	Away	4.16
2252	756	Home	1.98
2253	756	Draw	3.41
2254	756	Away	2.12
2255	757	Home	3.30
2256	757	Draw	3.13
2257	757	Away	2.01
2258	758	Home	4.58
2259	758	Draw	3.51
2260	758	Away	2.06
2261	759	Home	4.81
2262	759	Draw	3.34
2263	759	Away	1.72
2264	760	Home	4.46
2265	760	Draw	3.40
2266	760	Away	4.44
2267	761	Home	1.93
2268	761	Draw	3.12
2269	761	Away	1.95
2270	762	Home	4.11
2271	762	Draw	3.47
2272	762	Away	3.83
2273	763	Home	4.52
2274	763	Draw	3.80
2275	763	Away	4.67
2276	764	Home	2.63
2277	764	Draw	3.70
2278	764	Away	3.72
2279	765	Home	2.49
2280	765	Draw	3.33
2281	765	Away	1.98
2282	766	Home	1.57
2283	766	Draw	3.40
2284	766	Away	4.22
2285	767	Home	3.50
2286	767	Draw	2.91
2287	767	Away	4.37
2288	768	Home	4.64
2289	768	Draw	2.97
2290	768	Away	4.73
2291	769	Home	3.76
2292	769	Draw	3.50
2293	769	Away	2.65
2294	770	Home	3.30
2295	770	Draw	3.06
2296	770	Away	3.76
2297	771	Home	3.20
2298	771	Draw	2.95
2299	771	Away	4.24
2300	772	Home	2.03
2301	772	Draw	3.01
2302	772	Away	3.03
2303	773	Home	3.07
2304	773	Draw	3.20
2305	773	Away	4.38
2306	774	Home	3.59
2307	774	Draw	3.47
2308	774	Away	2.07
2309	775	Home	2.65
2310	775	Draw	3.93
2311	775	Away	3.75
2312	776	Home	3.74
2313	776	Draw	3.89
2314	776	Away	3.14
2315	777	Home	1.49
2316	777	Draw	3.54
2317	777	Away	4.09
2318	778	Home	4.14
2319	778	Draw	3.69
2320	778	Away	2.18
2321	779	Home	4.55
2322	779	Draw	3.09
2323	779	Away	2.32
2324	780	Home	2.29
2325	780	Draw	2.81
2326	780	Away	3.00
2327	781	Home	2.86
2328	781	Draw	3.93
2329	781	Away	2.09
2330	782	Home	4.59
2331	782	Draw	3.24
2332	782	Away	1.83
2333	783	Home	2.43
2334	783	Draw	3.75
2335	783	Away	2.77
2336	784	Home	3.55
2337	784	Draw	3.54
2338	784	Away	2.42
2339	785	Home	3.35
2340	785	Draw	3.07
2341	785	Away	4.56
2342	786	Home	3.24
2343	786	Draw	3.60
2344	786	Away	2.96
2345	787	Home	1.41
2346	787	Draw	3.34
2347	787	Away	1.65
2348	788	Home	3.26
2349	788	Draw	3.79
2350	788	Away	1.55
2351	789	Home	4.01
2352	789	Draw	3.70
2353	789	Away	2.80
2354	790	Home	2.40
2355	790	Draw	3.06
2356	790	Away	2.68
2357	791	Home	3.14
2358	791	Draw	3.68
2359	791	Away	1.70
2360	792	Home	3.32
2361	792	Draw	3.74
2362	792	Away	3.47
2363	793	Home	2.90
2364	793	Draw	3.60
2365	793	Away	1.89
2366	794	Home	4.41
2367	794	Draw	3.58
2368	794	Away	3.93
2369	795	Home	3.90
2370	795	Draw	3.63
2371	795	Away	3.72
2372	796	Home	1.49
2373	796	Draw	3.71
2374	796	Away	3.26
2375	797	Home	3.77
2376	797	Draw	3.30
2377	797	Away	1.95
2378	798	Home	3.63
2379	798	Draw	3.08
2380	798	Away	3.50
2381	799	Home	4.88
2382	799	Draw	3.16
2383	799	Away	3.29
2384	800	Home	3.68
2385	800	Draw	3.22
2386	800	Away	3.01
2387	801	Home	2.62
2388	801	Draw	3.16
2389	801	Away	1.54
2390	802	Home	4.47
2391	802	Draw	3.76
2392	802	Away	1.91
2393	803	Home	3.39
2394	803	Draw	2.96
2395	803	Away	2.46
2396	804	Home	2.96
2397	804	Draw	3.61
2398	804	Away	3.41
2399	805	Home	3.71
2400	805	Draw	3.48
2401	805	Away	3.15
2402	806	Home	2.89
2403	806	Draw	3.75
2404	806	Away	4.83
2405	807	Home	4.34
2406	807	Draw	3.09
2407	807	Away	3.78
2408	808	Home	3.67
2409	808	Draw	3.00
2410	808	Away	3.48
2411	809	Home	2.97
2412	809	Draw	2.82
2413	809	Away	2.06
2414	810	Home	3.98
2415	810	Draw	3.27
2416	810	Away	1.91
2417	811	Home	3.39
2418	811	Draw	3.38
2419	811	Away	3.50
2420	812	Home	4.51
2421	812	Draw	3.41
2422	812	Away	2.09
2423	813	Home	1.92
2424	813	Draw	3.14
2425	813	Away	4.45
2426	814	Home	1.49
2427	814	Draw	3.47
2428	814	Away	2.20
2429	815	Home	4.73
2430	815	Draw	3.39
2431	815	Away	4.15
2432	816	Home	1.47
2433	816	Draw	3.82
2434	816	Away	2.43
2435	817	Home	3.93
2436	817	Draw	3.96
2437	817	Away	2.26
2438	818	Home	2.76
2439	818	Draw	3.81
2440	818	Away	2.25
2441	819	Home	1.86
2442	819	Draw	3.16
2443	819	Away	4.52
2444	820	Home	3.95
2445	820	Draw	3.87
2446	820	Away	3.69
2447	821	Home	4.32
2448	821	Draw	3.36
2449	821	Away	4.48
2450	822	Home	4.29
2451	822	Draw	3.14
2452	822	Away	1.48
2453	823	Home	3.22
2454	823	Draw	3.51
2455	823	Away	1.76
2456	824	Home	3.44
2457	824	Draw	3.31
2458	824	Away	4.13
2459	825	Home	1.99
2460	825	Draw	3.20
2461	825	Away	1.68
2462	826	Home	4.03
2463	826	Draw	3.11
2464	826	Away	2.02
2465	827	Home	4.12
2466	827	Draw	3.07
2467	827	Away	2.99
2468	828	Home	2.66
2469	828	Draw	2.85
2470	828	Away	1.69
2471	829	Home	4.01
2472	829	Draw	3.25
2473	829	Away	4.28
2474	830	Home	3.26
2475	830	Draw	3.39
2476	830	Away	4.57
2477	831	Home	2.89
2478	831	Draw	3.17
2479	831	Away	2.21
2480	832	Home	2.51
2481	832	Draw	3.98
2482	832	Away	4.78
2483	833	Home	3.78
2484	833	Draw	4.00
2485	833	Away	4.35
2486	834	Home	4.68
2487	834	Draw	2.88
2488	834	Away	4.60
2489	835	Home	2.63
2490	835	Draw	3.56
2491	835	Away	4.52
2492	836	Home	4.63
2493	836	Draw	3.74
2494	836	Away	2.22
2495	837	Home	3.88
2496	837	Draw	3.65
2497	837	Away	4.66
2498	838	Home	2.72
2499	838	Draw	3.56
2500	838	Away	4.77
2501	839	Home	2.88
2502	839	Draw	3.98
2503	839	Away	4.72
2504	840	Home	2.40
2505	840	Draw	3.39
2506	840	Away	3.73
2507	841	Home	2.67
2508	841	Draw	3.89
2509	841	Away	3.15
2510	842	Home	4.18
2511	842	Draw	3.69
2512	842	Away	2.67
2513	843	Home	2.99
2514	843	Draw	3.46
2515	843	Away	2.16
2516	844	Home	3.97
2517	844	Draw	3.35
2518	844	Away	3.17
2519	845	Home	2.40
2520	845	Draw	3.80
2521	845	Away	1.63
2522	846	Home	3.58
2523	846	Draw	2.99
2524	846	Away	4.25
2525	847	Home	1.71
2526	847	Draw	3.07
2527	847	Away	3.35
2528	848	Home	3.89
2529	848	Draw	3.14
2530	848	Away	2.45
2531	849	Home	3.19
2532	849	Draw	2.95
2533	849	Away	3.66
2534	850	Home	1.72
2535	850	Draw	3.74
2536	850	Away	3.58
2537	851	Home	4.46
2538	851	Draw	3.66
2539	851	Away	3.59
2540	852	Home	2.94
2541	852	Draw	3.51
2542	852	Away	3.69
2543	853	Home	4.18
2544	853	Draw	2.94
2545	853	Away	4.53
2546	854	Home	1.63
2547	854	Draw	3.53
2548	854	Away	1.66
2549	855	Home	3.55
2550	855	Draw	3.42
2551	855	Away	2.75
2552	856	Home	1.68
2553	856	Draw	3.22
2554	856	Away	4.76
2555	857	Home	1.71
2556	857	Draw	3.41
2557	857	Away	1.78
2558	858	Home	2.88
2559	858	Draw	3.44
2560	858	Away	4.45
2561	859	Home	2.58
2562	859	Draw	3.93
2563	859	Away	1.55
2564	860	Home	3.91
2565	860	Draw	3.99
2566	860	Away	3.78
2567	861	Home	2.82
2568	861	Draw	2.92
2569	861	Away	3.81
2570	862	Home	3.71
2571	862	Draw	3.86
2572	862	Away	1.46
2573	863	Home	2.70
2574	863	Draw	3.87
2575	863	Away	1.67
2576	864	Home	2.51
2577	864	Draw	3.98
2578	864	Away	2.25
2579	865	Home	3.04
2580	865	Draw	3.09
2581	865	Away	4.90
2582	866	Home	2.20
2583	866	Draw	3.32
2584	866	Away	4.03
2585	867	Home	3.71
2586	867	Draw	2.98
2587	867	Away	2.24
2588	868	Home	3.31
2589	868	Draw	3.61
2590	868	Away	1.59
2591	869	Home	1.56
2592	869	Draw	3.08
2593	869	Away	4.42
2594	870	Home	3.86
2595	870	Draw	3.24
2596	870	Away	3.17
2597	871	Home	3.76
2598	871	Draw	3.78
2599	871	Away	4.46
2600	872	Home	2.48
2601	872	Draw	3.69
2602	872	Away	2.18
2603	873	Home	4.76
2604	873	Draw	3.98
2605	873	Away	4.88
2606	874	Home	4.64
2607	874	Draw	3.43
2608	874	Away	2.73
2609	875	Home	4.05
2610	875	Draw	3.75
2611	875	Away	4.14
2612	876	Home	2.23
2613	876	Draw	2.86
2614	876	Away	3.14
2615	877	Home	1.81
2616	877	Draw	2.83
2617	877	Away	3.56
2618	878	Home	2.50
2619	878	Draw	2.89
2620	878	Away	3.89
2621	879	Home	4.37
2622	879	Draw	2.90
2623	879	Away	4.63
2624	880	Home	3.88
2625	880	Draw	3.90
2626	880	Away	3.41
2627	881	Home	2.24
2628	881	Draw	3.76
2629	881	Away	2.91
2630	882	Home	3.03
2631	882	Draw	3.09
2632	882	Away	3.47
2633	883	Home	1.62
2634	883	Draw	3.93
2635	883	Away	1.53
2636	884	Home	3.22
2637	884	Draw	3.11
2638	884	Away	2.93
2639	885	Home	2.72
2640	885	Draw	3.13
2641	885	Away	3.55
2642	886	Home	2.66
2643	886	Draw	3.96
2644	886	Away	1.73
2645	887	Home	2.88
2646	887	Draw	2.83
2647	887	Away	3.78
2648	888	Home	3.46
2649	888	Draw	3.16
2650	888	Away	2.05
2651	889	Home	2.04
2652	889	Draw	2.95
2653	889	Away	2.04
2654	890	Home	4.16
2655	890	Draw	3.76
2656	890	Away	2.79
2657	891	Home	2.06
2658	891	Draw	3.40
2659	891	Away	2.24
2660	892	Home	4.19
2661	892	Draw	3.88
2662	892	Away	2.39
2663	893	Home	2.44
2664	893	Draw	2.87
2665	893	Away	4.49
2666	894	Home	3.09
2667	894	Draw	3.69
2668	894	Away	3.38
2669	895	Home	2.32
2670	895	Draw	3.27
2671	895	Away	3.75
2672	896	Home	2.73
2673	896	Draw	3.57
2674	896	Away	3.48
2675	897	Home	3.17
2676	897	Draw	3.61
2677	897	Away	1.81
2678	898	Home	1.73
2679	898	Draw	3.48
2680	898	Away	4.27
2681	899	Home	3.17
2682	899	Draw	3.19
2683	899	Away	2.01
2684	900	Home	2.04
2685	900	Draw	3.10
2686	900	Away	3.91
2687	901	Home	1.53
2688	901	Draw	3.17
2689	901	Away	2.64
2690	902	Home	2.80
2691	902	Draw	2.99
2692	902	Away	4.62
2693	903	Home	1.74
2694	903	Draw	3.94
2695	903	Away	1.55
2696	904	Home	1.58
2697	904	Draw	3.54
2698	904	Away	4.87
2699	905	Home	2.57
2700	905	Draw	3.93
2701	905	Away	1.48
2702	906	Home	1.93
2703	906	Draw	3.41
2704	906	Away	2.24
2705	907	Home	4.24
2706	907	Draw	2.85
2707	907	Away	2.98
2708	908	Home	4.24
2709	908	Draw	3.83
2710	908	Away	4.12
2711	909	Home	4.71
2712	909	Draw	3.28
2713	909	Away	2.51
2714	910	Home	2.83
2715	910	Draw	3.65
2716	910	Away	4.65
2717	911	Home	4.21
2718	911	Draw	3.33
2719	911	Away	4.71
2720	912	Home	1.63
2721	912	Draw	3.12
2722	912	Away	4.11
2723	913	Home	2.84
2724	913	Draw	3.58
2725	913	Away	2.46
2726	914	Home	4.19
2727	914	Draw	3.52
2728	914	Away	4.17
2729	915	Home	2.60
2730	915	Draw	3.99
2731	915	Away	2.47
2732	916	Home	2.71
2733	916	Draw	3.44
2734	916	Away	4.63
2735	917	Home	2.95
2736	917	Draw	3.17
2737	917	Away	3.80
2738	918	Home	3.54
2739	918	Draw	3.42
2740	918	Away	1.69
2741	919	Home	2.97
2742	919	Draw	3.95
2743	919	Away	4.84
2744	920	Home	1.99
2745	920	Draw	2.85
2746	920	Away	2.09
2747	921	Home	1.58
2748	921	Draw	3.62
2749	921	Away	4.83
2750	922	Home	2.15
2751	922	Draw	3.45
2752	922	Away	3.60
2753	923	Home	4.31
2754	923	Draw	3.92
2755	923	Away	3.98
2756	924	Home	1.66
2757	924	Draw	3.78
2758	924	Away	3.43
2759	925	Home	4.89
2760	925	Draw	3.72
2761	925	Away	2.35
2762	926	Home	2.03
2763	926	Draw	2.99
2764	926	Away	4.09
2765	927	Home	1.88
2766	927	Draw	3.89
2767	927	Away	3.43
2768	928	Home	2.97
2769	928	Draw	3.92
2770	928	Away	2.10
2771	929	Home	3.91
2772	929	Draw	3.95
2773	929	Away	4.52
2774	930	Home	4.44
2775	930	Draw	3.92
2776	930	Away	3.60
2777	931	Home	3.58
2778	931	Draw	3.72
2779	931	Away	3.05
2780	932	Home	3.58
2781	932	Draw	3.10
2782	932	Away	3.05
2783	933	Home	4.29
2784	933	Draw	3.13
2785	933	Away	4.71
2786	934	Home	4.24
2787	934	Draw	3.37
2788	934	Away	1.60
2789	935	Home	2.49
2790	935	Draw	3.63
2791	935	Away	3.28
2792	936	Home	4.72
2793	936	Draw	2.87
2794	936	Away	3.47
2795	937	Home	2.40
2796	937	Draw	3.92
2797	937	Away	4.79
2798	938	Home	4.37
2799	938	Draw	2.98
2800	938	Away	4.77
2801	939	Home	1.78
2802	939	Draw	3.07
2803	939	Away	1.49
2804	940	Home	2.23
2805	940	Draw	3.90
2806	940	Away	4.77
2807	941	Home	3.55
2808	941	Draw	2.94
2809	941	Away	2.94
2810	942	Home	4.30
2811	942	Draw	3.91
2812	942	Away	2.01
2813	943	Home	2.80
2814	943	Draw	3.81
2815	943	Away	2.20
2816	944	Home	3.87
2817	944	Draw	3.69
2818	944	Away	2.52
2819	945	Home	2.26
2820	945	Draw	3.43
2821	945	Away	3.69
2822	946	Home	1.60
2823	946	Draw	3.93
2824	946	Away	1.69
2825	947	Home	4.04
2826	947	Draw	3.62
2827	947	Away	4.70
2828	948	Home	4.07
2829	948	Draw	3.26
2830	948	Away	3.86
2831	949	Home	1.88
2832	949	Draw	3.76
2833	949	Away	4.37
2834	950	Home	3.45
2835	950	Draw	3.50
2836	950	Away	2.13
2837	951	Home	3.27
2838	951	Draw	3.02
2839	951	Away	2.39
2840	952	Home	3.59
2841	952	Draw	3.31
2842	952	Away	3.39
2843	953	Home	3.69
2844	953	Draw	3.54
2845	953	Away	2.69
2846	954	Home	4.83
2847	954	Draw	3.11
2848	954	Away	4.29
2849	955	Home	3.26
2850	955	Draw	3.62
2851	955	Away	4.02
2852	956	Home	4.04
2853	956	Draw	3.72
2854	956	Away	3.25
2855	957	Home	3.50
2856	957	Draw	3.75
2857	957	Away	2.43
2858	958	Home	1.56
2859	958	Draw	2.88
2860	958	Away	3.48
2861	959	Home	2.60
2862	959	Draw	3.53
2863	959	Away	4.01
2864	960	Home	2.91
2865	960	Draw	3.14
2866	960	Away	2.02
2867	961	Home	2.61
2868	961	Draw	3.52
2869	961	Away	3.09
2870	962	Home	3.65
2871	962	Draw	3.27
2872	962	Away	3.79
2873	963	Home	2.34
2874	963	Draw	3.95
2875	963	Away	1.46
2876	964	Home	2.88
2877	964	Draw	3.26
2878	964	Away	3.61
2879	965	Home	2.71
2880	965	Draw	3.93
2881	965	Away	3.15
2882	966	Home	4.68
2883	966	Draw	3.50
2884	966	Away	2.32
2885	967	Home	3.53
2886	967	Draw	3.16
2887	967	Away	4.90
2888	968	Home	1.97
2889	968	Draw	2.83
2890	968	Away	1.74
2891	969	Home	4.18
2892	969	Draw	2.81
2893	969	Away	1.98
2894	970	Home	4.57
2895	970	Draw	3.72
2896	970	Away	1.80
2897	971	Home	4.12
2898	971	Draw	3.33
2899	971	Away	3.71
2900	972	Home	2.97
2901	972	Draw	3.39
2902	972	Away	3.13
2903	973	Home	2.31
2904	973	Draw	3.93
2905	973	Away	3.64
2906	974	Home	1.96
2907	974	Draw	3.77
2908	974	Away	4.48
2909	975	Home	4.00
2910	975	Draw	3.88
2911	975	Away	2.81
2912	976	Home	2.54
2913	976	Draw	3.20
2914	976	Away	3.21
2915	977	Home	4.41
2916	977	Draw	3.88
2917	977	Away	4.07
2918	978	Home	4.80
2919	978	Draw	3.37
2920	978	Away	1.98
2921	979	Home	1.89
2922	979	Draw	3.07
2923	979	Away	4.83
2924	980	Home	2.67
2925	980	Draw	2.82
2926	980	Away	3.86
2927	981	Home	3.33
2928	981	Draw	3.06
2929	981	Away	3.69
2930	982	Home	1.79
2931	982	Draw	3.76
2932	982	Away	1.62
2933	983	Home	3.06
2934	983	Draw	3.73
2935	983	Away	4.80
2936	984	Home	4.03
2937	984	Draw	3.42
2938	984	Away	3.98
2939	985	Home	3.36
2940	985	Draw	3.03
2941	985	Away	4.60
2942	986	Home	1.92
2943	986	Draw	2.80
2944	986	Away	4.29
2945	987	Home	2.69
2946	987	Draw	3.86
2947	987	Away	4.71
2948	988	Home	4.65
2949	988	Draw	3.25
2950	988	Away	4.59
2951	989	Home	2.33
2952	989	Draw	3.39
2953	989	Away	1.58
2954	990	Home	1.76
2955	990	Draw	3.25
2956	990	Away	4.86
2957	991	Home	3.11
2958	991	Draw	3.34
2959	991	Away	2.02
2960	992	Home	2.46
2961	992	Draw	3.70
2962	992	Away	2.89
2963	993	Home	3.08
2964	993	Draw	3.43
2965	993	Away	2.05
2966	994	Home	3.45
2967	994	Draw	3.61
2968	994	Away	4.38
2969	995	Home	4.81
2970	995	Draw	3.61
2971	995	Away	1.63
2972	996	Home	3.67
2973	996	Draw	2.82
2974	996	Away	4.83
2975	997	Home	3.20
2976	997	Draw	3.50
2977	997	Away	2.38
2978	998	Home	1.54
2979	998	Draw	3.36
2980	998	Away	2.69
2981	999	Home	3.73
2982	999	Draw	2.84
2983	999	Away	4.83
2984	1000	Home	4.26
2985	1000	Draw	3.43
2986	1000	Away	3.85
2987	1001	Home	3.43
2988	1001	Draw	3.91
2989	1001	Away	3.40
2990	1002	Home	3.52
2991	1002	Draw	3.73
2992	1002	Away	2.31
2993	1003	Home	2.84
2994	1003	Draw	3.31
2995	1003	Away	4.07
2996	1004	Home	1.46
2997	1004	Draw	3.75
2998	1004	Away	4.73
2999	1005	Home	2.62
3000	1005	Draw	3.46
3001	1005	Away	1.85
3002	1006	Home	4.80
3003	1006	Draw	3.37
3004	1006	Away	4.43
3005	1007	Home	1.98
3006	1007	Draw	3.40
3007	1007	Away	2.43
3008	1008	Home	3.38
3009	1008	Draw	2.87
3010	1008	Away	3.04
3011	1009	Home	3.74
3012	1009	Draw	3.02
3013	1009	Away	3.03
3014	1010	Home	2.75
3015	1010	Draw	3.21
3016	1010	Away	1.60
3017	1011	Home	2.84
3018	1011	Draw	3.51
3019	1011	Away	4.70
3020	1012	Home	3.75
3021	1012	Draw	3.25
3022	1012	Away	4.31
3023	1013	Home	2.32
3024	1013	Draw	3.87
3025	1013	Away	3.44
3026	1014	Home	3.60
3027	1014	Draw	3.26
3028	1014	Away	2.33
3029	1015	Home	2.63
3030	1015	Draw	3.92
3031	1015	Away	2.58
3032	1016	Home	3.02
3033	1016	Draw	2.82
3034	1016	Away	2.50
3035	1017	Home	4.49
3036	1017	Draw	3.00
3037	1017	Away	2.62
3038	1018	Home	1.42
3039	1018	Draw	2.94
3040	1018	Away	2.84
3041	1019	Home	4.17
3042	1019	Draw	3.03
3043	1019	Away	1.51
3044	1020	Home	2.98
3045	1020	Draw	3.41
3046	1020	Away	4.84
3047	1021	Home	4.17
3048	1021	Draw	3.00
3049	1021	Away	4.13
3050	1022	Home	4.16
3051	1022	Draw	3.36
3052	1022	Away	3.60
3053	1023	Home	1.49
3054	1023	Draw	2.84
3055	1023	Away	4.18
3056	1024	Home	2.01
3057	1024	Draw	2.88
3058	1024	Away	4.26
3059	1025	Home	3.99
3060	1025	Draw	3.13
3061	1025	Away	3.11
3062	1026	Home	1.48
3063	1026	Draw	3.80
3064	1026	Away	2.89
3065	1027	Home	1.74
3066	1027	Draw	3.83
3067	1027	Away	3.21
3068	1028	Home	3.60
3069	1028	Draw	3.20
3070	1028	Away	3.63
3071	1029	Home	1.51
3072	1029	Draw	3.37
3073	1029	Away	3.96
3074	1030	Home	2.33
3075	1030	Draw	3.27
3076	1030	Away	2.58
3077	1031	Home	4.50
3078	1031	Draw	3.68
3079	1031	Away	2.39
3080	1032	Home	4.52
3081	1032	Draw	3.51
3082	1032	Away	4.83
3083	1033	Home	3.54
3084	1033	Draw	3.27
3085	1033	Away	2.25
3086	1034	Home	3.38
3087	1034	Draw	3.85
3088	1034	Away	3.94
3089	1035	Home	3.59
3090	1035	Draw	3.39
3091	1035	Away	2.28
3092	1036	Home	3.97
3093	1036	Draw	3.48
3094	1036	Away	2.52
3095	1037	Home	4.18
3096	1037	Draw	3.92
3097	1037	Away	3.75
3098	1038	Home	4.56
3099	1038	Draw	4.00
3100	1038	Away	1.88
3101	1039	Home	2.95
3102	1039	Draw	2.88
3103	1039	Away	4.31
3104	1040	Home	4.16
3105	1040	Draw	3.56
3106	1040	Away	4.40
3107	1041	Home	4.41
3108	1041	Draw	3.75
3109	1041	Away	2.00
3110	1042	Home	2.83
3111	1042	Draw	3.53
3112	1042	Away	3.97
3113	1043	Home	4.53
3114	1043	Draw	3.72
3115	1043	Away	1.52
3116	1044	Home	1.47
3117	1044	Draw	3.15
3118	1044	Away	3.00
3119	1045	Home	4.64
3120	1045	Draw	3.12
3121	1045	Away	3.18
3122	1046	Home	3.81
3123	1046	Draw	3.80
3124	1046	Away	4.74
3125	1047	Home	3.81
3126	1047	Draw	3.48
3127	1047	Away	4.00
3128	1048	Home	1.96
3129	1048	Draw	3.74
3130	1048	Away	1.41
3131	1049	Home	4.27
3132	1049	Draw	3.34
3133	1049	Away	3.65
3134	1050	Home	4.48
3135	1050	Draw	2.90
3136	1050	Away	2.23
3137	1051	Home	3.02
3138	1051	Draw	3.64
3139	1051	Away	2.56
3140	1052	Home	1.78
3141	1052	Draw	3.53
3142	1052	Away	2.94
3143	1053	Home	3.34
3144	1053	Draw	3.87
3145	1053	Away	1.68
3146	1054	Home	4.40
3147	1054	Draw	3.46
3148	1054	Away	2.53
3149	1055	Home	3.16
3150	1055	Draw	3.41
3151	1055	Away	4.76
3152	1056	Home	4.53
3153	1056	Draw	3.71
3154	1056	Away	2.94
3155	1057	Home	4.30
3156	1057	Draw	3.64
3157	1057	Away	2.23
3158	1058	Home	4.02
3159	1058	Draw	3.81
3160	1058	Away	1.64
3161	1059	Home	3.73
3162	1059	Draw	3.39
3163	1059	Away	3.59
3164	1060	Home	2.92
3165	1060	Draw	3.55
3166	1060	Away	3.24
3167	1061	Home	4.68
3168	1061	Draw	3.49
3169	1061	Away	2.64
3170	1062	Home	3.29
3171	1062	Draw	3.40
3172	1062	Away	3.32
3173	1063	Home	3.96
3174	1063	Draw	3.36
3175	1063	Away	1.99
3176	1064	Home	1.44
3177	1064	Draw	3.42
3178	1064	Away	4.43
3179	1065	Home	3.65
3180	1065	Draw	3.18
3181	1065	Away	2.50
3182	1066	Home	1.83
3183	1066	Draw	3.29
3184	1066	Away	4.35
3185	1067	Home	4.63
3186	1067	Draw	3.51
3187	1067	Away	4.79
3188	1068	Home	2.36
3189	1068	Draw	3.43
3190	1068	Away	3.37
3191	1069	Home	4.59
3192	1069	Draw	3.36
3193	1069	Away	3.25
3194	1070	Home	2.96
3195	1070	Draw	3.10
3196	1070	Away	1.91
3197	1071	Home	2.79
3198	1071	Draw	3.81
3199	1071	Away	2.88
3200	1072	Home	3.06
3201	1072	Draw	3.29
3202	1072	Away	4.46
3203	1073	Home	2.52
3204	1073	Draw	3.90
3205	1073	Away	2.79
3206	1074	Home	1.98
3207	1074	Draw	2.95
3208	1074	Away	3.60
3209	1075	Home	1.93
3210	1075	Draw	3.28
3211	1075	Away	1.82
3212	1076	Home	3.78
3213	1076	Draw	3.88
3214	1076	Away	4.74
3215	1077	Home	2.53
3216	1077	Draw	2.93
3217	1077	Away	3.09
3218	1078	Home	3.05
3219	1078	Draw	3.75
3220	1078	Away	1.54
3221	1079	Home	1.73
3222	1079	Draw	3.19
3223	1079	Away	2.91
3224	1080	Home	3.42
3225	1080	Draw	3.49
3226	1080	Away	3.72
3227	1081	Home	1.80
3228	1081	Draw	3.73
3229	1081	Away	2.72
3230	1082	Home	4.00
3231	1082	Draw	2.93
3232	1082	Away	3.18
3233	1083	Home	3.65
3234	1083	Draw	3.26
3235	1083	Away	4.09
3236	1084	Home	4.78
3237	1084	Draw	3.83
3238	1084	Away	1.57
3239	1085	Home	3.72
3240	1085	Draw	3.19
3241	1085	Away	3.85
3242	1086	Home	2.69
3243	1086	Draw	3.80
3244	1086	Away	2.00
3245	1087	Home	2.88
3246	1087	Draw	2.89
3247	1087	Away	2.17
3248	1088	Home	4.89
3249	1088	Draw	3.61
3250	1088	Away	2.03
3251	1089	Home	3.10
3252	1089	Draw	3.26
3253	1089	Away	2.66
3254	1090	Home	4.76
3255	1090	Draw	3.92
3256	1090	Away	3.55
3257	1091	Home	3.50
3258	1091	Draw	3.01
3259	1091	Away	3.98
3260	1092	Home	3.67
3261	1092	Draw	2.90
3262	1092	Away	3.32
3263	1093	Home	3.11
3264	1093	Draw	3.21
3265	1093	Away	2.46
3266	1094	Home	3.59
3267	1094	Draw	3.15
3268	1094	Away	2.41
3269	1095	Home	1.86
3270	1095	Draw	3.88
3271	1095	Away	4.36
3272	1096	Home	4.00
3273	1096	Draw	3.75
3274	1096	Away	3.26
3275	1097	Home	4.45
3276	1097	Draw	3.06
3277	1097	Away	4.58
3278	1098	Home	2.19
3279	1098	Draw	3.75
3280	1098	Away	4.84
3281	1099	Home	2.32
3282	1099	Draw	2.81
3283	1099	Away	2.53
3284	1100	Home	1.77
3285	1100	Draw	2.93
3286	1100	Away	2.99
3287	1101	Home	2.48
3288	1101	Draw	2.89
3289	1101	Away	3.17
3290	1102	Home	2.36
3291	1102	Draw	3.71
3292	1102	Away	3.69
3293	1103	Home	2.76
3294	1103	Draw	3.15
3295	1103	Away	1.52
3296	1104	Home	3.24
3297	1104	Draw	3.53
3298	1104	Away	3.01
3299	1105	Home	3.68
3300	1105	Draw	2.99
3301	1105	Away	1.94
3302	1106	Home	4.17
3303	1106	Draw	3.48
3304	1106	Away	3.06
3305	1107	Home	4.70
3306	1107	Draw	3.26
3307	1107	Away	2.99
3308	1108	Home	3.07
3309	1108	Draw	3.13
3310	1108	Away	2.85
3311	1109	Home	3.99
3312	1109	Draw	3.86
3313	1109	Away	2.15
3314	1110	Home	2.95
3315	1110	Draw	2.97
3316	1110	Away	1.92
3317	1111	Home	1.59
3318	1111	Draw	2.83
3319	1111	Away	2.14
3320	1112	Home	4.08
3321	1112	Draw	3.35
3322	1112	Away	3.03
3323	1113	Home	4.78
3324	1113	Draw	3.40
3325	1113	Away	4.69
3326	1114	Home	3.65
3327	1114	Draw	3.99
3328	1114	Away	4.67
3329	1115	Home	3.70
3330	1115	Draw	3.00
3331	1115	Away	4.63
3332	1116	Home	1.63
3333	1116	Draw	3.97
3334	1116	Away	4.04
3335	1117	Home	2.51
3336	1117	Draw	3.44
3337	1117	Away	2.68
3338	1118	Home	1.46
3339	1118	Draw	3.80
3340	1118	Away	3.21
3341	1119	Home	3.07
3342	1119	Draw	3.83
3343	1119	Away	3.03
3344	1120	Home	2.06
3345	1120	Draw	3.32
3346	1120	Away	3.93
3347	1121	Home	2.99
3348	1121	Draw	3.19
3349	1121	Away	1.86
3350	1122	Home	3.55
3351	1122	Draw	3.67
3352	1122	Away	4.36
3353	1123	Home	4.43
3354	1123	Draw	3.29
3355	1123	Away	3.87
3356	1124	Home	3.05
3357	1124	Draw	2.85
3358	1124	Away	3.41
3359	1125	Home	4.20
3360	1125	Draw	3.52
3361	1125	Away	2.77
3362	1126	Home	2.40
3363	1126	Draw	3.51
3364	1126	Away	4.06
3365	1127	Home	2.75
3366	1127	Draw	3.70
3367	1127	Away	4.89
3368	1128	Home	1.57
3369	1128	Draw	2.91
3370	1128	Away	3.14
3371	1129	Home	3.46
3372	1129	Draw	3.48
3373	1129	Away	3.33
3374	1130	Home	2.59
3375	1130	Draw	3.23
3376	1130	Away	2.46
3377	1131	Home	2.74
3378	1131	Draw	3.33
3379	1131	Away	2.94
3380	1132	Home	2.69
3381	1132	Draw	3.15
3382	1132	Away	4.25
3383	1133	Home	4.12
3384	1133	Draw	3.83
3385	1133	Away	1.50
3386	1134	Home	4.78
3387	1134	Draw	3.41
3388	1134	Away	2.38
3389	1135	Home	3.56
3390	1135	Draw	3.94
3391	1135	Away	2.10
3392	1136	Home	3.75
3393	1136	Draw	3.28
3394	1136	Away	3.85
3395	1137	Home	2.80
3396	1137	Draw	3.19
3397	1137	Away	2.02
3398	1138	Home	3.96
3399	1138	Draw	3.49
3400	1138	Away	2.95
3401	1139	Home	3.98
3402	1139	Draw	3.11
3403	1139	Away	2.68
3404	1140	Home	4.21
3405	1140	Draw	3.03
3406	1140	Away	4.85
3407	1141	Home	2.29
3408	1141	Draw	3.54
3409	1141	Away	3.17
3410	1142	Home	3.83
3411	1142	Draw	3.48
3412	1142	Away	3.32
3413	1143	Home	3.02
3414	1143	Draw	3.02
3415	1143	Away	2.28
3416	1144	Home	3.01
3417	1144	Draw	3.23
3418	1144	Away	1.85
3419	1145	Home	3.22
3420	1145	Draw	3.35
3421	1145	Away	2.89
3422	1146	Home	2.72
3423	1146	Draw	3.41
3424	1146	Away	4.01
3425	1147	Home	3.44
3426	1147	Draw	3.57
3427	1147	Away	3.60
3428	1148	Home	3.07
3429	1148	Draw	3.96
3430	1148	Away	4.75
3431	1149	Home	3.18
3432	1149	Draw	3.69
3433	1149	Away	4.67
3434	1150	Home	2.23
3435	1150	Draw	3.63
3436	1150	Away	2.95
3437	1151	Home	1.89
3438	1151	Draw	2.97
3439	1151	Away	1.93
3440	1152	Home	1.48
3441	1152	Draw	3.49
3442	1152	Away	3.45
3443	1153	Home	1.56
3444	1153	Draw	3.38
3445	1153	Away	3.79
3446	1154	Home	4.86
3447	1154	Draw	3.12
3448	1154	Away	3.29
3449	1155	Home	4.41
3450	1155	Draw	3.48
3451	1155	Away	2.59
3452	1156	Home	4.60
3453	1156	Draw	3.78
3454	1156	Away	2.88
3455	1157	Home	4.66
3456	1157	Draw	3.74
3457	1157	Away	1.71
3458	1158	Home	3.43
3459	1158	Draw	3.61
3460	1158	Away	3.35
3461	1159	Home	4.59
3462	1159	Draw	3.78
3463	1159	Away	1.91
3464	1160	Home	3.41
3465	1160	Draw	3.84
3466	1160	Away	3.69
3467	1161	Home	4.29
3468	1161	Draw	3.81
3469	1161	Away	2.21
3470	1162	Home	3.70
3471	1162	Draw	3.46
3472	1162	Away	4.75
3473	1163	Home	2.74
3474	1163	Draw	2.85
3475	1163	Away	1.91
3476	1164	Home	1.84
3477	1164	Draw	3.91
3478	1164	Away	3.07
3479	1165	Home	2.49
3480	1165	Draw	3.03
3481	1165	Away	4.62
3482	1166	Home	4.12
3483	1166	Draw	3.97
3484	1166	Away	1.44
3485	1167	Home	3.84
3486	1167	Draw	2.94
3487	1167	Away	2.94
3488	1168	Home	3.88
3489	1168	Draw	2.96
3490	1168	Away	4.43
3491	1169	Home	3.60
3492	1169	Draw	3.98
3493	1169	Away	3.38
3494	1170	Home	4.33
3495	1170	Draw	3.52
3496	1170	Away	4.66
3497	1171	Home	1.73
3498	1171	Draw	3.69
3499	1171	Away	4.80
3500	1172	Home	3.82
3501	1172	Draw	3.34
3502	1172	Away	1.73
3503	1173	Home	3.78
3504	1173	Draw	3.45
3505	1173	Away	4.74
3506	1174	Home	3.93
3507	1174	Draw	3.31
3508	1174	Away	1.68
3509	1175	Home	4.24
3510	1175	Draw	3.25
3511	1175	Away	2.24
3512	1176	Home	4.18
3513	1176	Draw	2.86
3514	1176	Away	1.71
3515	1177	Home	4.13
3516	1177	Draw	2.82
3517	1177	Away	1.52
3518	1178	Home	3.13
3519	1178	Draw	3.58
3520	1178	Away	2.71
3521	1179	Home	3.96
3522	1179	Draw	3.25
3523	1179	Away	3.95
3524	1180	Home	3.87
3525	1180	Draw	3.99
3526	1180	Away	3.82
3527	1181	Home	2.79
3528	1181	Draw	3.54
3529	1181	Away	2.79
3530	1182	Home	4.51
3531	1182	Draw	2.94
3532	1182	Away	4.19
3533	1183	Home	1.94
3534	1183	Draw	2.85
3535	1183	Away	4.81
3536	1184	Home	3.54
3537	1184	Draw	3.06
3538	1184	Away	1.75
3539	1185	Home	2.56
3540	1185	Draw	3.48
3541	1185	Away	2.28
3542	1186	Home	1.76
3543	1186	Draw	3.86
3544	1186	Away	3.58
3545	1187	Home	4.04
3546	1187	Draw	3.39
3547	1187	Away	3.33
3548	1188	Home	3.03
3549	1188	Draw	3.63
3550	1188	Away	4.50
3551	1189	Home	2.04
3552	1189	Draw	3.84
3553	1189	Away	2.49
3554	1190	Home	3.11
3555	1190	Draw	3.60
3556	1190	Away	3.57
3557	1191	Home	2.79
3558	1191	Draw	3.58
3559	1191	Away	4.68
3560	1192	Home	2.15
3561	1192	Draw	3.47
3562	1192	Away	3.94
3563	1193	Home	4.33
3564	1193	Draw	3.19
3565	1193	Away	2.95
3566	1194	Home	2.07
3567	1194	Draw	3.79
3568	1194	Away	4.08
3569	1195	Home	2.01
3570	1195	Draw	3.28
3571	1195	Away	4.36
3572	1196	Home	1.76
3573	1196	Draw	3.46
3574	1196	Away	3.75
3575	1197	Home	3.14
3576	1197	Draw	3.21
3577	1197	Away	3.60
3578	1198	Home	3.69
3579	1198	Draw	3.43
3580	1198	Away	3.92
3581	1199	Home	4.24
3582	1199	Draw	3.96
3583	1199	Away	3.18
3584	1200	Home	4.49
3585	1200	Draw	3.40
3586	1200	Away	2.37
3587	1201	Home	3.90
3588	1201	Draw	3.18
3589	1201	Away	3.19
3590	1202	Home	4.04
3591	1202	Draw	2.83
3592	1202	Away	3.66
3593	1203	Home	4.75
3594	1203	Draw	3.88
3595	1203	Away	3.46
3596	1204	Home	2.61
3597	1204	Draw	2.84
3598	1204	Away	1.61
3599	1205	Home	3.36
3600	1205	Draw	3.39
3601	1205	Away	2.64
3602	1206	Home	1.70
3603	1206	Draw	2.96
3604	1206	Away	1.56
3605	1207	Home	1.42
3606	1207	Draw	3.76
3607	1207	Away	3.62
3608	1208	Home	2.36
3609	1208	Draw	3.23
3610	1208	Away	3.57
3611	1209	Home	3.30
3612	1209	Draw	3.49
3613	1209	Away	3.86
3614	1210	Home	1.67
3615	1210	Draw	3.77
3616	1210	Away	4.23
3617	1211	Home	1.59
3618	1211	Draw	3.99
3619	1211	Away	4.71
3620	1212	Home	1.46
3621	1212	Draw	3.69
3622	1212	Away	2.18
3623	1213	Home	3.37
3624	1213	Draw	3.99
3625	1213	Away	4.17
3626	1214	Home	3.73
3627	1214	Draw	3.58
3628	1214	Away	1.56
3629	1215	Home	4.13
3630	1215	Draw	3.59
3631	1215	Away	3.50
3632	1216	Home	3.84
3633	1216	Draw	3.60
3634	1216	Away	2.80
3635	1217	Home	1.76
3636	1217	Draw	2.87
3637	1217	Away	3.59
3638	1218	Home	1.65
3639	1218	Draw	3.10
3640	1218	Away	3.09
3641	1219	Home	4.30
3642	1219	Draw	3.87
3643	1219	Away	2.76
3644	1220	Home	2.17
3645	1220	Draw	2.83
3646	1220	Away	3.40
3647	1221	Home	2.39
3648	1221	Draw	2.98
3649	1221	Away	3.99
3650	1222	Home	1.58
3651	1222	Draw	3.69
3652	1222	Away	4.03
3653	1223	Home	4.24
3654	1223	Draw	3.42
3655	1223	Away	4.24
3656	1224	Home	4.33
3657	1224	Draw	3.85
3658	1224	Away	2.92
3659	1225	Home	4.90
3660	1225	Draw	3.65
3661	1225	Away	2.18
3662	1226	Home	4.76
3663	1226	Draw	3.84
3664	1226	Away	2.11
3665	1227	Home	2.61
3666	1227	Draw	3.06
3667	1227	Away	4.20
3668	1228	Home	3.38
3669	1228	Draw	3.07
3670	1228	Away	3.16
3671	1229	Home	4.58
3672	1229	Draw	2.85
3673	1229	Away	3.85
3674	1230	Home	4.77
3675	1230	Draw	3.83
3676	1230	Away	2.71
3677	1231	Home	3.47
3678	1231	Draw	3.15
3679	1231	Away	4.13
3680	1232	Home	2.68
3681	1232	Draw	3.88
3682	1232	Away	2.08
3683	1233	Home	4.46
3684	1233	Draw	3.69
3685	1233	Away	3.28
3686	1234	Home	3.58
3687	1234	Draw	3.05
3688	1234	Away	1.77
3689	1235	Home	2.82
3690	1235	Draw	3.25
3691	1235	Away	3.70
3692	1236	Home	3.94
3693	1236	Draw	3.12
3694	1236	Away	1.65
3695	1237	Home	1.80
3696	1237	Draw	3.28
3697	1237	Away	4.12
3698	1238	Home	4.35
3699	1238	Draw	3.50
3700	1238	Away	3.53
3701	1239	Home	3.91
3702	1239	Draw	3.10
3703	1239	Away	3.89
3704	1240	Home	1.76
3705	1240	Draw	3.52
3706	1240	Away	2.69
3707	1241	Home	3.39
3708	1241	Draw	3.81
3709	1241	Away	1.69
3710	1242	Home	2.27
3711	1242	Draw	2.98
3712	1242	Away	3.91
3713	1243	Home	1.41
3714	1243	Draw	3.78
3715	1243	Away	2.71
3716	1244	Home	1.64
3717	1244	Draw	2.96
3718	1244	Away	2.57
3719	1245	Home	4.16
3720	1245	Draw	2.93
3721	1245	Away	4.58
3722	1246	Home	4.86
3723	1246	Draw	3.66
3724	1246	Away	3.69
3725	1247	Home	2.84
3726	1247	Draw	3.89
3727	1247	Away	2.38
3728	1248	Home	4.24
3729	1248	Draw	3.91
3730	1248	Away	4.69
3731	1249	Home	3.15
3732	1249	Draw	3.54
3733	1249	Away	2.84
3734	1250	Home	1.64
3735	1250	Draw	2.92
3736	1250	Away	2.03
3737	1251	Home	4.13
3738	1251	Draw	3.23
3739	1251	Away	2.67
3740	1252	Home	3.18
3741	1252	Draw	3.08
3742	1252	Away	3.73
3743	1253	Home	3.48
3744	1253	Draw	3.29
3745	1253	Away	1.79
3746	1254	Home	1.51
3747	1254	Draw	3.80
3748	1254	Away	2.34
3749	1255	Home	3.09
3750	1255	Draw	3.82
3751	1255	Away	4.35
3752	1256	Home	3.26
3753	1256	Draw	3.76
3754	1256	Away	3.81
3755	1257	Home	4.24
3756	1257	Draw	3.16
3757	1257	Away	3.79
3758	1258	Home	4.56
3759	1258	Draw	3.03
3760	1258	Away	1.95
3761	1259	Home	4.70
3762	1259	Draw	3.67
3763	1259	Away	3.57
3764	1260	Home	3.88
3765	1260	Draw	2.85
3766	1260	Away	4.55
3767	1261	Home	2.79
3768	1261	Draw	3.90
3769	1261	Away	4.42
3770	1262	Home	2.91
3771	1262	Draw	3.97
3772	1262	Away	2.28
3773	1263	Home	4.52
3774	1263	Draw	3.43
3775	1263	Away	1.93
3776	1264	Home	3.64
3777	1264	Draw	3.21
3778	1264	Away	4.63
3779	1265	Home	4.56
3780	1265	Draw	3.13
3781	1265	Away	1.42
3782	1266	Home	1.90
3783	1266	Draw	3.67
3784	1266	Away	2.84
3785	1267	Home	3.02
3786	1267	Draw	3.45
3787	1267	Away	2.48
3788	1268	Home	3.76
3789	1268	Draw	3.14
3790	1268	Away	1.56
3791	1269	Home	3.97
3792	1269	Draw	3.04
3793	1269	Away	3.38
3794	1270	Home	3.78
3795	1270	Draw	3.75
3796	1270	Away	1.42
3797	1271	Home	2.09
3798	1271	Draw	3.14
3799	1271	Away	3.65
3800	1272	Home	3.64
3801	1272	Draw	3.38
3802	1272	Away	3.81
3803	1273	Home	2.63
3804	1273	Draw	3.73
3805	1273	Away	2.35
3806	1274	Home	4.63
3807	1274	Draw	3.60
3808	1274	Away	3.74
3809	1275	Home	3.13
3810	1275	Draw	3.21
3811	1275	Away	1.62
3812	1276	Home	3.36
3813	1276	Draw	3.17
3814	1276	Away	3.73
3815	1277	Home	3.59
3816	1277	Draw	3.57
3817	1277	Away	1.46
3818	1278	Home	4.76
3819	1278	Draw	3.00
3820	1278	Away	1.60
3821	1279	Home	1.60
3822	1279	Draw	3.47
3823	1279	Away	4.17
3824	1280	Home	1.78
3825	1280	Draw	3.45
3826	1280	Away	3.61
3827	1281	Home	4.51
3828	1281	Draw	3.44
3829	1281	Away	3.55
3830	1282	Home	2.98
3831	1282	Draw	3.87
3832	1282	Away	3.33
3833	1283	Home	1.67
3834	1283	Draw	3.12
3835	1283	Away	3.44
3836	1284	Home	3.27
3837	1284	Draw	3.08
3838	1284	Away	4.40
3839	1285	Home	4.35
3840	1285	Draw	3.93
3841	1285	Away	3.20
3842	1286	Home	3.08
3843	1286	Draw	2.81
3844	1286	Away	4.00
3845	1287	Home	4.11
3846	1287	Draw	3.98
3847	1287	Away	3.12
3848	1288	Home	4.09
3849	1288	Draw	2.85
3850	1288	Away	4.79
3851	1289	Home	2.40
3852	1289	Draw	2.84
3853	1289	Away	3.06
3854	1290	Home	2.96
3855	1290	Draw	3.54
3856	1290	Away	4.26
3857	1291	Home	2.98
3858	1291	Draw	3.29
3859	1291	Away	1.53
3860	1292	Home	4.27
3861	1292	Draw	3.77
3862	1292	Away	3.99
3863	1293	Home	1.76
3864	1293	Draw	2.96
3865	1293	Away	3.21
3866	1294	Home	4.63
3867	1294	Draw	2.84
3868	1294	Away	4.33
3869	1295	Home	3.92
3870	1295	Draw	3.22
3871	1295	Away	1.80
3872	1296	Home	1.67
3873	1296	Draw	3.61
3874	1296	Away	4.53
3875	1297	Home	3.95
3876	1297	Draw	3.45
3877	1297	Away	3.11
3878	1298	Home	4.61
3879	1298	Draw	2.83
3880	1298	Away	4.30
3881	1299	Home	3.67
3882	1299	Draw	3.64
3883	1299	Away	3.17
3884	1300	Home	2.60
3885	1300	Draw	3.97
3886	1300	Away	2.65
3887	1301	Home	3.40
3888	1301	Draw	3.39
3889	1301	Away	2.16
3890	1302	Home	4.47
3891	1302	Draw	3.58
3892	1302	Away	1.65
3893	1303	Home	4.38
3894	1303	Draw	3.97
3895	1303	Away	1.40
3896	1304	Home	4.71
3897	1304	Draw	3.12
3898	1304	Away	3.48
3899	1305	Home	3.96
3900	1305	Draw	3.95
3901	1305	Away	3.22
3902	1306	Home	4.57
3903	1306	Draw	3.72
3904	1306	Away	4.11
3905	1307	Home	3.40
3906	1307	Draw	3.92
3907	1307	Away	2.44
3908	1308	Home	4.27
3909	1308	Draw	2.93
3910	1308	Away	4.82
3911	1309	Home	3.12
3912	1309	Draw	3.44
3913	1309	Away	1.68
3914	1310	Home	4.84
3915	1310	Draw	3.30
3916	1310	Away	4.86
3917	1311	Home	4.61
3918	1311	Draw	3.31
3919	1311	Away	3.34
3920	1312	Home	4.44
3921	1312	Draw	3.37
3922	1312	Away	3.47
3923	1313	Home	3.87
3924	1313	Draw	3.24
3925	1313	Away	4.40
3926	1314	Home	1.85
3927	1314	Draw	3.16
3928	1314	Away	4.14
3929	1315	Home	1.89
3930	1315	Draw	3.03
3931	1315	Away	3.77
3932	1316	Home	1.65
3933	1316	Draw	3.77
3934	1316	Away	3.16
3935	1317	Home	4.66
3936	1317	Draw	3.00
3937	1317	Away	4.68
3938	1318	Home	4.87
3939	1318	Draw	3.33
3940	1318	Away	3.75
3941	1319	Home	2.35
3942	1319	Draw	3.52
3943	1319	Away	4.18
3944	1320	Home	3.16
3945	1320	Draw	3.73
3946	1320	Away	2.16
3947	1321	Home	2.03
3948	1321	Draw	2.84
3949	1321	Away	3.75
3950	1322	Home	2.99
3951	1322	Draw	3.27
3952	1322	Away	3.12
3953	1323	Home	4.87
3954	1323	Draw	3.89
3955	1323	Away	1.51
3956	1324	Home	4.42
3957	1324	Draw	2.91
3958	1324	Away	4.27
3959	1325	Home	4.60
3960	1325	Draw	3.45
3961	1325	Away	1.50
3962	1326	Home	2.12
3963	1326	Draw	3.74
3964	1326	Away	2.17
3965	1327	Home	3.66
3966	1327	Draw	2.84
3967	1327	Away	3.12
3968	1328	Home	1.96
3969	1328	Draw	3.97
3970	1328	Away	1.49
3971	1329	Home	2.24
3972	1329	Draw	3.22
3973	1329	Away	1.46
3974	1330	Home	2.47
3975	1330	Draw	3.25
3976	1330	Away	3.02
3977	1331	Home	1.48
3978	1331	Draw	3.73
3979	1331	Away	3.66
3980	1332	Home	2.54
3981	1332	Draw	3.66
3982	1332	Away	3.72
3983	1333	Home	2.83
3984	1333	Draw	3.20
3985	1333	Away	2.88
3986	1334	Home	3.22
3987	1334	Draw	3.60
3988	1334	Away	1.43
3989	1335	Home	4.40
3990	1335	Draw	3.35
3991	1335	Away	2.28
3992	1336	Home	4.73
3993	1336	Draw	3.28
3994	1336	Away	3.75
3995	1337	Home	4.64
3996	1337	Draw	3.32
3997	1337	Away	2.95
3998	1338	Home	4.17
3999	1338	Draw	3.01
4000	1338	Away	2.45
4001	1339	Home	4.01
4002	1339	Draw	3.41
4003	1339	Away	3.65
4004	1340	Home	4.74
4005	1340	Draw	2.91
4006	1340	Away	4.19
4007	1341	Home	4.52
4008	1341	Draw	3.95
4009	1341	Away	2.11
4010	1342	Home	3.99
4011	1342	Draw	3.73
4012	1342	Away	2.07
4013	1343	Home	2.87
4014	1343	Draw	3.75
4015	1343	Away	4.18
4016	1344	Home	3.89
4017	1344	Draw	3.48
4018	1344	Away	4.48
4019	1345	Home	4.48
4020	1345	Draw	3.48
4021	1345	Away	1.64
4022	1346	Home	4.00
4023	1346	Draw	3.07
4024	1346	Away	2.23
4025	1347	Home	4.17
4026	1347	Draw	3.68
4027	1347	Away	3.84
4028	1348	Home	2.65
4029	1348	Draw	3.63
4030	1348	Away	3.54
4031	1349	Home	4.71
4032	1349	Draw	3.86
4033	1349	Away	4.77
4034	1350	Home	2.07
4035	1350	Draw	3.99
4036	1350	Away	4.76
4037	1351	Home	4.79
4038	1351	Draw	3.79
4039	1351	Away	1.55
4040	1352	Home	4.59
4041	1352	Draw	3.89
4042	1352	Away	2.11
4043	1353	Home	4.04
4044	1353	Draw	3.07
4045	1353	Away	4.09
4046	1354	Home	4.49
4047	1354	Draw	3.73
4048	1354	Away	2.82
4049	1355	Home	4.07
4050	1355	Draw	3.34
4051	1355	Away	4.78
4052	1356	Home	3.90
4053	1356	Draw	3.13
4054	1356	Away	3.34
4055	1357	Home	4.13
4056	1357	Draw	3.14
4057	1357	Away	1.97
4058	1358	Home	2.93
4059	1358	Draw	3.07
4060	1358	Away	2.18
4061	1359	Home	4.28
4062	1359	Draw	4.00
4063	1359	Away	3.19
4064	1360	Home	2.65
4065	1360	Draw	3.70
4066	1360	Away	4.37
4067	1361	Home	3.61
4068	1361	Draw	3.99
4069	1361	Away	3.63
4070	1362	Home	3.56
4071	1362	Draw	3.90
4072	1362	Away	4.29
4073	1363	Home	4.60
4074	1363	Draw	3.38
4075	1363	Away	4.58
4076	1364	Home	2.75
4077	1364	Draw	3.54
4078	1364	Away	1.76
4079	1365	Home	1.96
4080	1365	Draw	3.58
4081	1365	Away	4.30
4082	1366	Home	2.65
4083	1366	Draw	3.71
4084	1366	Away	2.05
4085	1367	Home	1.85
4086	1367	Draw	3.42
4087	1367	Away	2.49
4088	1368	Home	3.30
4089	1368	Draw	3.54
4090	1368	Away	3.09
4091	1369	Home	3.74
4092	1369	Draw	3.86
4093	1369	Away	3.08
4094	1370	Home	3.89
4095	1370	Draw	3.71
4096	1370	Away	3.03
4097	1371	Home	3.87
4098	1371	Draw	2.96
4099	1371	Away	4.23
4100	1372	Home	3.54
4101	1372	Draw	3.88
4102	1372	Away	2.14
4103	1373	Home	1.69
4104	1373	Draw	3.78
4105	1373	Away	4.34
4106	1374	Home	2.73
4107	1374	Draw	3.92
4108	1374	Away	4.25
4109	1375	Home	2.26
4110	1375	Draw	3.98
4111	1375	Away	2.06
4112	1376	Home	4.67
4113	1376	Draw	3.08
4114	1376	Away	3.85
4115	1377	Home	2.55
4116	1377	Draw	3.13
4117	1377	Away	2.03
4118	1378	Home	4.43
4119	1378	Draw	3.14
4120	1378	Away	4.04
4121	1379	Home	2.75
4122	1379	Draw	3.40
4123	1379	Away	3.81
4124	1380	Home	3.64
4125	1380	Draw	3.93
4126	1380	Away	2.10
4127	1381	Home	3.57
4128	1381	Draw	3.34
4129	1381	Away	1.99
4130	1382	Home	1.49
4131	1382	Draw	2.88
4132	1382	Away	4.07
4133	1383	Home	3.04
4134	1383	Draw	3.02
4135	1383	Away	4.06
4136	1384	Home	4.34
4137	1384	Draw	3.66
4138	1384	Away	2.96
4139	1385	Home	2.56
4140	1385	Draw	3.12
4141	1385	Away	2.33
4142	1386	Home	2.86
4143	1386	Draw	3.09
4144	1386	Away	4.22
4145	1387	Home	3.48
4146	1387	Draw	3.35
4147	1387	Away	2.29
4148	1388	Home	2.53
4149	1388	Draw	2.82
4150	1388	Away	4.63
4151	1389	Home	4.22
4152	1389	Draw	3.67
4153	1389	Away	4.16
4154	1390	Home	1.87
4155	1390	Draw	3.33
4156	1390	Away	4.63
4157	1391	Home	3.10
4158	1391	Draw	2.91
4159	1391	Away	3.69
4160	1392	Home	1.45
4161	1392	Draw	3.07
4162	1392	Away	4.64
4163	1393	Home	1.66
4164	1393	Draw	3.03
4165	1393	Away	1.71
4166	1394	Home	3.86
4167	1394	Draw	3.98
4168	1394	Away	1.47
4169	1395	Home	2.67
4170	1395	Draw	3.51
4171	1395	Away	2.77
4172	1396	Home	2.82
4173	1396	Draw	3.70
4174	1396	Away	2.52
4175	1397	Home	2.18
4176	1397	Draw	3.57
4177	1397	Away	2.33
4178	1398	Home	2.86
4179	1398	Draw	2.86
4180	1398	Away	3.81
4181	1399	Home	3.18
4182	1399	Draw	2.81
4183	1399	Away	2.22
4184	1400	Home	3.35
4185	1400	Draw	3.70
4186	1400	Away	2.39
4187	1401	Home	3.23
4188	1401	Draw	3.67
4189	1401	Away	4.26
4190	1402	Home	3.09
4191	1402	Draw	3.39
4192	1402	Away	2.86
4193	1403	Home	4.28
4194	1403	Draw	3.09
4195	1403	Away	3.38
4196	1404	Home	4.19
4197	1404	Draw	3.85
4198	1404	Away	3.59
4199	1405	Home	2.78
4200	1405	Draw	3.88
4201	1405	Away	3.90
4202	1406	Home	2.73
4203	1406	Draw	3.83
4204	1406	Away	1.75
4205	1407	Home	4.75
4206	1407	Draw	3.58
4207	1407	Away	3.34
4208	1408	Home	3.60
4209	1408	Draw	3.44
4210	1408	Away	2.25
4211	1409	Home	2.71
4212	1409	Draw	2.87
4213	1409	Away	3.53
4214	1410	Home	3.62
4215	1410	Draw	3.20
4216	1410	Away	3.22
4217	1411	Home	4.28
4218	1411	Draw	3.43
4219	1411	Away	3.85
4220	1412	Home	1.97
4221	1412	Draw	3.87
4222	1412	Away	2.46
4223	1413	Home	4.20
4224	1413	Draw	3.65
4225	1413	Away	1.77
4226	1414	Home	3.39
4227	1414	Draw	3.09
4228	1414	Away	2.82
4229	1415	Home	1.63
4230	1415	Draw	3.43
4231	1415	Away	1.78
4232	1416	Home	4.12
4233	1416	Draw	2.91
4234	1416	Away	4.48
4235	1417	Home	4.36
4236	1417	Draw	3.14
4237	1417	Away	2.27
4238	1418	Home	2.34
4239	1418	Draw	3.53
4240	1418	Away	4.36
4241	1419	Home	4.74
4242	1419	Draw	3.37
4243	1419	Away	3.14
4244	1420	Home	3.66
4245	1420	Draw	3.50
4246	1420	Away	2.96
4247	1421	Home	1.66
4248	1421	Draw	3.45
4249	1421	Away	1.42
4250	1422	Home	2.99
4251	1422	Draw	3.70
4252	1422	Away	3.32
4253	1423	Home	4.51
4254	1423	Draw	3.53
4255	1423	Away	1.70
4256	1424	Home	4.05
4257	1424	Draw	3.26
4258	1424	Away	2.07
4259	1425	Home	2.16
4260	1425	Draw	3.20
4261	1425	Away	2.71
4262	1426	Home	3.82
4263	1426	Draw	3.86
4264	1426	Away	4.78
4265	1427	Home	3.90
4266	1427	Draw	3.18
4267	1427	Away	2.34
4268	1428	Home	3.91
4269	1428	Draw	3.87
4270	1428	Away	3.33
4271	1429	Home	1.89
4272	1429	Draw	3.38
4273	1429	Away	4.62
4274	1430	Home	2.41
4275	1430	Draw	3.73
4276	1430	Away	4.77
4277	1431	Home	1.41
4278	1431	Draw	3.81
4279	1431	Away	4.07
4280	1432	Home	3.12
4281	1432	Draw	3.58
4282	1432	Away	1.45
4283	1433	Home	3.75
4284	1433	Draw	3.89
4285	1433	Away	2.81
4286	1434	Home	3.35
4287	1434	Draw	3.90
4288	1434	Away	3.16
4289	1435	Home	2.36
4290	1435	Draw	2.87
4291	1435	Away	3.46
4292	1436	Home	3.47
4293	1436	Draw	3.92
4294	1436	Away	1.76
4295	1437	Home	4.87
4296	1437	Draw	3.21
4297	1437	Away	4.22
4298	1438	Home	1.88
4299	1438	Draw	2.86
4300	1438	Away	1.93
4301	1439	Home	2.74
4302	1439	Draw	3.87
4303	1439	Away	2.28
4304	1440	Home	3.50
4305	1440	Draw	2.99
4306	1440	Away	4.62
4307	1441	Home	2.50
4308	1441	Draw	3.27
4309	1441	Away	3.11
4310	1442	Home	3.05
4311	1442	Draw	2.85
4312	1442	Away	2.29
4313	1443	Home	4.46
4314	1443	Draw	3.72
4315	1443	Away	3.81
4316	1444	Home	2.09
4317	1444	Draw	3.69
4318	1444	Away	1.45
4319	1445	Home	2.90
4320	1445	Draw	3.47
4321	1445	Away	2.16
4322	1446	Home	1.65
4323	1446	Draw	2.98
4324	1446	Away	4.00
4325	1447	Home	2.30
4326	1447	Draw	3.50
4327	1447	Away	3.31
4328	1448	Home	2.58
4329	1448	Draw	3.36
4330	1448	Away	2.14
4331	1449	Home	2.61
4332	1449	Draw	3.46
4333	1449	Away	3.99
4334	1450	Home	3.50
4335	1450	Draw	3.04
4336	1450	Away	4.12
4337	1451	Home	3.05
4338	1451	Draw	3.69
4339	1451	Away	4.75
4340	1452	Home	4.53
4341	1452	Draw	3.62
4342	1452	Away	2.54
4343	1453	Home	4.51
4344	1453	Draw	3.10
4345	1453	Away	2.56
4346	1454	Home	3.07
4347	1454	Draw	2.90
4348	1454	Away	3.16
4349	1455	Home	4.49
4350	1455	Draw	3.35
4351	1455	Away	2.44
4352	1456	Home	3.05
4353	1456	Draw	3.70
4354	1456	Away	4.29
4355	1457	Home	2.21
4356	1457	Draw	3.80
4357	1457	Away	2.29
4358	1458	Home	2.42
4359	1458	Draw	2.96
4360	1458	Away	1.61
4361	1459	Home	4.63
4362	1459	Draw	3.76
4363	1459	Away	1.94
4364	1460	Home	3.85
4365	1460	Draw	3.87
4366	1460	Away	2.67
4367	1461	Home	2.12
4368	1461	Draw	3.64
4369	1461	Away	3.02
4370	1462	Home	1.86
4371	1462	Draw	2.90
4372	1462	Away	3.31
4373	1463	Home	3.94
4374	1463	Draw	2.80
4375	1463	Away	2.14
4376	1464	Home	4.71
4377	1464	Draw	3.22
4378	1464	Away	3.88
4379	1465	Home	4.12
4380	1465	Draw	2.97
4381	1465	Away	4.12
4382	1466	Home	2.58
4383	1466	Draw	3.51
4384	1466	Away	2.88
4385	1467	Home	4.72
4386	1467	Draw	3.35
4387	1467	Away	4.05
4388	1468	Home	4.55
4389	1468	Draw	3.15
4390	1468	Away	3.70
4391	1469	Home	1.98
4392	1469	Draw	3.24
4393	1469	Away	3.87
4394	1470	Home	1.79
4395	1470	Draw	3.23
4396	1470	Away	2.59
4397	1471	Home	3.58
4398	1471	Draw	3.77
4399	1471	Away	3.90
4400	1472	Home	3.16
4401	1472	Draw	3.12
4402	1472	Away	2.63
4403	1473	Home	1.43
4404	1473	Draw	3.41
4405	1473	Away	3.31
4406	1474	Home	3.32
4407	1474	Draw	3.42
4408	1474	Away	1.95
4409	1475	Home	2.66
4410	1475	Draw	4.00
4411	1475	Away	3.57
4412	1476	Home	3.72
4413	1476	Draw	3.64
4414	1476	Away	4.11
4415	1477	Home	4.33
4416	1477	Draw	3.51
4417	1477	Away	1.41
4418	1478	Home	2.20
4419	1478	Draw	3.60
4420	1478	Away	2.02
4421	1479	Home	3.90
4422	1479	Draw	2.83
4423	1479	Away	4.39
4424	1480	Home	3.42
4425	1480	Draw	3.46
4426	1480	Away	1.79
4427	1481	Home	4.72
4428	1481	Draw	3.98
4429	1481	Away	3.06
4430	1482	Home	3.16
4431	1482	Draw	3.47
4432	1482	Away	1.60
4433	1483	Home	2.24
4434	1483	Draw	3.07
4435	1483	Away	1.86
4436	1484	Home	4.21
4437	1484	Draw	3.76
4438	1484	Away	4.71
4439	1485	Home	3.10
4440	1485	Draw	3.53
4441	1485	Away	4.17
4442	1486	Home	4.35
4443	1486	Draw	3.13
4444	1486	Away	3.86
4445	1487	Home	4.33
4446	1487	Draw	3.58
4447	1487	Away	2.95
4448	1488	Home	3.57
4449	1488	Draw	3.03
4450	1488	Away	4.11
4451	1489	Home	4.60
4452	1489	Draw	3.27
4453	1489	Away	2.09
4454	1490	Home	3.93
4455	1490	Draw	3.06
4456	1490	Away	4.47
4457	1491	Home	4.07
4458	1491	Draw	3.93
4459	1491	Away	2.35
4460	1492	Home	3.59
4461	1492	Draw	2.92
4462	1492	Away	4.49
4463	1493	Home	3.51
4464	1493	Draw	3.82
4465	1493	Away	2.05
4466	1494	Home	4.46
4467	1494	Draw	3.36
4468	1494	Away	1.97
4469	1495	Home	2.01
4470	1495	Draw	3.31
4471	1495	Away	2.71
4472	1496	Home	4.05
4473	1496	Draw	3.87
4474	1496	Away	2.60
4475	1497	Home	4.87
4476	1497	Draw	3.91
4477	1497	Away	2.37
4478	1498	Home	4.60
4479	1498	Draw	3.92
4480	1498	Away	2.36
4481	1499	Home	2.48
4482	1499	Draw	3.34
4483	1499	Away	4.42
4484	1500	Home	1.67
4485	1500	Draw	3.61
4486	1500	Away	1.98
4487	1501	Home	4.33
4488	1501	Draw	3.04
4489	1501	Away	2.43
4490	1502	Home	3.28
4491	1502	Draw	2.89
4492	1502	Away	4.62
4493	1503	Home	2.84
4494	1503	Draw	3.22
4495	1503	Away	3.57
4496	1504	Home	4.51
4497	1504	Draw	3.42
4498	1504	Away	2.14
4499	1505	Home	4.20
4500	1505	Draw	2.83
4501	1505	Away	2.93
4502	1506	Home	3.83
4503	1506	Draw	3.07
4504	1506	Away	2.99
4505	1507	Home	2.87
4506	1507	Draw	3.51
4507	1507	Away	2.54
4508	1508	Home	3.32
4509	1508	Draw	2.87
4510	1508	Away	3.68
4511	1509	Home	2.29
4512	1509	Draw	3.72
4513	1509	Away	4.00
4514	1510	Home	1.90
4515	1510	Draw	3.78
4516	1510	Away	2.91
4517	1511	Home	3.35
4518	1511	Draw	2.93
4519	1511	Away	2.91
4520	1512	Home	4.02
4521	1512	Draw	3.80
4522	1512	Away	3.38
4523	1513	Home	2.08
4524	1513	Draw	2.87
4525	1513	Away	3.01
4526	1514	Home	2.30
4527	1514	Draw	3.59
4528	1514	Away	3.38
4529	1515	Home	3.72
4530	1515	Draw	2.81
4531	1515	Away	1.84
4532	1516	Home	3.11
4533	1516	Draw	3.78
4534	1516	Away	4.32
4535	1517	Home	4.03
4536	1517	Draw	3.70
4537	1517	Away	2.52
4538	1518	Home	2.37
4539	1518	Draw	3.31
4540	1518	Away	3.67
4541	1519	Home	3.18
4542	1519	Draw	3.63
4543	1519	Away	3.84
4544	1520	Home	3.20
4545	1520	Draw	3.25
4546	1520	Away	3.49
4547	1521	Home	4.20
4548	1521	Draw	3.89
4549	1521	Away	3.33
4550	1522	Home	4.69
4551	1522	Draw	2.89
4552	1522	Away	3.50
4553	1523	Home	4.38
4554	1523	Draw	3.14
4555	1523	Away	3.77
4556	1524	Home	2.07
4557	1524	Draw	3.86
4558	1524	Away	3.07
4559	1525	Home	2.55
4560	1525	Draw	3.23
4561	1525	Away	4.52
4562	1526	Home	1.66
4563	1526	Draw	3.76
4564	1526	Away	2.93
4565	1527	Home	4.01
4566	1527	Draw	3.40
4567	1527	Away	2.09
4568	1528	Home	2.62
4569	1528	Draw	3.55
4570	1528	Away	3.39
4571	1529	Home	2.75
4572	1529	Draw	2.85
4573	1529	Away	4.07
4574	1530	Home	2.21
4575	1530	Draw	3.46
4576	1530	Away	1.81
4577	1531	Home	2.51
4578	1531	Draw	2.97
4579	1531	Away	2.17
4580	1532	Home	1.73
4581	1532	Draw	3.52
4582	1532	Away	1.70
4583	1533	Home	4.64
4584	1533	Draw	3.71
4585	1533	Away	2.96
4586	1534	Home	1.67
4587	1534	Draw	3.05
4588	1534	Away	3.94
4589	1535	Home	3.86
4590	1535	Draw	3.17
4591	1535	Away	2.23
4592	1536	Home	4.74
4593	1536	Draw	3.90
4594	1536	Away	3.68
4595	1537	Home	4.37
4596	1537	Draw	3.79
4597	1537	Away	2.93
4598	1538	Home	3.25
4599	1538	Draw	3.74
4600	1538	Away	2.20
4601	1539	Home	2.74
4602	1539	Draw	3.32
4603	1539	Away	2.06
4604	1540	Home	2.61
4605	1540	Draw	3.44
4606	1540	Away	4.31
4607	1541	Home	3.03
4608	1541	Draw	3.43
4609	1541	Away	4.68
4610	1542	Home	4.19
4611	1542	Draw	3.37
4612	1542	Away	3.71
4613	1543	Home	4.26
4614	1543	Draw	3.18
4615	1543	Away	1.43
4616	1544	Home	4.75
4617	1544	Draw	3.68
4618	1544	Away	3.75
4619	1545	Home	3.62
4620	1545	Draw	2.92
4621	1545	Away	3.25
4622	1546	Home	1.44
4623	1546	Draw	3.10
4624	1546	Away	1.60
4625	1547	Home	3.61
4626	1547	Draw	3.53
4627	1547	Away	2.62
4628	1548	Home	3.99
4629	1548	Draw	3.20
4630	1548	Away	3.51
4631	1549	Home	3.42
4632	1549	Draw	3.68
4633	1549	Away	1.74
4634	1550	Home	4.52
4635	1550	Draw	3.14
4636	1550	Away	2.63
4637	1551	Home	2.68
4638	1551	Draw	3.94
4639	1551	Away	2.29
4640	1552	Home	4.72
4641	1552	Draw	3.92
4642	1552	Away	4.53
4643	1553	Home	4.59
4644	1553	Draw	3.06
4645	1553	Away	4.56
4646	1554	Home	2.70
4647	1554	Draw	3.40
4648	1554	Away	4.57
4649	1555	Home	3.86
4650	1555	Draw	3.74
4651	1555	Away	3.56
4652	1556	Home	1.66
4653	1556	Draw	3.74
4654	1556	Away	1.86
4655	1557	Home	2.16
4656	1557	Draw	3.50
4657	1557	Away	1.74
4658	1558	Home	1.42
4659	1558	Draw	3.37
4660	1558	Away	4.26
4661	1559	Home	3.15
4662	1559	Draw	3.11
4663	1559	Away	2.13
4664	1560	Home	2.45
4665	1560	Draw	3.49
4666	1560	Away	4.13
4667	1561	Home	4.62
4668	1561	Draw	3.25
4669	1561	Away	3.39
4670	1562	Home	3.79
4671	1562	Draw	3.14
4672	1562	Away	2.21
4673	1563	Home	1.61
4674	1563	Draw	3.55
4675	1563	Away	4.74
4676	1564	Home	2.37
4677	1564	Draw	3.38
4678	1564	Away	3.18
4679	1565	Home	3.11
4680	1565	Draw	3.50
4681	1565	Away	4.02
4682	1566	Home	1.65
4683	1566	Draw	3.49
4684	1566	Away	4.35
4685	1567	Home	4.57
4686	1567	Draw	3.35
4687	1567	Away	3.69
4688	1568	Home	3.48
4689	1568	Draw	3.43
4690	1568	Away	3.04
4691	1569	Home	4.86
4692	1569	Draw	3.26
4693	1569	Away	2.66
4694	1570	Home	3.08
4695	1570	Draw	3.06
4696	1570	Away	3.36
4697	1571	Home	3.92
4698	1571	Draw	3.09
4699	1571	Away	4.68
4700	1572	Home	1.99
4701	1572	Draw	3.72
4702	1572	Away	2.44
4703	1573	Home	2.05
4704	1573	Draw	3.78
4705	1573	Away	3.77
4706	1574	Home	1.62
4707	1574	Draw	3.49
4708	1574	Away	3.20
4709	1575	Home	2.95
4710	1575	Draw	3.01
4711	1575	Away	3.89
4712	1576	Home	4.32
4713	1576	Draw	3.68
4714	1576	Away	1.45
4715	1577	Home	1.63
4716	1577	Draw	3.63
4717	1577	Away	3.43
4718	1578	Home	2.18
4719	1578	Draw	3.24
4720	1578	Away	4.39
4721	1579	Home	4.29
4722	1579	Draw	3.68
4723	1579	Away	3.91
4724	1580	Home	2.32
4725	1580	Draw	3.54
4726	1580	Away	1.72
4727	1581	Home	3.97
4728	1581	Draw	3.91
4729	1581	Away	3.45
4730	1582	Home	3.54
4731	1582	Draw	3.85
4732	1582	Away	1.86
4733	1583	Home	4.39
4734	1583	Draw	3.14
4735	1583	Away	3.62
4736	1584	Home	2.66
4737	1584	Draw	3.29
4738	1584	Away	4.57
4739	1585	Home	2.59
4740	1585	Draw	3.91
4741	1585	Away	3.20
4742	1586	Home	1.95
4743	1586	Draw	3.64
4744	1586	Away	1.55
4745	1587	Home	1.55
4746	1587	Draw	3.70
4747	1587	Away	2.57
4748	1588	Home	3.75
4749	1588	Draw	3.59
4750	1588	Away	4.66
4751	1589	Home	3.95
4752	1589	Draw	2.89
4753	1589	Away	4.36
4754	1590	Home	3.19
4755	1590	Draw	3.09
4756	1590	Away	2.92
4757	1591	Home	1.88
4758	1591	Draw	3.51
4759	1591	Away	2.83
4760	1592	Home	1.86
4761	1592	Draw	2.92
4762	1592	Away	1.88
4763	1593	Home	3.51
4764	1593	Draw	3.32
4765	1593	Away	4.48
4766	1594	Home	4.60
4767	1594	Draw	3.32
4768	1594	Away	2.59
4769	1595	Home	3.00
4770	1595	Draw	3.08
4771	1595	Away	4.05
4772	1596	Home	3.85
4773	1596	Draw	3.76
4774	1596	Away	1.68
4775	1597	Home	2.96
4776	1597	Draw	2.94
4777	1597	Away	2.02
4778	1598	Home	4.28
4779	1598	Draw	3.59
4780	1598	Away	3.50
4781	1599	Home	2.83
4782	1599	Draw	3.34
4783	1599	Away	2.80
4784	1600	Home	2.06
4785	1600	Draw	3.70
4786	1600	Away	3.58
4787	1601	Home	2.69
4788	1601	Draw	3.36
4789	1601	Away	3.45
4790	1602	Home	2.20
4791	1602	Draw	3.02
4792	1602	Away	2.56
4793	1603	Home	1.85
4794	1603	Draw	3.57
4795	1603	Away	4.34
4796	1604	Home	3.17
4797	1604	Draw	3.33
4798	1604	Away	3.89
4799	1605	Home	2.22
4800	1605	Draw	3.21
4801	1605	Away	4.33
4802	1606	Home	1.98
4803	1606	Draw	3.54
4804	1606	Away	4.72
4805	1607	Home	1.97
4806	1607	Draw	3.61
4807	1607	Away	1.96
4808	1608	Home	2.60
4809	1608	Draw	3.80
4810	1608	Away	2.65
4811	1609	Home	2.09
4812	1609	Draw	3.81
4813	1609	Away	3.91
4814	1610	Home	4.48
4815	1610	Draw	3.87
4816	1610	Away	1.50
4817	1611	Home	2.16
4818	1611	Draw	3.40
4819	1611	Away	1.96
4820	1612	Home	1.74
4821	1612	Draw	3.17
4822	1612	Away	4.30
4823	1613	Home	4.52
4824	1613	Draw	3.23
4825	1613	Away	2.26
4826	1614	Home	2.78
4827	1614	Draw	3.32
4828	1614	Away	3.92
4829	1615	Home	2.67
4830	1615	Draw	2.98
4831	1615	Away	3.48
4832	1616	Home	3.31
4833	1616	Draw	3.58
4834	1616	Away	3.09
4835	1617	Home	2.92
4836	1617	Draw	3.12
4837	1617	Away	1.75
4838	1618	Home	3.96
4839	1618	Draw	3.32
4840	1618	Away	3.91
4841	1619	Home	4.03
4842	1619	Draw	3.83
4843	1619	Away	3.87
4844	1620	Home	2.57
4845	1620	Draw	3.69
4846	1620	Away	1.70
4847	1621	Home	4.71
4848	1621	Draw	3.04
4849	1621	Away	1.58
4850	1622	Home	1.92
4851	1622	Draw	3.77
4852	1622	Away	4.76
4853	1623	Home	3.79
4854	1623	Draw	3.49
4855	1623	Away	1.83
4856	1624	Home	2.26
4857	1624	Draw	3.81
4858	1624	Away	3.03
4859	1625	Home	2.09
4860	1625	Draw	2.83
4861	1625	Away	2.38
4862	1626	Home	4.48
4863	1626	Draw	2.90
4864	1626	Away	4.09
4865	1627	Home	2.97
4866	1627	Draw	3.80
4867	1627	Away	3.33
4868	1628	Home	3.39
4869	1628	Draw	3.88
4870	1628	Away	2.98
4871	1629	Home	1.76
4872	1629	Draw	3.54
4873	1629	Away	3.58
4874	1630	Home	1.80
4875	1630	Draw	3.74
4876	1630	Away	2.55
4877	1631	Home	2.21
4878	1631	Draw	3.33
4879	1631	Away	2.66
4880	1632	Home	1.68
4881	1632	Draw	3.69
4882	1632	Away	3.88
4883	1633	Home	4.64
4884	1633	Draw	2.83
4885	1633	Away	3.19
4886	1634	Home	4.75
4887	1634	Draw	3.20
4888	1634	Away	4.48
4889	1635	Home	3.25
4890	1635	Draw	3.95
4891	1635	Away	1.46
4892	1636	Home	1.50
4893	1636	Draw	3.99
4894	1636	Away	1.90
4895	1637	Home	1.53
4896	1637	Draw	3.18
4897	1637	Away	1.65
4898	1638	Home	4.69
4899	1638	Draw	3.58
4900	1638	Away	3.21
4901	1639	Home	2.77
4902	1639	Draw	3.18
4903	1639	Away	3.17
4904	1640	Home	3.49
4905	1640	Draw	3.57
4906	1640	Away	3.60
4907	1641	Home	1.63
4908	1641	Draw	3.63
4909	1641	Away	2.19
4910	1642	Home	4.89
4911	1642	Draw	3.41
4912	1642	Away	4.21
4913	1643	Home	1.87
4914	1643	Draw	3.38
4915	1643	Away	3.41
4916	1644	Home	2.70
4917	1644	Draw	3.39
4918	1644	Away	4.24
4919	1645	Home	2.94
4920	1645	Draw	3.73
4921	1645	Away	3.32
4922	1646	Home	4.86
4923	1646	Draw	3.41
4924	1646	Away	2.46
4925	1647	Home	4.36
4926	1647	Draw	2.80
4927	1647	Away	4.58
4928	1648	Home	2.04
4929	1648	Draw	3.73
4930	1648	Away	3.66
4931	1649	Home	3.26
4932	1649	Draw	3.64
4933	1649	Away	2.48
4934	1650	Home	3.01
4935	1650	Draw	3.52
4936	1650	Away	3.97
4937	1651	Home	1.78
4938	1651	Draw	4.00
4939	1651	Away	4.50
4940	1652	Home	1.99
4941	1652	Draw	3.39
4942	1652	Away	2.12
4943	1653	Home	4.88
4944	1653	Draw	2.90
4945	1653	Away	1.94
4946	1654	Home	1.42
4947	1654	Draw	3.96
4948	1654	Away	4.77
4949	1655	Home	3.25
4950	1655	Draw	3.25
4951	1655	Away	3.47
4952	1656	Home	4.69
4953	1656	Draw	3.45
4954	1656	Away	3.19
4955	1657	Home	3.90
4956	1657	Draw	3.86
4957	1657	Away	3.89
4958	1658	Home	2.11
4959	1658	Draw	3.10
4960	1658	Away	4.17
4961	1659	Home	2.42
4962	1659	Draw	3.05
4963	1659	Away	2.25
4964	1660	Home	4.35
4965	1660	Draw	3.46
4966	1660	Away	4.35
4967	1661	Home	3.84
4968	1661	Draw	3.53
4969	1661	Away	1.67
4970	1662	Home	4.11
4971	1662	Draw	3.90
4972	1662	Away	2.53
4973	1663	Home	1.93
4974	1663	Draw	3.74
4975	1663	Away	3.94
4976	1664	Home	1.71
4977	1664	Draw	3.92
4978	1664	Away	2.76
4979	1665	Home	2.20
4980	1665	Draw	3.26
4981	1665	Away	3.25
4982	1666	Home	2.93
4983	1666	Draw	3.90
4984	1666	Away	3.27
4985	1667	Home	2.17
4986	1667	Draw	3.64
4987	1667	Away	1.40
4988	1668	Home	4.41
4989	1668	Draw	3.57
4990	1668	Away	2.22
4991	1669	Home	1.98
4992	1669	Draw	3.37
4993	1669	Away	2.38
4994	1670	Home	3.70
4995	1670	Draw	3.11
4996	1670	Away	4.09
4997	1671	Home	1.96
4998	1671	Draw	3.02
4999	1671	Away	2.58
5000	1672	Home	3.94
5001	1672	Draw	3.11
5002	1672	Away	2.89
5003	1673	Home	2.91
5004	1673	Draw	2.88
5005	1673	Away	2.39
5006	1674	Home	2.96
5007	1674	Draw	3.36
5008	1674	Away	4.12
5009	1675	Home	2.89
5010	1675	Draw	2.87
5011	1675	Away	4.57
5012	1676	Home	2.20
5013	1676	Draw	3.87
5014	1676	Away	1.70
5015	1677	Home	4.15
5016	1677	Draw	3.21
5017	1677	Away	2.26
5018	1678	Home	3.13
5019	1678	Draw	3.51
5020	1678	Away	4.58
5021	1679	Home	2.71
5022	1679	Draw	2.84
5023	1679	Away	1.70
5024	1680	Home	4.61
5025	1680	Draw	3.19
5026	1680	Away	4.74
5027	1681	Home	4.56
5028	1681	Draw	3.92
5029	1681	Away	2.41
5030	1682	Home	2.16
5031	1682	Draw	3.96
5032	1682	Away	4.61
5033	1683	Home	4.34
5034	1683	Draw	3.33
5035	1683	Away	4.82
5036	1684	Home	4.51
5037	1684	Draw	3.18
5038	1684	Away	1.64
5039	1685	Home	2.18
5040	1685	Draw	3.58
5041	1685	Away	2.65
5042	1686	Home	4.66
5043	1686	Draw	3.84
5044	1686	Away	3.07
5045	1687	Home	4.14
5046	1687	Draw	3.69
5047	1687	Away	2.37
5048	1688	Home	3.49
5049	1688	Draw	2.86
5050	1688	Away	2.12
5051	1689	Home	2.11
5052	1689	Draw	3.12
5053	1689	Away	2.14
5054	1690	Home	2.54
5055	1690	Draw	3.18
5056	1690	Away	1.70
5057	1691	Home	1.66
5058	1691	Draw	3.75
5059	1691	Away	1.58
5060	1692	Home	3.19
5061	1692	Draw	2.97
5062	1692	Away	2.10
5063	1693	Home	4.69
5064	1693	Draw	3.77
5065	1693	Away	3.52
5066	1694	Home	4.25
5067	1694	Draw	3.85
5068	1694	Away	4.56
5069	1695	Home	4.55
5070	1695	Draw	3.52
5071	1695	Away	2.95
5072	1696	Home	3.01
5073	1696	Draw	3.60
5074	1696	Away	1.99
5075	1697	Home	2.47
5076	1697	Draw	3.25
5077	1697	Away	3.89
5078	1698	Home	3.57
5079	1698	Draw	2.91
5080	1698	Away	2.39
5081	1699	Home	2.88
5082	1699	Draw	3.94
5083	1699	Away	4.65
5084	1700	Home	4.86
5085	1700	Draw	3.41
5086	1700	Away	3.99
5087	1701	Home	3.29
5088	1701	Draw	3.75
5089	1701	Away	3.42
5090	1702	Home	3.62
5091	1702	Draw	3.55
5092	1702	Away	4.59
5093	1703	Home	3.42
5094	1703	Draw	2.91
5095	1703	Away	1.97
5096	1704	Home	3.08
5097	1704	Draw	3.58
5098	1704	Away	2.94
5099	1705	Home	2.77
5100	1705	Draw	2.82
5101	1705	Away	4.60
5102	1706	Home	3.91
5103	1706	Draw	3.07
5104	1706	Away	1.77
5105	1707	Home	4.11
5106	1707	Draw	3.02
5107	1707	Away	2.81
5108	1708	Home	3.77
5109	1708	Draw	3.17
5110	1708	Away	3.16
5111	1709	Home	3.13
5112	1709	Draw	3.82
5113	1709	Away	3.30
5114	1710	Home	3.75
5115	1710	Draw	2.90
5116	1710	Away	2.91
5117	1711	Home	3.17
5118	1711	Draw	3.06
5119	1711	Away	1.45
5120	1712	Home	2.86
5121	1712	Draw	2.81
5122	1712	Away	4.25
5123	1713	Home	2.72
5124	1713	Draw	3.98
5125	1713	Away	3.71
5126	1714	Home	3.04
5127	1714	Draw	3.13
5128	1714	Away	2.29
5129	1715	Home	3.66
5130	1715	Draw	3.31
5131	1715	Away	3.29
5132	1716	Home	2.07
5133	1716	Draw	3.18
5134	1716	Away	4.78
5135	1717	Home	2.20
5136	1717	Draw	2.82
5137	1717	Away	3.56
5138	1718	Home	4.56
5139	1718	Draw	3.91
5140	1718	Away	4.75
5141	1719	Home	1.96
5142	1719	Draw	3.36
5143	1719	Away	1.65
5144	1720	Home	2.07
5145	1720	Draw	3.70
5146	1720	Away	2.81
5147	1721	Home	2.96
5148	1721	Draw	3.89
5149	1721	Away	1.93
5150	1722	Home	3.90
5151	1722	Draw	2.93
5152	1722	Away	3.33
5153	1723	Home	1.89
5154	1723	Draw	3.23
5155	1723	Away	2.15
5156	1724	Home	2.79
5157	1724	Draw	3.16
5158	1724	Away	3.09
5159	1725	Home	2.69
5160	1725	Draw	3.41
5161	1725	Away	4.42
5162	1726	Home	3.30
5163	1726	Draw	3.66
5164	1726	Away	2.83
5165	1727	Home	1.87
5166	1727	Draw	3.15
5167	1727	Away	4.11
5168	1728	Home	2.58
5169	1728	Draw	3.82
5170	1728	Away	1.81
5171	1729	Home	2.58
5172	1729	Draw	3.13
5173	1729	Away	4.12
5174	1730	Home	3.91
5175	1730	Draw	3.21
5176	1730	Away	1.90
5177	1731	Home	2.33
5178	1731	Draw	3.61
5179	1731	Away	3.78
5180	1732	Home	4.44
5181	1732	Draw	3.93
5182	1732	Away	1.74
5183	1733	Home	3.53
5184	1733	Draw	3.81
5185	1733	Away	4.69
5186	1734	Home	2.84
5187	1734	Draw	3.20
5188	1734	Away	3.96
5189	1735	Home	3.85
5190	1735	Draw	3.59
5191	1735	Away	4.39
5192	1736	Home	3.36
5193	1736	Draw	3.39
5194	1736	Away	4.06
5195	1737	Home	3.81
5196	1737	Draw	2.99
5197	1737	Away	2.09
5198	1738	Home	3.32
5199	1738	Draw	3.90
5200	1738	Away	3.24
5201	1739	Home	2.20
5202	1739	Draw	2.83
5203	1739	Away	1.73
5204	1740	Home	4.68
5205	1740	Draw	2.91
5206	1740	Away	4.77
5207	1741	Home	4.08
5208	1741	Draw	2.94
5209	1741	Away	4.85
5210	1742	Home	1.71
5211	1742	Draw	3.55
5212	1742	Away	2.33
5213	1743	Home	2.83
5214	1743	Draw	3.62
5215	1743	Away	4.31
5216	1744	Home	4.19
5217	1744	Draw	3.55
5218	1744	Away	4.02
5219	1745	Home	4.18
5220	1745	Draw	3.92
5221	1745	Away	2.84
5222	1746	Home	3.93
5223	1746	Draw	2.98
5224	1746	Away	2.88
5225	1747	Home	1.73
5226	1747	Draw	2.81
5227	1747	Away	3.17
5228	1748	Home	4.82
5229	1748	Draw	3.90
5230	1748	Away	2.27
5231	1749	Home	1.46
5232	1749	Draw	3.93
5233	1749	Away	2.02
5234	1750	Home	4.76
5235	1750	Draw	3.32
5236	1750	Away	2.44
5237	1751	Home	2.03
5238	1751	Draw	3.56
5239	1751	Away	1.46
5240	1752	Home	2.27
5241	1752	Draw	3.25
5242	1752	Away	1.50
5243	1753	Home	2.70
5244	1753	Draw	3.32
5245	1753	Away	3.46
5246	1754	Home	4.70
5247	1754	Draw	3.15
5248	1754	Away	2.76
5249	1755	Home	2.78
5250	1755	Draw	3.95
5251	1755	Away	3.65
5252	1756	Home	4.87
5253	1756	Draw	3.88
5254	1756	Away	3.67
5255	1757	Home	2.13
5256	1757	Draw	3.97
5257	1757	Away	3.88
5258	1758	Home	4.13
5259	1758	Draw	3.42
5260	1758	Away	3.76
5261	1759	Home	2.76
5262	1759	Draw	3.61
5263	1759	Away	1.70
5264	1760	Home	3.50
5265	1760	Draw	4.00
5266	1760	Away	4.10
5267	1761	Home	4.11
5268	1761	Draw	3.50
5269	1761	Away	3.06
5270	1762	Home	3.73
5271	1762	Draw	3.90
5272	1762	Away	2.12
5273	1763	Home	2.33
5274	1763	Draw	4.00
5275	1763	Away	3.65
5276	1764	Home	3.43
5277	1764	Draw	3.62
5278	1764	Away	1.83
5279	1765	Home	2.27
5280	1765	Draw	3.76
5281	1765	Away	3.65
5282	1766	Home	3.04
5283	1766	Draw	3.44
5284	1766	Away	1.90
5285	1767	Home	3.59
5286	1767	Draw	3.71
5287	1767	Away	3.93
5288	1768	Home	2.85
5289	1768	Draw	3.51
5290	1768	Away	2.15
5291	1769	Home	4.29
5292	1769	Draw	3.69
5293	1769	Away	1.96
5294	1770	Home	2.00
5295	1770	Draw	3.30
5296	1770	Away	1.95
5297	1771	Home	3.14
5298	1771	Draw	3.03
5299	1771	Away	4.70
5300	1772	Home	2.09
5301	1772	Draw	2.92
5302	1772	Away	4.75
5303	1773	Home	1.48
5304	1773	Draw	2.95
5305	1773	Away	2.23
5306	1774	Home	2.61
5307	1774	Draw	2.91
5308	1774	Away	2.33
5309	1775	Home	3.40
5310	1775	Draw	3.15
5311	1775	Away	4.01
5312	1776	Home	2.70
5313	1776	Draw	2.80
5314	1776	Away	2.87
5315	1777	Home	1.95
5316	1777	Draw	3.67
5317	1777	Away	3.05
5318	1778	Home	3.50
5319	1778	Draw	3.54
5320	1778	Away	4.56
5321	1779	Home	4.17
5322	1779	Draw	3.36
5323	1779	Away	1.56
5324	1780	Home	2.74
5325	1780	Draw	3.63
5326	1780	Away	3.41
5327	1781	Home	3.70
5328	1781	Draw	3.00
5329	1781	Away	4.22
5330	1782	Home	2.71
5331	1782	Draw	2.89
5332	1782	Away	2.28
5333	1783	Home	1.62
5334	1783	Draw	3.41
5335	1783	Away	3.18
5336	1784	Home	2.13
5337	1784	Draw	3.43
5338	1784	Away	3.47
5339	1785	Home	4.21
5340	1785	Draw	2.88
5341	1785	Away	4.01
5342	1786	Home	4.12
5343	1786	Draw	2.95
5344	1786	Away	2.75
5345	1787	Home	3.55
5346	1787	Draw	3.63
5347	1787	Away	1.57
5348	1788	Home	3.64
5349	1788	Draw	2.87
5350	1788	Away	1.73
5351	1789	Home	3.32
5352	1789	Draw	3.12
5353	1789	Away	4.21
5354	1790	Home	2.27
5355	1790	Draw	3.66
5356	1790	Away	4.41
5357	1791	Home	4.28
5358	1791	Draw	3.48
5359	1791	Away	1.41
5360	1792	Home	4.30
5361	1792	Draw	3.49
5362	1792	Away	1.62
5363	1793	Home	3.31
5364	1793	Draw	3.67
5365	1793	Away	4.18
5366	1794	Home	2.90
5367	1794	Draw	3.30
5368	1794	Away	3.81
5369	1795	Home	3.48
5370	1795	Draw	2.91
5371	1795	Away	1.44
5372	1796	Home	2.03
5373	1796	Draw	3.35
5374	1796	Away	4.12
5375	1797	Home	4.55
5376	1797	Draw	3.94
5377	1797	Away	4.64
5378	1798	Home	2.21
5379	1798	Draw	3.17
5380	1798	Away	3.20
5381	1799	Home	4.82
5382	1799	Draw	3.55
5383	1799	Away	2.57
5384	1800	Home	3.69
5385	1800	Draw	3.66
5386	1800	Away	4.12
5387	1801	Home	3.84
5388	1801	Draw	3.77
5389	1801	Away	4.58
5390	1802	Home	4.78
5391	1802	Draw	3.05
5392	1802	Away	3.45
5393	1803	Home	2.08
5394	1803	Draw	3.48
5395	1803	Away	3.15
5396	1804	Home	3.33
5397	1804	Draw	3.49
5398	1804	Away	2.56
5399	1805	Home	1.78
5400	1805	Draw	2.94
5401	1805	Away	3.35
5402	1806	Home	1.41
5403	1806	Draw	3.68
5404	1806	Away	2.40
5405	1807	Home	4.17
5406	1807	Draw	3.26
5407	1807	Away	4.40
5408	1808	Home	2.37
5409	1808	Draw	3.84
5410	1808	Away	3.40
5411	1809	Home	1.74
5412	1809	Draw	3.43
5413	1809	Away	2.86
5414	1810	Home	4.88
5415	1810	Draw	3.76
5416	1810	Away	3.69
5417	1811	Home	1.69
5418	1811	Draw	3.92
5419	1811	Away	2.49
5420	1812	Home	4.16
5421	1812	Draw	3.78
5422	1812	Away	3.92
5423	1813	Home	4.84
5424	1813	Draw	3.94
5425	1813	Away	1.41
5426	1814	Home	4.48
5427	1814	Draw	3.46
5428	1814	Away	2.80
5429	1815	Home	4.47
5430	1815	Draw	3.40
5431	1815	Away	1.79
5432	1816	Home	3.89
5433	1816	Draw	3.61
5434	1816	Away	2.18
5435	1817	Home	3.13
5436	1817	Draw	3.64
5437	1817	Away	1.64
5438	1818	Home	1.54
5439	1818	Draw	3.43
5440	1818	Away	1.40
5441	1819	Home	4.32
5442	1819	Draw	3.77
5443	1819	Away	2.73
5444	1820	Home	2.61
5445	1820	Draw	3.65
5446	1820	Away	2.20
5447	1821	Home	4.38
5448	1821	Draw	3.81
5449	1821	Away	3.70
5450	1822	Home	3.04
5451	1822	Draw	3.32
5452	1822	Away	4.66
5453	1823	Home	2.00
5454	1823	Draw	3.78
5455	1823	Away	2.44
5456	1824	Home	1.61
5457	1824	Draw	3.01
5458	1824	Away	2.58
5459	1825	Home	3.34
5460	1825	Draw	3.48
5461	1825	Away	3.40
5462	1826	Home	3.10
5463	1826	Draw	3.79
5464	1826	Away	2.97
5465	1827	Home	2.66
5466	1827	Draw	3.42
5467	1827	Away	2.50
5468	1828	Home	4.54
5469	1828	Draw	2.86
5470	1828	Away	3.23
5471	1829	Home	3.26
5472	1829	Draw	3.09
5473	1829	Away	4.36
5474	1830	Home	3.14
5475	1830	Draw	3.20
5476	1830	Away	3.82
5477	1831	Home	3.49
5478	1831	Draw	2.80
5479	1831	Away	1.60
5480	1832	Home	3.59
5481	1832	Draw	2.83
5482	1832	Away	1.44
5483	1833	Home	2.94
5484	1833	Draw	3.48
5485	1833	Away	3.09
5486	1834	Home	3.68
5487	1834	Draw	3.85
5488	1834	Away	3.32
5489	1835	Home	1.48
5490	1835	Draw	3.23
5491	1835	Away	4.31
5492	1836	Home	1.80
5493	1836	Draw	3.11
5494	1836	Away	3.99
5495	1837	Home	3.96
5496	1837	Draw	3.54
5497	1837	Away	4.53
5498	1838	Home	4.56
5499	1838	Draw	3.08
5500	1838	Away	3.90
5501	1839	Home	4.14
5502	1839	Draw	3.06
5503	1839	Away	3.75
5504	1840	Home	4.55
5505	1840	Draw	3.49
5506	1840	Away	3.12
5507	1841	Home	2.84
5508	1841	Draw	3.19
5509	1841	Away	1.62
5510	1842	Home	4.00
5511	1842	Draw	3.23
5512	1842	Away	3.42
5513	1843	Home	1.42
5514	1843	Draw	3.47
5515	1843	Away	1.80
5516	1844	Home	2.65
5517	1844	Draw	3.46
5518	1844	Away	3.59
5519	1845	Home	4.09
5520	1845	Draw	2.80
5521	1845	Away	3.16
5522	1846	Home	4.46
5523	1846	Draw	3.01
5524	1846	Away	4.42
5525	1847	Home	1.45
5526	1847	Draw	2.96
5527	1847	Away	3.64
5528	1848	Home	2.25
5529	1848	Draw	3.88
5530	1848	Away	1.67
5531	1849	Home	4.69
5532	1849	Draw	3.86
5533	1849	Away	1.86
5534	1850	Home	4.37
5535	1850	Draw	3.76
5536	1850	Away	1.56
5537	1851	Home	4.90
5538	1851	Draw	3.87
5539	1851	Away	4.75
5540	1852	Home	4.71
5541	1852	Draw	3.53
5542	1852	Away	3.09
5543	1853	Home	3.62
5544	1853	Draw	3.72
5545	1853	Away	4.24
5546	1854	Home	3.68
5547	1854	Draw	3.17
5548	1854	Away	1.68
5549	1855	Home	3.27
5550	1855	Draw	3.37
5551	1855	Away	3.30
5552	1856	Home	2.54
5553	1856	Draw	2.82
5554	1856	Away	1.88
5555	1857	Home	4.65
5556	1857	Draw	2.86
5557	1857	Away	4.21
5558	1858	Home	2.11
5559	1858	Draw	3.43
5560	1858	Away	4.29
5561	1859	Home	3.32
5562	1859	Draw	3.59
5563	1859	Away	2.54
5564	1860	Home	4.44
5565	1860	Draw	3.40
5566	1860	Away	3.11
5567	1861	Home	2.32
5568	1861	Draw	3.28
5569	1861	Away	2.38
5570	1862	Home	3.22
5571	1862	Draw	3.21
5572	1862	Away	4.73
5573	1863	Home	3.78
5574	1863	Draw	3.46
5575	1863	Away	2.71
5576	1864	Home	3.12
5577	1864	Draw	3.36
5578	1864	Away	2.41
5579	1865	Home	1.94
5580	1865	Draw	2.91
5581	1865	Away	1.62
5582	1866	Home	3.49
5583	1866	Draw	3.37
5584	1866	Away	1.80
5585	1867	Home	3.76
5586	1867	Draw	2.90
5587	1867	Away	2.30
5588	1868	Home	3.50
5589	1868	Draw	3.91
5590	1868	Away	3.48
5591	1869	Home	1.52
5592	1869	Draw	3.35
5593	1869	Away	3.63
5594	1870	Home	3.61
5595	1870	Draw	2.84
5596	1870	Away	3.82
5597	1871	Home	4.49
5598	1871	Draw	3.74
5599	1871	Away	2.32
5600	1872	Home	2.42
5601	1872	Draw	3.15
5602	1872	Away	4.25
5603	1873	Home	3.09
5604	1873	Draw	3.51
5605	1873	Away	1.60
5606	1874	Home	2.51
5607	1874	Draw	3.28
5608	1874	Away	1.75
5609	1875	Home	3.82
5610	1875	Draw	3.40
5611	1875	Away	4.68
5612	1876	Home	3.98
5613	1876	Draw	3.25
5614	1876	Away	3.35
5615	1877	Home	3.20
5616	1877	Draw	3.96
5617	1877	Away	2.24
5618	1878	Home	2.99
5619	1878	Draw	3.80
5620	1878	Away	3.73
5621	1879	Home	4.43
5622	1879	Draw	3.24
5623	1879	Away	1.46
5624	1880	Home	2.52
5625	1880	Draw	3.92
5626	1880	Away	2.62
5627	1881	Home	3.48
5628	1881	Draw	3.28
5629	1881	Away	3.70
5630	1882	Home	3.04
5631	1882	Draw	3.42
5632	1882	Away	2.82
5633	1883	Home	4.71
5634	1883	Draw	3.49
5635	1883	Away	4.26
5636	1884	Home	1.47
5637	1884	Draw	3.72
5638	1884	Away	4.63
5639	1885	Home	4.04
5640	1885	Draw	3.16
5641	1885	Away	4.69
5642	1886	Home	3.10
5643	1886	Draw	2.84
5644	1886	Away	3.96
5645	1887	Home	3.66
5646	1887	Draw	3.57
5647	1887	Away	3.26
5648	1888	Home	3.59
5649	1888	Draw	3.47
5650	1888	Away	4.51
5651	1889	Home	1.57
5652	1889	Draw	3.44
5653	1889	Away	1.89
5654	1890	Home	4.40
5655	1890	Draw	3.41
5656	1890	Away	4.39
5657	1891	Home	3.22
5658	1891	Draw	3.33
5659	1891	Away	2.97
5660	1892	Home	1.58
5661	1892	Draw	3.38
5662	1892	Away	1.82
5663	1893	Home	4.73
5664	1893	Draw	3.48
5665	1893	Away	3.09
5666	1894	Home	4.10
5667	1894	Draw	3.78
5668	1894	Away	3.71
5669	1895	Home	3.42
5670	1895	Draw	3.41
5671	1895	Away	4.86
5672	1896	Home	3.16
5673	1896	Draw	3.71
5674	1896	Away	3.65
5675	1897	Home	3.75
5676	1897	Draw	3.45
5677	1897	Away	1.58
5678	1898	Home	3.51
5679	1898	Draw	3.84
5680	1898	Away	3.26
5681	1899	Home	1.87
5682	1899	Draw	3.10
5683	1899	Away	2.23
5684	1900	Home	3.47
5685	1900	Draw	2.81
5686	1900	Away	1.88
5687	1901	Home	2.93
5688	1901	Draw	2.92
5689	1901	Away	3.29
5690	1902	Home	4.88
5691	1902	Draw	3.23
5692	1902	Away	2.63
5693	1903	Home	2.94
5694	1903	Draw	3.51
5695	1903	Away	2.82
5696	1904	Home	1.59
5697	1904	Draw	3.48
5698	1904	Away	4.14
5699	1905	Home	2.55
5700	1905	Draw	3.71
5701	1905	Away	2.97
5702	1906	Home	1.52
5703	1906	Draw	3.36
5704	1906	Away	4.59
5705	1907	Home	3.97
5706	1907	Draw	3.36
5707	1907	Away	2.74
5708	1908	Home	4.07
5709	1908	Draw	3.11
5710	1908	Away	2.24
5711	1909	Home	4.42
5712	1909	Draw	3.52
5713	1909	Away	3.30
5714	1910	Home	1.73
5715	1910	Draw	3.97
5716	1910	Away	1.62
5717	1911	Home	3.72
5718	1911	Draw	2.81
5719	1911	Away	2.91
5720	1912	Home	2.49
5721	1912	Draw	3.64
5722	1912	Away	4.68
5723	1913	Home	2.02
5724	1913	Draw	2.89
5725	1913	Away	4.76
5726	1914	Home	3.80
5727	1914	Draw	2.91
5728	1914	Away	4.64
5729	1915	Home	3.03
5730	1915	Draw	3.08
5731	1915	Away	4.03
5732	1916	Home	1.51
5733	1916	Draw	3.40
5734	1916	Away	4.05
5735	1917	Home	3.33
5736	1917	Draw	3.15
5737	1917	Away	2.85
5738	1918	Home	2.65
5739	1918	Draw	3.74
5740	1918	Away	2.55
5741	1919	Home	4.65
5742	1919	Draw	3.23
5743	1919	Away	2.82
5744	1920	Home	4.22
5745	1920	Draw	3.85
5746	1920	Away	2.63
5747	1921	Home	3.59
5748	1921	Draw	3.15
5749	1921	Away	3.72
5750	1922	Home	1.57
5751	1922	Draw	2.96
5752	1922	Away	1.49
5753	1923	Home	2.56
5754	1923	Draw	3.49
5755	1923	Away	3.21
5756	1924	Home	1.80
5757	1924	Draw	3.38
5758	1924	Away	4.82
5759	1925	Home	3.47
5760	1925	Draw	3.62
5761	1925	Away	3.34
5762	1926	Home	4.17
5763	1926	Draw	3.15
5764	1926	Away	1.57
5765	1927	Home	2.65
5766	1927	Draw	3.49
5767	1927	Away	2.70
5768	1928	Home	3.57
5769	1928	Draw	2.98
5770	1928	Away	2.28
5771	1929	Home	2.10
5772	1929	Draw	2.86
5773	1929	Away	1.95
5774	1930	Home	3.22
5775	1930	Draw	2.83
5776	1930	Away	2.72
5777	1931	Home	3.19
5778	1931	Draw	3.78
5779	1931	Away	3.93
5780	1932	Home	2.75
5781	1932	Draw	3.37
5782	1932	Away	3.03
5783	1933	Home	2.26
5784	1933	Draw	3.12
5785	1933	Away	4.03
5786	1934	Home	2.27
5787	1934	Draw	2.91
5788	1934	Away	2.11
5789	1935	Home	1.46
5790	1935	Draw	3.58
5791	1935	Away	4.57
5792	1936	Home	1.89
5793	1936	Draw	3.34
5794	1936	Away	4.25
5795	1937	Home	4.83
5796	1937	Draw	3.13
5797	1937	Away	4.60
5798	1938	Home	1.59
5799	1938	Draw	3.75
5800	1938	Away	1.73
5801	1939	Home	2.38
5802	1939	Draw	2.93
5803	1939	Away	4.53
5804	1940	Home	1.57
5805	1940	Draw	3.77
5806	1940	Away	2.03
5807	1941	Home	3.37
5808	1941	Draw	3.61
5809	1941	Away	4.57
5810	1942	Home	4.79
5811	1942	Draw	2.98
5812	1942	Away	4.02
5813	1943	Home	2.34
5814	1943	Draw	3.21
5815	1943	Away	3.89
5816	1944	Home	3.33
5817	1944	Draw	3.19
5818	1944	Away	2.85
5819	1945	Home	4.10
5820	1945	Draw	3.75
5821	1945	Away	2.74
5822	1946	Home	4.69
5823	1946	Draw	3.73
5824	1946	Away	1.80
5825	1947	Home	4.74
5826	1947	Draw	3.93
5827	1947	Away	3.84
5828	1948	Home	1.75
5829	1948	Draw	2.97
5830	1948	Away	1.84
5831	1949	Home	2.09
5832	1949	Draw	3.22
5833	1949	Away	1.98
5834	1950	Home	4.69
5835	1950	Draw	3.02
5836	1950	Away	2.79
5837	1951	Home	3.83
5838	1951	Draw	2.97
5839	1951	Away	2.53
5840	1952	Home	3.59
5841	1952	Draw	3.12
5842	1952	Away	4.51
5843	1953	Home	4.50
5844	1953	Draw	3.01
5845	1953	Away	3.97
5846	1954	Home	4.78
5847	1954	Draw	3.80
5848	1954	Away	2.89
5849	1955	Home	1.92
5850	1955	Draw	3.80
5851	1955	Away	3.57
5852	1956	Home	3.75
5853	1956	Draw	3.32
5854	1956	Away	1.77
5855	1957	Home	4.45
5856	1957	Draw	3.85
5857	1957	Away	4.06
5858	1958	Home	1.71
5859	1958	Draw	3.57
5860	1958	Away	4.63
5861	1959	Home	4.33
5862	1959	Draw	3.81
5863	1959	Away	2.30
5864	1960	Home	2.82
5865	1960	Draw	3.74
5866	1960	Away	2.55
5867	1961	Home	3.43
5868	1961	Draw	3.38
5869	1961	Away	4.10
5870	1962	Home	4.38
5871	1962	Draw	2.95
5872	1962	Away	2.07
5873	1963	Home	3.22
5874	1963	Draw	3.34
5875	1963	Away	4.48
5876	1964	Home	2.37
5877	1964	Draw	3.71
5878	1964	Away	2.79
5879	1965	Home	2.06
5880	1965	Draw	3.76
5881	1965	Away	1.97
5882	1966	Home	1.92
5883	1966	Draw	3.60
5884	1966	Away	3.17
5885	1967	Home	4.78
5886	1967	Draw	3.33
5887	1967	Away	3.54
5888	1968	Home	2.20
5889	1968	Draw	2.96
5890	1968	Away	4.79
5891	1969	Home	3.35
5892	1969	Draw	3.42
5893	1969	Away	2.57
5894	1970	Home	2.92
5895	1970	Draw	3.17
5896	1970	Away	3.61
5897	1971	Home	3.67
5898	1971	Draw	3.16
5899	1971	Away	4.09
5900	1972	Home	1.59
5901	1972	Draw	3.86
5902	1972	Away	1.67
5903	1973	Home	2.43
5904	1973	Draw	3.12
5905	1973	Away	4.71
5906	1974	Home	3.61
5907	1974	Draw	3.84
5908	1974	Away	1.92
5909	1975	Home	2.92
5910	1975	Draw	3.33
5911	1975	Away	4.47
5912	1976	Home	3.99
5913	1976	Draw	3.72
5914	1976	Away	2.87
5915	1977	Home	4.68
5916	1977	Draw	2.87
5917	1977	Away	3.41
5918	1978	Home	3.55
5919	1978	Draw	3.81
5920	1978	Away	2.66
5921	1979	Home	3.61
5922	1979	Draw	3.35
5923	1979	Away	4.75
5924	1980	Home	4.84
5925	1980	Draw	3.63
5926	1980	Away	3.56
5927	1981	Home	3.71
5928	1981	Draw	3.82
5929	1981	Away	2.95
5930	1982	Home	1.40
5931	1982	Draw	3.63
5932	1982	Away	4.25
5933	1983	Home	2.14
5934	1983	Draw	3.52
5935	1983	Away	2.46
5936	1984	Home	1.83
5937	1984	Draw	3.95
5938	1984	Away	3.47
5939	1985	Home	3.85
5940	1985	Draw	3.21
5941	1985	Away	2.18
5942	1986	Home	3.91
5943	1986	Draw	3.61
5944	1986	Away	3.68
5945	1987	Home	3.56
5946	1987	Draw	2.91
5947	1987	Away	3.50
5948	1988	Home	4.68
5949	1988	Draw	3.05
5950	1988	Away	2.54
5951	1989	Home	3.39
5952	1989	Draw	3.66
5953	1989	Away	3.45
5954	1990	Home	3.68
5955	1990	Draw	3.05
5956	1990	Away	3.94
5957	1991	Home	2.14
5958	1991	Draw	3.49
5959	1991	Away	3.14
5960	1992	Home	2.77
5961	1992	Draw	3.94
5962	1992	Away	1.88
5963	1993	Home	1.61
5964	1993	Draw	3.32
5965	1993	Away	1.56
5966	1994	Home	2.21
5967	1994	Draw	3.89
5968	1994	Away	1.46
5969	1995	Home	2.38
5970	1995	Draw	3.62
5971	1995	Away	3.56
5972	1996	Home	2.05
5973	1996	Draw	2.81
5974	1996	Away	2.01
5975	1997	Home	3.88
5976	1997	Draw	3.93
5977	1997	Away	2.06
5978	1998	Home	2.93
5979	1998	Draw	3.76
5980	1998	Away	2.66
5981	1999	Home	2.71
5982	1999	Draw	3.46
5983	1999	Away	4.74
5984	2000	Home	3.30
5985	2000	Draw	2.87
5986	2000	Away	4.20
5987	2001	Home	2.19
5988	2001	Draw	2.96
5989	2001	Away	2.62
5990	2002	Home	2.37
5991	2002	Draw	3.15
5992	2002	Away	4.61
5993	2003	Home	4.25
5994	2003	Draw	3.51
5995	2003	Away	3.57
5996	2004	Home	4.84
5997	2004	Draw	3.56
5998	2004	Away	3.25
5999	2005	Home	1.43
6000	2005	Draw	3.72
6001	2005	Away	3.32
6002	2006	Home	1.55
6003	2006	Draw	3.54
6004	2006	Away	3.08
6005	2007	Home	1.92
6006	2007	Draw	3.37
6007	2007	Away	2.82
6008	2008	Home	3.34
6009	2008	Draw	3.72
6010	2008	Away	2.41
6011	2009	Home	2.79
6012	2009	Draw	3.69
6013	2009	Away	4.68
6014	2010	Home	3.36
6015	2010	Draw	3.65
6016	2010	Away	1.91
6017	2011	Home	3.70
6018	2011	Draw	3.52
6019	2011	Away	2.95
6020	2012	Home	3.86
6021	2012	Draw	2.91
6022	2012	Away	4.24
6023	2013	Home	4.00
6024	2013	Draw	3.24
6025	2013	Away	2.23
6026	2014	Home	3.33
6027	2014	Draw	3.22
6028	2014	Away	2.21
6029	2015	Home	3.25
6030	2015	Draw	3.57
6031	2015	Away	3.94
6032	2016	Home	1.84
6033	2016	Draw	3.87
6034	2016	Away	4.21
6035	2017	Home	4.14
6036	2017	Draw	3.99
6037	2017	Away	1.41
6038	2018	Home	4.31
6039	2018	Draw	2.90
6040	2018	Away	2.27
6041	2019	Home	1.56
6042	2019	Draw	3.00
6043	2019	Away	4.48
6044	2020	Home	3.70
6045	2020	Draw	2.86
6046	2020	Away	2.55
6047	2021	Home	1.97
6048	2021	Draw	3.30
6049	2021	Away	3.61
6050	2022	Home	2.69
6051	2022	Draw	2.84
6052	2022	Away	3.22
6053	2023	Home	1.67
6054	2023	Draw	3.14
6055	2023	Away	4.01
6056	2024	Home	1.95
6057	2024	Draw	2.83
6058	2024	Away	2.25
6059	2025	Home	4.33
6060	2025	Draw	3.67
6061	2025	Away	3.79
6062	2026	Home	1.44
6063	2026	Draw	3.66
6064	2026	Away	2.35
6065	2027	Home	2.03
6066	2027	Draw	2.83
6067	2027	Away	4.17
6068	2028	Home	4.65
6069	2028	Draw	3.24
6070	2028	Away	4.78
6071	2029	Home	4.02
6072	2029	Draw	3.38
6073	2029	Away	2.95
6074	2030	Home	3.77
6075	2030	Draw	3.65
6076	2030	Away	2.76
6077	2031	Home	4.72
6078	2031	Draw	3.77
6079	2031	Away	3.57
6080	2032	Home	1.57
6081	2032	Draw	3.86
6082	2032	Away	2.93
6083	2033	Home	1.47
6084	2033	Draw	3.23
6085	2033	Away	3.33
6086	2034	Home	1.68
6087	2034	Draw	3.28
6088	2034	Away	1.76
6089	2035	Home	2.26
6090	2035	Draw	2.96
6091	2035	Away	3.04
6092	2036	Home	4.80
6093	2036	Draw	3.31
6094	2036	Away	2.32
6095	2037	Home	2.84
6096	2037	Draw	2.89
6097	2037	Away	2.74
6098	2038	Home	2.72
6099	2038	Draw	3.25
6100	2038	Away	3.17
6101	2039	Home	2.60
6102	2039	Draw	3.15
6103	2039	Away	2.14
6104	2040	Home	2.40
6105	2040	Draw	3.43
6106	2040	Away	4.55
6107	2041	Home	1.74
6108	2041	Draw	3.89
6109	2041	Away	3.28
6110	2042	Home	1.56
6111	2042	Draw	3.93
6112	2042	Away	3.89
6113	2043	Home	1.94
6114	2043	Draw	3.39
6115	2043	Away	4.41
6116	2044	Home	3.20
6117	2044	Draw	3.46
6118	2044	Away	4.16
6119	2045	Home	4.90
6120	2045	Draw	3.66
6121	2045	Away	2.83
6122	2046	Home	3.37
6123	2046	Draw	3.00
6124	2046	Away	3.33
6125	2047	Home	3.31
6126	2047	Draw	2.98
6127	2047	Away	3.57
6128	2048	Home	2.71
6129	2048	Draw	3.28
6130	2048	Away	2.32
6131	2049	Home	2.51
6132	2049	Draw	3.84
6133	2049	Away	3.06
6134	2050	Home	4.86
6135	2050	Draw	3.31
6136	2050	Away	3.47
6137	2051	Home	2.12
6138	2051	Draw	3.25
6139	2051	Away	4.72
6140	2052	Home	1.75
6141	2052	Draw	3.56
6142	2052	Away	3.57
6143	2053	Home	3.71
6144	2053	Draw	2.80
6145	2053	Away	3.28
6146	2054	Home	2.56
6147	2054	Draw	3.38
6148	2054	Away	1.77
6149	2055	Home	3.22
6150	2055	Draw	2.93
6151	2055	Away	4.39
6152	2056	Home	4.69
6153	2056	Draw	3.68
6154	2056	Away	3.37
6155	2057	Home	1.49
6156	2057	Draw	3.84
6157	2057	Away	4.26
6158	2058	Home	3.12
6159	2058	Draw	3.62
6160	2058	Away	3.97
6161	2059	Home	4.18
6162	2059	Draw	3.08
6163	2059	Away	2.72
6164	2060	Home	3.32
6165	2060	Draw	3.06
6166	2060	Away	3.68
6167	2061	Home	2.64
6168	2061	Draw	2.86
6169	2061	Away	1.75
6170	2062	Home	3.78
6171	2062	Draw	3.81
6172	2062	Away	2.07
6173	2063	Home	4.15
6174	2063	Draw	3.26
6175	2063	Away	1.77
6176	2064	Home	3.27
6177	2064	Draw	3.43
6178	2064	Away	4.34
6179	2065	Home	2.36
6180	2065	Draw	3.00
6181	2065	Away	3.17
6182	2066	Home	3.97
6183	2066	Draw	3.06
6184	2066	Away	4.29
6185	2067	Home	4.08
6186	2067	Draw	3.61
6187	2067	Away	2.54
6188	2068	Home	2.97
6189	2068	Draw	3.47
6190	2068	Away	3.69
6191	2069	Home	2.23
6192	2069	Draw	3.08
6193	2069	Away	1.83
6194	2070	Home	3.83
6195	2070	Draw	2.91
6196	2070	Away	3.90
6197	2071	Home	3.72
6198	2071	Draw	3.79
6199	2071	Away	1.90
6200	2072	Home	4.31
6201	2072	Draw	3.50
6202	2072	Away	3.78
6203	2073	Home	3.56
6204	2073	Draw	3.41
6205	2073	Away	3.74
6206	2074	Home	3.83
6207	2074	Draw	3.77
6208	2074	Away	4.55
6209	2075	Home	2.39
6210	2075	Draw	3.40
6211	2075	Away	4.64
6212	2076	Home	4.01
6213	2076	Draw	2.83
6214	2076	Away	4.45
6215	2077	Home	2.21
6216	2077	Draw	2.97
6217	2077	Away	1.66
6218	2078	Home	2.70
6219	2078	Draw	3.85
6220	2078	Away	2.28
6221	2079	Home	4.71
6222	2079	Draw	3.43
6223	2079	Away	3.63
6224	2080	Home	4.21
6225	2080	Draw	3.52
6226	2080	Away	2.97
6227	2081	Home	3.76
6228	2081	Draw	3.39
6229	2081	Away	3.18
6230	2082	Home	3.07
6231	2082	Draw	3.04
6232	2082	Away	4.31
6233	2083	Home	3.87
6234	2083	Draw	3.35
6235	2083	Away	2.00
6236	2084	Home	2.43
6237	2084	Draw	3.52
6238	2084	Away	1.95
6239	2085	Home	3.03
6240	2085	Draw	3.83
6241	2085	Away	1.70
6242	2086	Home	3.22
6243	2086	Draw	3.34
6244	2086	Away	4.74
6245	2087	Home	3.12
6246	2087	Draw	3.86
6247	2087	Away	4.70
6248	2088	Home	2.57
6249	2088	Draw	3.03
6250	2088	Away	3.71
6251	2089	Home	1.89
6252	2089	Draw	3.99
6253	2089	Away	4.40
6254	2090	Home	1.57
6255	2090	Draw	3.45
6256	2090	Away	3.28
6257	2091	Home	1.88
6258	2091	Draw	3.31
6259	2091	Away	4.11
6260	2092	Home	2.58
6261	2092	Draw	3.75
6262	2092	Away	4.61
6263	2093	Home	3.49
6264	2093	Draw	3.66
6265	2093	Away	1.74
6266	2094	Home	2.16
6267	2094	Draw	3.64
6268	2094	Away	2.80
6269	2095	Home	4.11
6270	2095	Draw	3.26
6271	2095	Away	1.56
6272	2096	Home	2.49
6273	2096	Draw	3.04
6274	2096	Away	3.16
6275	2097	Home	2.53
6276	2097	Draw	2.98
6277	2097	Away	4.64
6278	2098	Home	3.96
6279	2098	Draw	2.95
6280	2098	Away	2.53
6281	2099	Home	1.58
6282	2099	Draw	3.89
6283	2099	Away	3.58
6284	2100	Home	4.70
6285	2100	Draw	3.71
6286	2100	Away	2.72
6287	2101	Home	3.18
6288	2101	Draw	3.84
6289	2101	Away	1.41
6290	2102	Home	4.76
6291	2102	Draw	3.60
6292	2102	Away	2.66
6293	2103	Home	1.65
6294	2103	Draw	3.98
6295	2103	Away	1.85
6296	2104	Home	1.63
6297	2104	Draw	3.38
6298	2104	Away	2.53
6299	2105	Home	4.88
6300	2105	Draw	3.91
6301	2105	Away	4.68
6302	2106	Home	1.76
6303	2106	Draw	3.11
6304	2106	Away	3.05
6305	2107	Home	2.99
6306	2107	Draw	3.60
6307	2107	Away	4.80
6308	2108	Home	1.42
6309	2108	Draw	3.82
6310	2108	Away	4.61
6311	2109	Home	3.52
6312	2109	Draw	3.79
6313	2109	Away	3.33
6314	2110	Home	2.22
6315	2110	Draw	3.60
6316	2110	Away	1.70
6317	2111	Home	2.80
6318	2111	Draw	3.07
6319	2111	Away	2.23
6320	2112	Home	4.44
6321	2112	Draw	3.70
6322	2112	Away	4.78
6323	2113	Home	3.17
6324	2113	Draw	2.81
6325	2113	Away	1.43
6326	2114	Home	2.71
6327	2114	Draw	3.37
6328	2114	Away	1.58
6329	2115	Home	4.09
6330	2115	Draw	3.57
6331	2115	Away	2.14
6332	2116	Home	1.82
6333	2116	Draw	3.82
6334	2116	Away	2.51
6335	2117	Home	2.95
6336	2117	Draw	2.99
6337	2117	Away	4.17
6338	2118	Home	2.61
6339	2118	Draw	3.74
6340	2118	Away	1.96
6341	2119	Home	4.84
6342	2119	Draw	3.34
6343	2119	Away	3.63
6344	2120	Home	3.54
6345	2120	Draw	3.40
6346	2120	Away	3.83
6347	2121	Home	3.96
6348	2121	Draw	3.77
6349	2121	Away	3.18
6350	2122	Home	3.92
6351	2122	Draw	3.04
6352	2122	Away	2.58
6353	2123	Home	1.87
6354	2123	Draw	3.00
6355	2123	Away	3.45
6356	2124	Home	4.77
6357	2124	Draw	2.82
6358	2124	Away	1.82
6359	2125	Home	4.51
6360	2125	Draw	3.19
6361	2125	Away	1.41
6362	2126	Home	2.18
6363	2126	Draw	3.05
6364	2126	Away	4.05
6365	2127	Home	2.07
6366	2127	Draw	2.89
6367	2127	Away	3.53
6368	2128	Home	4.34
6369	2128	Draw	3.97
6370	2128	Away	2.52
6371	2129	Home	3.22
6372	2129	Draw	3.40
6373	2129	Away	3.85
6374	2130	Home	3.36
6375	2130	Draw	3.41
6376	2130	Away	3.53
6377	2131	Home	4.57
6378	2131	Draw	3.37
6379	2131	Away	2.13
6380	2132	Home	2.42
6381	2132	Draw	3.60
6382	2132	Away	2.36
6383	2133	Home	1.45
6384	2133	Draw	3.08
6385	2133	Away	2.52
6386	2134	Home	2.46
6387	2134	Draw	3.76
6388	2134	Away	1.53
6389	2135	Home	1.94
6390	2135	Draw	3.61
6391	2135	Away	3.27
6392	2136	Home	1.95
6393	2136	Draw	3.51
6394	2136	Away	4.81
6395	2137	Home	3.21
6396	2137	Draw	3.42
6397	2137	Away	3.82
6398	2138	Home	1.90
6399	2138	Draw	3.71
6400	2138	Away	4.46
6401	2139	Home	2.48
6402	2139	Draw	2.96
6403	2139	Away	2.81
6404	2140	Home	1.41
6405	2140	Draw	3.17
6406	2140	Away	3.11
6407	2141	Home	3.78
6408	2141	Draw	3.36
6409	2141	Away	3.66
6410	2142	Home	4.42
6411	2142	Draw	3.84
6412	2142	Away	2.41
6413	2143	Home	1.86
6414	2143	Draw	3.01
6415	2143	Away	2.94
6416	2144	Home	1.65
6417	2144	Draw	3.09
6418	2144	Away	2.87
6419	2145	Home	1.74
6420	2145	Draw	3.41
6421	2145	Away	1.93
6422	2146	Home	1.89
6423	2146	Draw	3.34
6424	2146	Away	4.07
6425	2147	Home	2.93
6426	2147	Draw	3.52
6427	2147	Away	3.46
6428	2148	Home	4.88
6429	2148	Draw	3.77
6430	2148	Away	4.23
6431	2149	Home	1.63
6432	2149	Draw	3.49
6433	2149	Away	2.58
6434	2150	Home	1.61
6435	2150	Draw	3.31
6436	2150	Away	2.47
6437	2151	Home	2.03
6438	2151	Draw	2.90
6439	2151	Away	2.47
6440	2152	Home	3.90
6441	2152	Draw	3.78
6442	2152	Away	3.33
6443	2153	Home	3.11
6444	2153	Draw	3.89
6445	2153	Away	4.53
6446	2154	Home	4.40
6447	2154	Draw	3.74
6448	2154	Away	3.28
6449	2155	Home	3.68
6450	2155	Draw	3.83
6451	2155	Away	3.85
6452	2156	Home	2.05
6453	2156	Draw	3.38
6454	2156	Away	4.82
6455	2157	Home	2.48
6456	2157	Draw	3.02
6457	2157	Away	4.55
6458	2158	Home	3.89
6459	2158	Draw	3.48
6460	2158	Away	2.06
6461	2159	Home	3.45
6462	2159	Draw	3.43
6463	2159	Away	2.41
6464	2160	Home	3.10
6465	2160	Draw	3.34
6466	2160	Away	4.63
6467	2161	Home	3.36
6468	2161	Draw	3.45
6469	2161	Away	3.80
6470	2162	Home	3.40
6471	2162	Draw	3.44
6472	2162	Away	3.64
6473	2163	Home	1.88
6474	2163	Draw	3.12
6475	2163	Away	4.05
6476	2164	Home	2.97
6477	2164	Draw	2.91
6478	2164	Away	3.57
6479	2165	Home	2.93
6480	2165	Draw	3.67
6481	2165	Away	4.56
6482	2166	Home	4.31
6483	2166	Draw	3.82
6484	2166	Away	2.56
6485	2167	Home	3.95
6486	2167	Draw	3.32
6487	2167	Away	1.47
6488	2168	Home	3.16
6489	2168	Draw	3.02
6490	2168	Away	4.30
6491	2169	Home	2.06
6492	2169	Draw	3.03
6493	2169	Away	2.88
6494	2170	Home	4.14
6495	2170	Draw	3.70
6496	2170	Away	4.24
6497	2171	Home	3.59
6498	2171	Draw	3.67
6499	2171	Away	2.29
6500	2172	Home	1.80
6501	2172	Draw	3.36
6502	2172	Away	4.67
6503	2173	Home	3.84
6504	2173	Draw	2.95
6505	2173	Away	2.21
6506	2174	Home	4.12
6507	2174	Draw	2.93
6508	2174	Away	3.15
6509	2175	Home	4.01
6510	2175	Draw	3.95
6511	2175	Away	4.05
6512	2176	Home	4.75
6513	2176	Draw	3.26
6514	2176	Away	3.90
6515	2177	Home	4.48
6516	2177	Draw	3.07
6517	2177	Away	3.58
6518	2178	Home	4.13
6519	2178	Draw	2.80
6520	2178	Away	1.48
6521	2179	Home	1.67
6522	2179	Draw	2.99
6523	2179	Away	2.14
6524	2180	Home	1.41
6525	2180	Draw	3.00
6526	2180	Away	1.92
6527	2181	Home	1.76
6528	2181	Draw	3.21
6529	2181	Away	2.12
6530	2182	Home	4.10
6531	2182	Draw	3.16
6532	2182	Away	3.68
6533	2183	Home	4.62
6534	2183	Draw	3.60
6535	2183	Away	1.62
6536	2184	Home	2.04
6537	2184	Draw	3.16
6538	2184	Away	3.68
6539	2185	Home	2.04
6540	2185	Draw	3.99
6541	2185	Away	2.25
6542	2186	Home	1.46
6543	2186	Draw	3.08
6544	2186	Away	4.83
6545	2187	Home	3.62
6546	2187	Draw	3.67
6547	2187	Away	2.71
6548	2188	Home	4.62
6549	2188	Draw	3.85
6550	2188	Away	2.72
6551	2189	Home	3.13
6552	2189	Draw	2.85
6553	2189	Away	2.63
6554	2190	Home	2.43
6555	2190	Draw	3.89
6556	2190	Away	3.63
6557	2191	Home	4.19
6558	2191	Draw	3.73
6559	2191	Away	4.09
6560	2192	Home	2.84
6561	2192	Draw	3.80
6562	2192	Away	4.72
6563	2193	Home	2.18
6564	2193	Draw	3.20
6565	2193	Away	1.96
6566	2194	Home	4.37
6567	2194	Draw	3.20
6568	2194	Away	4.77
6569	2195	Home	4.58
6570	2195	Draw	3.06
6571	2195	Away	2.20
6572	2196	Home	4.68
6573	2196	Draw	3.51
6574	2196	Away	2.27
6575	2197	Home	3.45
6576	2197	Draw	3.84
6577	2197	Away	2.67
6578	2198	Home	2.59
6579	2198	Draw	3.56
6580	2198	Away	3.07
6581	2199	Home	4.74
6582	2199	Draw	3.75
6583	2199	Away	2.15
6584	2200	Home	3.96
6585	2200	Draw	3.22
6586	2200	Away	3.38
6587	2201	Home	4.09
6588	2201	Draw	3.28
6589	2201	Away	3.04
6590	2202	Home	1.63
6591	2202	Draw	3.52
6592	2202	Away	4.06
6593	2203	Home	4.14
6594	2203	Draw	3.27
6595	2203	Away	3.75
6596	2204	Home	4.39
6597	2204	Draw	3.49
6598	2204	Away	3.64
6599	2205	Home	3.09
6600	2205	Draw	3.83
6601	2205	Away	4.70
6602	2206	Home	1.87
6603	2206	Draw	3.56
6604	2206	Away	4.77
6605	2207	Home	4.21
6606	2207	Draw	3.84
6607	2207	Away	2.35
6608	2208	Home	3.94
6609	2208	Draw	3.04
6610	2208	Away	3.94
6611	2209	Home	2.54
6612	2209	Draw	3.67
6613	2209	Away	4.33
6614	2210	Home	1.68
6615	2210	Draw	3.51
6616	2210	Away	3.38
6617	2211	Home	2.52
6618	2211	Draw	3.53
6619	2211	Away	1.65
6620	2212	Home	3.22
6621	2212	Draw	3.22
6622	2212	Away	2.62
6623	2213	Home	2.13
6624	2213	Draw	3.00
6625	2213	Away	4.12
6626	2214	Home	4.88
6627	2214	Draw	3.46
6628	2214	Away	3.48
6629	2215	Home	1.75
6630	2215	Draw	3.99
6631	2215	Away	3.65
6632	2216	Home	3.03
6633	2216	Draw	3.03
6634	2216	Away	2.58
6635	2217	Home	2.27
6636	2217	Draw	3.61
6637	2217	Away	1.98
6638	2218	Home	3.61
6639	2218	Draw	3.62
6640	2218	Away	4.67
6641	2219	Home	3.52
6642	2219	Draw	3.26
6643	2219	Away	1.49
6644	2220	Home	4.67
6645	2220	Draw	3.66
6646	2220	Away	4.70
6647	2221	Home	4.64
6648	2221	Draw	3.16
6649	2221	Away	4.43
6650	2222	Home	4.16
6651	2222	Draw	3.27
6652	2222	Away	4.08
6653	2223	Home	4.08
6654	2223	Draw	3.28
6655	2223	Away	3.41
6656	2224	Home	3.57
6657	2224	Draw	3.37
6658	2224	Away	3.59
6659	2225	Home	4.02
6660	2225	Draw	3.77
6661	2225	Away	4.20
6662	2226	Home	4.05
6663	2226	Draw	2.86
6664	2226	Away	2.88
6665	2227	Home	4.43
6666	2227	Draw	3.18
6667	2227	Away	2.36
6668	2228	Home	3.81
6669	2228	Draw	3.70
6670	2228	Away	2.01
6671	2229	Home	4.09
6672	2229	Draw	3.40
6673	2229	Away	3.73
6674	2230	Home	2.56
6675	2230	Draw	3.52
6676	2230	Away	3.71
6677	2231	Home	2.92
6678	2231	Draw	3.71
6679	2231	Away	1.96
6680	2232	Home	1.44
6681	2232	Draw	2.88
6682	2232	Away	3.34
6683	2233	Home	4.46
6684	2233	Draw	2.96
6685	2233	Away	2.45
6686	2234	Home	2.35
6687	2234	Draw	3.16
6688	2234	Away	2.64
6689	2235	Home	2.49
6690	2235	Draw	2.81
6691	2235	Away	3.60
6692	2236	Home	3.76
6693	2236	Draw	3.31
6694	2236	Away	3.27
6695	2237	Home	4.23
6696	2237	Draw	3.40
6697	2237	Away	4.81
6698	2238	Home	3.38
6699	2238	Draw	3.61
6700	2238	Away	3.42
6701	2239	Home	3.68
6702	2239	Draw	3.19
6703	2239	Away	2.57
6704	2240	Home	3.49
6705	2240	Draw	2.89
6706	2240	Away	4.33
6707	2241	Home	3.43
6708	2241	Draw	3.25
6709	2241	Away	1.81
6710	2242	Home	2.69
6711	2242	Draw	3.63
6712	2242	Away	3.43
6713	2243	Home	3.35
6714	2243	Draw	3.57
6715	2243	Away	1.69
6716	2244	Home	4.15
6717	2244	Draw	3.09
6718	2244	Away	3.95
6719	2245	Home	2.32
6720	2245	Draw	3.62
6721	2245	Away	3.58
6722	2246	Home	3.12
6723	2246	Draw	3.08
6724	2246	Away	3.95
6725	2247	Home	4.66
6726	2247	Draw	3.50
6727	2247	Away	2.36
6728	2248	Home	4.11
6729	2248	Draw	3.53
6730	2248	Away	2.49
6731	2249	Home	3.56
6732	2249	Draw	3.54
6733	2249	Away	2.93
6734	2250	Home	4.44
6735	2250	Draw	3.86
6736	2250	Away	1.55
6737	2251	Home	2.89
6738	2251	Draw	3.14
6739	2251	Away	2.15
6740	2252	Home	1.99
6741	2252	Draw	3.37
6742	2252	Away	2.14
6743	2253	Home	1.66
6744	2253	Draw	3.09
6745	2253	Away	4.65
6746	2254	Home	2.01
6747	2254	Draw	3.56
6748	2254	Away	1.89
6749	2255	Home	3.92
6750	2255	Draw	3.49
6751	2255	Away	3.33
6752	2256	Home	1.99
6753	2256	Draw	3.97
6754	2256	Away	3.07
6755	2257	Home	4.24
6756	2257	Draw	3.98
6757	2257	Away	2.31
6758	2258	Home	1.74
6759	2258	Draw	2.83
6760	2258	Away	2.61
6761	2259	Home	2.72
6762	2259	Draw	2.98
6763	2259	Away	4.47
6764	2260	Home	2.64
6765	2260	Draw	3.93
6766	2260	Away	1.51
6767	2261	Home	3.72
6768	2261	Draw	3.91
6769	2261	Away	1.66
6770	2262	Home	3.95
6771	2262	Draw	3.95
6772	2262	Away	4.86
6773	2263	Home	4.51
6774	2263	Draw	2.97
6775	2263	Away	1.56
6776	2264	Home	4.38
6777	2264	Draw	3.15
6778	2264	Away	2.36
6779	2265	Home	2.55
6780	2265	Draw	3.16
6781	2265	Away	3.13
6782	2266	Home	4.03
6783	2266	Draw	3.22
6784	2266	Away	4.42
6785	2267	Home	4.74
6786	2267	Draw	3.55
6787	2267	Away	4.63
6788	2268	Home	1.74
6789	2268	Draw	3.28
6790	2268	Away	3.03
6791	2269	Home	2.10
6792	2269	Draw	3.82
6793	2269	Away	1.51
6794	2270	Home	2.57
6795	2270	Draw	3.61
6796	2270	Away	4.13
6797	2271	Home	2.87
6798	2271	Draw	3.23
6799	2271	Away	2.25
6800	2272	Home	2.49
6801	2272	Draw	3.51
6802	2272	Away	3.16
6803	2273	Home	4.44
6804	2273	Draw	3.41
6805	2273	Away	4.30
6806	2274	Home	3.62
6807	2274	Draw	2.95
6808	2274	Away	3.37
6809	2275	Home	3.98
6810	2275	Draw	3.01
6811	2275	Away	1.94
6812	2276	Home	2.90
6813	2276	Draw	3.64
6814	2276	Away	2.31
6815	2277	Home	2.13
6816	2277	Draw	3.42
6817	2277	Away	4.31
6818	2278	Home	3.91
6819	2278	Draw	3.66
6820	2278	Away	3.52
6821	2279	Home	4.76
6822	2279	Draw	3.58
6823	2279	Away	2.44
6824	2280	Home	3.09
6825	2280	Draw	3.85
6826	2280	Away	3.01
6827	2281	Home	4.08
6828	2281	Draw	3.67
6829	2281	Away	2.62
6830	2282	Home	2.25
6831	2282	Draw	3.01
6832	2282	Away	2.36
6833	2283	Home	4.28
6834	2283	Draw	2.99
6835	2283	Away	4.39
6836	2284	Home	4.47
6837	2284	Draw	2.98
6838	2284	Away	2.72
6839	2285	Home	2.57
6840	2285	Draw	3.20
6841	2285	Away	3.36
6842	2286	Home	4.86
6843	2286	Draw	2.91
6844	2286	Away	4.00
6845	2287	Home	4.45
6846	2287	Draw	3.82
6847	2287	Away	4.49
6848	2288	Home	2.18
6849	2288	Draw	3.78
6850	2288	Away	4.65
6851	2289	Home	3.93
6852	2289	Draw	2.94
6853	2289	Away	2.14
6854	2290	Home	4.66
6855	2290	Draw	3.08
6856	2290	Away	4.51
6857	2291	Home	2.83
6858	2291	Draw	3.97
6859	2291	Away	3.18
6860	2292	Home	3.95
6861	2292	Draw	3.64
6862	2292	Away	3.56
6863	2293	Home	3.41
6864	2293	Draw	2.86
6865	2293	Away	1.47
6866	2294	Home	3.15
6867	2294	Draw	3.21
6868	2294	Away	4.87
6869	2295	Home	2.71
6870	2295	Draw	3.25
6871	2295	Away	4.60
6872	2296	Home	4.61
6873	2296	Draw	3.65
6874	2296	Away	3.89
6875	2297	Home	2.49
6876	2297	Draw	2.81
6877	2297	Away	2.68
6878	2298	Home	4.80
6879	2298	Draw	3.74
6880	2298	Away	2.10
6881	2299	Home	2.40
6882	2299	Draw	3.43
6883	2299	Away	3.40
6884	2300	Home	3.71
6885	2300	Draw	3.63
6886	2300	Away	4.05
6887	2301	Home	3.80
6888	2301	Draw	3.05
6889	2301	Away	2.03
6890	2302	Home	3.98
6891	2302	Draw	3.71
6892	2302	Away	4.18
6893	2303	Home	4.17
6894	2303	Draw	2.81
6895	2303	Away	1.83
6896	2304	Home	3.97
6897	2304	Draw	3.86
6898	2304	Away	4.75
6899	2305	Home	1.40
6900	2305	Draw	3.51
6901	2305	Away	4.11
6902	2306	Home	3.14
6903	2306	Draw	2.88
6904	2306	Away	3.45
6905	2307	Home	3.30
6906	2307	Draw	3.69
6907	2307	Away	3.50
6908	2308	Home	3.87
6909	2308	Draw	3.05
6910	2308	Away	3.85
6911	2309	Home	4.44
6912	2309	Draw	3.21
6913	2309	Away	3.53
6914	2310	Home	4.21
6915	2310	Draw	3.70
6916	2310	Away	3.84
6917	2311	Home	3.95
6918	2311	Draw	3.74
6919	2311	Away	2.29
6920	2312	Home	3.37
6921	2312	Draw	3.58
6922	2312	Away	1.76
6923	2313	Home	2.60
6924	2313	Draw	2.88
6925	2313	Away	2.47
6926	2314	Home	2.39
6927	2314	Draw	3.53
6928	2314	Away	4.73
6929	2315	Home	4.88
6930	2315	Draw	2.91
6931	2315	Away	3.38
6932	2316	Home	3.20
6933	2316	Draw	3.36
6934	2316	Away	1.53
6935	2317	Home	3.99
6936	2317	Draw	2.99
6937	2317	Away	4.87
6938	2318	Home	3.04
6939	2318	Draw	3.56
6940	2318	Away	2.59
6941	2319	Home	2.70
6942	2319	Draw	3.43
6943	2319	Away	2.59
6944	2320	Home	3.46
6945	2320	Draw	3.39
6946	2320	Away	4.76
6947	2321	Home	2.01
6948	2321	Draw	3.49
6949	2321	Away	1.68
6950	2322	Home	3.17
6951	2322	Draw	3.11
6952	2322	Away	2.75
6953	2323	Home	1.76
6954	2323	Draw	3.28
6955	2323	Away	4.88
6956	2324	Home	4.53
6957	2324	Draw	2.98
6958	2324	Away	3.29
6959	2325	Home	3.63
6960	2325	Draw	3.66
6961	2325	Away	2.80
6962	2326	Home	4.07
6963	2326	Draw	3.61
6964	2326	Away	3.88
6965	2327	Home	2.81
6966	2327	Draw	3.16
6967	2327	Away	2.95
6968	2328	Home	3.07
6969	2328	Draw	3.41
6970	2328	Away	4.14
6971	2329	Home	2.56
6972	2329	Draw	3.82
6973	2329	Away	4.69
6974	2330	Home	2.50
6975	2330	Draw	3.42
6976	2330	Away	3.07
6977	2331	Home	4.39
6978	2331	Draw	3.11
6979	2331	Away	3.21
6980	2332	Home	2.99
6981	2332	Draw	3.08
6982	2332	Away	3.29
6983	2333	Home	3.36
6984	2333	Draw	3.49
6985	2333	Away	3.20
6986	2334	Home	1.81
6987	2334	Draw	3.02
6988	2334	Away	4.36
6989	2335	Home	3.36
6990	2335	Draw	3.32
6991	2335	Away	2.43
6992	2336	Home	2.52
6993	2336	Draw	3.97
6994	2336	Away	2.06
6995	2337	Home	2.29
6996	2337	Draw	2.99
6997	2337	Away	3.96
6998	2338	Home	2.51
6999	2338	Draw	3.33
7000	2338	Away	4.30
7001	2339	Home	2.89
7002	2339	Draw	3.71
7003	2339	Away	3.94
7004	2340	Home	2.82
7005	2340	Draw	3.82
7006	2340	Away	3.11
7007	2341	Home	1.55
7008	2341	Draw	3.09
7009	2341	Away	4.75
7010	2342	Home	1.88
7011	2342	Draw	3.25
7012	2342	Away	2.34
7013	2343	Home	4.58
7014	2343	Draw	3.53
7015	2343	Away	3.18
7016	2344	Home	1.46
7017	2344	Draw	3.08
7018	2344	Away	1.75
7019	2345	Home	3.51
7020	2345	Draw	3.42
7021	2345	Away	1.57
7022	2346	Home	1.92
7023	2346	Draw	2.97
7024	2346	Away	4.33
7025	2347	Home	3.64
7026	2347	Draw	3.32
7027	2347	Away	4.71
7028	2348	Home	2.91
7029	2348	Draw	3.90
7030	2348	Away	2.60
7031	2349	Home	3.91
7032	2349	Draw	3.91
7033	2349	Away	3.56
7034	2350	Home	2.43
7035	2350	Draw	3.36
7036	2350	Away	2.24
7037	2351	Home	4.81
7038	2351	Draw	3.66
7039	2351	Away	3.39
7040	2352	Home	4.14
7041	2352	Draw	3.45
7042	2352	Away	4.22
7043	2353	Home	4.87
7044	2353	Draw	2.96
7045	2353	Away	4.56
7046	2354	Home	2.78
7047	2354	Draw	2.85
7048	2354	Away	1.86
7049	2355	Home	2.77
7050	2355	Draw	2.99
7051	2355	Away	4.47
7052	2356	Home	1.57
7053	2356	Draw	3.99
7054	2356	Away	4.18
7055	2357	Home	3.44
7056	2357	Draw	3.67
7057	2357	Away	2.11
7058	2358	Home	2.83
7059	2358	Draw	3.39
7060	2358	Away	3.45
7061	2359	Home	3.50
7062	2359	Draw	3.17
7063	2359	Away	3.48
7064	2360	Home	2.62
7065	2360	Draw	3.46
7066	2360	Away	4.38
7067	2361	Home	1.70
7068	2361	Draw	3.68
7069	2361	Away	3.13
7070	2362	Home	3.81
7071	2362	Draw	3.17
7072	2362	Away	2.72
7073	2363	Home	2.68
7074	2363	Draw	3.39
7075	2363	Away	4.19
7076	2364	Home	2.68
7077	2364	Draw	3.38
7078	2364	Away	2.08
7079	2365	Home	1.44
7080	2365	Draw	3.50
7081	2365	Away	2.67
7082	2366	Home	2.47
7083	2366	Draw	3.56
7084	2366	Away	3.99
7085	2367	Home	2.39
7086	2367	Draw	2.88
7087	2367	Away	3.28
7088	2368	Home	4.35
7089	2368	Draw	3.98
7090	2368	Away	1.53
7091	2369	Home	2.54
7092	2369	Draw	3.05
7093	2369	Away	2.89
7094	2370	Home	2.27
7095	2370	Draw	2.82
7096	2370	Away	1.91
7097	2371	Home	1.63
7098	2371	Draw	3.47
7099	2371	Away	2.97
7100	2372	Home	2.82
7101	2372	Draw	3.12
7102	2372	Away	3.27
7103	2373	Home	4.31
7104	2373	Draw	3.49
7105	2373	Away	2.42
7106	2374	Home	4.24
7107	2374	Draw	3.00
7108	2374	Away	2.12
7109	2375	Home	2.30
7110	2375	Draw	3.08
7111	2375	Away	1.79
7112	2376	Home	2.26
7113	2376	Draw	3.64
7114	2376	Away	3.42
7115	2377	Home	2.88
7116	2377	Draw	2.92
7117	2377	Away	4.25
7118	2378	Home	2.29
7119	2378	Draw	3.55
7120	2378	Away	4.30
7121	2379	Home	4.00
7122	2379	Draw	3.30
7123	2379	Away	2.17
7124	2380	Home	1.67
7125	2380	Draw	3.24
7126	2380	Away	4.62
7127	2381	Home	3.49
7128	2381	Draw	2.96
7129	2381	Away	1.41
7130	2382	Home	3.54
7131	2382	Draw	3.41
7132	2382	Away	3.80
7133	2383	Home	2.98
7134	2383	Draw	3.37
7135	2383	Away	2.94
7136	2384	Home	4.79
7137	2384	Draw	3.37
7138	2384	Away	3.04
7139	2385	Home	4.60
7140	2385	Draw	3.63
7141	2385	Away	4.89
7142	2386	Home	3.49
7143	2386	Draw	3.55
7144	2386	Away	2.10
7145	2387	Home	3.49
7146	2387	Draw	3.71
7147	2387	Away	3.30
7148	2388	Home	1.47
7149	2388	Draw	2.88
7150	2388	Away	1.82
7151	2389	Home	3.53
7152	2389	Draw	3.76
7153	2389	Away	3.53
7154	2390	Home	2.94
7155	2390	Draw	2.97
7156	2390	Away	1.84
7157	2391	Home	3.51
7158	2391	Draw	2.86
7159	2391	Away	2.11
7160	2392	Home	3.97
7161	2392	Draw	2.88
7162	2392	Away	1.74
7163	2393	Home	2.88
7164	2393	Draw	3.73
7165	2393	Away	2.16
7166	2394	Home	4.31
7167	2394	Draw	3.45
7168	2394	Away	2.24
7169	2395	Home	2.40
7170	2395	Draw	3.75
7171	2395	Away	3.16
7172	2396	Home	3.16
7173	2396	Draw	4.00
7174	2396	Away	1.56
7175	2397	Home	4.06
7176	2397	Draw	3.37
7177	2397	Away	4.66
7178	2398	Home	4.36
7179	2398	Draw	3.36
7180	2398	Away	2.05
7181	2399	Home	3.65
7182	2399	Draw	3.55
7183	2399	Away	2.99
7184	2400	Home	4.04
7185	2400	Draw	3.24
7186	2400	Away	3.02
7187	2401	Home	3.91
7188	2401	Draw	3.78
7189	2401	Away	2.72
7190	2402	Home	1.60
7191	2402	Draw	3.30
7192	2402	Away	3.77
7193	2403	Home	2.60
7194	2403	Draw	3.19
7195	2403	Away	3.21
7196	2404	Home	1.63
7197	2404	Draw	3.92
7198	2404	Away	1.51
7199	2405	Home	2.55
7200	2405	Draw	2.92
7201	2405	Away	2.21
7202	2406	Home	2.46
7203	2406	Draw	3.44
7204	2406	Away	3.90
7205	2407	Home	1.70
7206	2407	Draw	2.92
7207	2407	Away	4.07
7208	2408	Home	4.49
7209	2408	Draw	3.40
7210	2408	Away	1.70
7211	2409	Home	3.33
7212	2409	Draw	3.90
7213	2409	Away	3.80
7214	2410	Home	3.91
7215	2410	Draw	3.76
7216	2410	Away	2.91
7217	2411	Home	4.32
7218	2411	Draw	3.46
7219	2411	Away	2.66
7220	2412	Home	3.52
7221	2412	Draw	3.10
7222	2412	Away	1.70
7223	2413	Home	4.56
7224	2413	Draw	3.00
7225	2413	Away	2.63
7226	2414	Home	3.62
7227	2414	Draw	3.71
7228	2414	Away	2.04
7229	2415	Home	2.39
7230	2415	Draw	3.01
7231	2415	Away	1.41
7232	2416	Home	1.79
7233	2416	Draw	3.11
7234	2416	Away	3.71
7235	2417	Home	1.64
7236	2417	Draw	3.75
7237	2417	Away	4.34
7238	2418	Home	4.33
7239	2418	Draw	3.90
7240	2418	Away	4.17
7241	2419	Home	3.48
7242	2419	Draw	3.48
7243	2419	Away	1.90
7244	2420	Home	1.74
7245	2420	Draw	3.24
7246	2420	Away	3.20
7247	2421	Home	2.53
7248	2421	Draw	3.17
7249	2421	Away	3.16
7250	2422	Home	3.69
7251	2422	Draw	3.50
7252	2422	Away	2.02
7253	2423	Home	4.62
7254	2423	Draw	2.99
7255	2423	Away	1.69
7256	2424	Home	3.23
7257	2424	Draw	3.23
7258	2424	Away	3.97
7259	2425	Home	3.13
7260	2425	Draw	3.44
7261	2425	Away	2.13
7262	2426	Home	2.66
7263	2426	Draw	3.36
7264	2426	Away	2.72
7265	2427	Home	2.85
7266	2427	Draw	3.79
7267	2427	Away	2.53
7268	2428	Home	2.33
7269	2428	Draw	3.31
7270	2428	Away	3.10
7271	2429	Home	1.47
7272	2429	Draw	3.83
7273	2429	Away	3.50
7274	2430	Home	2.79
7275	2430	Draw	3.09
7276	2430	Away	2.82
7277	2431	Home	3.44
7278	2431	Draw	3.14
7279	2431	Away	4.32
7280	2432	Home	3.49
7281	2432	Draw	3.73
7282	2432	Away	3.66
7283	2433	Home	2.34
7284	2433	Draw	3.98
7285	2433	Away	4.17
7286	2434	Home	3.31
7287	2434	Draw	3.52
7288	2434	Away	4.52
7289	2435	Home	2.56
7290	2435	Draw	3.95
7291	2435	Away	3.23
7292	2436	Home	3.32
7293	2436	Draw	3.92
7294	2436	Away	2.45
7295	2437	Home	4.50
7296	2437	Draw	3.06
7297	2437	Away	2.41
7298	2438	Home	4.39
7299	2438	Draw	2.95
7300	2438	Away	3.73
7301	2439	Home	4.23
7302	2439	Draw	3.50
7303	2439	Away	3.28
7304	2440	Home	2.40
7305	2440	Draw	3.60
7306	2440	Away	2.58
7307	2441	Home	3.10
7308	2441	Draw	3.95
7309	2441	Away	2.22
7310	2442	Home	4.24
7311	2442	Draw	3.50
7312	2442	Away	4.70
7313	2443	Home	1.51
7314	2443	Draw	3.55
7315	2443	Away	2.50
7316	2444	Home	1.73
7317	2444	Draw	2.88
7318	2444	Away	4.57
7319	2445	Home	3.88
7320	2445	Draw	2.89
7321	2445	Away	2.38
7322	2446	Home	3.64
7323	2446	Draw	2.93
7324	2446	Away	1.92
7325	2447	Home	1.64
7326	2447	Draw	3.31
7327	2447	Away	4.15
7328	2448	Home	4.66
7329	2448	Draw	3.41
7330	2448	Away	4.18
7331	2449	Home	3.12
7332	2449	Draw	3.08
7333	2449	Away	2.80
7334	2450	Home	1.41
7335	2450	Draw	3.89
7336	2450	Away	1.88
7337	2451	Home	4.74
7338	2451	Draw	3.47
7339	2451	Away	1.54
7340	2452	Home	4.70
7341	2452	Draw	3.63
7342	2452	Away	3.42
7343	2453	Home	4.85
7344	2453	Draw	3.45
7345	2453	Away	4.20
7346	2454	Home	4.59
7347	2454	Draw	2.81
7348	2454	Away	3.37
7349	2455	Home	4.77
7350	2455	Draw	3.96
7351	2455	Away	1.64
7352	2456	Home	3.80
7353	2456	Draw	3.63
7354	2456	Away	2.37
7355	2457	Home	2.52
7356	2457	Draw	2.87
7357	2457	Away	2.61
7358	2458	Home	1.43
7359	2458	Draw	2.97
7360	2458	Away	4.13
7361	2459	Home	4.46
7362	2459	Draw	3.16
7363	2459	Away	3.96
7364	2460	Home	1.79
7365	2460	Draw	3.83
7366	2460	Away	3.71
7367	2461	Home	2.90
7368	2461	Draw	3.40
7369	2461	Away	3.91
7370	2462	Home	2.20
7371	2462	Draw	3.08
7372	2462	Away	3.65
7373	2463	Home	1.42
7374	2463	Draw	3.17
7375	2463	Away	1.47
7376	2464	Home	4.24
7377	2464	Draw	2.86
7378	2464	Away	4.46
7379	2465	Home	1.94
7380	2465	Draw	3.85
7381	2465	Away	4.75
7382	2466	Home	2.02
7383	2466	Draw	3.63
7384	2466	Away	4.27
7385	2467	Home	2.32
7386	2467	Draw	2.91
7387	2467	Away	4.12
7388	2468	Home	4.84
7389	2468	Draw	3.58
7390	2468	Away	3.90
7391	2469	Home	4.06
7392	2469	Draw	3.41
7393	2469	Away	2.84
7394	2470	Home	3.22
7395	2470	Draw	3.11
7396	2470	Away	2.42
7397	2471	Home	3.80
7398	2471	Draw	3.72
7399	2471	Away	4.01
7400	2472	Home	2.98
7401	2472	Draw	2.95
7402	2472	Away	3.03
7403	2473	Home	3.15
7404	2473	Draw	3.16
7405	2473	Away	2.93
7406	2474	Home	4.52
7407	2474	Draw	3.43
7408	2474	Away	4.25
7409	2475	Home	4.31
7410	2475	Draw	3.33
7411	2475	Away	2.13
7412	2476	Home	2.95
7413	2476	Draw	3.20
7414	2476	Away	1.65
7415	2477	Home	2.68
7416	2477	Draw	2.91
7417	2477	Away	3.16
7418	2478	Home	2.09
7419	2478	Draw	3.17
7420	2478	Away	3.29
7421	2479	Home	4.74
7422	2479	Draw	3.45
7423	2479	Away	2.06
7424	2480	Home	2.80
7425	2480	Draw	2.90
7426	2480	Away	3.42
7427	2481	Home	1.50
7428	2481	Draw	3.11
7429	2481	Away	2.29
7430	2482	Home	2.70
7431	2482	Draw	3.20
7432	2482	Away	3.32
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (key, value, updated_at) FROM stdin;
allsports_api_key	f1a65851488a136ab10525b18633a6015d8b9c3bd6131a5aceb649462173a5cf	2026-06-08 08:19:18.502305+00
last_sync	2026-06-08T08:41:59.524Z	2026-06-08 08:41:59.524+00
sync_status	idle	2026-06-08 08:41:59.527+00
sync_summary	0 imported, 2494 updated, 0 errors out of 2494 total	2026-06-08 08:41:59.53+00
\.


--
-- Data for Name: sports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sports (id, name, icon) FROM stdin;
1	Football	football
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teams (id, name, logo, external_id) FROM stdin;
40	Orebro	https://apiv2.allsportsapi.com/logo/7358_orebro.jpg	7358
31	Sogndal 2	https://apiv2.allsportsapi.com/logo/10954_sogndal-ii.jpg	10954
18	Uruguay	https://apiv2.allsportsapi.com/logo/539_uruguay.jpg	539
318	Hafnarfjordur	https://apiv2.allsportsapi.com/logo/255_fh.jpg	255
75	Real Monarchs	https://apiv2.allsportsapi.com/logo/7941_real-monarchs.jpg	7941
77	Ogre United	https://apiv2.allsportsapi.com/logo/25115_ogre-united.jpg	25115
79	IFK Lulea	https://apiv2.allsportsapi.com/logo/8308_ifk-lule.jpg	8308
24	Shelbourne	https://apiv2.allsportsapi.com/logo/4760_shelbourne.jpg	4760
21	Austria	https://apiv2.allsportsapi.com/logo/9_austria.jpg	9
33	Asane 2	https://apiv2.allsportsapi.com/logo/34289_sane-ii.jpg	34289
45	Samtredia	https://apiv2.allsportsapi.com/logo/3910_samtredia.jpg	3910
44	Bolnisi	https://apiv2.allsportsapi.com/logo/3893_sioni.jpg	3893
74	Tacoma Defiance	https://apiv2.allsportsapi.com/logo/7939_tacoma-defiance.jpg	7939
37	Flekkeroy	https://apiv2.allsportsapi.com/logo/5694_fly-flekkery.jpg	5694
41	Sandviken	https://apiv2.allsportsapi.com/logo/7356_sandviken.jpg	7356
50	Merani Martvili	https://apiv2.allsportsapi.com/logo/3895_merani-martvili.jpg	3895
53	Dusheti	https://apiv2.allsportsapi.com/logo/8777_aragvi-dusheti.jpg	8777
58	Torpedo Kutaisi	https://apiv2.allsportsapi.com/logo/3908_torpedo-kutaisi.jpg	3908
51	Gori	https://apiv2.allsportsapi.com/logo/8754_gori.jpg	8754
49	Shturmi	https://apiv2.allsportsapi.com/logo/8773_shturmi.jpg	8773
17	Egypt	https://apiv2.allsportsapi.com/logo/716_egypt.jpg	716
59	Spaeri	https://apiv2.allsportsapi.com/logo/8771_spaeri.jpg	8771
48	Kolkheti 1913	https://apiv2.allsportsapi.com/logo/8767_kolkheti-poti.jpg	8767
78	Boden	https://apiv2.allsportsapi.com/logo/7362_boden.jpg	7362
66	New England Revolution II	https://apiv2.allsportsapi.com/logo/11092_new-england-ii.jpg	11092
16	New Zealand	https://apiv2.allsportsapi.com/logo/527_new-zealand.jpg	527
1050	Playford Patriots	https://apiv2.allsportsapi.com/logo/19214_playford-city-patriots.jpg	19214
208	Viking 2	https://apiv2.allsportsapi.com/logo/10945_viking-ii.jpg	10945
38	Oddevold	https://apiv2.allsportsapi.com/logo/8336_oddevold.jpg	8336
52	Telavi	https://apiv2.allsportsapi.com/logo/3907_telavi.jpg	3907
36	Odd 2	https://apiv2.allsportsapi.com/logo/8300_odd-ii.jpg	8300
80	Elva	https://apiv2.allsportsapi.com/logo/3462_elva.jpg	3462
46	FC Gareji Sagarejo	https://apiv2.allsportsapi.com/logo/3899_gareji.jpg	3899
54	KR Reykjavik	https://apiv2.allsportsapi.com/logo/4698_kr.jpg	4698
81	Flora U21	https://apiv2.allsportsapi.com/logo/3458_flora-ii.jpg	3458
27	Derry City	https://apiv2.allsportsapi.com/logo/4764_derry-city.jpg	4764
30	Fana	https://apiv2.allsportsapi.com/logo/10953_fana.jpg	10953
20	Argentina	https://apiv2.allsportsapi.com/logo/536_argentina.jpg	536
57	Rustavi	https://apiv2.allsportsapi.com/logo/3901_rustavi.jpg	3901
43	Landskrona	https://apiv2.allsportsapi.com/logo/7336_landskrona.jpg	7336
35	Madla IL	https://apiv2.allsportsapi.com/logo/5679_madla.jpg	5679
71	Philadelphia Union II	https://apiv2.allsportsapi.com/logo/11311_philadelphia-union-ii.jpg	11311
29	Ranheim 2	https://apiv2.allsportsapi.com/logo/10963_ranheim-ii.jpg	10963
68	New York Red Bulls II	https://apiv2.allsportsapi.com/logo/7923_new-york-rb-ii.jpg	7923
64	Columbus Crew 2	https://apiv2.allsportsapi.com/logo/24907_columbus-crew-ii.jpg	24907
83	Viimsi JK	https://apiv2.allsportsapi.com/logo/9040_viimsi.jpg	9040
47	Odishi 1919	https://apiv2.allsportsapi.com/logo/8758_odishi-1919.jpg	8758
61	Nykopings	https://apiv2.allsportsapi.com/logo/7379_nykoping.jpg	7379
69	Toronto FC II	https://apiv2.allsportsapi.com/logo/11098_toronto-ii.jpg	11098
23	Iraq	https://apiv2.allsportsapi.com/logo/642_iraq.jpg	642
22	France	https://apiv2.allsportsapi.com/logo/22_france.jpg	22
42	Varberg	https://apiv2.allsportsapi.com/logo/7407_varberg.jpg	7407
67	Chicago Fire II	\N	42801
62	New York City II	https://apiv2.allsportsapi.com/logo/24840_new-york-city-ii.jpg	24840
55	Akranes	https://apiv2.allsportsapi.com/logo/4704_ia.jpg	4704
687	Mes Shahr Babak	https://apiv2.allsportsapi.com/logo/18796_mes-shahr-e-babak.jpg	18796
65	Atlanta United 2	https://apiv2.allsportsapi.com/logo/7918_atlanta-united-ii.jpg	7918
28	Aalesund 2	https://apiv2.allsportsapi.com/logo/10966_aalesund-ii.jpg	10966
34	Haugesund 2	https://apiv2.allsportsapi.com/logo/24120_haugesund-ii.jpg	24120
39	Ljungskile	https://apiv2.allsportsapi.com/logo/8316_ljungskile.jpg	8316
76	RFS	https://apiv2.allsportsapi.com/logo/5200_rgas-fs.jpg	5200
70	Orlando City B	https://apiv2.allsportsapi.com/logo/16850_orlando-city-b.jpg	16850
82	Maardu	https://apiv2.allsportsapi.com/logo/3460_maardu.jpg	3460
63	Chattanooga	https://apiv2.allsportsapi.com/logo/8395_chattanooga.jpg	8395
84	Legion	https://apiv2.allsportsapi.com/logo/3471_legion.jpg	3471
56	Dila Gori	https://apiv2.allsportsapi.com/logo/3903_dila.jpg	3903
73	Sporting Kansas City II	https://apiv2.allsportsapi.com/logo/7937_sporting-kc-ii.jpg	7937
72	Austin FC II	https://apiv2.allsportsapi.com/logo/31397_austin-ii.jpg	31397
32	Forde	https://apiv2.allsportsapi.com/logo/15549_frde.jpg	15549
60	Sleipner	https://apiv2.allsportsapi.com/logo/7400_sleipner.jpg	7400
1021	Hegelmann Litauen 2	https://apiv2.allsportsapi.com/logo/34806_hegelmann-ii.jpg	34806
103	CISA	https://apiv2.allsportsapi.com/logo/25047_colorado-isa.jpg	25047
148	CRB	https://apiv2.allsportsapi.com/logo/1744_crb.jpg	1744
95	Hegelmann	https://apiv2.allsportsapi.com/logo/5256_hegelmann.jpg	5256
98	Sueno	https://apiv2.allsportsapi.com/logo/34755_sueno.jpg	34755
106	Annapolis Blues	https://apiv2.allsportsapi.com/logo/36906_annapolis-blues.jpg	36906
109	Ethio Electric	https://apiv2.allsportsapi.com/logo/27530_mebrat-hayl.jpg	27530
111	Sheger Ketema	\N	41509
89	Narva U21	https://apiv2.allsportsapi.com/logo/36031_trans-ii.jpg	36031
141	Kairat Almaty	https://apiv2.allsportsapi.com/logo/245_kairat.jpg	245
129	Curacao	https://apiv2.allsportsapi.com/logo/520_curacao.jpg	520
119	Nacional Potosi	https://apiv2.allsportsapi.com/logo/1646_nacional-potosi.jpg	1646
1254	Midtjylland	https://apiv2.allsportsapi.com/logo/87_midtjylland.jpg	87
104	AMSG FC	https://apiv2.allsportsapi.com/logo/34760_amsg.jpg	34760
123	Valmiera	https://apiv2.allsportsapi.com/logo/5196_valmiera.jpg	5196
134	Spain	https://apiv2.allsportsapi.com/logo/19_spain.jpg	19
151	Operario-PR	https://apiv2.allsportsapi.com/logo/1742_operario-pr.jpg	1742
124	Torpedo Moscow	https://apiv2.allsportsapi.com/logo/6268_torpedo-moskva.jpg	6268
101	San Antonio FC 2	\N	42501
144	Avai	https://apiv2.allsportsapi.com/logo/1743_avai.jpg	1743
110	Dire Dawa	https://apiv2.allsportsapi.com/logo/11589_dire-dawa-kenema.jpg	11589
142	Okzhetpes	https://apiv2.allsportsapi.com/logo/11637_okzhetpes.jpg	11637
149	Fortaleza	https://apiv2.allsportsapi.com/logo/2018_fortaleza.jpg	2018
93	Brunswick City	https://apiv2.allsportsapi.com/logo/19202_brunswick-city.jpg	19202
131	Japan	https://apiv2.allsportsapi.com/logo/540_japan.jpg	540
128	Ecuador	https://apiv2.allsportsapi.com/logo/541_ecuador.jpg	541
117	Independiente	https://apiv2.allsportsapi.com/logo/1644_independiente.jpg	1644
126	U. Cluj	https://apiv2.allsportsapi.com/logo/6175_fc-universitatea-cluj.jpg	6175
127	Mura	https://apiv2.allsportsapi.com/logo/186_mura.jpg	186
116	Real Oruro	https://apiv2.allsportsapi.com/logo/27850_real-oruro.jpg	27850
87	Johvi Phoenix	\N	8946
158	FC Minsk	https://apiv2.allsportsapi.com/logo/1342_minsk.jpg	1342
135	Saudi Arabia	https://apiv2.allsportsapi.com/logo/647_saudi-arabia.jpg	647
935	Louisville City 2	\N	42499
108	Welayta Dicha	https://apiv2.allsportsapi.com/logo/11590_dicha-sc.jpg	11590
102	Albion Colorado	https://apiv2.allsportsapi.com/logo/34766_albion-colorado.jpg	34766
121	Dalstorps	https://apiv2.allsportsapi.com/logo/8368_dalstorps.jpg	8368
96	West Seattle Junction	https://apiv2.allsportsapi.com/logo/34765_west-seattle-junction.jpg	34765
92	Melbourne Victory U21	https://apiv2.allsportsapi.com/logo/34235_melbourne-victory-ii.jpg	34235
86	Levadia U19	https://apiv2.allsportsapi.com/logo/18649_levadia-u19.jpg	18649
113	Tsirang	https://apiv2.allsportsapi.com/logo/31655_tsirang.jpg	31655
118	Oriente Petrolero	https://apiv2.allsportsapi.com/logo/1652_oriente-petrolero.jpg	1652
161	Din. Minsk	https://apiv2.allsportsapi.com/logo/247_dinamo-minsk.jpg	247
137	FC Astana	https://apiv2.allsportsapi.com/logo/208_astana.jpg	208
146	Ceara	https://apiv2.allsportsapi.com/logo/2016_ceara.jpg	2016
138	Atyrau	https://apiv2.allsportsapi.com/logo/5113_atyrau.jpg	5113
139	Yelimay Semey	https://apiv2.allsportsapi.com/logo/30996_yelimay-semey.jpg	30996
94	Riteriai	https://apiv2.allsportsapi.com/logo/214_riteriai.jpg	214
145	Cuiaba	https://apiv2.allsportsapi.com/logo/1738_cuiaba.jpg	1738
155	Nautico	https://apiv2.allsportsapi.com/logo/1750_nautico-fc.jpg	1750
150	Goias	https://apiv2.allsportsapi.com/logo/1938_goias.jpg	1938
112	Thimphu FC	\N	18223
143	Tobol	https://apiv2.allsportsapi.com/logo/5105_tobol-kostanay.jpg	5105
160	Neman	https://apiv2.allsportsapi.com/logo/1339_neman-grodno.jpg	1339
153	Juventude	https://apiv2.allsportsapi.com/logo/1737_juventude.jpg	1737
152	Sao Bernardo	https://apiv2.allsportsapi.com/logo/1916_sao-bernardo-fc.jpg	1916
120	Landvetter	https://apiv2.allsportsapi.com/logo/16439_landvetter-is.jpg	16439
100	AHFC Royals	https://apiv2.allsportsapi.com/logo/7858_ahfc-royals.jpg	7858
140	Kyzylzhar	https://apiv2.allsportsapi.com/logo/5108_kyzyl-zhar.jpg	5108
133	Iran	https://apiv2.allsportsapi.com/logo/644_ir-iran.jpg	644
122	FK Smiltene	https://apiv2.allsportsapi.com/logo/5194_smiltene.jpg	5194
156	BATE	https://apiv2.allsportsapi.com/logo/1335_bate.jpg	1335
157	Arsenal Dzerzhinsk	https://apiv2.allsportsapi.com/logo/1348_arsenal-fc.jpg	1348
162	Temperley	https://apiv2.allsportsapi.com/logo/929_temperley.jpg	929
90	Tulevik	https://apiv2.allsportsapi.com/logo/3468_tulevik.jpg	3468
97	Ballard	https://apiv2.allsportsapi.com/logo/25041_ballard.jpg	25041
125	Ulyanovsk	https://apiv2.allsportsapi.com/logo/6251_volga-ulyanovsk.jpg	6251
115	U. Espanola	https://apiv2.allsportsapi.com/logo/578_union-espanola.jpg	578
91	Tammeka U21	https://apiv2.allsportsapi.com/logo/3461_tammeka-ii.jpg	3461
159	ML Vitebsk	https://apiv2.allsportsapi.com/logo/8518_ml-vitebsk.jpg	8518
136	Aktobe	https://apiv2.allsportsapi.com/logo/5114_aktobe.jpg	5114
147	Botafogo SP	https://apiv2.allsportsapi.com/logo/1753_botafogo-sp.jpg	1753
105	City SC	\N	39586
132	Belgium	https://apiv2.allsportsapi.com/logo/6_belgium.jpg	6
154	Vila Nova FC	https://apiv2.allsportsapi.com/logo/1783_vila-nova.jpg	1783
99	St. Croix	https://apiv2.allsportsapi.com/logo/25033_st.-croix.jpg	25033
182	Brooklyn	\N	42033
189	El Paso	https://apiv2.allsportsapi.com/logo/7938_el-paso-locomotive.jpg	7938
168	Corpus Christi FC	https://apiv2.allsportsapi.com/logo/7860_corpus-christi.jpg	7860
179	Charlotte Independ.	https://apiv2.allsportsapi.com/logo/7934_charlotte-independence.jpg	7934
196	Las Vegas Lights	https://apiv2.allsportsapi.com/logo/7944_las-vegas-lights.jpg	7944
192	Sacramento Republic	https://apiv2.allsportsapi.com/logo/7922_sacramento-republic.jpg	7922
210	Floya	https://apiv2.allsportsapi.com/logo/5636_flya.jpg	5636
195	Charleston	https://apiv2.allsportsapi.com/logo/7940_charleston-battery.jpg	7940
188	Monterey Bay	https://apiv2.allsportsapi.com/logo/23976_monterey-bay.jpg	23976
193	New Mexico	https://apiv2.allsportsapi.com/logo/7930_new-mexico-united.jpg	7930
176	Spokane Velocity	https://apiv2.allsportsapi.com/logo/34157_spokane-velocity.jpg	34157
1085	Newcastle Croatia	\N	42816
211	Stromsgodset 2	https://apiv2.allsportsapi.com/logo/10942_strmsgodset-ii.jpg	10942
1298	Slovan Bratislava B	https://apiv2.allsportsapi.com/logo/8955_slovan-bratislava-ii.jpg	8955
209	Staal Jorpeland	https://apiv2.allsportsapi.com/logo/10948_staal-jrpeland.jpg	10948
180	Birmingham	https://apiv2.allsportsapi.com/logo/7927_birmingham-legion.jpg	7927
181	Loudoun	https://apiv2.allsportsapi.com/logo/7936_loudoun-united.jpg	7936
177	One Knoxville	https://apiv2.allsportsapi.com/logo/25031_one-knoxville.jpg	25031
187	Pittsburgh	https://apiv2.allsportsapi.com/logo/7945_pittsburgh-riverhounds.jpg	7945
174	Richmond Kickers	https://apiv2.allsportsapi.com/logo/7948_richmond-kickers.jpg	7948
190	Phoenix Rising	https://apiv2.allsportsapi.com/logo/7925_phoenix-rising.jpg	7925
172	Greenville	https://apiv2.allsportsapi.com/logo/8390_greenville-triumph.jpg	8390
171	New York Cosmos	https://apiv2.allsportsapi.com/logo/9254_ny-cosmos.jpg	9254
184	FC Tulsa	https://apiv2.allsportsapi.com/logo/7920_fc-tulsa.jpg	7920
167	FC Naples	https://apiv2.allsportsapi.com/logo/38616_naples.jpg	38616
164	Boise	\N	42027
165	Union Omaha	https://apiv2.allsportsapi.com/logo/11093_union-omaha.jpg	11093
229	Follo	https://apiv2.allsportsapi.com/logo/5659_follo.jpg	5659
197	Orange County SC	https://apiv2.allsportsapi.com/logo/7942_orange-county-sc.jpg	7942
200	Molde 2	https://apiv2.allsportsapi.com/logo/10968_molde-ii.jpg	10968
194	Sporting Jax	https://apiv2.allsportsapi.com/logo/39523_sporting-jax.jpg	39523
191	Oakland Roots	https://apiv2.allsportsapi.com/logo/7947_oakland-roots.jpg	7947
223	Jerv	https://apiv2.allsportsapi.com/logo/5622_jerv.jpg	5622
163	San Martin T.	https://apiv2.allsportsapi.com/logo/933_san-martin-tucuman.jpg	933
204	Mandalskameratene	https://apiv2.allsportsapi.com/logo/10943_mandalskameratene.jpg	10943
183	Tampa Bay	https://apiv2.allsportsapi.com/logo/7933_tampa-bay-rowdies.jpg	7933
169	Sarasota Paradise	https://apiv2.allsportsapi.com/logo/31677_sarasota-paradise.jpg	31677
212	Harstad	https://apiv2.allsportsapi.com/logo/5635_harstad.jpg	5635
166	Chattanooga Red Wolves	https://apiv2.allsportsapi.com/logo/8389_chattanooga-red-wolves.jpg	8389
222	Brattvag	https://apiv2.allsportsapi.com/logo/5630_brattvg.jpg	5630
221	Traeff	https://apiv2.allsportsapi.com/logo/5648_trff.jpg	5648
228	Rana FK	https://apiv2.allsportsapi.com/logo/10970_rana.jpg	10970
238	Moss	https://apiv2.allsportsapi.com/logo/5617_moss.jpg	5617
231	Lorenskog	https://apiv2.allsportsapi.com/logo/5620_lrenskog.jpg	5620
207	Varhaug	\N	35187
178	Tormenta	https://apiv2.allsportsapi.com/logo/8392_tormenta.jpg	8392
173	AV Alta	https://apiv2.allsportsapi.com/logo/39249_alta.jpg	39249
234	Egersund	https://apiv2.allsportsapi.com/logo/5624_egersund.jpg	5624
235	Haugesund	https://apiv2.allsportsapi.com/logo/5591_haugesund.jpg	5591
199	Valerenga 2	https://apiv2.allsportsapi.com/logo/8299_vlerenga-ii.jpg	8299
232	Bryne	https://apiv2.allsportsapi.com/logo/5612_bryne.jpg	5612
205	Vag	https://apiv2.allsportsapi.com/logo/38652_vg.jpg	38652
198	Ready	https://apiv2.allsportsapi.com/logo/5661_if-ready.jpg	5661
236	Kongsvinger	https://apiv2.allsportsapi.com/logo/5596_kongsvinger.jpg	5596
201	Strindheim	https://apiv2.allsportsapi.com/logo/10965_strindheim.jpg	10965
206	Stabaek 2	https://apiv2.allsportsapi.com/logo/10974_stabk-ii.jpg	10974
202	Akra	https://apiv2.allsportsapi.com/logo/5680_kra.jpg	5680
214	Tromso 2	https://apiv2.allsportsapi.com/logo/10969_troms-ii.jpg	10969
219	LSK Kvinner W	\N	11820
215	Skedsmo	https://apiv2.allsportsapi.com/logo/15561_skedsmo.jpg	15561
224	Grorud	https://apiv2.allsportsapi.com/logo/5597_grorud.jpg	5597
220	Arendal	https://apiv2.allsportsapi.com/logo/5623_arendal.jpg	5623
233	Asane	https://apiv2.allsportsapi.com/logo/5642_sane.jpg	5642
227	Eidsvold TF	https://apiv2.allsportsapi.com/logo/5637_eidsvold.jpg	5637
216	Sandefjord 2	https://apiv2.allsportsapi.com/logo/31524_sandefjord-ii.jpg	31524
226	Honefoss	https://apiv2.allsportsapi.com/logo/5697_hnefoss.jpg	5697
218	Brann W	https://apiv2.allsportsapi.com/logo/24014_brann-w.jpg	24014
230	Trygg/Lade	https://apiv2.allsportsapi.com/logo/5689_trygg--lade.jpg	5689
225	Junkeren	https://apiv2.allsportsapi.com/logo/5702_junkeren.jpg	5702
203	Vindbjart	https://apiv2.allsportsapi.com/logo/5676_vindbjart.jpg	5676
237	Stromsgodset	https://apiv2.allsportsapi.com/logo/5640_strmsgodset.jpg	5640
217	Brumunddal	https://apiv2.allsportsapi.com/logo/5669_brumunddal.jpg	5669
185	Colorado Springs	https://apiv2.allsportsapi.com/logo/7932_colorado-springs.jpg	7932
242	Raufoss	https://apiv2.allsportsapi.com/logo/5667_raufoss.jpg	5667
293	AFC Eskilstuna	https://apiv2.allsportsapi.com/logo/7328_afc-eskilstuna.jpg	7328
241	Hodd	https://apiv2.allsportsapi.com/logo/5629_hdd.jpg	5629
296	07 Vestur Sorvagur	https://apiv2.allsportsapi.com/logo/3475_07-vestur.jpg	3475
275	Agropecuario	https://apiv2.allsportsapi.com/logo/937_agropecuario.jpg	937
287	Laholms	https://apiv2.allsportsapi.com/logo/30619_laholm.jpg	30619
253	Falkenberg	https://apiv2.allsportsapi.com/logo/7331_falkenberg.jpg	7331
292	Pitea	https://apiv2.allsportsapi.com/logo/8309_pite.jpg	8309
313	Dinamo Tbilisi 2	https://apiv2.allsportsapi.com/logo/8744_dinamo-tbilisi-ii.jpg	8744
249	Sundsvall	https://apiv2.allsportsapi.com/logo/7333_sundsvall.jpg	7333
259	Godoy Cruz	https://apiv2.allsportsapi.com/logo/994_godoy-cruz.jpg	994
289	Karlstad	https://apiv2.allsportsapi.com/logo/8307_if-karlstad.jpg	8307
251	Nordic United	https://apiv2.allsportsapi.com/logo/11695_nordic-united.jpg	11695
268	Deportivo Maipu	https://apiv2.allsportsapi.com/logo/895_deportivo-maipu.jpg	895
314	Merani Tbilisi	https://apiv2.allsportsapi.com/logo/3898_merani-tbilisi.jpg	3898
311	Gonio	https://apiv2.allsportsapi.com/logo/25270_gonio.jpg	25270
300	Betlemi	https://apiv2.allsportsapi.com/logo/8781_betlemi.jpg	8781
303	Guria	https://apiv2.allsportsapi.com/logo/8783_guria.jpg	8783
310	Khobi	https://apiv2.allsportsapi.com/logo/12163_kolkheti-khobi.jpg	12163
307	Iberia 1999 2	https://apiv2.allsportsapi.com/logo/8785_iberia-1999-ii.jpg	8785
304	Gardabani	https://apiv2.allsportsapi.com/logo/14559_gardabani.jpg	14559
312	Margveti 2006	https://apiv2.allsportsapi.com/logo/8763_margveti-2006.jpg	8763
255	Norrkoping	https://apiv2.allsportsapi.com/logo/7355_norrkoping.jpg	7355
306	Iberia 2010	\N	8787
252	Oster	https://apiv2.allsportsapi.com/logo/7343_oster.jpg	7343
302	Didube	https://apiv2.allsportsapi.com/logo/8749_didube-2014.jpg	8749
250	Norrby	https://apiv2.allsportsapi.com/logo/7337_norrby.jpg	7337
243	Sogndal	https://apiv2.allsportsapi.com/logo/5607_sogndal.jpg	5607
245	Stabaek	https://apiv2.allsportsapi.com/logo/5614_stabk.jpg	5614
281	Sandviken W	\N	9774
246	Brage	https://apiv2.allsportsapi.com/logo/7330_brage.jpg	7330
265	All Boys	https://apiv2.allsportsapi.com/logo/950_all-boys.jpg	950
276	Goteborg W	\N	47
261	Tristan Suarez	https://apiv2.allsportsapi.com/logo/956_tristan-suarez.jpg	956
299	HB Torshavn	https://apiv2.allsportsapi.com/logo/270_hb.jpg	270
258	Central Norte	https://apiv2.allsportsapi.com/logo/885_central-norte.jpg	885
308	Iveria Khashuri	\N	42195
266	Deportivo Madryn	https://apiv2.allsportsapi.com/logo/897_deportivo-madryn.jpg	897
285	Olympic	https://apiv2.allsportsapi.com/logo/8350_olympic.jpg	8350
278	Orebro SK W	https://apiv2.allsportsapi.com/logo/9854_orebro-sk-w.jpg	9854
264	Def. de Belgrano	https://apiv2.allsportsapi.com/logo/942_defensores-de-belgrano.jpg	942
291	Umea FC	https://apiv2.allsportsapi.com/logo/7387_ume.jpg	7387
280	Team TG W	https://apiv2.allsportsapi.com/logo/21349_team-tg-w.jpg	21349
256	Almirante Brown	https://apiv2.allsportsapi.com/logo/930_almirante-brown.jpg	930
257	CA Mitre	https://apiv2.allsportsapi.com/logo/926_mitre-santiago-d.-estero.jpg	926
273	Midland	https://apiv2.allsportsapi.com/logo/971_midland.jpg	971
269	Gimnasia y Tiro	https://apiv2.allsportsapi.com/logo/11586_gimnasia-y-tiro.jpg	11586
271	Deportivo Moron	https://apiv2.allsportsapi.com/logo/951_deportivo-moron.jpg	951
270	Ferro	https://apiv2.allsportsapi.com/logo/954_ferro-carril-oeste.jpg	954
260	Chacarita Juniors	https://apiv2.allsportsapi.com/logo/938_chacarita-juniors.jpg	938
262	Club A. Guemes	https://apiv2.allsportsapi.com/logo/884_guemes.jpg	884
316	Breidablik	https://apiv2.allsportsapi.com/logo/4694_breidablik.jpg	4694
277	Trelleborg W	https://apiv2.allsportsapi.com/logo/21348_trelleborg-w.jpg	21348
279	Umea W	https://apiv2.allsportsapi.com/logo/509_ume-w.jpg	509
254	Ostersund	https://apiv2.allsportsapi.com/logo/7353_ostersund.jpg	7353
248	Helsingborg	https://apiv2.allsportsapi.com/logo/7334_helsingborg.jpg	7334
298	B36 Torshavn	https://apiv2.allsportsapi.com/logo/202_b36.jpg	202
288	Assyriska FF	https://apiv2.allsportsapi.com/logo/8304_assyriska.jpg	8304
240	Odd	https://apiv2.allsportsapi.com/logo/5593_odd.jpg	5593
315	Orbi	https://apiv2.allsportsapi.com/logo/8776_orbi.jpg	8776
244	Strommen	https://apiv2.allsportsapi.com/logo/5601_strmmen.jpg	5601
272	Patronato	https://apiv2.allsportsapi.com/logo/1008_patronato.jpg	1008
267	Los Andes	https://apiv2.allsportsapi.com/logo/919_los-andes.jpg	919
282	Enskede W	https://apiv2.allsportsapi.com/logo/9858_enskede-w.jpg	9858
247	Varnamo	https://apiv2.allsportsapi.com/logo/7340_varnamo.jpg	7340
297	AB Argir	https://apiv2.allsportsapi.com/logo/3483_ab.jpg	3483
286	Kristianstad	https://apiv2.allsportsapi.com/logo/7393_kristianstad.jpg	7393
284	AFC Malmo	\N	42774
85	Parnu JK Vaprus U21	https://apiv2.allsportsapi.com/logo/38453_vaprus-ii.jpg	38453
294	Streymur 2	https://apiv2.allsportsapi.com/logo/3487_eb--streymur-ii.jpg	3487
301	WIT Georgia	https://apiv2.allsportsapi.com/logo/3897_wit-georgia.jpg	3897
317	KA Akureyri	https://apiv2.allsportsapi.com/logo/4697_ka.jpg	4697
305	Tbilisi 2025	https://apiv2.allsportsapi.com/logo/8766_tbilisi-2025.jpg	8766
239	Sandnes	https://apiv2.allsportsapi.com/logo/5605_sandnes-ulf.jpg	5605
368	Aegir	https://apiv2.allsportsapi.com/logo/8878_gir.jpg	8878
357	St. Louis City 2	https://apiv2.allsportsapi.com/logo/24580_st.-louis-city-ii.jpg	24580
356	Minnesota 2	https://apiv2.allsportsapi.com/logo/24873_minnesota-united-ii.jpg	24873
351	Carolina Core	https://apiv2.allsportsapi.com/logo/34658_carolina-core.jpg	34658
362	Kopavogur	https://apiv2.allsportsapi.com/logo/4696_hk.jpg	4696
379	IFK Ostersund	https://apiv2.allsportsapi.com/logo/8339_ifk-ostersund.jpg	8339
325	Vikingur Reykjavik	https://apiv2.allsportsapi.com/logo/4703_vikingur-reykjavik.jpg	4703
326	Karlstad II	https://apiv2.allsportsapi.com/logo/7374_if-karlstad-ii.jpg	7374
389	APIA Leichhardt	https://apiv2.allsportsapi.com/logo/1068_apia-leichhardt-fc.jpg	1068
329	Sunnersta AIF	https://apiv2.allsportsapi.com/logo/16386_sunnersta.jpg	16386
387	Sydney FC U23	https://apiv2.allsportsapi.com/logo/1059_sydney-ii.jpg	1059
394	Busan Kyotong	https://apiv2.allsportsapi.com/logo/5145_busan-transportation.jpg	5145
343	Haninge	https://apiv2.allsportsapi.com/logo/7381_haninge.jpg	7381
323	Stjarnan	https://apiv2.allsportsapi.com/logo/4701_stjarnan.jpg	4701
349	Paide	\N	3466
375	FK Liepaja	https://apiv2.allsportsapi.com/logo/5198_liepja.jpg	5198
374	Riga FC	https://apiv2.allsportsapi.com/logo/188_riga.jpg	188
701	Sweden	https://apiv2.allsportsapi.com/logo/17_sweden.jpg	17
384	Tartu Welco	https://apiv2.allsportsapi.com/logo/3459_tartu-welco.jpg	3459
328	Korsnas	https://apiv2.allsportsapi.com/logo/16389_korsnas.jpg	16389
702	Altai	https://apiv2.allsportsapi.com/logo/39791_altay-vko.jpg	39791
380	Levadia U21	https://apiv2.allsportsapi.com/logo/3456_fci-levadia-ii.jpg	3456
370	Jelgava	https://apiv2.allsportsapi.com/logo/24896_fs-jelgava.jpg	24896
347	Narva	https://apiv2.allsportsapi.com/logo/3469_trans.jpg	3469
365	Volsungur	https://apiv2.allsportsapi.com/logo/8850_volsungur.jpg	8850
337	Farsta	https://apiv2.allsportsapi.com/logo/16363_farsta.jpg	16363
352	Colorado Rapids 2	https://apiv2.allsportsapi.com/logo/16836_colorado-rapids-ii.jpg	16836
360	Grotta	https://apiv2.allsportsapi.com/logo/8206_grotta.jpg	8206
388	Blacktown City	https://apiv2.allsportsapi.com/logo/1063_blacktown-city-fc.jpg	1063
342	Smedby	https://apiv2.allsportsapi.com/logo/8364_smedby.jpg	8364
350	Fort Lauderdale	https://apiv2.allsportsapi.com/logo/11091_inter-miami-ii.jpg	11091
335	Fittja	\N	41550
333	Helges	\N	42201
390	Marconi Stallions	https://apiv2.allsportsapi.com/logo/1064_marconi-stallions-fc.jpg	1064
344	Syrianska	https://apiv2.allsportsapi.com/logo/8365_syrianska.jpg	8365
345	Ragsved	https://apiv2.allsportsapi.com/logo/19080_rgsved.jpg	19080
339	Eker Orebro	https://apiv2.allsportsapi.com/logo/38797_eker-orebro.jpg	38797
381	FC Tallinn	https://apiv2.allsportsapi.com/logo/9033_fc-tallinn.jpg	9033
341	Sylvia	https://apiv2.allsportsapi.com/logo/8310_sylvia.jpg	8310
377	Umea FC Akademi	https://apiv2.allsportsapi.com/logo/7352_ume-fc-akademi.jpg	7352
354	Huntsville	https://apiv2.allsportsapi.com/logo/31395_huntsville-city.jpg	31395
331	Kungsangen	https://apiv2.allsportsapi.com/logo/8357_kungsangen.jpg	8357
322	Vestmannaeyjar	https://apiv2.allsportsapi.com/logo/8209_ibv.jpg	8209
367	Afturelding	https://apiv2.allsportsapi.com/logo/8201_afturelding.jpg	8201
319	Thor Akureyri	https://apiv2.allsportsapi.com/logo/8208_thor.jpg	8208
376	Skelleftea	https://apiv2.allsportsapi.com/logo/8342_skellefte.jpg	8342
327	Motala	https://apiv2.allsportsapi.com/logo/8327_motala.jpg	8327
336	Karlslund	https://apiv2.allsportsapi.com/logo/7375_karlslund.jpg	7375
332	Taby	https://apiv2.allsportsapi.com/logo/7367_taby.jpg	7367
371	Tukums 2000	https://apiv2.allsportsapi.com/logo/8964_tukums.jpg	8964
334	Forward	https://apiv2.allsportsapi.com/logo/7363_forward.jpg	7363
372	Super Nova	https://apiv2.allsportsapi.com/logo/5192_super-nova.jpg	5192
324	Fram	https://apiv2.allsportsapi.com/logo/8207_fram.jpg	8207
378	Umea FF	https://apiv2.allsportsapi.com/logo/8324_team-thoren.jpg	8324
393	SD Raiders	https://apiv2.allsportsapi.com/logo/19222_sd-raiders.jpg	19222
363	Grindavik	https://apiv2.allsportsapi.com/logo/8204_grindavik.jpg	8204
320	Valur	https://apiv2.allsportsapi.com/logo/4702_valur.jpg	4702
382	Tallinna Kalev	https://apiv2.allsportsapi.com/logo/3455_tallinna-kalev.jpg	3455
369	Throttur	https://apiv2.allsportsapi.com/logo/8199_throttur-reykjavik.jpg	8199
359	Ventura County	https://apiv2.allsportsapi.com/logo/7921_ventura-county.jpg	7921
361	Fylkir	https://apiv2.allsportsapi.com/logo/4695_fylkir.jpg	4695
383	Nomme Kalju U21	https://apiv2.allsportsapi.com/logo/25360_nomme-kalju-ii.jpg	25360
364	IR Reykjavik	https://apiv2.allsportsapi.com/logo/8835_ir.jpg	8835
321	Keflavik	https://apiv2.allsportsapi.com/logo/4699_keflavik.jpg	4699
385	Nomme Utd U21	https://apiv2.allsportsapi.com/logo/38849_nomme-united-ii.jpg	38849
355	Crown Legacy	https://apiv2.allsportsapi.com/logo/31394_crown-legacy.jpg	31394
338	Nacka FC	https://apiv2.allsportsapi.com/logo/17284_nacka-iliria.jpg	17284
386	Wollongong Wolves	https://apiv2.allsportsapi.com/logo/1062_wollongong-wolves-fc.jpg	1062
373	Auda	https://apiv2.allsportsapi.com/logo/5188_auda.jpg	5188
391	UNSW	https://apiv2.allsportsapi.com/logo/34267_unsw.jpg	34267
392	Sydney Utd	https://apiv2.allsportsapi.com/logo/1057_sydney-united.jpg	1057
348	Flora	https://apiv2.allsportsapi.com/logo/129_flora.jpg	129
346	Tammeka	https://apiv2.allsportsapi.com/logo/3467_tammeka.jpg	3467
434	Albany Rush	https://apiv2.allsportsapi.com/logo/25043_albany-rush.jpg	25043
396	Pocheon	https://apiv2.allsportsapi.com/logo/8941_pocheon.jpg	8941
397	Gangneung	https://apiv2.allsportsapi.com/logo/5155_gangneung-citizen.jpg	5155
471	Lonestar SC	\N	39500
456	PA Classics	\N	42509
418	AC Connecticut	https://apiv2.allsportsapi.com/logo/7864_ac-connecticut.jpg	7864
436	Cedar	https://apiv2.allsportsapi.com/logo/7911_cedar-stars-rush.jpg	7911
399	Tartu Kalev	https://apiv2.allsportsapi.com/logo/19413_tartu-kalev.jpg	19413
444	Lionsbridge	https://apiv2.allsportsapi.com/logo/7876_lionsbridge.jpg	7876
447	Mississippi Brilla	https://apiv2.allsportsapi.com/logo/7862_mississippi-brilla.jpg	7862
473	Oakland County	https://apiv2.allsportsapi.com/logo/7841_oakland-county.jpg	7841
420	Almaden	https://apiv2.allsportsapi.com/logo/34759_almaden.jpg	34759
423	Northern Indiana	\N	39557
410	Bigfoot	\N	39580
468	Tucson	https://apiv2.allsportsapi.com/logo/11096_tucson.jpg	11096
403	Altona Magic	https://apiv2.allsportsapi.com/logo/10417_altona-magic.jpg	10417
438	GFI Woodlands	\N	39531
419	Black Rock	https://apiv2.allsportsapi.com/logo/7865_black-rock.jpg	7865
451	Hattiesburg	https://apiv2.allsportsapi.com/logo/34746_hattiesburg.jpg	34746
413	Edgewater Castle	\N	42502
440	Hickory	https://apiv2.allsportsapi.com/logo/36910_hickory.jpg	36910
441	Wake FC	https://apiv2.allsportsapi.com/logo/7882_wake.jpg	7882
469	Ventura	https://apiv2.allsportsapi.com/logo/7897_ventura-county-fusion.jpg	7897
408	Buffalo	https://apiv2.allsportsapi.com/logo/19275_buffalo.jpg	19275
404	Dziugas Telsiai	https://apiv2.allsportsapi.com/logo/5253_diugas-teliai.jpg	5253
424	Inter Gainesville	https://apiv2.allsportsapi.com/logo/34745_inter-gainesville.jpg	34745
407	Swarm FC	\N	42513
445	Virginia Beach	https://apiv2.allsportsapi.com/logo/11842_virginia-beach-city.jpg	11842
401	Lindo FF	https://apiv2.allsportsapi.com/logo/42040_lindo-ff.jpg	42040
427	Port City	\N	41163
455	Reading	https://apiv2.allsportsapi.com/logo/7856_reading-united.jpg	7856
448	Manhattan	https://apiv2.allsportsapi.com/logo/7914_manhattan.jpg	7914
452	Miami City	https://apiv2.allsportsapi.com/logo/7885_fc-miami-city.jpg	7885
475	Boston City	https://apiv2.allsportsapi.com/logo/17662_boston-city.jpg	17662
421	Glens SC	https://apiv2.allsportsapi.com/logo/7893_sf-glens.jpg	7893
428	FC Olympia	https://apiv2.allsportsapi.com/logo/25042_olympia.jpg	25042
406	East Atlanta	https://apiv2.allsportsapi.com/logo/7906_east-atlanta-dutch-lions.jpg	7906
412	Minneapolis City	https://apiv2.allsportsapi.com/logo/8402_minneapolis-city.jpg	8402
467	West Virginia	https://apiv2.allsportsapi.com/logo/7883_west-virginia-united.jpg	7883
402	St Albans	https://apiv2.allsportsapi.com/logo/10418_st.-albans-saints.jpg	10418
464	Shark Coast	\N	42507
460	Red River	\N	39527
462	SC United Bantams	https://apiv2.allsportsapi.com/logo/7908_sc-united-bantams.jpg	7908
472	Union FC Macomb	https://apiv2.allsportsapi.com/logo/34754_union-macomb.jpg	34754
409	Pittsburgh Riverhounds 2	\N	42511
442	Hill City	\N	42506
405	Suduva	https://apiv2.allsportsapi.com/logo/115_sduva.jpg	115
430	Academica SC	https://apiv2.allsportsapi.com/logo/17698_academica.jpg	17698
416	Utah United	https://apiv2.allsportsapi.com/logo/34761_utah-united.jpg	34761
426	North Carolina FC U23	https://apiv2.allsportsapi.com/logo/7878_north-carolina-ii.jpg	7878
449	Hudson Valley	https://apiv2.allsportsapi.com/logo/25040_hudson-valley-hammers.jpg	25040
453	Lakeland United	\N	42500
432	Akron City	https://apiv2.allsportsapi.com/logo/36911_akron-city.jpg	36911
459	Southern California	https://apiv2.allsportsapi.com/logo/7896_so-cal-eagles.jpg	7896
450	Memphis FC	\N	42510
465	Brave SC	https://apiv2.allsportsapi.com/logo/7889_brave.jpg	7889
395	Gyeongju KHNP	https://apiv2.allsportsapi.com/logo/5148_gyeongju-khnp.jpg	5148
458	Redlands FC	https://apiv2.allsportsapi.com/logo/31679_redlands.jpg	31679
425	Sporting Jax 2	\N	42508
437	Morris Elite	https://apiv2.allsportsapi.com/logo/11918_morris-elite.jpg	11918
411	Tacoma Stars	https://apiv2.allsportsapi.com/logo/34764_tacoma-stars.jpg	34764
454	Ocean City	https://apiv2.allsportsapi.com/logo/7854_ocean-city-noreasters.jpg	7854
415	Santafe Wanderers	\N	39555
414	Springfield FC	\N	39545
429	Midlakes United	https://apiv2.allsportsapi.com/logo/34763_midlakes-united.jpg	34763
398	Tabasalu	https://apiv2.allsportsapi.com/logo/12409_jk-tabasalu.jpg	12409
433	Steel City	https://apiv2.allsportsapi.com/logo/34893_steel-city-fc.jpg	34893
340	Orebro Syr.	https://apiv2.allsportsapi.com/logo/8311_orebro-syrianska.jpg	8311
417	Colorado Storm	https://apiv2.allsportsapi.com/logo/39591_colorado-storm.jpg	39591
463	Charlotte Eagles	https://apiv2.allsportsapi.com/logo/7903_charlotte-eagles.jpg	7903
466	Toledo Villa	https://apiv2.allsportsapi.com/logo/11915_toledo-villa.jpg	11915
422	Dayton	https://apiv2.allsportsapi.com/logo/7837_dayton-dutch-lions.jpg	7837
474	Vermont Green	https://apiv2.allsportsapi.com/logo/25034_vermont-green.jpg	25034
439	Hill Country Lobos	https://apiv2.allsportsapi.com/logo/34750_hill-country-lobos.jpg	34750
443	Christos	https://apiv2.allsportsapi.com/logo/8399_christos.jpg	8399
435	Connecticut Rush	\N	42505
431	Project 51O	https://apiv2.allsportsapi.com/logo/25022_project-51o.jpg	25022
461	Louisiana	https://apiv2.allsportsapi.com/logo/8412_louisiana-krewe.jpg	8412
478	Columbus United	https://apiv2.allsportsapi.com/logo/36917_columbus-united.jpg	36917
513	Ypiranga FC	https://apiv2.allsportsapi.com/logo/1787_ypiranga-rs.jpg	1787
500	Kahibah	https://apiv2.allsportsapi.com/logo/35357_kahibah.jpg	35357
492	Long Island	https://apiv2.allsportsapi.com/logo/7913_long-island-rough-riders.jpg	7913
488	Charlottesville Blues	https://apiv2.allsportsapi.com/logo/34753_charlottesville-blues.jpg	34753
514	SER Caxias	https://apiv2.allsportsapi.com/logo/1819_caxias-do-sul.jpg	1819
505	Floresta EC	https://apiv2.allsportsapi.com/logo/1803_floresta.jpg	1803
481	Lubbock Matadors	https://apiv2.allsportsapi.com/logo/34895_lubbock-matadors.jpg	34895
498	Maitland	https://apiv2.allsportsapi.com/logo/8497_maitland.jpg	8497
494	Olympic FC	https://apiv2.allsportsapi.com/logo/9560_olympic.jpg	9560
502	Barra FC	https://apiv2.allsportsapi.com/logo/23820_barra.jpg	23820
520	Zalgiris 2	https://apiv2.allsportsapi.com/logo/5244_algiris-ii.jpg	5244
482	McKinney Chupacabras	\N	39525
486	Apotheos	https://apiv2.allsportsapi.com/logo/34890_apotheos.jpg	34890
499	Newcastle Olympic	https://apiv2.allsportsapi.com/logo/8498_newcastle-olympic.jpg	8498
523	Siauliai 2	https://apiv2.allsportsapi.com/logo/24890_fa-iauliai-ii.jpg	24890
512	Santa Cruz	https://apiv2.allsportsapi.com/logo/1789_santa-cruz-fc.jpg	1789
527	Circulo Deportivo	https://apiv2.allsportsapi.com/logo/906_circulo-deportivo.jpg	906
510	Maranhao	https://apiv2.allsportsapi.com/logo/2032_maranhao.jpg	2032
521	Jonava	https://apiv2.allsportsapi.com/logo/5241_jonava.jpg	5241
480	Denton Diablos	https://apiv2.allsportsapi.com/logo/8413_denton-diablos.jpg	8413
517	Osorno	https://apiv2.allsportsapi.com/logo/8898_provincial-osorno.jpg	8898
511	Paysandu PA	https://apiv2.allsportsapi.com/logo/1786_paysandu.jpg	1786
485	Sunflower State	https://apiv2.allsportsapi.com/logo/36935_sunflower-state.jpg	36935
493	Westchester Flames	https://apiv2.allsportsapi.com/logo/7916_westchester-flames.jpg	7916
495	Peninsula	https://apiv2.allsportsapi.com/logo/9562_peninsula-power.jpg	9562
506	Ferroviaria	https://apiv2.allsportsapi.com/logo/1820_ferroviaria.jpg	1820
497	Rochedale	https://apiv2.allsportsapi.com/logo/17839_rochedale-rovers.jpg	17839
509	Figueirense	https://apiv2.allsportsapi.com/logo/1751_figueirense.jpg	1751
504	Brusque	https://apiv2.allsportsapi.com/logo/1788_brusque.jpg	1788
782	Bjarg	https://apiv2.allsportsapi.com/logo/10956_bjarg.jpg	10956
519	Real San Joaquin	https://apiv2.allsportsapi.com/logo/24786_real-san-joaquin.jpg	24786
516	Colchagua	https://apiv2.allsportsapi.com/logo/8902_colchagua.jpg	8902
515	Maringa FC	https://apiv2.allsportsapi.com/logo/1779_maringa.jpg	1779
508	Ituano	https://apiv2.allsportsapi.com/logo/1790_ituano.jpg	1790
545	Sol de Mayo	https://apiv2.allsportsapi.com/logo/908_sol-de-mayo.jpg	908
543	Sportivo Las Parejas	https://apiv2.allsportsapi.com/logo/890_sportivo-las-parejas.jpg	890
536	Defensores Belgrano VR	https://apiv2.allsportsapi.com/logo/883_defensores-belgrano-vr.jpg	883
525	El Linqueno	https://apiv2.allsportsapi.com/logo/18394_el-linqueno.jpg	18394
496	Queensland Lions	https://apiv2.allsportsapi.com/logo/9565_lions.jpg	9565
530	Biblioteca Atenas	https://apiv2.allsportsapi.com/logo/18417_atenas.jpg	18417
544	Guillermo Brown	https://apiv2.allsportsapi.com/logo/953_guillermo-brown.jpg	953
534	Cipolletti	https://apiv2.allsportsapi.com/logo/902_cipolletti.jpg	902
528	Bartolome Mitre	https://apiv2.allsportsapi.com/logo/39135_bartolome-mitre.jpg	39135
542	Gimnasia E.R.	https://apiv2.allsportsapi.com/logo/893_gimnasia-concepcion.jpg	893
529	Juventud Antoniana	https://apiv2.allsportsapi.com/logo/12717_juventud-antoniana.jpg	12717
546	Juventud U.U.	https://apiv2.allsportsapi.com/logo/898_juventud-unida-univ..jpg	898
547	Fundacion Amigos	\N	42660
524	9 de Julio Rafaela	https://apiv2.allsportsapi.com/logo/18346_9-de-julio-rafaela.jpg	18346
539	Sol de America	https://apiv2.allsportsapi.com/logo/12727_sol-de-america.jpg	12727
491	RKC SC	https://apiv2.allsportsapi.com/logo/31669_rkc-third-coast.jpg	31669
526	Alvarado	https://apiv2.allsportsapi.com/logo/936_alvarado.jpg	936
541	Sportivo Belgrano	https://apiv2.allsportsapi.com/logo/879_sportivo-belgrano.jpg	879
531	Costa Brava	https://apiv2.allsportsapi.com/logo/39133_costa-brava.jpg	39133
538	Defensores de Vilelas	\N	42662
501	Charlestown Azzurri	https://apiv2.allsportsapi.com/logo/8493_charlestown-azzurri.jpg	8493
537	Independiente Chivilcoy	https://apiv2.allsportsapi.com/logo/11584_independiente-chivilcoy.jpg	11584
532	Chivilcoy	https://apiv2.allsportsapi.com/logo/39134_gimnasia-chivilcoy.jpg	39134
548	Olimpo Bahia Blanca	https://apiv2.allsportsapi.com/logo/901_olimpo.jpg	901
540	Douglas Haig	https://apiv2.allsportsapi.com/logo/887_douglas-haig.jpg	887
503	Amazonas	https://apiv2.allsportsapi.com/logo/1859_amazonas.jpg	1859
518	Provincial Ovalle	https://apiv2.allsportsapi.com/logo/17921_provincial-ovalle.jpg	17921
507	Inter de Limeira	https://apiv2.allsportsapi.com/logo/2057_inter-de-limeira.jpg	2057
490	Chicago Dutch Lions	https://apiv2.allsportsapi.com/logo/25048_chicago-dutch-lions.jpg	25048
484	Peoria	https://apiv2.allsportsapi.com/logo/7848_peoria-city.jpg	7848
522	Dainava Alytus	https://apiv2.allsportsapi.com/logo/5257_dainava.jpg	5257
533	Atletico Escobar	\N	42661
535	Deportivo Rincon	https://apiv2.allsportsapi.com/logo/18430_deportivo-rincon.jpg	18430
479	Dothan United	https://apiv2.allsportsapi.com/logo/34748_dothan-united.jpg	34748
477	Appalachian	https://apiv2.allsportsapi.com/logo/30933_appalachian.jpg	30933
552	San Martin Mendoza	https://apiv2.allsportsapi.com/logo/18415_san-martin-mendoza.jpg	18415
558	Lota Schwager	https://apiv2.allsportsapi.com/logo/13458_lota-schwager.jpg	13458
556	Tucuman Central	\N	42663
549	Kimberley	https://apiv2.allsportsapi.com/logo/18362_kimberley-mar-del-plata.jpg	18362
624	Gremio Juventus	https://apiv2.allsportsapi.com/logo/2010_juventus-sc.jpg	2010
588	Vladimir	https://apiv2.allsportsapi.com/logo/6220_torpedo-vladimir.jpg	6220
551	Sarmiento Resistencia	https://apiv2.allsportsapi.com/logo/888_sarmiento-resistencia.jpg	888
563	Uni X Labs	https://apiv2.allsportsapi.com/logo/24931_uni-minsk.jpg	24931
613	Bahir Dar Kenema	https://apiv2.allsportsapi.com/logo/11576_bahardar.jpg	11576
614	Welwalo Adigrat	https://apiv2.allsportsapi.com/logo/18750_welwalo-adigrat-uni.jpg	18750
566	Singleton Strikers	https://apiv2.allsportsapi.com/logo/35337_singleton-strikers.jpg	35337
620	Lexington	https://apiv2.allsportsapi.com/logo/30567_lexington.jpg	30567
557	Boca Unidos	https://apiv2.allsportsapi.com/logo/881_boca-unidos.jpg	881
612	Hawassa	https://apiv2.allsportsapi.com/logo/11528_awassa-kenema.jpg	11528
562	SKA-1938	https://apiv2.allsportsapi.com/logo/1337_energetik-bgu.jpg	1337
567	West Wallsend	https://apiv2.allsportsapi.com/logo/17846_west-wallsend.jpg	17846
554	Santamarina	https://apiv2.allsportsapi.com/logo/948_deportivo-santamarina.jpg	948
559	S. Morning	https://apiv2.allsportsapi.com/logo/2229_santiago-morning.jpg	2229
553	Huracan Las Heras	https://apiv2.allsportsapi.com/logo/896_huracan-las-heras.jpg	896
550	San Martin Formosa	https://apiv2.allsportsapi.com/logo/892_san-martin-formosa.jpg	892
555	Villa Mitre	https://apiv2.allsportsapi.com/logo/894_villa-mitre.jpg	894
623	Jaragua-SC	https://apiv2.allsportsapi.com/logo/38099_jaragua.jpg	38099
571	South Hobart	https://apiv2.allsportsapi.com/logo/11241_south-hobart.jpg	11241
570	Kingborough Lions	https://apiv2.allsportsapi.com/logo/11247_kingborough-lions.jpg	11247
560	Niva Dolbizno	https://apiv2.allsportsapi.com/logo/11860_niva-dolbizno.jpg	11860
577	Kyzyltash	\N	11266
583	Dynamo SPB	https://apiv2.allsportsapi.com/logo/16020_dinamo-st.-petersburg.jpg	16020
593	Ural 2	https://apiv2.allsportsapi.com/logo/6258_ural-ii.jpg	6258
578	Baltika 2	https://apiv2.allsportsapi.com/logo/39332_baltika-ii.jpg	39332
585	Tver	https://apiv2.allsportsapi.com/logo/6222_tver.jpg	6222
587	Iskra Smolensk	\N	42664
579	Chertanovo M.	https://apiv2.allsportsapi.com/logo/6282_chertanovo.jpg	6282
580	Dynamo Vologda	https://apiv2.allsportsapi.com/logo/16066_dinamo-vologda.jpg	16066
584	Luki-Energiya	https://apiv2.allsportsapi.com/logo/6228_luki-energiya.jpg	6228
590	Izhevsk	\N	42830
607	Bryne W	\N	33615
600	Rubin Kazan 2	https://apiv2.allsportsapi.com/logo/16058_rubin-kazan-ii.jpg	16058
611	Kolbotn W	https://apiv2.allsportsapi.com/logo/9775_kolbotn-w.jpg	9775
592	KDV Tomsk	https://apiv2.allsportsapi.com/logo/39330_kdv.jpg	39330
597	Dynamo Barnaul	https://apiv2.allsportsapi.com/logo/6256_dinamo-barnaul.jpg	6256
598	Orenburg 2	https://apiv2.allsportsapi.com/logo/6260_orenburg-ii.jpg	6260
595	Khimik	https://apiv2.allsportsapi.com/logo/16035_khimik-dzerzhinsk.jpg	16035
569	Wallsend Red Devils	https://apiv2.allsportsapi.com/logo/35376_wallsend.jpg	35376
591	Chelyabinsk 2	https://apiv2.allsportsapi.com/logo/39331_chelyabinsk-ii.jpg	39331
618	Mechal	https://apiv2.allsportsapi.com/logo/21581_mekelakeya.jpg	21581
617	Adama City	https://apiv2.allsportsapi.com/logo/11579_adama-kenema.jpg	11579
573	University of Tasmania	https://apiv2.allsportsapi.com/logo/21854_university-of-tasmania.jpg	21854
619	Ethiopian Insurance	https://apiv2.allsportsapi.com/logo/27531_ethiopian-medhin.jpg	27531
610	Viking W	https://apiv2.allsportsapi.com/logo/33614_viking-fk-w.jpg	33614
574	South East Utd. U21	\N	42825
605	Start W	https://apiv2.allsportsapi.com/logo/39130_start-w.jpg	39130
604	Frigg W	\N	42848
589	Cherepovets	https://apiv2.allsportsapi.com/logo/16113_cherepovets.jpg	16113
565	BATE 2	https://apiv2.allsportsapi.com/logo/34990_bate-ii.jpg	34990
599	Pobeda Nizhniy Novgorod	\N	42831
615	Hadiya Hossana	https://apiv2.allsportsapi.com/logo/11683_hadiya-hosaena.jpg	11683
575	Glenorchy Knights U21	https://apiv2.allsportsapi.com/logo/35413_glenorchy-knights-ii.jpg	35413
572	Clarence Zebras U21	https://apiv2.allsportsapi.com/logo/35414_clarence-zebras-ii.jpg	35414
603	Odd W	https://apiv2.allsportsapi.com/logo/34276_odd-w.jpg	34276
561	Molodechno	https://apiv2.allsportsapi.com/logo/1358_molodechno.jpg	1358
622	Fluminense-SC	https://apiv2.allsportsapi.com/logo/38095_fluminense-sc.jpg	38095
582	Irkutsk	https://apiv2.allsportsapi.com/logo/32015_irkutsk.jpg	32015
576	Dynamo Makhachkala 2	https://apiv2.allsportsapi.com/logo/16016_dinamo-dagestan.jpg	16016
606	Arna-Bjornar W	https://apiv2.allsportsapi.com/logo/9770_arna-bjrnar-w.jpg	9770
581	Kosmos	https://apiv2.allsportsapi.com/logo/25948_kosmos-dolgoprudny.jpg	25948
586	Murom	https://apiv2.allsportsapi.com/logo/6225_murom.jpg	6225
594	Krylya Sovetov Samara 2	https://apiv2.allsportsapi.com/logo/6263_krylya-sovetov-ii.jpg	6263
608	Tromso W	https://apiv2.allsportsapi.com/logo/25333_til-2020-w.jpg	25333
602	Grei W	https://apiv2.allsportsapi.com/logo/30831_grei-w.jpg	30831
609	Asane W	https://apiv2.allsportsapi.com/logo/25336_sane-w.jpg	25336
596	Nosta	https://apiv2.allsportsapi.com/logo/6257_nosta.jpg	6257
616	Mekelle 70 Enderta	https://apiv2.allsportsapi.com/logo/8151_mekelle-70-enderta.jpg	8151
673	S. Kostroma	https://apiv2.allsportsapi.com/logo/16055_spartak-kostroma.jpg	16055
636	Barreiras	\N	43067
637	Vitoria da Conquista	https://apiv2.allsportsapi.com/logo/1827_vitoria-da-conquista.jpg	1827
625	Tubarao	https://apiv2.allsportsapi.com/logo/1846_atletico-tubarao.jpg	1846
666	Bafmeng United	https://apiv2.allsportsapi.com/logo/33721_bafmeng-united.jpg	33721
656	The Strongest	https://apiv2.allsportsapi.com/logo/1641_the-strongest.jpg	1641
672	Arsenal Tula	https://apiv2.allsportsapi.com/logo/6286_arsenal-tula.jpg	6286
698	Turkey	https://apiv2.allsportsapi.com/logo/1_turkiye.jpg	1
626	Guarani de Palhoca	https://apiv2.allsportsapi.com/logo/25657_guarani-de-palhoca.jpg	25657
662	Bollstanas	https://apiv2.allsportsapi.com/logo/38794_bollstanas.jpg	38794
663	Gute	https://apiv2.allsportsapi.com/logo/7383_gute.jpg	7383
670	Yafoot	https://apiv2.allsportsapi.com/logo/2181_yafoot.jpg	2181
649	D. Concepcion	https://apiv2.allsportsapi.com/logo/8904_concepcion.jpg	8904
639	Nublense	https://apiv2.allsportsapi.com/logo/2219_nublense.jpg	2219
654	Lago Verde	\N	40986
681	Naft Bandar Abbas	https://apiv2.allsportsapi.com/logo/37573_naft-bandar-abbas.jpg	37573
645	La Serena	https://apiv2.allsportsapi.com/logo/2213_la-serena.jpg	2213
628	Hercilio Luz	https://apiv2.allsportsapi.com/logo/2014_hercilio-luz.jpg	2014
634	Fluminense de Feira	https://apiv2.allsportsapi.com/logo/1987_fluminense-de-feira.jpg	1987
648	Deportes Temuco	https://apiv2.allsportsapi.com/logo/2223_deportes-temuco.jpg	2223
635	SSA	https://apiv2.allsportsapi.com/logo/35501_ssa.jpg	35501
685	Ario Eslamshahr	https://apiv2.allsportsapi.com/logo/30532_ario-eslamshahr.jpg	30532
674	Besat Kermanshah	https://apiv2.allsportsapi.com/logo/18828_besat-kermanshah.jpg	18828
683	Fard	\N	38387
686	Nassaji Mazandaran	https://apiv2.allsportsapi.com/logo/4739_nassaji-mazandaran.jpg	4739
692	Brazil	https://apiv2.allsportsapi.com/logo/531_brazil.jpg	531
678	Mes Kerman	https://apiv2.allsportsapi.com/logo/4741_mes-kerman.jpg	4741
695	Morocco	https://apiv2.allsportsapi.com/logo/717_morocco.jpg	717
688	Sanat Naft	https://apiv2.allsportsapi.com/logo/4732_sanat-naft.jpg	4732
680	Navad Urmia	https://apiv2.allsportsapi.com/logo/4757_navad-urmia.jpg	4757
671	Union Douala	https://apiv2.allsportsapi.com/logo/2179_union-douala.jpg	2179
691	Naft Gachsaran	https://apiv2.allsportsapi.com/logo/15025_naft-gachsaran.jpg	15025
677	Kara Gostar	https://apiv2.allsportsapi.com/logo/33070_mes-soongoun.jpg	33070
641	San Luis	https://apiv2.allsportsapi.com/logo/2228_san-luis-fc.jpg	2228
675	Havadar SC	https://apiv2.allsportsapi.com/logo/4746_havadar.jpg	4746
642	Rangers	https://apiv2.allsportsapi.com/logo/2221_rangers.jpg	2221
694	Scotland	https://apiv2.allsportsapi.com/logo/15_scotland.jpg	15
661	Yunnan Yukun	https://apiv2.allsportsapi.com/logo/31644_yunnan-yukun.jpg	31644
693	Haiti	https://apiv2.allsportsapi.com/logo/515_haiti.jpg	515
699	Paraguay	https://apiv2.allsportsapi.com/logo/537_paraguay.jpg	537
664	AS Fap	https://apiv2.allsportsapi.com/logo/9240_fap.jpg	9240
696	Germany	https://apiv2.allsportsapi.com/logo/21_germany.jpg	21
667	Ngoketunjia	https://apiv2.allsportsapi.com/logo/9245_ngok-etunja.jpg	9245
697	Ivory Coast	https://apiv2.allsportsapi.com/logo/738_ivory-coast.jpg	738
643	U. De Concepcion	https://apiv2.allsportsapi.com/logo/8892_universidad-concepcion.jpg	8892
659	Bolivar	https://apiv2.allsportsapi.com/logo/548_bolivar.jpg	548
627	Nacao	https://apiv2.allsportsapi.com/logo/25992_nacao.jpg	25992
638	Curico Unido	https://apiv2.allsportsapi.com/logo/2209_curico-unido.jpg	2209
700	Netherlands	https://apiv2.allsportsapi.com/logo/10_netherlands.jpg	10
682	Niroye Zamini	https://apiv2.allsportsapi.com/logo/15030_niroye-zamini.jpg	15030
657	Aurora	https://apiv2.allsportsapi.com/logo/1650_aurora.jpg	1650
651	San Felipe	https://apiv2.allsportsapi.com/logo/2220_union-san-felipe.jpg	2220
668	Sable	https://apiv2.allsportsapi.com/logo/3723_sable.jpg	3723
655	Pinheiro	https://apiv2.allsportsapi.com/logo/2031_pinheiro.jpg	2031
653	S. Wanderers	https://apiv2.allsportsapi.com/logo/2217_santiago-wanderers.jpg	2217
647	D. Puerto Montt	https://apiv2.allsportsapi.com/logo/2222_puerto-montt.jpg	2222
650	Union La Calera	https://apiv2.allsportsapi.com/logo/2218_union-la-calera.jpg	2218
684	Saipa	https://apiv2.allsportsapi.com/logo/4737_saipa.jpg	4737
632	Leonico	https://apiv2.allsportsapi.com/logo/31468_leonico.jpg	31468
644	Antofagasta	https://apiv2.allsportsapi.com/logo/2210_deportes-antofagasta.jpg	2210
631	Caravaggio	https://apiv2.allsportsapi.com/logo/4844_caravaggio.jpg	4844
633	Jacobina	https://apiv2.allsportsapi.com/logo/1988_jacobina.jpg	1988
629	Metropolitano	https://apiv2.allsportsapi.com/logo/2013_metropolitano.jpg	2013
676	Damash Gilan	https://apiv2.allsportsapi.com/logo/15034_damash-gilanian.jpg	15034
1469	Shanghai Port	https://apiv2.allsportsapi.com/logo/2256_shanghai-port.jpg	2256
646	Huachipato	https://apiv2.allsportsapi.com/logo/2212_huachipato.jpg	2212
658	Always Ready	https://apiv2.allsportsapi.com/logo/1645_always-ready.jpg	1645
669	Tonnerre	https://apiv2.allsportsapi.com/logo/2185_tonnerre.jpg	2185
679	Pars Janoobi Jam	https://apiv2.allsportsapi.com/logo/4748_pars-jonoubi-jam.jpg	4748
689	Shahrdari Noshahr	https://apiv2.allsportsapi.com/logo/23866_shahrdari-noshahr.jpg	23866
640	Everton	https://apiv2.allsportsapi.com/logo/2211_everton.jpg	2211
660	Suzhou Dongwu	https://apiv2.allsportsapi.com/logo/2245_suzhou-dongwu-fc.jpg	2245
713	Zhodino	https://apiv2.allsportsapi.com/logo/1338_torpedo-belaz.jpg	1338
707	Kaspij Aktau	https://apiv2.allsportsapi.com/logo/5109_kaspiy.jpg	5109
731	KFUM Oslo 2	https://apiv2.allsportsapi.com/logo/31525_kfum-ii.jpg	31525
720	Westchester SC	https://apiv2.allsportsapi.com/logo/38617_westchester-sc.jpg	38617
763	Oppsal	https://apiv2.allsportsapi.com/logo/5646_oppsal.jpg	5646
740	Volda TI	https://apiv2.allsportsapi.com/logo/10960_volda.jpg	10960
746	OS TF	https://apiv2.allsportsapi.com/logo/10951_os.jpg	10951
717	Isloch	https://apiv2.allsportsapi.com/logo/1334_isloch.jpg	1334
766	Raelingen	https://apiv2.allsportsapi.com/logo/15634_raelingen.jpg	15634
764	Lyn 2	https://apiv2.allsportsapi.com/logo/38651_lyn-ii.jpg	38651
721	Portland Hearts of Pine	https://apiv2.allsportsapi.com/logo/38614_portland-hearts-of-pine.jpg	38614
704	Kaisar Kyzylorda	https://apiv2.allsportsapi.com/logo/204_kaisar-kyzylorda.jpg	204
706	Ordabasy	https://apiv2.allsportsapi.com/logo/244_ordabasy.jpg	244
729	Asker	https://apiv2.allsportsapi.com/logo/5619_asker.jpg	5619
759	Alta	https://apiv2.allsportsapi.com/logo/5613_alta.jpg	5613
735	Herd	https://apiv2.allsportsapi.com/logo/5685_herd.jpg	5685
741	Byasen	https://apiv2.allsportsapi.com/logo/10964_bysen.jpg	10964
734	FK Kvik	https://apiv2.allsportsapi.com/logo/15664_kvik-trondheim.jpg	15664
777	Haugesund W	https://apiv2.allsportsapi.com/logo/39131_haugesund-w.jpg	39131
743	Djerv 1919	https://apiv2.allsportsapi.com/logo/10949_djerv.jpg	10949
737	Ntnui	https://apiv2.allsportsapi.com/logo/5687_ntnui.jpg	5687
723	Konnerud	\N	39384
756	Skjervoy	https://apiv2.allsportsapi.com/logo/5653_skjervy.jpg	5653
703	Zhetysu Taldykorgan	https://apiv2.allsportsapi.com/logo/5111_zhetysu.jpg	5111
711	Athletic Club	https://apiv2.allsportsapi.com/logo/1871_athletic-club-mg.jpg	1871
760	Drobak-Frogn	https://apiv2.allsportsapi.com/logo/15584_drbak--frogn.jpg	15584
708	Zhenis	https://apiv2.allsportsapi.com/logo/12224_zhenys-astana.jpg	12224
714	FC Gomel	https://apiv2.allsportsapi.com/logo/1336_gomel.jpg	1336
719	Dynamo Brest	https://apiv2.allsportsapi.com/logo/123_dinamo-brest.jpg	123
733	Grei	https://apiv2.allsportsapi.com/logo/15607_sf-grei.jpg	15607
736	Nardo	https://apiv2.allsportsapi.com/logo/5632_nardo.jpg	5632
718	Vitebsk	https://apiv2.allsportsapi.com/logo/1340_vitebsk.jpg	1340
748	Stord	https://apiv2.allsportsapi.com/logo/10959_stord.jpg	10959
730	Ullern	https://apiv2.allsportsapi.com/logo/5639_ullern.jpg	5639
726	Lokomotiv Oslo	https://apiv2.allsportsapi.com/logo/10975_lokomotiv-oslo.jpg	10975
722	Baerum Sportsklubb	https://apiv2.allsportsapi.com/logo/5598_brum.jpg	5598
728	Nordstrand	https://apiv2.allsportsapi.com/logo/5645_nordstrand.jpg	5645
732	Union Carl Berner	\N	35190
744	Gneist	https://apiv2.allsportsapi.com/logo/25110_gneist.jpg	25110
727	Frigg	https://apiv2.allsportsapi.com/logo/10952_frigg.jpg	10952
725	Gamle Oslo	https://apiv2.allsportsapi.com/logo/25106_gamle-oslo.jpg	25106
745	Askoy	https://apiv2.allsportsapi.com/logo/34290_asky.jpg	34290
751	Austevoll	\N	15573
750	V. Haugesund	https://apiv2.allsportsapi.com/logo/5625_vard.jpg	5625
753	Fauske Sprint	\N	15658
738	Spjelkavik	https://apiv2.allsportsapi.com/logo/5649_spjelkavik.jpg	5649
747	Brann 2	https://apiv2.allsportsapi.com/logo/10957_brann-ii.jpg	10957
769	Fram	https://apiv2.allsportsapi.com/logo/5589_if-fram.jpg	5589
758	Skjetten	https://apiv2.allsportsapi.com/logo/5663_skjetten.jpg	5663
742	Fyllingsdalen	https://apiv2.allsportsapi.com/logo/5627_fyllingsdalen.jpg	5627
752	Finnsnes	https://apiv2.allsportsapi.com/logo/10973_finnsnes.jpg	10973
749	Varegg	https://apiv2.allsportsapi.com/logo/15626_varegg.jpg	15626
757	Bossekop	https://apiv2.allsportsapi.com/logo/15614_bossekop.jpg	15614
754	Lillestrom 2	https://apiv2.allsportsapi.com/logo/10931_lillestrm-ii.jpg	10931
709	Ertis Pavlodar	https://apiv2.allsportsapi.com/logo/12553_ertis.jpg	12553
762	Elverum	https://apiv2.allsportsapi.com/logo/5615_elverum.jpg	5615
768	Sarpsborg 08 2	https://apiv2.allsportsapi.com/logo/10939_sarpsborg-08-ii.jpg	10939
715	Dnepr Mogilev	https://apiv2.allsportsapi.com/logo/8501_dnepr-mogilev.jpg	8501
779	Valerenga W	https://apiv2.allsportsapi.com/logo/56_vlerenga-w.jpg	56
775	Lyn W	https://apiv2.allsportsapi.com/logo/9773_lyn-women.jpg	9773
761	Rade	https://apiv2.allsportsapi.com/logo/25105_rde.jpg	25105
770	SK Gjovik-Lyn	https://apiv2.allsportsapi.com/logo/5700_gjvik-lyn.jpg	5700
771	Orn	https://apiv2.allsportsapi.com/logo/5672_rn-horten.jpg	5672
765	Lillehammer	https://apiv2.allsportsapi.com/logo/15546_lillehammer.jpg	15546
755	Ulfstind	https://apiv2.allsportsapi.com/logo/34292_ulfstind.jpg	34292
774	Honefoss W	https://apiv2.allsportsapi.com/logo/25337_hnefoss-women.jpg	25337
776	Molde W	https://apiv2.allsportsapi.com/logo/33620_molde-w.jpg	33620
716	Slavia Mozyr	https://apiv2.allsportsapi.com/logo/1344_slavia.jpg	1344
767	Bjorkelangen	https://apiv2.allsportsapi.com/logo/34291_bjrkelangen.jpg	34291
712	Belshina	https://apiv2.allsportsapi.com/logo/11574_belshina.jpg	11574
778	Rosenborg W	https://apiv2.allsportsapi.com/logo/9771_rosenborg-w.jpg	9771
780	Stabaek W	https://apiv2.allsportsapi.com/logo/9772_stabk-women.jpg	9772
772	Aalesund W	https://apiv2.allsportsapi.com/logo/25334_fortuna-lesund-w.jpg	25334
724	Heming	\N	5655
781	Roa W	https://apiv2.allsportsapi.com/logo/11793_ra-women.jpg	11793
787	Mjondalen	https://apiv2.allsportsapi.com/logo/5590_mjndalen.jpg	5590
783	Vidar	https://apiv2.allsportsapi.com/logo/10946_vidar.jpg	10946
800	Almagro	https://apiv2.allsportsapi.com/logo/955_almagro.jpg	955
785	Sotra	https://apiv2.allsportsapi.com/logo/5626_sotra.jpg	5626
804	Ciudad Bolivar	https://apiv2.allsportsapi.com/logo/11704_ciudad-de-bolivar.jpg	11704
791	Lysekloster	https://apiv2.allsportsapi.com/logo/5682_lysekloster.jpg	5682
847	Grobina	https://apiv2.allsportsapi.com/logo/5189_grobia.jpg	5189
789	Eik-Tonsberg	https://apiv2.allsportsapi.com/logo/10937_eik-tnsberg.jpg	10937
854	Newcastle Jets U23	https://apiv2.allsportsapi.com/logo/17850_newcastle-jets-ii.jpg	17850
849	Northern Tigers	https://apiv2.allsportsapi.com/logo/19223_northern-tigers.jpg	19223
784	Kvik Halden	https://apiv2.allsportsapi.com/logo/5616_kvik-halden.jpg	5616
837	Hoyvik	https://apiv2.allsportsapi.com/logo/10708_hoyvik.jpg	10708
796	Tromsdalen	https://apiv2.allsportsapi.com/logo/5610_tromsdalen.jpg	5610
797	Stjordals Blink	https://apiv2.allsportsapi.com/logo/5651_stjrdals-blink.jpg	5651
811	Racing Cordoba	https://apiv2.allsportsapi.com/logo/11585_racing-cordoba.jpg	11585
795	Skeid	https://apiv2.allsportsapi.com/logo/5600_skeid.jpg	5600
799	San Miguel	https://apiv2.allsportsapi.com/logo/921_san-miguel.jpg	921
821	Deportivo Camioneros	https://apiv2.allsportsapi.com/logo/903_deportivo-camioneros.jpg	903
801	Atletico Atlanta	https://apiv2.allsportsapi.com/logo/928_atlanta.jpg	928
802	Chaco For Ever	https://apiv2.allsportsapi.com/logo/886_chaco-for-ever.jpg	886
798	Acassuso	https://apiv2.allsportsapi.com/logo/909_acassuso.jpg	909
810	San Telmo	https://apiv2.allsportsapi.com/logo/944_san-telmo.jpg	944
807	Quilmes	https://apiv2.allsportsapi.com/logo/931_quilmes.jpg	931
843	Nomme Utd	https://apiv2.allsportsapi.com/logo/3464_nomme-united.jpg	3464
838	Streymur	https://apiv2.allsportsapi.com/logo/3476_eb--streymur.jpg	3476
848	Hakoah Sydney	https://apiv2.allsportsapi.com/logo/19224_hakoah-sydney-city.jpg	19224
851	Central Coast Mariners U23	https://apiv2.allsportsapi.com/logo/19215_central-coast-ii.jpg	19215
792	Kjelsas	https://apiv2.allsportsapi.com/logo/5618_kjelss.jpg	5618
830	UAI Urquiza	https://apiv2.allsportsapi.com/logo/923_uai-urquiza.jpg	923
852	Hills United	https://apiv2.allsportsapi.com/logo/19221_hills-united.jpg	19221
835	Sandur	https://apiv2.allsportsapi.com/logo/3486_b71.jpg	3486
793	Ull/Kisa	https://apiv2.allsportsapi.com/logo/5603_ullensaker--kisa.jpg	5603
803	Colon Santa Fe	https://apiv2.allsportsapi.com/logo/988_colon.jpg	988
809	Atl. Rafaela	https://apiv2.allsportsapi.com/logo/941_atletico-rafaela.jpg	941
829	Comunicaciones	https://apiv2.allsportsapi.com/logo/283_comunicaciones.jpg	283
817	Argentino de Quilmes	https://apiv2.allsportsapi.com/logo/910_argentino-quilmes.jpg	910
806	Colegiales	https://apiv2.allsportsapi.com/logo/912_colegiales.jpg	912
842	Harju JK Laagri	https://apiv2.allsportsapi.com/logo/24487_laagri.jpg	24487
839	Skala Itrottarfelag	https://apiv2.allsportsapi.com/logo/3479_skala.jpg	3479
824	Laferrere	https://apiv2.allsportsapi.com/logo/963_deportivo-laferrere.jpg	963
813	Dock Sud	https://apiv2.allsportsapi.com/logo/964_dock-sud.jpg	964
834	B36 Torshavn 2	https://apiv2.allsportsapi.com/logo/3484_b36-ii.jpg	3484
826	Real Pilar	https://apiv2.allsportsapi.com/logo/972_real-pilar.jpg	972
846	BFC Daugavpils	https://apiv2.allsportsapi.com/logo/5197_bfc-daugavpils.jpg	5197
818	Deportivo Armenio	https://apiv2.allsportsapi.com/logo/914_deportivo-armenio.jpg	914
833	Sportivo Italiano	https://apiv2.allsportsapi.com/logo/974_sportivo-italiano.jpg	974
822	Ituzaingo	https://apiv2.allsportsapi.com/logo/968_ituzaingo.jpg	968
815	Dep. Merlo	https://apiv2.allsportsapi.com/logo/915_deportivo-merlo.jpg	915
828	Talleres (R.E)	https://apiv2.allsportsapi.com/logo/922_talleres-remedios.jpg	922
788	Pors	https://apiv2.allsportsapi.com/logo/5621_pors.jpg	5621
825	Defensores Unidos	https://apiv2.allsportsapi.com/logo/913_defensores-unidos.jpg	913
812	Argentino de Merlo	https://apiv2.allsportsapi.com/logo/957_argentino-merlo.jpg	957
816	Brown Adrogue	https://apiv2.allsportsapi.com/logo/952_brown-de-adrogue.jpg	952
819	Flandria	https://apiv2.allsportsapi.com/logo/916_flandria.jpg	916
831	San Martin Burzaco	https://apiv2.allsportsapi.com/logo/973_san-martin-burzaco.jpg	973
823	Liniers	https://apiv2.allsportsapi.com/logo/976_liniers.jpg	976
820	Excursionistas	https://apiv2.allsportsapi.com/logo/966_excursionistas.jpg	966
836	HB Torshavn 2	https://apiv2.allsportsapi.com/logo/3482_hb-ii.jpg	3482
814	Arsenal Sarandi	https://apiv2.allsportsapi.com/logo/997_arsenal-fc.jpg	997
840	NSI Runavik	https://apiv2.allsportsapi.com/logo/266_nsi.jpg	266
790	Sandviken	https://apiv2.allsportsapi.com/logo/10958_sandviken.jpg	10958
841	Toftir	https://apiv2.allsportsapi.com/logo/3477_b68.jpg	3477
845	Kalju	https://apiv2.allsportsapi.com/logo/262_nomme-kalju.jpg	262
850	Bankstown City Lions	https://apiv2.allsportsapi.com/logo/12758_bankstown-city-lions.jpg	12758
855	Macarthur Rams	https://apiv2.allsportsapi.com/logo/12756_macarthur-rams.jpg	12756
844	Levadia	https://apiv2.allsportsapi.com/logo/3465_fci-levadia.jpg	3465
786	Notodden	https://apiv2.allsportsapi.com/logo/5675_notodden.jpg	5675
853	Prospect United	https://apiv2.allsportsapi.com/logo/40745_prospect-united.jpg	40745
832	Villa Dalmine	https://apiv2.allsportsapi.com/logo/946_villa-dalmine.jpg	946
856	Dulwich Hill	https://apiv2.allsportsapi.com/logo/30516_dulwich-hill.jpg	30516
871	NWS Spirit	https://apiv2.allsportsapi.com/logo/19219_nws-spirit.jpg	19219
884	Manningham United Blues	https://apiv2.allsportsapi.com/logo/19204_manningham-united-blues.jpg	19204
859	Canterbury Bankstown	\N	16293
868	Sydney Olympic	https://apiv2.allsportsapi.com/logo/1065_sydney-olympic-fc.jpg	1065
931	Boston Bolts	https://apiv2.allsportsapi.com/logo/7866_boston-bolts.jpg	7866
860	Bulls Academy	https://apiv2.allsportsapi.com/logo/30519_bulls-academy.jpg	30519
933	New Jersey Copa	https://apiv2.allsportsapi.com/logo/11929_new-jersey-copa.jpg	11929
862	Inter Lions	https://apiv2.allsportsapi.com/logo/30513_inter-lions.jpg	30513
925	Houston FC	https://apiv2.allsportsapi.com/logo/7861_houston.jpg	7861
861	Hurstville Zagreb	\N	42404
920	River Light	https://apiv2.allsportsapi.com/logo/34756_river-light.jpg	34756
866	Manly Utd	https://apiv2.allsportsapi.com/logo/1060_manly-united.jpg	1060
928	Tobacco Road	https://apiv2.allsportsapi.com/logo/7879_tobacco-road.jpg	7879
869	Rockdale Ilinden	https://apiv2.allsportsapi.com/logo/1058_rockdale-ilinden-fc.jpg	1058
929	Asheville City	https://apiv2.allsportsapi.com/logo/7902_asheville-city.jpg	7902
914	FK Panevezys	https://apiv2.allsportsapi.com/logo/5252_panevys.jpg	5252
175	Fort Wayne	https://apiv2.allsportsapi.com/logo/11919_fort-wayne.jpg	11919
864	WS Wanderers U21	\N	42434
865	Sutherland Sharks	https://apiv2.allsportsapi.com/logo/1066_sutherland-sharks.jpg	1066
917	Kauno Zalgiris	https://apiv2.allsportsapi.com/logo/5251_kauno-algiris.jpg	5251
870	St. George City	https://apiv2.allsportsapi.com/logo/19216_st-george-city-fa.jpg	19216
927	Bethesda SC	\N	42516
924	Houston Sur	https://apiv2.allsportsapi.com/logo/25028_houston-sur.jpg	25028
863	Western City Rangers	https://apiv2.allsportsapi.com/logo/1061_mt-druitt-town.jpg	1061
858	Rydalmere Lions	https://apiv2.allsportsapi.com/logo/30514_rydalmere-lions.jpg	30514
926	Loudoun 2	\N	42498
883	Northcote City	https://apiv2.allsportsapi.com/logo/18842_northcote-city.jpg	18842
888	Hume City	https://apiv2.allsportsapi.com/logo/10416_hume-city.jpg	10416
872	Changwon	https://apiv2.allsportsapi.com/logo/5150_changwon.jpg	5150
887	Melbourne Knights	https://apiv2.allsportsapi.com/logo/10409_melbourne-knights-fc.jpg	10409
934	Kings Hammer Columbus	\N	39549
873	Mokpo	https://apiv2.allsportsapi.com/logo/5147_mokpo.jpg	5147
874	Yangpyeong	https://apiv2.allsportsapi.com/logo/8943_yangpyeong.jpg	8943
875	Yeoju Citizen	https://apiv2.allsportsapi.com/logo/8952_yeoju-citizen.jpg	8952
886	Melbourne Srbija	https://apiv2.allsportsapi.com/logo/36410_melbourne-srbija.jpg	36410
909	Ayema	https://apiv2.allsportsapi.com/logo/10294_ayema.jpg	10294
919	Zalgiris	https://apiv2.allsportsapi.com/logo/216_algiris.jpg	216
885	North Geelong	https://apiv2.allsportsapi.com/logo/19205_north-geelong-warriors.jpg	19205
915	FA Siauliai	https://apiv2.allsportsapi.com/logo/5238_fa-iauliai.jpg	5238
913	Dynamo Abomey	\N	11200
912	Krake	\N	37978
911	ASVO	https://apiv2.allsportsapi.com/logo/10306_asvo.jpg	10306
906	Damissa	https://apiv2.allsportsapi.com/logo/10285_damissa.jpg	10285
923	Portland Bangers	\N	39579
902	ASPAC	https://apiv2.allsportsapi.com/logo/10304_aspac.jpg	10304
899	Buffles du Borgou	https://apiv2.allsportsapi.com/logo/8150_buffles.jpg	8150
908	Hodio	https://apiv2.allsportsapi.com/logo/10301_hodio.jpg	10301
900	AS Cotonou	https://apiv2.allsportsapi.com/logo/10302_as-cotonou.jpg	10302
907	Dadje	https://apiv2.allsportsapi.com/logo/10298_dadje.jpg	10298
910	JS Pobe	\N	41724
857	Blacktown Spartans	https://apiv2.allsportsapi.com/logo/19217_blacktown-spartans.jpg	19217
898	Dragons	\N	11199
916	Transinvest	https://apiv2.allsportsapi.com/logo/24991_transinvest-vilnius.jpg	24991
896	Coton FC	https://apiv2.allsportsapi.com/logo/23450_coton-sport-ouidah.jpg	23450
897	FC Loto	https://apiv2.allsportsapi.com/logo/23451_loto-popo.jpg	23451
903	Cavaliers	https://apiv2.allsportsapi.com/logo/10295_cavaliers.jpg	10295
932	Motown 2	https://apiv2.allsportsapi.com/logo/25044_fc-motown-ii.jpg	25044
876	Chuncheon	https://apiv2.allsportsapi.com/logo/8944_chuncheon.jpg	8944
889	Green Gully	https://apiv2.allsportsapi.com/logo/10419_green-gully.jpg	10419
867	St George Saints	https://apiv2.allsportsapi.com/logo/19220_st-george-saints.jpg	19220
877	Siheung Citizen	https://apiv2.allsportsapi.com/logo/8942_siheung-citizen.jpg	8942
878	Daejeon Korail	https://apiv2.allsportsapi.com/logo/5156_daejeon-korail.jpg	5156
879	Jeonbuk 2	https://apiv2.allsportsapi.com/logo/39046_jeonbuk-motors-ii.jpg	39046
880	Dangjin Citizen	https://apiv2.allsportsapi.com/logo/24494_dangjin-citizen.jpg	24494
881	Ulsan Citizen	https://apiv2.allsportsapi.com/logo/5157_ulsan-citizen.jpg	5157
905	AS Sobemap	\N	41725
890	Avondale FC	https://apiv2.allsportsapi.com/logo/10414_avondale-united.jpg	10414
891	Dandenong Thunder	https://apiv2.allsportsapi.com/logo/10410_dandenong-thunder.jpg	10410
892	Heidelberg Utd	https://apiv2.allsportsapi.com/logo/10420_heidelberg-united.jpg	10420
893	Preston Lions	https://apiv2.allsportsapi.com/logo/18844_preston-lions.jpg	18844
894	George Cross	https://apiv2.allsportsapi.com/logo/18850_george-cross.jpg	18850
895	Dandenong City	https://apiv2.allsportsapi.com/logo/10411_dandenong-city.jpg	10411
901	Espoir	https://apiv2.allsportsapi.com/logo/11198_espoir.jpg	11198
918	Banga	https://apiv2.allsportsapi.com/logo/5255_banga.jpg	5255
937	Delaware	\N	39494
953	Broadmeadow	https://apiv2.allsportsapi.com/logo/8492_broadmeadow-magic.jpg	8492
954	Valentine	https://apiv2.allsportsapi.com/logo/8499_valentine.jpg	8499
976	Santos U20	https://apiv2.allsportsapi.com/logo/9131_santos-u20.jpg	9131
948	Cooks Hill United	https://apiv2.allsportsapi.com/logo/23882_cooks-hill-united.jpg	23882
967	Corinthians U20	https://apiv2.allsportsapi.com/logo/9119_corinthians-u20.jpg	9119
972	Gremio U20	https://apiv2.allsportsapi.com/logo/9122_gremio-u20.jpg	9122
951	Adamstown Rosebud	https://apiv2.allsportsapi.com/logo/8491_adamstown-rosebuds.jpg	8491
962	Redlands	https://apiv2.allsportsapi.com/logo/9571_redlands-united.jpg	9571
979	Flamengo RJ U20	https://apiv2.allsportsapi.com/logo/9118_flamengo-u20.jpg	9118
947	Wynnum Wolves	https://apiv2.allsportsapi.com/logo/17838_wolves.jpg	17838
943	Brisbane Roar U23	https://apiv2.allsportsapi.com/logo/9561_brisbane-roar-ii.jpg	9561
971	Athletico-PR U20	https://apiv2.allsportsapi.com/logo/9117_athletico-pr-u20.jpg	9117
945	Brisbane City	https://apiv2.allsportsapi.com/logo/18205_brisbane-city.jpg	18205
981	RB Bragantino U20	https://apiv2.allsportsapi.com/logo/23906_rb-bragantino-u20.jpg	23906
941	Lorain County Leviathan	\N	42512
965	Juventude U20	https://apiv2.allsportsapi.com/logo/10813_juventude-u20.jpg	10813
936	Philadelphia Lone Star	https://apiv2.allsportsapi.com/logo/12334_lone-star-ii.jpg	12334
980	Vasco U20	https://apiv2.allsportsapi.com/logo/9126_vasco-da-gama-u20.jpg	9126
983	Botafogo U20	https://apiv2.allsportsapi.com/logo/34310_botafogo-u20.jpg	34310
957	Logan Lightning	https://apiv2.allsportsapi.com/logo/9568_logan-lightning.jpg	9568
995	Armadale	https://apiv2.allsportsapi.com/logo/1079_armadale.jpg	1079
940	Cleveland Force	https://apiv2.allsportsapi.com/logo/25037_cleveland-force.jpg	25037
968	Cuiaba U20	https://apiv2.allsportsapi.com/logo/10887_cuiaba-u20.jpg	10887
955	Edgeworth E.	https://apiv2.allsportsapi.com/logo/8494_edgeworth-eagles.jpg	8494
939	Ann Arbor	\N	25101
984	Botafogo PB	https://apiv2.allsportsapi.com/logo/1796_botafogo-pb.jpg	1796
938	Kalamazoo FC	https://apiv2.allsportsapi.com/logo/11914_kalamazoo-fc.jpg	11914
950	Lambton J.	https://apiv2.allsportsapi.com/logo/8496_lambton-jaffas.jpg	8496
993	Perth RedStar	https://apiv2.allsportsapi.com/logo/24674_perth-redstar.jpg	24674
985	Volta Redonda	https://apiv2.allsportsapi.com/logo/1798_volta-redonda.jpg	1798
970	Fluminense U20	https://apiv2.allsportsapi.com/logo/9121_fluminense-u20.jpg	9121
956	Robina City	\N	42527
949	Weston Bears	https://apiv2.allsportsapi.com/logo/8500_weston-workers.jpg	8500
992	Perth Glory U23	https://apiv2.allsportsapi.com/logo/1075_perth-glory-ii.jpg	1075
961	Broadbeach Utd.	https://apiv2.allsportsapi.com/logo/30634_broadbeach-united.jpg	30634
969	Criciuma U20	https://apiv2.allsportsapi.com/logo/10827_criciuma-u20.jpg	10827
982	Vitoria U20	https://apiv2.allsportsapi.com/logo/9130_vitoria-u20.jpg	9130
966	Cruzeiro U20	https://apiv2.allsportsapi.com/logo/9125_cruzeiro-u20.jpg	9125
959	Sunshine Coast Wanderers	https://apiv2.allsportsapi.com/logo/9566_sc-wanderers.jpg	9566
952	Belmont Swansea Utd.	https://apiv2.allsportsapi.com/logo/35416_belmont-swansea.jpg	35416
958	Capalaba	https://apiv2.allsportsapi.com/logo/9567_capalaba.jpg	9567
942	Gold Coast Utd	https://apiv2.allsportsapi.com/logo/9572_gold-coast-united.jpg	9572
960	North Star	https://apiv2.allsportsapi.com/logo/11680_north-star.jpg	11680
990	Olympic Kingsway	https://apiv2.allsportsapi.com/logo/11217_olympic-kingsway.jpg	11217
999	Adelaide Croatia Raiders	https://apiv2.allsportsapi.com/logo/1041_croatia-raiders.jpg	1041
996	Western Knights	https://apiv2.allsportsapi.com/logo/12761_western-knights.jpg	12761
994	Sorrento	https://apiv2.allsportsapi.com/logo/1071_sorrento.jpg	1071
987	Perth Azzurri	https://apiv2.allsportsapi.com/logo/1074_perth.jpg	1074
1000	Adelaide Cobras	https://apiv2.allsportsapi.com/logo/19210_adelaide-cobras.jpg	19210
991	Stirling Macedonia	https://apiv2.allsportsapi.com/logo/12763_stirling-macedonia.jpg	12763
986	Balcatta	https://apiv2.allsportsapi.com/logo/1077_balcatta-etna-fc.jpg	1077
1003	Cove FC	https://apiv2.allsportsapi.com/logo/38646_the-cove.jpg	38646
1008	Modbury Jets	https://apiv2.allsportsapi.com/logo/1047_modbury-jets.jpg	1047
964	Avai U20	https://apiv2.allsportsapi.com/logo/10802_avai-u20.jpg	10802
1007	Salisbury Utd.	https://apiv2.allsportsapi.com/logo/34199_salisbury-united.jpg	34199
1005	South Adelaide	https://apiv2.allsportsapi.com/logo/11587_south-adelaide-panthers.jpg	11587
946	Moreton City Excelsior	https://apiv2.allsportsapi.com/logo/34386_moreton-city-excelsior.jpg	34386
1006	Fulham Utd.	https://apiv2.allsportsapi.com/logo/19213_fulham-united.jpg	19213
998	Adelaide Atletico	\N	42629
1004	Cumberland Utd.	https://apiv2.allsportsapi.com/logo/1043_cumberland-united.jpg	1043
1001	Eastern United	https://apiv2.allsportsapi.com/logo/19212_eastern-united.jpg	19212
944	Eastern Suburbs	https://apiv2.allsportsapi.com/logo/9573_eastern-suburbs.jpg	9573
974	Palmeiras U20	https://apiv2.allsportsapi.com/logo/9123_palmeiras-u20.jpg	9123
975	America MG U20	https://apiv2.allsportsapi.com/logo/9132_america-mineiro-u20.jpg	9132
963	Ipswich	https://apiv2.allsportsapi.com/logo/34375_ipswich.jpg	34375
977	Bahia U20	https://apiv2.allsportsapi.com/logo/9135_bahia-u20.jpg	9135
988	Fremantle City	https://apiv2.allsportsapi.com/logo/12764_fremantle-city.jpg	12764
997	Bayswater	https://apiv2.allsportsapi.com/logo/1070_bayswater-city.jpg	1070
1002	Adelaide Olympic	https://apiv2.allsportsapi.com/logo/1044_adelaide-olympic.jpg	1044
1035	MAK	\N	42665
1011	Brujas Salamanca	https://apiv2.allsportsapi.com/logo/24785_brujas-de-salamanca.jpg	24785
1062	Wuhan Three Towns B	https://apiv2.allsportsapi.com/logo/39279_wuhan-three-towns-ii.jpg	39279
1074	BumProm Gomel	https://apiv2.allsportsapi.com/logo/8521_bumprom.jpg	8521
1015	Santiago City	https://apiv2.allsportsapi.com/logo/31334_santiago-city.jpg	31334
1069	Sejong Sportstoto W	https://apiv2.allsportsapi.com/logo/10929_sejong-w.jpg	10929
1010	Atletico Colina	https://apiv2.allsportsapi.com/logo/8894_colina.jpg	8894
1014	Trasandino	https://apiv2.allsportsapi.com/logo/8889_trasandino.jpg	8889
1009	Blue Eagles	https://apiv2.allsportsapi.com/logo/1045_adelaide-blue-eagles.jpg	1045
1075	Smorgon	https://apiv2.allsportsapi.com/logo/1345_smorgon.jpg	1345
1083	Cessnock City Hornets	https://apiv2.allsportsapi.com/logo/35338_cessnock-city.jpg	35338
1067	Gyeongju W	https://apiv2.allsportsapi.com/logo/10922_gyeongju-w.jpg	10922
1081	South Cardiff	https://apiv2.allsportsapi.com/logo/17847_south-cardiff.jpg	17847
1018	Atmosfera	https://apiv2.allsportsapi.com/logo/5239_atmosfera.jpg	5239
1072	Mungyeong Sangmu W	https://apiv2.allsportsapi.com/logo/10926_mungyeong-sangmu-w.jpg	10926
1080	Toronto Awaba Stags	https://apiv2.allsportsapi.com/logo/17849_toronto-awaba.jpg	17849
1034	TSK Simferopol	https://apiv2.allsportsapi.com/logo/10395_tsk-simferopol.jpg	10395
1023	Lokomotiv Moscow W	https://apiv2.allsportsapi.com/logo/11301_lokomotiv-moskva-w.jpg	11301
1037	Ocean Kerch	\N	10396
1036	Sparta-KT	\N	41282
1058	Adelaide City	https://apiv2.allsportsapi.com/logo/1042_adelaide-city.jpg	1042
1047	Sagadam	https://apiv2.allsportsapi.com/logo/10422_agadam.jpg	10422
1038	GFK Yalta	\N	41283
1059	NE Metrostars	https://apiv2.allsportsapi.com/logo/1039_metrostars.jpg	1039
1042	Altyn Asyr	https://apiv2.allsportsapi.com/logo/431_altyn-asyr.jpg	431
1045	Kopetdag Asgabat	https://apiv2.allsportsapi.com/logo/10423_kopetdag.jpg	10423
1040	Ahal	https://apiv2.allsportsapi.com/logo/456_ahal.jpg	456
1043	Nebitci	https://apiv2.allsportsapi.com/logo/10426_nebitci.jpg	10426
1046	Merw	https://apiv2.allsportsapi.com/logo/10425_merw.jpg	10425
1052	Sturt Lions	https://apiv2.allsportsapi.com/logo/11564_sturt-lions.jpg	11564
1044	Arkadag	https://apiv2.allsportsapi.com/logo/31562_arkadag.jpg	31562
1061	Shandong Taishan B	https://apiv2.allsportsapi.com/logo/35007_shandong-taishan-ii.jpg	35007
1078	Soligorsk	\N	42789
1057	West Torrens	https://apiv2.allsportsapi.com/logo/12751_wt-birkalla.jpg	12751
1063	Shenzhen	https://apiv2.allsportsapi.com/logo/39159_shenzhen-2028.jpg	39159
1049	Adelaide Comets	https://apiv2.allsportsapi.com/logo/1037_adelaide-comets.jpg	1037
1053	Para	https://apiv2.allsportsapi.com/logo/1048_para-hills-knights.jpg	1048
1056	FK Beograd	https://apiv2.allsportsapi.com/logo/12750_fk-beograd.jpg	12750
1066	Seoul W	https://apiv2.allsportsapi.com/logo/10925_seoul-w.jpg	10925
1065	Wenzhou Professional	https://apiv2.allsportsapi.com/logo/19594_wenzhou.jpg	19594
1082	Lake Macquarie	https://apiv2.allsportsapi.com/logo/8495_lake-macquarie.jpg	8495
1070	Incheon Hyundai Steel W	https://apiv2.allsportsapi.com/logo/10923_incheon-red-angels-w.jpg	10923
1084	New Lambton	https://apiv2.allsportsapi.com/logo/30518_new-lambton.jpg	30518
1079	Ostrovets	https://apiv2.allsportsapi.com/logo/8507_ostrovets.jpg	8507
1017	Ekranas	https://apiv2.allsportsapi.com/logo/12184_ekranas.jpg	12184
1016	Tauras Taurage	https://apiv2.allsportsapi.com/logo/8995_tauras.jpg	8995
1076	Osipovichi	https://apiv2.allsportsapi.com/logo/8504_osipovichi.jpg	8504
1012	Dep. Linares	https://apiv2.allsportsapi.com/logo/10496_linares.jpg	10496
1013	Deportes Rengo	https://apiv2.allsportsapi.com/logo/8895_deportes-rengo.jpg	8895
1051	Campbelltown City	https://apiv2.allsportsapi.com/logo/1038_campbelltown-city.jpg	1038
1024	Dynamo Moscow W	https://apiv2.allsportsapi.com/logo/31343_dinamo-moskva-w.jpg	31343
1022	Chertanovo M. W	https://apiv2.allsportsapi.com/logo/11305_chertanovo-w.jpg	11305
1054	West Adelaide	https://apiv2.allsportsapi.com/logo/17268_west-adelaide.jpg	17268
1064	Chengdu Rongcheng B	https://apiv2.allsportsapi.com/logo/39307_chengdu-rongcheng-ii.jpg	39307
1060	Taian Tiankuang	https://apiv2.allsportsapi.com/logo/25806_taian-tiankuang.jpg	25806
1073	Suwon FC W	https://apiv2.allsportsapi.com/logo/10928_suwon-w.jpg	10928
1077	Orsha	https://apiv2.allsportsapi.com/logo/1354_orsha.jpg	1354
1019	FK Minija	https://apiv2.allsportsapi.com/logo/5247_minija.jpg	5247
1020	BFA Vilnius	https://apiv2.allsportsapi.com/logo/5248_bfa.jpg	5248
1048	Adelaide United U23	https://apiv2.allsportsapi.com/logo/1046_adelaide-united-ii.jpg	1046
1025	Krasnodar W	https://apiv2.allsportsapi.com/logo/11302_krasnodar-w.jpg	11302
1026	FK Rostov W	https://apiv2.allsportsapi.com/logo/11300_rostov-w.jpg	11300
1027	FK Yenisey W	https://apiv2.allsportsapi.com/logo/11298_yenisey-w.jpg	11298
1028	Rubin Kazan W	https://apiv2.allsportsapi.com/logo/11303_rubin-kazan-w.jpg	11303
1029	CSKA Moscow W	https://apiv2.allsportsapi.com/logo/70_cska-moskva-w.jpg	70
1030	Zenit W	https://apiv2.allsportsapi.com/logo/11306_zenit-w.jpg	11306
1031	Ryazan W	https://apiv2.allsportsapi.com/logo/11299_ryazan-w.jpg	11299
1032	Zvezda 2005 W	https://apiv2.allsportsapi.com/logo/11304_zvezda-perm-w.jpg	11304
1033	Spartak Moscow W	https://apiv2.allsportsapi.com/logo/34883_spartak-moskva-w.jpg	34883
1041	FC Asgabat	https://apiv2.allsportsapi.com/logo/10424_agabat.jpg	10424
1055	Croydon	https://apiv2.allsportsapi.com/logo/1040_croydon.jpg	1040
1039	Zarechnoye	\N	41281
1106	Northern Rangers	https://apiv2.allsportsapi.com/logo/35327_northern-rangers.jpg	35327
1089	Floreat Athena	https://apiv2.allsportsapi.com/logo/1073_floreat-athena.jpg	1073
1086	Curtin Univ	https://apiv2.allsportsapi.com/logo/38989_curtin-university.jpg	38989
1103	Launceston	https://apiv2.allsportsapi.com/logo/11246_launceston-city.jpg	11246
1131	Spartak Moscow 2	https://apiv2.allsportsapi.com/logo/6278_spartak-moskva-ii.jpg	6278
1146	Volna Nizhegorodskaya	https://apiv2.allsportsapi.com/logo/6255_volna-nizhegorodskaya.jpg	6255
1130	Zvezda St. Peterburg	https://apiv2.allsportsapi.com/logo/6226_zvezda-st.-petersburg.jpg	6226
1153	O'Connor Knights	https://apiv2.allsportsapi.com/logo/18047_oconnor-knights.jpg	18047
1133	SKA Khabarovsk 2	https://apiv2.allsportsapi.com/logo/19435_ska-khabarovsk-ii.jpg	19435
1150	Canberra Olympic	https://apiv2.allsportsapi.com/logo/8958_canberra-olympic.jpg	8958
1088	Joondalup	\N	24567
1090	Mandurah City	https://apiv2.allsportsapi.com/logo/11221_mandurah-city.jpg	11221
1093	Inglewood Utd	https://apiv2.allsportsapi.com/logo/1069_inglewood-united.jpg	1069
1098	Devonport	https://apiv2.allsportsapi.com/logo/11240_devonport-city.jpg	11240
1091	Cockburn City	https://apiv2.allsportsapi.com/logo/1076_cockburn-city.jpg	1076
1099	Clarence Zebras	https://apiv2.allsportsapi.com/logo/11245_clarence-zebras.jpg	11245
1095	Gwelup Croatia	https://apiv2.allsportsapi.com/logo/1078_gwelup-croatia.jpg	1078
1094	Nedlands	https://apiv2.allsportsapi.com/logo/35415_uwa-nedlands.jpg	35415
1092	Murdoch Melville	https://apiv2.allsportsapi.com/logo/35294_murdoch-uni-melville.jpg	35294
1108	Devonport U21	https://apiv2.allsportsapi.com/logo/35356_devonport-city-ii.jpg	35356
1087	Kingsley Westside	https://apiv2.allsportsapi.com/logo/35296_kingsley-westside.jpg	35296
1111	Launceston United U21	https://apiv2.allsportsapi.com/logo/35344_launceston-united-ii.jpg	35344
1105	Glenorchy Knights	https://apiv2.allsportsapi.com/logo/11244_glenorchy-knights.jpg	11244
1102	Riverside Olympic	https://apiv2.allsportsapi.com/logo/11243_riverside.jpg	11243
1115	Hobart Utd.	https://apiv2.allsportsapi.com/logo/35339_hobart-united.jpg	35339
1143	FK Strogino Moscow	https://apiv2.allsportsapi.com/logo/6239_strogino.jpg	6239
1107	Somerset	https://apiv2.allsportsapi.com/logo/23308_somerset.jpg	23308
1119	FC Sevastopol	https://apiv2.allsportsapi.com/logo/16790_sevastopol.jpg	16790
1112	Hobart City	https://apiv2.allsportsapi.com/logo/35343_hobart-city.jpg	35343
1121	PSK Dinskoy rayon	\N	39878
1109	Riverside Olympic U21	https://apiv2.allsportsapi.com/logo/35355_riverside-ii.jpg	35355
1125	FK Chayka 2	\N	42828
1113	Taroona	https://apiv2.allsportsapi.com/logo/21838_taroona.jpg	21838
1114	New Town	https://apiv2.allsportsapi.com/logo/35341_new-town-white-eagles.jpg	35341
1129	Lugansk	\N	42827
1116	Angust Nazran	https://apiv2.allsportsapi.com/logo/16022_angusht.jpg	16022
1117	Rostov 2	https://apiv2.allsportsapi.com/logo/35113_rostov-ii.jpg	35113
1122	Izberbash	\N	42829
1120	FK Pobeda	https://apiv2.allsportsapi.com/logo/33021_pobeda.jpg	33021
1127	Shahter Taganrog	\N	42826
1126	Nart Cherkessk	https://apiv2.allsportsapi.com/logo/35100_nart-cherkessk.jpg	35100
1123	Rubin Yalta	https://apiv2.allsportsapi.com/logo/10397_rubin-yalta.jpg	10397
1149	Klepp W	https://apiv2.allsportsapi.com/logo/9769_klepp-w.jpg	9769
1118	Astrakhan	https://apiv2.allsportsapi.com/logo/16042_astrakhan.jpg	16042
1135	Arsenal Tula 2	https://apiv2.allsportsapi.com/logo/19415_arsenal-tula-ii.jpg	19415
1137	Penza	https://apiv2.allsportsapi.com/logo/16043_zenit-penza.jpg	16043
1124	Maykop	https://apiv2.allsportsapi.com/logo/6213_druzhba.jpg	6213
1128	Spartak Nalchik	https://apiv2.allsportsapi.com/logo/6206_spartak-nalchik.jpg	6206
1139	FK Shumbrat Saransk	\N	41246
1134	Oryol	https://apiv2.allsportsapi.com/logo/16018_orel.jpg	16018
1152	Brindabella	https://apiv2.allsportsapi.com/logo/35291_brindabella-blues.jpg	35291
1148	Fyllingsdalen W	https://apiv2.allsportsapi.com/logo/30830_fyllingsdalen-w.jpg	30830
1145	Lipetsk	https://apiv2.allsportsapi.com/logo/6234_metallurg-lipetsk.jpg	6234
1140	Ryazan	https://apiv2.allsportsapi.com/logo/6236_ryazan.jpg	6236
1154	Tuggeranong Utd	https://apiv2.allsportsapi.com/logo/8962_tuggeranong-united.jpg	8962
1151	Monaro Panthers	https://apiv2.allsportsapi.com/logo/8961_monaro-panthers.jpg	8961
1132	Kvant	https://apiv2.allsportsapi.com/logo/6245_kvant.jpg	6245
1142	Salyut-Belgorod	https://apiv2.allsportsapi.com/logo/6235_salyut-belgorod.jpg	6235
1147	Kursk	https://apiv2.allsportsapi.com/logo/6243_avangard-kursk.jpg	6243
1138	R. Volgograd 2	https://apiv2.allsportsapi.com/logo/16006_rotor-volgograd-ii.jpg	16006
1141	Spartak Tambov	https://apiv2.allsportsapi.com/logo/25949_fk-spartak-tambov.jpg	25949
1136	Rodina Moscow 3	https://apiv2.allsportsapi.com/logo/25951_rodina-moskva-iii.jpg	25951
1157	Queanbeyan City	https://apiv2.allsportsapi.com/logo/18045_queanbeyan-city-fc.jpg	18045
1159	Canberra Croatia	https://apiv2.allsportsapi.com/logo/8957_canberra-croatia.jpg	8957
1155	Canberra White Eagles	https://apiv2.allsportsapi.com/logo/35292_canberra-white-eagles.jpg	35292
1101	Ulverstone	https://apiv2.allsportsapi.com/logo/35328_ulverstone.jpg	35328
1100	Launceston United	https://apiv2.allsportsapi.com/logo/31029_launceston-united.jpg	31029
1096	Quinns	\N	42806
1158	Tigers FC	https://apiv2.allsportsapi.com/logo/8959_tigers.jpg	8959
1156	Belconnen Utd.	https://apiv2.allsportsapi.com/logo/8956_belconnen-united.jpg	8956
1097	Subiaco	https://apiv2.allsportsapi.com/logo/11222_subiaco.jpg	11222
1162	Shire Endaselassie	https://apiv2.allsportsapi.com/logo/18751_suhul-shire.jpg	18751
1167	Arba Menche	https://apiv2.allsportsapi.com/logo/21580_arba-minch-kenema.jpg	21580
1207	Redencao	\N	43066
1214	Cobreloa	https://apiv2.allsportsapi.com/logo/2227_cobreloa.jpg	2227
1196	Magni	https://apiv2.allsportsapi.com/logo/8830_magni.jpg	8830
1197	Selfoss	https://apiv2.allsportsapi.com/logo/8205_selfoss.jpg	8205
1179	Mauaense	https://apiv2.allsportsapi.com/logo/34411_mauaense.jpg	34411
1163	St. George	https://apiv2.allsportsapi.com/logo/11525_kedus-giorgis.jpg	11525
1183	Barcelona SP	\N	42965
1219	Colo Colo	https://apiv2.allsportsapi.com/logo/553_colo-colo.jpg	553
1192	Detroit	https://apiv2.allsportsapi.com/logo/8394_detroit-city.jpg	8394
1202	KFG Gardabaer	https://apiv2.allsportsapi.com/logo/8838_kfg.jpg	8838
1220	Coquimbo	https://apiv2.allsportsapi.com/logo/8891_coquimbo-unido.jpg	8891
1215	Cobresal	https://apiv2.allsportsapi.com/logo/2208_cobresal.jpg	2208
1229	Academia del Balompie	https://apiv2.allsportsapi.com/logo/21742_abb.jpg	21742
1201	Kormakur/Hvot	https://apiv2.allsportsapi.com/logo/8871_kormakur--hvot.jpg	8871
1189	Santa Fe SP	\N	42972
1232	Ningbo Professional	\N	42633
1173	Flamengo SP	https://apiv2.allsportsapi.com/logo/35451_flamengo-sp.jpg	35451
1188	Tupa	https://apiv2.allsportsapi.com/logo/35468_tupa-fc.jpg	35468
1185	Votoraty SP	\N	42974
1191	Itaqua	\N	42963
1182	Maua	https://apiv2.allsportsapi.com/logo/35461_maua.jpg	35461
1177	Catanduvense	https://apiv2.allsportsapi.com/logo/42928_catanduvense.jpg	42928
1176	Independente SP	https://apiv2.allsportsapi.com/logo/13373_independente-sp.jpg	13373
1231	Shandong Taishan	https://apiv2.allsportsapi.com/logo/2251_shandong-taishan.jpg	2251
1190	Uniao Mogi	https://apiv2.allsportsapi.com/logo/35456_uniao-mogi.jpg	35456
1200	KFA	https://apiv2.allsportsapi.com/logo/23959_kfa.jpg	23959
1170	Assisense	https://apiv2.allsportsapi.com/logo/39150_assisense.jpg	39150
1168	America SP	https://apiv2.allsportsapi.com/logo/34436_america-sp.jpg	34436
1174	Guarulhos	https://apiv2.allsportsapi.com/logo/39149_guarulhos.jpg	39149
1187	Sao Carlos	https://apiv2.allsportsapi.com/logo/13375_sao-carlos.jpg	13375
1227	Blooming	https://apiv2.allsportsapi.com/logo/1648_blooming.jpg	1648
1193	Louisville City	https://apiv2.allsportsapi.com/logo/7917_louisville-city.jpg	7917
1205	Grapiuna	https://apiv2.allsportsapi.com/logo/11849_grapiuna-itabuna.jpg	11849
1199	Olafsvik	https://apiv2.allsportsapi.com/logo/8202_vikingur-olafsvik.jpg	8202
1222	Balsas	\N	40765
1166	Fasil Kenema	https://apiv2.allsportsapi.com/logo/8569_fasil-kenema.jpg	8569
1203	Dalvik/Reynir	https://apiv2.allsportsapi.com/logo/8866_dalvik--reynir.jpg	8866
1212	Magallanes	https://apiv2.allsportsapi.com/logo/2225_magallanes.jpg	2225
1210	San Marcos de Arica	https://apiv2.allsportsapi.com/logo/2224_san-marcos.jpg	2224
1164	Sidama Bunna	https://apiv2.allsportsapi.com/logo/11578_sidama-bunna.jpg	11578
1204	Camacari	https://apiv2.allsportsapi.com/logo/11850_camacari.jpg	11850
1228	Tomayapo	https://apiv2.allsportsapi.com/logo/1647_real-tomayapo.jpg	1647
1184	Paulinia FU	\N	42966
1235	Wuhan Three Towns	https://apiv2.allsportsapi.com/logo/11814_wuhan-three-towns.jpg	11814
1171	Riopretano	\N	42973
1186	Santacruzense	https://apiv2.allsportsapi.com/logo/13370_santacruzense.jpg	13370
1230	Guangxi Hengchen	https://apiv2.allsportsapi.com/logo/34989_guangxi-hengchen-fc.jpg	34989
1172	Audax-SP	https://apiv2.allsportsapi.com/logo/1911_osasco-audax.jpg	1911
1194	Thimphu City	https://apiv2.allsportsapi.com/logo/455_thimphu-city-fc.jpg	455
1178	Manthiqueira	https://apiv2.allsportsapi.com/logo/35453_manthiqueira.jpg	35453
1169	Jose Bonifacio EC	\N	42964
1180	Matonense	https://apiv2.allsportsapi.com/logo/23862_matonense.jpg	23862
1175	Paulinense	\N	42967
1218	Recoleta	https://apiv2.allsportsapi.com/logo/8899_recoleta.jpg	8899
1161	Ethiopia Bunna	https://apiv2.allsportsapi.com/logo/11527_ethiopia-bunna.jpg	11527
1198	Haukar	https://apiv2.allsportsapi.com/logo/8881_haukar.jpg	8881
1223	Timon EC	https://apiv2.allsportsapi.com/logo/38200_timon-ma.jpg	38200
1211	Limache	https://apiv2.allsportsapi.com/logo/12391_deportes-limache.jpg	12391
1217	U. Catolica	https://apiv2.allsportsapi.com/logo/560_universidad-catolica.jpg	560
1206	Feira	\N	43068
1165	Negele Arsi Ketema	\N	41510
1208	A. Italiano	https://apiv2.allsportsapi.com/logo/2207_audax-italiano.jpg	2207
1209	CD Santa Cruz	https://apiv2.allsportsapi.com/logo/2232_deportes-santa-cruz.jpg	2232
1233	Chongqing Tonglianglong	https://apiv2.allsportsapi.com/logo/31645_chongqing-tonglianglong.jpg	31645
1221	Deportes Iquique	https://apiv2.allsportsapi.com/logo/8888_deportes-iquique.jpg	8888
1216	Copiapo	https://apiv2.allsportsapi.com/logo/2226_copiapo.jpg	2226
1181	Mogi Mirim	https://apiv2.allsportsapi.com/logo/13284_mogi-mirim.jpg	13284
1225	Guabira	https://apiv2.allsportsapi.com/logo/1643_guabira.jpg	1643
1195	BFF Academy U19	https://apiv2.allsportsapi.com/logo/39489_bff-academy-u20.jpg	39489
1213	Palestino	https://apiv2.allsportsapi.com/logo/2216_palestino.jpg	2216
1236	Shanghai Zetian	\N	39154
1237	Chengdu Rongcheng	https://apiv2.allsportsapi.com/logo/2236_chengdu-rongcheng.jpg	2236
1239	Shanghai Shenhua	https://apiv2.allsportsapi.com/logo/381_shanghai-shenhua.jpg	381
1226	SA Bulo Bulo	https://apiv2.allsportsapi.com/logo/21815_san-antonio-bulo-bulo.jpg	21815
1289	Aliance	https://apiv2.allsportsapi.com/logo/12178_aliance.jpg	12178
1242	Stranraer	https://apiv2.allsportsapi.com/logo/6365_stranraer.jpg	6365
1271	Les Astres	https://apiv2.allsportsapi.com/logo/2189_les-astres.jpg	2189
1295	Speks	\N	19163
1259	Aigles du Congo	https://apiv2.allsportsapi.com/logo/11422_aigles-du-congo.jpg	11422
1272	Kelen	https://apiv2.allsportsapi.com/logo/14975_kelen.jpg	14975
1265	AS Vita Club	https://apiv2.allsportsapi.com/logo/8133_vita-club.jpg	8133
1267	APEJES Academy	https://apiv2.allsportsapi.com/logo/2184_apejes-academy.jpg	2184
1270	Union SA	https://apiv2.allsportsapi.com/logo/38535_union-abong-mbang.jpg	38535
1243	Larne	https://apiv2.allsportsapi.com/logo/5581_larne.jpg	5581
1273	Paks	https://apiv2.allsportsapi.com/logo/4618_paks.jpg	4618
1241	Qingdao Hainiu	https://apiv2.allsportsapi.com/logo/13465_qingdao-hainiu.jpg	13465
1269	Kumba	\N	42359
1240	Wuxi Wugou	https://apiv2.allsportsapi.com/logo/19595_wuxi-wugou.jpg	19595
1268	Avion Academy	https://apiv2.allsportsapi.com/logo/2177_avion-academy.jpg	2177
1260	Mazembe	https://apiv2.allsportsapi.com/logo/8134_tp-mazembe.jpg	8134
1317	Atletico Pilar	https://apiv2.allsportsapi.com/logo/34716_atletico-pilar.jpg	34716
1291	Kekava-Auda	https://apiv2.allsportsapi.com/logo/25223_ekava--auda.jpg	25223
1286	JFK Ventspils	https://apiv2.allsportsapi.com/logo/31492_jfk-ventspils.jpg	31492
1261	Celeste	https://apiv2.allsportsapi.com/logo/30044_celeste.jpg	30044
1290	Metta	https://apiv2.allsportsapi.com/logo/5201_metta.jpg	5201
1258	Don Bosco	https://apiv2.allsportsapi.com/logo/11425_don-bosco.jpg	11425
1266	Atlantic	https://apiv2.allsportsapi.com/logo/38517_atlantic.jpg	38517
1312	Deportivo Metalurgico	https://apiv2.allsportsapi.com/logo/34720_deportivo-metalurgico.jpg	34720
1315	Defensores de Glew	https://apiv2.allsportsapi.com/logo/34741_defensores-glew.jpg	34741
1255	Lillestrom	https://apiv2.allsportsapi.com/logo/5602_lillestrm.jpg	5602
1314	Estrella de Berisso	https://apiv2.allsportsapi.com/logo/34724_estrella-de-berisso.jpg	34724
1316	Provincial	https://apiv2.allsportsapi.com/logo/34715_provincial-lobos.jpg	34715
1256	Pogon Siedlce	https://apiv2.allsportsapi.com/logo/5782_pogo-siedlce.jpg	5782
1306	Ferroviario U20	https://apiv2.allsportsapi.com/logo/35804_ferroviario-u20.jpg	35804
1244	Dun. Streda	https://apiv2.allsportsapi.com/logo/238_dac-1904.jpg	238
1245	Samorin	https://apiv2.allsportsapi.com/logo/6570_amorin.jpg	6570
1246	Renens	https://apiv2.allsportsapi.com/logo/7447_renens.jpg	7447
1247	Lausanne	https://apiv2.allsportsapi.com/logo/7409_lausanne-sport.jpg	7409
1248	Glentoran	https://apiv2.allsportsapi.com/logo/269_glentoran.jpg	269
1249	Caernarfon	https://apiv2.allsportsapi.com/logo/8097_caernarfon-town.jpg	8097
1250	Horbranz	https://apiv2.allsportsapi.com/logo/19512_horbranz.jpg	19512
1251	Altach	https://apiv2.allsportsapi.com/logo/1238_rheindorf-altach.jpg	1238
1252	Al Ansar	https://apiv2.allsportsapi.com/logo/424_al-ansar.jpg	424
1304	Ceara U20	https://apiv2.allsportsapi.com/logo/9133_ceara-u20.jpg	9133
1305	Atletico-CE U20	https://apiv2.allsportsapi.com/logo/10848_atletico-cearense-u20.jpg	10848
1257	Wisla Plock	https://apiv2.allsportsapi.com/logo/5771_wisa-pock.jpg	5771
1293	Alberts JDFS	https://apiv2.allsportsapi.com/logo/5190_jdfs-alberts.jpg	5190
1294	Salaspils FK	https://apiv2.allsportsapi.com/logo/8973_salaspils.jpg	8973
1274	Zilina	https://apiv2.allsportsapi.com/logo/6559_ilina.jpg	6559
1275	Opava	https://apiv2.allsportsapi.com/logo/2645_opava.jpg	2645
1276	Lomnica	\N	43206
1277	Legnica	https://apiv2.allsportsapi.com/logo/5896_mied-legnica.jpg	5896
1278	Eichstatt	https://apiv2.allsportsapi.com/logo/12434_eichstatt.jpg	12434
1279	Ingolstadt II	https://apiv2.allsportsapi.com/logo/14604_ingolstadt-ii.jpg	14604
1280	Cegledi	https://apiv2.allsportsapi.com/logo/4597_cegledi.jpg	4597
1281	Ujpest	https://apiv2.allsportsapi.com/logo/4617_ujpest.jpg	4617
1282	Leczna	https://apiv2.allsportsapi.com/logo/5786_gornik-czna.jpg	5786
1283	Dinamo Bucuresti	https://apiv2.allsportsapi.com/logo/6197_dinamo-bucureti.jpg	6197
1284	SV Rothenstein	\N	43223
1285	Jena	https://apiv2.allsportsapi.com/logo/3952_carl-zeiss-jena.jpg	3952
1292	Riga Mariners	https://apiv2.allsportsapi.com/logo/39226_riga-mariners.jpg	39226
1287	Leevon PPK	https://apiv2.allsportsapi.com/logo/34958_leevon--ppk.jpg	34958
1262	Simba	https://apiv2.allsportsapi.com/logo/11437_simba.jpg	11437
1263	Maniema	https://apiv2.allsportsapi.com/logo/8579_maniema-union.jpg	8579
1296	FC Schwaig	https://apiv2.allsportsapi.com/logo/30792_sportfreunde-schwaig.jpg	30792
1297	Buchbach	https://apiv2.allsportsapi.com/logo/12424_buchbach.jpg	12424
1299	Trencin	https://apiv2.allsportsapi.com/logo/6555_trenin.jpg	6555
1300	Alianca U20	https://apiv2.allsportsapi.com/logo/35757_alianca-u20.jpg	35757
1301	Tiangua EC U20	\N	43263
1302	Caucaia U20	https://apiv2.allsportsapi.com/logo/35795_caucaia-u20.jpg	35795
1288	Marupe	https://apiv2.allsportsapi.com/logo/8985_mrupe.jpg	8985
1307	Anjos do Ceu U20	https://apiv2.allsportsapi.com/logo/39612_anjos-do-ceu-u20.jpg	39612
1308	Floresta EC U20	https://apiv2.allsportsapi.com/logo/10916_floresta-u20.jpg	10916
1309	Vila Real U20	\N	43261
1310	Quixada U20	https://apiv2.allsportsapi.com/logo/39613_quixada-u20.jpg	39613
1311	Tirol U20	\N	35789
1313	Nautico Hacoaj	https://apiv2.allsportsapi.com/logo/34717_nautico-hacoaj.jpg	34717
1253	Al Ahed	https://apiv2.allsportsapi.com/logo/421_al-ahed.jpg	421
1364	Melhus	https://apiv2.allsportsapi.com/logo/10961_melhus.jpg	10961
1358	Cobh Ramblers	https://apiv2.allsportsapi.com/logo/4768_cobh-ramblers.jpg	4768
1367	Brodd	https://apiv2.allsportsapi.com/logo/5678_brodd.jpg	5678
114	O'Higgins	https://apiv2.allsportsapi.com/logo/2215_ohiggins.jpg	2215
1390	Oakleigh Cannons	https://apiv2.allsportsapi.com/logo/10415_oakleigh-cannons.jpg	10415
1334	Mexico	https://apiv2.allsportsapi.com/logo/511_mexico.jpg	511
1389	Western Utd. U21	https://apiv2.allsportsapi.com/logo/30457_western-united-ii.jpg	30457
1369	Lyn	https://apiv2.allsportsapi.com/logo/5660_lyn.jpg	5660
1371	TB Tvoroyri	https://apiv2.allsportsapi.com/logo/3478_tb.jpg	3478
1400	San Juan	\N	39551
1379	Leiknir	https://apiv2.allsportsapi.com/logo/4700_leiknir-reykjavik.jpg	4700
483	West Texas	https://apiv2.allsportsapi.com/logo/36922_west-texas.jpg	36922
1341	Atletico GO	https://apiv2.allsportsapi.com/logo/1929_atletico-goianiense.jpg	1929
1322	Belgrano Zarate	https://apiv2.allsportsapi.com/logo/34721_belgrano-zarate.jpg	34721
1376	Connecticut FC	\N	42311
1333	Qatar	https://apiv2.allsportsapi.com/logo/538_qatar.jpg	538
1340	Sport Recife	https://apiv2.allsportsapi.com/logo/1956_sport-recife.jpg	1956
1386	Brunswick Juventus	\N	42471
1343	Baranovici	https://apiv2.allsportsapi.com/logo/8503_baranovichi.jpg	8503
1326	Uribelarrea	\N	43260
1332	Canada	https://apiv2.allsportsapi.com/logo/512_canada.jpg	512
1346	Drogheda	https://apiv2.allsportsapi.com/logo/4766_drogheda-united.jpg	4766
1368	Ranheim	https://apiv2.allsportsapi.com/logo/5588_ranheim.jpg	5588
1354	Athlone	https://apiv2.allsportsapi.com/logo/4759_athlone-town.jpg	4759
1375	Klaksvik	https://apiv2.allsportsapi.com/logo/126_ki.jpg	126
1373	NSI Runavik 2	https://apiv2.allsportsapi.com/logo/3480_nsi-ii.jpg	3480
1370	FC Suduroy	https://apiv2.allsportsapi.com/logo/3485_suduroy.jpg	3485
1377	Cincinnati 2	https://apiv2.allsportsapi.com/logo/24871_cincinnati-ii.jpg	24871
1387	Bulleen	https://apiv2.allsportsapi.com/logo/19207_bulleen-lions.jpg	19207
1374	Vikingur	https://apiv2.allsportsapi.com/logo/3474_vikingur.jpg	3474
1384	Langwarrin	https://apiv2.allsportsapi.com/logo/19203_langwarrin.jpg	19203
1401	San Francisco City	https://apiv2.allsportsapi.com/logo/7894_san-francisco-city.jpg	7894
1378	Njardvik	https://apiv2.allsportsapi.com/logo/8847_njardvik.jpg	8847
25	Bohemians	https://apiv2.allsportsapi.com/logo/4762_bohemians.jpg	4762
1402	Texoma	https://apiv2.allsportsapi.com/logo/38615_texoma.jpg	38615
1391	Melbourne City U21	https://apiv2.allsportsapi.com/logo/30456_melbourne-city-ii.jpg	30456
1319	Juventud de Bernal	https://apiv2.allsportsapi.com/logo/34722_juventud-de-bernal.jpg	34722
1356	Bray	https://apiv2.allsportsapi.com/logo/4767_bray-wanderers.jpg	4767
1329	Rio Branco-VN	https://apiv2.allsportsapi.com/logo/2063_rio-branco-vn.jpg	2063
1318	Social Atletico Television	https://apiv2.allsportsapi.com/logo/34864_sat-moreno.jpg	34864
1320	Alumni Los Hornos	\N	43256
1342	Naftan	https://apiv2.allsportsapi.com/logo/1355_naftan.jpg	1355
1325	Everton La Plata	https://apiv2.allsportsapi.com/logo/18342_everton-la-plata.jpg	18342
1336	USA	https://apiv2.allsportsapi.com/logo/523_united-states.jpg	523
1324	Las Mandarinas	\N	43258
1331	Vilavelhense	https://apiv2.allsportsapi.com/logo/2072_vilavelhense.jpg	2072
1321	Ezeiza	https://apiv2.allsportsapi.com/logo/34719_ezeiza.jpg	34719
1564	Kumla	https://apiv2.allsportsapi.com/logo/8333_kumla.jpg	8333
1328	Porto Vitoria	https://apiv2.allsportsapi.com/logo/30419_porto-vitoria.jpg	30419
1357	Longford	https://apiv2.allsportsapi.com/logo/4771_longford-town.jpg	4771
1330	Vitoria ES	https://apiv2.allsportsapi.com/logo/1848_vitoria-es.jpg	1848
26	Shamrock Rovers	https://apiv2.allsportsapi.com/logo/226_shamrock-rovers.jpg	226
1365	Rosenborg 2	https://apiv2.allsportsapi.com/logo/8301_rosenborg-ii.jpg	8301
1327	Barrancas	https://apiv2.allsportsapi.com/logo/34768_barrancas-umet.jpg	34768
1345	Dundalk	https://apiv2.allsportsapi.com/logo/142_dundalk.jpg	142
1350	St. Patricks	https://apiv2.allsportsapi.com/logo/4778_st-patricks-athletic.jpg	4778
1348	Galway	https://apiv2.allsportsapi.com/logo/4765_galway-united.jpg	4765
1388	Eltham Redbacks	\N	42473
1352	Waterford	https://apiv2.allsportsapi.com/logo/4779_waterford.jpg	4779
1359	Finn Harps	https://apiv2.allsportsapi.com/logo/4761_finn-harps.jpg	4761
1351	Sligo Rovers	https://apiv2.allsportsapi.com/logo/4763_sligo-rovers.jpg	4763
1385	Port Melbourne Sharks	https://apiv2.allsportsapi.com/logo/10408_port-melbourne.jpg	10408
1360	Cork City	https://apiv2.allsportsapi.com/logo/4770_cork-city.jpg	4770
1372	IF Fuglafjordur	https://apiv2.allsportsapi.com/logo/3473_if.jpg	3473
1363	Kerry	\N	17786
1362	UC Dublin	https://apiv2.allsportsapi.com/logo/4769_ucd.jpg	4769
1355	Wexford	https://apiv2.allsportsapi.com/logo/4774_wexford.jpg	4774
1366	Hinna	https://apiv2.allsportsapi.com/logo/5641_hinna.jpg	5641
1396	Lansing City	https://apiv2.allsportsapi.com/logo/25029_lansing-city.jpg	25029
1335	South Korea	https://apiv2.allsportsapi.com/logo/651_korea-republic.jpg	651
1323	Buenos Aires City	\N	43257
1392	Bentleigh Greens	https://apiv2.allsportsapi.com/logo/10413_bentleigh-greens.jpg	10413
1393	South Melbourne	https://apiv2.allsportsapi.com/logo/10421_south-melbourne.jpg	10421
1397	Midwest United	https://apiv2.allsportsapi.com/logo/25038_midwest-united.jpg	25038
1337	Australia	https://apiv2.allsportsapi.com/logo/529_australia.jpg	529
1473	Shenzhen Xinpengcheng	https://apiv2.allsportsapi.com/logo/2241_shenzhen-peng-city.jpg	2241
1456	Dalian Kewei	\N	42767
1450	Throttur Vogar	https://apiv2.allsportsapi.com/logo/8845_throttur-vogar.jpg	8845
1453	Fjolnir	https://apiv2.allsportsapi.com/logo/8200_fjolnir.jpg	8200
1459	Beijing Guoan	https://apiv2.allsportsapi.com/logo/375_beijing-guoan.jpg	375
1435	Taraz	https://apiv2.allsportsapi.com/logo/5106_taraz.jpg	5106
1438	Cliftonville W	https://apiv2.allsportsapi.com/logo/31927_cliftonville-w.jpg	31927
1412	Caboolture	https://apiv2.allsportsapi.com/logo/17845_caboolture.jpg	17845
1458	Guangdong GZ-Power	https://apiv2.allsportsapi.com/logo/34988_guangdong-gz-power.jpg	34988
1439	Derry City W	https://apiv2.allsportsapi.com/logo/31933_sion-swifts-women.jpg	31933
1457	Liaoning Tieren	https://apiv2.allsportsapi.com/logo/2242_liaoning-tieren.jpg	2242
1474	SK Rapid II	https://apiv2.allsportsapi.com/logo/1233_rapid-wien-ii.jpg	1233
1420	Dalian Yingbo B	\N	42769
1472	Shenzhen Juniors	https://apiv2.allsportsapi.com/logo/34956_shenzhen-juniors.jpg	34956
1461	Dalian Yingbo	https://apiv2.allsportsapi.com/logo/31643_dalian-yingbo.jpg	31643
1433	Volna Pinsk	https://apiv2.allsportsapi.com/logo/1352_volna.jpg	1352
1430	Lida	https://apiv2.allsportsapi.com/logo/1350_lida.jpg	1350
1429	FC Slonim	https://apiv2.allsportsapi.com/logo/1351_slonim.jpg	1351
1432	Minsk 2	https://apiv2.allsportsapi.com/logo/12867_minsk-ii.jpg	12867
1411	Magic United	https://apiv2.allsportsapi.com/logo/38649_magic-united.jpg	38649
1479	Foutoua	https://apiv2.allsportsapi.com/logo/7562_al-futuwa.jpg	7562
1413	Brisbane Strikers	https://apiv2.allsportsapi.com/logo/9570_brisbane-strikers.jpg	9570
1417	BE1 NFA	https://apiv2.allsportsapi.com/logo/12435_be1-nfa.jpg	12435
1415	St. George Willawong	https://apiv2.allsportsapi.com/logo/8483_st-george-willawong.jpg	8483
1437	Jaiyq	\N	42655
1462	Jiangxi Lushan	https://apiv2.allsportsapi.com/logo/2250_jiangxi-lushan.jpg	2250
1427	Xiamen Feilu	\N	42768
1455	GV San Jose	https://apiv2.allsportsapi.com/logo/33124_gualberto-villarroel-sj.jpg	33124
1431	FC Gomel 2	https://apiv2.allsportsapi.com/logo/35228_gomel-ii.jpg	35228
1422	Guangzhou Dandelion	https://apiv2.allsportsapi.com/logo/39160_guangzhou-dandelion.jpg	39160
1426	Guizhou Guiyang	https://apiv2.allsportsapi.com/logo/39153_guizhou-zhucheng.jpg	39153
1428	Din. Minsk 2	https://apiv2.allsportsapi.com/logo/34991_dinamo-minsk-ii.jpg	34991
1470	Shanxi Chongde Ronghai	https://apiv2.allsportsapi.com/logo/30315_shanxi-chongde-ronghai.jpg	30315
1465	Tianjin Jinmen Tiger	https://apiv2.allsportsapi.com/logo/2262_tianjin-jinmen-tiger.jpg	2262
1466	Shaanxi Union	https://apiv2.allsportsapi.com/logo/35001_shaanxi-union.jpg	35001
1410	Gold Coast Knights	https://apiv2.allsportsapi.com/logo/9563_gold-coast-knights.jpg	9563
1436	Shakhter Karagandy	https://apiv2.allsportsapi.com/logo/5112_shakhter-karagandy.jpg	5112
1447	Burnie Utd.	https://apiv2.allsportsapi.com/logo/35346_burnie-united.jpg	35346
1419	Transinvest 2	\N	42658
1408	Brevard SC	https://apiv2.allsportsapi.com/logo/31673_brevard.jpg	31673
1446	Ulverstone U21	\N	42824
1414	Holland Park Hawks	https://apiv2.allsportsapi.com/logo/17841_holland-park-hawks.jpg	17841
1404	Flatirons	https://apiv2.allsportsapi.com/logo/25049_flatirons.jpg	25049
1478	Al Jaish	https://apiv2.allsportsapi.com/logo/419_al-jaish.jpg	419
1460	Hangzhou Linping	https://apiv2.allsportsapi.com/logo/34982_hangzhou-linping-wuyue.jpg	34982
1416	Babrungas	https://apiv2.allsportsapi.com/logo/5246_babrungas.jpg	5246
1445	Glentoran W	https://apiv2.allsportsapi.com/logo/19180_glentoran-women.jpg	19180
1421	Nantong Haimen	https://apiv2.allsportsapi.com/logo/25971_haimen-codion.jpg	25971
1440	Larne W	https://apiv2.allsportsapi.com/logo/35566_larne-women.jpg	35566
1481	Al Shorta	https://apiv2.allsportsapi.com/logo/7560_al-shorta.jpg	7560
1454	Real Potosi	https://apiv2.allsportsapi.com/logo/1649_real-potosi.jpg	1649
1441	Lisburn Rangers W	https://apiv2.allsportsapi.com/logo/35565_lisburn-rangers-women.jpg	35565
1452	Hviti	https://apiv2.allsportsapi.com/logo/8836_hviti-riddarinn.jpg	8836
1480	Al Karamah	https://apiv2.allsportsapi.com/logo/7556_al-karama.jpg	7556
1434	Khan Tengri	https://apiv2.allsportsapi.com/logo/24857_khan-tengri.jpg	24857
1449	South Hobart U21	https://apiv2.allsportsapi.com/logo/35435_south-hobart-ii.jpg	35435
1423	Hubei Istar	https://apiv2.allsportsapi.com/logo/18496_hubei-istar.jpg	18496
1444	Crusaders W	https://apiv2.allsportsapi.com/logo/31930_crusaders-strikers-women.jpg	31930
1442	Linfield W	https://apiv2.allsportsapi.com/logo/11959_linfield-women.jpg	11959
1448	Olympia Warriors	https://apiv2.allsportsapi.com/logo/11242_olympia-warriors.jpg	11242
1468	Shanghai Second	\N	42770
1463	Henan Songshan Longmen	https://apiv2.allsportsapi.com/logo/2255_henan.jpg	2255
1471	Qingdao West Coast	https://apiv2.allsportsapi.com/logo/19588_qingdao-west-coast.jpg	19588
1451	Kari	https://apiv2.allsportsapi.com/logo/8853_kari.jpg	8853
1425	Guangdong Mingtu	https://apiv2.allsportsapi.com/logo/39156_guangdong-mingtu.jpg	39156
1467	Zhejiang Professional	https://apiv2.allsportsapi.com/logo/2234_zhejiang.jpg	2234
1475	SV Oberwart	https://apiv2.allsportsapi.com/logo/12820_oberwart.jpg	12820
1476	Levski Sofia	https://apiv2.allsportsapi.com/logo/2164_levski-sofia.jpg	2164
1477	Akademik Svishtov	https://apiv2.allsportsapi.com/logo/2104_akademik-svishtov.jpg	2104
1418	Garliava	https://apiv2.allsportsapi.com/logo/12183_garliava.jpg	12183
1424	Ganzhou Ruishi	https://apiv2.allsportsapi.com/logo/25807_ganzhou-ruishi.jpg	25807
1540	Trelleborg	https://apiv2.allsportsapi.com/logo/7338_trelleborg.jpg	7338
1541	Rosengard	https://apiv2.allsportsapi.com/logo/7394_rosengrd.jpg	7394
1502	Switzerland	https://apiv2.allsportsapi.com/logo/2_switzerland.jpg	2
1484	Al Wahda	https://apiv2.allsportsapi.com/logo/463_al-wahda.jpg	463
1501	South Africa	https://apiv2.allsportsapi.com/logo/726_south-africa.jpg	726
1514	JKT Tanzania	https://apiv2.allsportsapi.com/logo/11613_jkt-tanzania.jpg	11613
1527	Mariehamn	https://apiv2.allsportsapi.com/logo/3553_mariehamn.jpg	3553
1517	Simba	https://apiv2.allsportsapi.com/logo/8132_simba.jpg	8132
1503	Bosnia & Herzegovina	https://apiv2.allsportsapi.com/logo/685_bosnia-herzegovina.jpg	685
1490	Jableh	https://apiv2.allsportsapi.com/logo/7558_jableh.jpg	7558
1553	Karlbergs	https://apiv2.allsportsapi.com/logo/7396_karlberg.jpg	7396
1531	KIF Orebro W	https://apiv2.allsportsapi.com/logo/505_kif-orebro-w.jpg	505
1530	Jitex W	https://apiv2.allsportsapi.com/logo/9833_jitex-w.jpg	9833
1556	Meshakhte Tkibuli	https://apiv2.allsportsapi.com/logo/8765_meshakhte.jpg	8765
1554	Dinamo Tbilisi	https://apiv2.allsportsapi.com/logo/130_dinamo-tbilisi.jpg	130
1493	Al Taliya	https://apiv2.allsportsapi.com/logo/7557_al-taliya.jpg	7557
1543	Angelholm	https://apiv2.allsportsapi.com/logo/7388_angelholm.jpg	7388
1485	Al-Ittihad Aleppo	https://apiv2.allsportsapi.com/logo/7559_al-ittihad-ahli-aleppo.jpg	7559
1550	Sollentuna	https://apiv2.allsportsapi.com/logo/7384_sollentuna.jpg	7384
1544	Arlanda	https://apiv2.allsportsapi.com/logo/8354_arlanda.jpg	8354
1542	Tvaaker	https://apiv2.allsportsapi.com/logo/8320_tvker.jpg	8320
1482	Al-Shouleh	https://apiv2.allsportsapi.com/logo/37862_al-shouleh.jpg	37862
1515	Tanzania Prisons	https://apiv2.allsportsapi.com/logo/11645_tanzania-prisons.jpg	11645
1494	Horizonte U20	https://apiv2.allsportsapi.com/logo/35755_horizonte-u20.jpg	35755
1488	Hottin	https://apiv2.allsportsapi.com/logo/7555_hottin.jpg	7555
1495	Juazeiro CE U20	\N	43262
1509	Vittsjo W	https://apiv2.allsportsapi.com/logo/503_vittsjo-w.jpg	503
1506	Hacken W	https://apiv2.allsportsapi.com/logo/9859_hacken-w.jpg	9859
1491	Homs Al Fidaa	\N	42042
1537	Lunds	https://apiv2.allsportsapi.com/logo/7385_lund.jpg	7385
1510	Kristianstad W	https://apiv2.allsportsapi.com/logo/501_kristianstad-w.jpg	501
1511	Uppsala W	https://apiv2.allsportsapi.com/logo/510_uppsala-w.jpg	510
1505	Pitea W	https://apiv2.allsportsapi.com/logo/506_pite-w.jpg	506
1519	Mtibwa Sugar	https://apiv2.allsportsapi.com/logo/11616_mtibwa-sugar.jpg	11616
1507	Rosengard W	https://apiv2.allsportsapi.com/logo/32_rosengrd-w.jpg	32
1513	Vaxjo DFF W	https://apiv2.allsportsapi.com/logo/504_vaxjo-w.jpg	504
1533	Alingsas W	https://apiv2.allsportsapi.com/logo/9843_alingss-w.jpg	9843
1526	AC Oulu	https://apiv2.allsportsapi.com/logo/3555_oulu.jpg	3555
1487	Damascus Al-Ahli	\N	42041
170	Forward Madison	https://apiv2.allsportsapi.com/logo/11097_forward-madison.jpg	11097
1535	Trollhattan	https://apiv2.allsportsapi.com/logo/8319_trollhattan.jpg	8319
1536	Jonkoping	https://apiv2.allsportsapi.com/logo/7335_jonkopings-sodra.jpg	7335
1545	Stocksund	https://apiv2.allsportsapi.com/logo/7389_stocksund.jpg	7389
1529	Elfsborg W	https://apiv2.allsportsapi.com/logo/32261_elfsborg-w.jpg	32261
1528	Husqvarna W	https://apiv2.allsportsapi.com/logo/9846_husqvarna-w.jpg	9846
1563	IFK Skovde	https://apiv2.allsportsapi.com/logo/8331_ifk-skovde.jpg	8331
1549	Jarfalla	https://apiv2.allsportsapi.com/logo/11693_jarfalla.jpg	11693
1547	Stockholm Internazionale	https://apiv2.allsportsapi.com/logo/7366_stockholm-inter.jpg	7366
1539	Hassleholms IF	https://apiv2.allsportsapi.com/logo/7376_hassleholms-if.jpg	7376
1562	Herrestads AIF	https://apiv2.allsportsapi.com/logo/16426_herrestads.jpg	16426
1552	Vasalund	https://apiv2.allsportsapi.com/logo/7339_vasalund.jpg	7339
1557	Gagra	https://apiv2.allsportsapi.com/logo/3894_gagra.jpg	3894
1538	Skovde AIK	https://apiv2.allsportsapi.com/logo/8318_skovde-aik.jpg	8318
1548	Hammarby TFF	https://apiv2.allsportsapi.com/logo/11681_hammarby-talang.jpg	11681
1560	Ahlafors IF	https://apiv2.allsportsapi.com/logo/8329_ahlafors.jpg	8329
1561	Skara	https://apiv2.allsportsapi.com/logo/16444_skara.jpg	16444
1555	Samgurali	https://apiv2.allsportsapi.com/logo/3909_samgurali.jpg	3909
1518	Pamba	\N	19453
1489	Khan Shaykhun	\N	42043
1483	Tishreen	https://apiv2.allsportsapi.com/logo/476_tishreen.jpg	476
1486	Horriya	https://apiv2.allsportsapi.com/logo/7564_horriya.jpg	7564
1496	Ghana	https://apiv2.allsportsapi.com/logo/725_ghana.jpg	725
1497	Panama	https://apiv2.allsportsapi.com/logo/524_panama.jpg	524
1512	Norrkoping W	https://apiv2.allsportsapi.com/logo/9845_norrkoping-w.jpg	9845
1499	Colombia	https://apiv2.allsportsapi.com/logo/535_colombia.jpg	535
621	Indy Eleven	https://apiv2.allsportsapi.com/logo/7928_indy-eleven.jpg	7928
1546	Gefle	https://apiv2.allsportsapi.com/logo/8306_gefle.jpg	8306
1558	Grebbestad	https://apiv2.allsportsapi.com/logo/8330_grebbestad.jpg	8330
1504	Eskilstuna Utd W	https://apiv2.allsportsapi.com/logo/508_eskilstuna-united-w.jpg	508
1492	Umayya	https://apiv2.allsportsapi.com/logo/42024_umayya.jpg	42024
1508	IF Brommapojkarna W	https://apiv2.allsportsapi.com/logo/9844_brommapojkarna-w.jpg	9844
1534	Eskilsminne	https://apiv2.allsportsapi.com/logo/8326_eskilsminne.jpg	8326
1498	Uzbekistan	https://apiv2.allsportsapi.com/logo/646_uzbekistan.jpg	646
1551	FBK Karlstad	https://apiv2.allsportsapi.com/logo/12475_fbk-karlstad.jpg	12475
1632	Miami	https://apiv2.allsportsapi.com/logo/25036_miami-ac.jpg	25036
1567	Husqvarna	https://apiv2.allsportsapi.com/logo/7372_husqvarna.jpg	7372
1667	Menace	https://apiv2.allsportsapi.com/logo/7844_des-moines-menace.jpg	7844
1707	Khangarid	https://apiv2.allsportsapi.com/logo/11736_khangarid.jpg	11736
1595	Houston Dynamo 2	https://apiv2.allsportsapi.com/logo/24872_houston-dynamo-ii.jpg	24872
1587	Astorps	https://apiv2.allsportsapi.com/logo/17281_storp.jpg	17281
1688	Capo	https://apiv2.allsportsapi.com/logo/30936_capo.jpg	30936
1568	Vanersborgs FK	https://apiv2.allsportsapi.com/logo/7399_vanersborgs-fk.jpg	7399
1600	Kubikenborgs	https://apiv2.allsportsapi.com/logo/16336_kubikenborg.jpg	16336
489	Virginia Marauders	https://apiv2.allsportsapi.com/logo/31670_virginia-marauders.jpg	31670
1583	Onsala	https://apiv2.allsportsapi.com/logo/8370_onsala.jpg	8370
1582	Boljan	https://apiv2.allsportsapi.com/logo/34689_boljan.jpg	34689
1690	Laredo Heat	https://apiv2.allsportsapi.com/logo/17602_laredo-heat.jpg	17602
1590	Torslanda	https://apiv2.allsportsapi.com/logo/8373_torslanda.jpg	8373
1653	Patuxent	https://apiv2.allsportsapi.com/logo/25020_patuxent.jpg	25020
1579	Rappe GOIF	https://apiv2.allsportsapi.com/logo/8352_rappe.jpg	8352
1648	Jackson Boom	\N	42514
1682	Fort Worth Vaqueros	https://apiv2.allsportsapi.com/logo/8401_fort-worth-vaqueros.jpg	8401
1651	Flint City	https://apiv2.allsportsapi.com/logo/7838_flint-city-bucks.jpg	7838
1729	Jordan	https://apiv2.allsportsapi.com/logo/641_jordan.jpg	641
1575	Angby	\N	42286
1711	Tensung	https://apiv2.allsportsapi.com/logo/9678_tensung.jpg	9678
1687	Ironbound SC	https://apiv2.allsportsapi.com/logo/31672_ironbound.jpg	31672
1695	Kauno Zalgiris 2	https://apiv2.allsportsapi.com/logo/5245_kauno-algiris-ii.jpg	5245
1628	Brooke House	https://apiv2.allsportsapi.com/logo/34749_brooke-house.jpg	34749
921	Rochester FC	https://apiv2.allsportsapi.com/logo/31668_rochester.jpg	31668
1700	FC Astana 2	https://apiv2.allsportsapi.com/logo/24895_astana-ii.jpg	24895
1709	Deren	https://apiv2.allsportsapi.com/logo/11733_deren.jpg	11733
1565	Tord	https://apiv2.allsportsapi.com/logo/8372_tord.jpg	8372
1715	Sao Jose MA	https://apiv2.allsportsapi.com/logo/2033_sao-jose-ma.jpg	2033
1572	Skiljebo	https://apiv2.allsportsapi.com/logo/7391_skiljebo.jpg	7391
1578	Solvesborgs	https://apiv2.allsportsapi.com/logo/8353_solvesborg.jpg	8353
1566	Lidkoping	https://apiv2.allsportsapi.com/logo/8334_lidkoping.jpg	8334
1580	Staffanstorp United	\N	41549
1660	Rockford Raptors	\N	42503
1588	Qviding	https://apiv2.allsportsapi.com/logo/8317_qviding-fif.jpg	8317
1706	Khovd Western	\N	41016
1646	Davis Legacy	https://apiv2.allsportsapi.com/logo/25046_davis-legacy.jpg	25046
1623	Montgomery United	\N	39495
1569	Stenungsunds	https://apiv2.allsportsapi.com/logo/7368_stenungsund.jpg	7368
1573	IK Franke	https://apiv2.allsportsapi.com/logo/16452_franke.jpg	16452
1599	Friska Viljor	https://apiv2.allsportsapi.com/logo/8338_friska-viljor.jpg	8338
1596	Storfors	https://apiv2.allsportsapi.com/logo/11690_storfors.jpg	11690
1409	Weston	https://apiv2.allsportsapi.com/logo/7891_weston.jpg	7891
1730	England	https://apiv2.allsportsapi.com/logo/16_england.jpg	16
1598	Fransta	\N	42372
1731	Croatia	https://apiv2.allsportsapi.com/logo/14_croatia.jpg	14
1702	Tobol 2	\N	42803
1697	Yelimay Semey 2	\N	42804
1601	Gottne	https://apiv2.allsportsapi.com/logo/7378_gottne.jpg	7378
1696	Akademiya Ontustik	https://apiv2.allsportsapi.com/logo/5122_akademiya-ontustik.jpg	5122
1585	Astrio	https://apiv2.allsportsapi.com/logo/7365_astrio.jpg	7365
1591	Frolunda	https://apiv2.allsportsapi.com/logo/8377_vastra-frolunda.jpg	8377
1701	Kairat Almaty 2	https://apiv2.allsportsapi.com/logo/5123_kairat-ii.jpg	5123
1705	Aktobe 2	https://apiv2.allsportsapi.com/logo/18308_aktobe-ii.jpg	18308
1586	Lindome	https://apiv2.allsportsapi.com/logo/8314_lindome.jpg	8314
1708	Khovd	https://apiv2.allsportsapi.com/logo/23414_khovd.jpg	23414
1732	Portugal	https://apiv2.allsportsapi.com/logo/23_portugal.jpg	23
1703	FC Batyr	https://apiv2.allsportsapi.com/logo/5117_ekibastuz.jpg	5117
358	San Jose Earthquakes II	https://apiv2.allsportsapi.com/logo/24839_the-town.jpg	24839
1666	St. Louis Ambush	\N	39538
1597	Taftea IK	https://apiv2.allsportsapi.com/logo/8344_tafte.jpg	8344
1698	Arys	https://apiv2.allsportsapi.com/logo/35200_arys.jpg	35200
1704	Turan	https://apiv2.allsportsapi.com/logo/5110_turan-turkistan.jpg	5110
1647	Marin	https://apiv2.allsportsapi.com/logo/25021_marin.jpg	25021
1714	Americano Bacabal	\N	37946
1699	Kaspij Aktau 2	\N	42802
1577	IFK Karlshamn	https://apiv2.allsportsapi.com/logo/8348_karlshamn.jpg	8348
1581	Linero IF	\N	34798
1717	Valerenga	https://apiv2.allsportsapi.com/logo/5599_vlerenga.jpg	5599
1643	Salem City	https://apiv2.allsportsapi.com/logo/7877_salem-city-fc.jpg	7877
446	Little Rock Rangers	https://apiv2.allsportsapi.com/logo/11841_little-rock-rangers.jpg	11841
1694	Neptunas	https://apiv2.allsportsapi.com/logo/5237_neptn-klaipda.jpg	5237
1589	Galtabacks	https://apiv2.allsportsapi.com/logo/16344_galtabacks.jpg	16344
1716	Goteborg	https://apiv2.allsportsapi.com/logo/213_ifk-goteborg.jpg	213
1733	D.R. Congo	https://apiv2.allsportsapi.com/logo/728_congo-dr.jpg	728
1727	Algeria	https://apiv2.allsportsapi.com/logo/734_algeria.jpg	734
1571	Falu	https://apiv2.allsportsapi.com/logo/34413_falu-bs.jpg	34413
1817	Aldosivi 2	https://apiv2.allsportsapi.com/logo/24466_aldosivi-res..jpg	24466
1739	Malmo FF W	https://apiv2.allsportsapi.com/logo/32263_malmo-ff-w.jpg	32263
1749	Young Africans	https://apiv2.allsportsapi.com/logo/11649_young-africans.jpg	11649
1738	Djurgarden W	https://apiv2.allsportsapi.com/logo/507_djurgrden-w.jpg	507
1752	HJK	https://apiv2.allsportsapi.com/logo/3549_hjk.jpg	3549
1813	Newells Old Boys 2	https://apiv2.allsportsapi.com/logo/24537_newells-old-boys-res..jpg	24537
1754	Ilves	https://apiv2.allsportsapi.com/logo/3551_ilves.jpg	3551
1740	Hammarby W	https://apiv2.allsportsapi.com/logo/9827_hammarby-w.jpg	9827
1745	US Oyem	\N	42756
1766	Utsikten	https://apiv2.allsportsapi.com/logo/7347_utsikten.jpg	7347
1746	Singida Black Stars	https://apiv2.allsportsapi.com/logo/36121_singida-black-stars.jpg	36121
1753	Inter Turku	https://apiv2.allsportsapi.com/logo/3542_inter-turku.jpg	3542
1761	VPS	https://apiv2.allsportsapi.com/logo/3544_vps.jpg	3544
1759	Lahti	https://apiv2.allsportsapi.com/logo/3548_lahti.jpg	3548
1744	Bitam	https://apiv2.allsportsapi.com/logo/25259_bitam.jpg	25259
1794	Kongahalla	https://apiv2.allsportsapi.com/logo/34412_kongahalla.jpg	34412
1782	Enskede	https://apiv2.allsportsapi.com/logo/7398_enskede.jpg	7398
1767	Atvidaberg	https://apiv2.allsportsapi.com/logo/8322_tvidaberg.jpg	8322
1765	Gamla Upsala W	https://apiv2.allsportsapi.com/logo/9856_gamla-upsala-w.jpg	9856
1760	SJK	https://apiv2.allsportsapi.com/logo/3543_sjk.jpg	3543
1756	TPS	https://apiv2.allsportsapi.com/logo/3557_tps.jpg	3557
1758	Gnistan	https://apiv2.allsportsapi.com/logo/3541_gnistan.jpg	3541
1787	Lilla Torg	https://apiv2.allsportsapi.com/logo/33898_lilla-torg.jpg	33898
1755	Jaro	https://apiv2.allsportsapi.com/logo/3554_jaro.jpg	3554
1795	Hestrafors	\N	39345
1815	Argentinos Jrs 2	https://apiv2.allsportsapi.com/logo/24542_argentinos-juniors-res..jpg	24542
1784	IFK Trelleborg	https://apiv2.allsportsapi.com/logo/16343_ifk-trelleborg.jpg	16343
1791	Osterlen	https://apiv2.allsportsapi.com/logo/8323_osterlen.jpg	8323
1789	Vaxjo Norra	https://apiv2.allsportsapi.com/logo/38796_vaxjo-norra.jpg	38796
1786	Nosaby	https://apiv2.allsportsapi.com/logo/8349_nosaby.jpg	8349
1825	Ind. Rivadavia 2	https://apiv2.allsportsapi.com/logo/34426_independiente-riva.-res..jpg	34426
1826	Quilmes 2	\N	42296
1788	Oskarshamn	https://apiv2.allsportsapi.com/logo/7361_oskarshamns-aik.jpg	7361
1778	Iberia 1999	https://apiv2.allsportsapi.com/logo/3906_iberia-1999.jpg	3906
1781	Dinamo Batumi	https://apiv2.allsportsapi.com/logo/3904_dinamo-batumi.jpg	3904
1824	Platense 2	https://apiv2.allsportsapi.com/logo/24631_platense-res..jpg	24631
1797	Jonsereds	https://apiv2.allsportsapi.com/logo/31794_jonsered.jpg	31794
1790	Torns	https://apiv2.allsportsapi.com/logo/7370_torns.jpg	7370
1785	IFK Berga	https://apiv2.allsportsapi.com/logo/8325_berga.jpg	8325
1831	Racing Club 2	https://apiv2.allsportsapi.com/logo/24541_racing-club-res..jpg	24541
1802	Banfield 2	https://apiv2.allsportsapi.com/logo/24475_banfield-res..jpg	24475
1823	Union de Santa Fe 2	https://apiv2.allsportsapi.com/logo/24543_union-res..jpg	24543
1812	Ferro 2	\N	40223
1803	River Plate 2	https://apiv2.allsportsapi.com/logo/24538_river-plate-res..jpg	24538
1806	Boca Juniors 2	https://apiv2.allsportsapi.com/logo/24467_boca-juniors-res..jpg	24467
1827	San Martin S.J. 2	https://apiv2.allsportsapi.com/logo/38853_san-martin-san-juan-res..jpg	38853
1798	Atl. Rafaela 2	\N	42297
1801	Gimnasia L.P. 2	https://apiv2.allsportsapi.com/logo/24468_gimnasia-la-plata-res..jpg	24468
808	Nueva Chicago	https://apiv2.allsportsapi.com/logo/935_nueva-chicago.jpg	935
1816	Godoy Cruz 2	https://apiv2.allsportsapi.com/logo/24573_godoy-cruz-res..jpg	24573
1800	Atl. Tucuman 2	https://apiv2.allsportsapi.com/logo/24544_atletico-tucuman-res..jpg	24544
1818	Huracan 2	https://apiv2.allsportsapi.com/logo/24499_huracan-res..jpg	24499
1811	Central Cordoba 2	https://apiv2.allsportsapi.com/logo/24569_central-cordoba-sde-res..jpg	24569
1828	Rosario Central 2	https://apiv2.allsportsapi.com/logo/24572_rosario-central-res..jpg	24572
1829	Velez Sarsfield 2	https://apiv2.allsportsapi.com/logo/24571_velez-sarsfield-res..jpg	24571
1735	Norway	https://apiv2.allsportsapi.com/logo/692_norway.jpg	692
1821	Belgrano 2	https://apiv2.allsportsapi.com/logo/30589_belgrano-res..jpg	30589
1830	Talleres Cordoba 2	https://apiv2.allsportsapi.com/logo/24540_talleres-de-cordoba-res..jpg	24540
1822	Instituto 2	https://apiv2.allsportsapi.com/logo/30588_instituto-res..jpg	30588
1741	AIK W	https://apiv2.allsportsapi.com/logo/9830_aik-w.jpg	9830
1810	Estudiantes L.P. 2	https://apiv2.allsportsapi.com/logo/24500_estudiantes-res..jpg	24500
1805	Sarmiento Junin 2	https://apiv2.allsportsapi.com/logo/24474_sarmiento-res..jpg	24474
1743	America MG	https://apiv2.allsportsapi.com/logo/1736_america-mineiro.jpg	1736
1820	Independiente 2	https://apiv2.allsportsapi.com/logo/24470_independiente-res..jpg	24470
1807	Lanus 2	https://apiv2.allsportsapi.com/logo/24472_lanus-res..jpg	24472
1804	Barracas Central 2	https://apiv2.allsportsapi.com/logo/24473_barracas-central-res..jpg	24473
1764	Hacken B W	https://apiv2.allsportsapi.com/logo/30594_hacken-ii-w.jpg	30594
1808	Colon Santa Fe 2	https://apiv2.allsportsapi.com/logo/24570_colon-res..jpg	24570
1819	Defensa y Justicia 2	https://apiv2.allsportsapi.com/logo/24574_defensa-y-justicia-res..jpg	24574
1757	KuPS	https://apiv2.allsportsapi.com/logo/180_kups.jpg	180
1809	Estudiantes Rio Cuarto 2	\N	42045
1814	Gimnasia Mendoza 2	\N	42044
2040	Ugyen Academy	https://apiv2.allsportsapi.com/logo/25378_ugyen-academy.jpg	25378
2018	Greater Tomorrow	https://apiv2.allsportsapi.com/logo/30582_greater-tomorrow.jpg	30582
1953	Kortrijk	https://apiv2.allsportsapi.com/logo/1367_kortrijk.jpg	1367
1923	Expressinho	\N	37979
2019	BST Galaxy	https://apiv2.allsportsapi.com/logo/33913_bst-galaxy.jpg	33913
973	Fortaleza U20	https://apiv2.allsportsapi.com/logo/10855_fortaleza-u20.jpg	10855
366	Vestri	https://apiv2.allsportsapi.com/logo/8587_vestri.jpg	8587
1857	LVU Rush	https://apiv2.allsportsapi.com/logo/7853_lehigh-valley-united.jpg	7853
2021	Brikama U.	https://apiv2.allsportsapi.com/logo/11529_brikama-united.jpg	11529
1224	Universitario de Vinto	https://apiv2.allsportsapi.com/logo/21783_universitario-de-vinto.jpg	21783
2029	Hawks	https://apiv2.allsportsapi.com/logo/11534_hawks.jpg	11534
1833	San Lorenzo 2	https://apiv2.allsportsapi.com/logo/24469_san-lorenzo-res..jpg	24469
1913	GE Bage	https://apiv2.allsportsapi.com/logo/1708_bage.jpg	1708
2025	Bombada	https://apiv2.allsportsapi.com/logo/33912_bombada.jpg	33912
630	Blumenau	https://apiv2.allsportsapi.com/logo/25990_blumenau.jpg	25990
457	RC New Jersey	https://apiv2.allsportsapi.com/logo/11925_real-central-new-jersey.jpg	11925
1916	Monsoon	https://apiv2.allsportsapi.com/logo/31561_monsoon.jpg	31561
1984	Parnu JK Vaprus	https://apiv2.allsportsapi.com/logo/3470_vaprus.jpg	3470
1898	Khoromkhon	https://apiv2.allsportsapi.com/logo/12624_khoromkhon.jpg	12624
1919	Gramadense	https://apiv2.allsportsapi.com/logo/38075_gramadense.jpg	38075
1906	Gremio U17	https://apiv2.allsportsapi.com/logo/36207_gremio-u17.jpg	36207
1917	Brasil de Farroupilha	https://apiv2.allsportsapi.com/logo/1701_brasil-farroupilha.jpg	1701
1901	Internacional U17	https://apiv2.allsportsapi.com/logo/36218_internacional-u17.jpg	36218
1944	La Fama	https://apiv2.allsportsapi.com/logo/1035_la-fama.jpg	1035
1853	Erie Sports Center	\N	39537
2020	Hart Academy	https://apiv2.allsportsapi.com/logo/38538_hart-acedemy.jpg	38538
1952	Marke	https://apiv2.allsportsapi.com/logo/37216_marke.jpg	37216
564	Slutsk	https://apiv2.allsportsapi.com/logo/1343_slutsk-2024.jpg	1343
1068	Hwacheon W	https://apiv2.allsportsapi.com/logo/10924_hwacheon-kspo-w.jpg	10924
2014	Fortune	https://apiv2.allsportsapi.com/logo/11580_fortune.jpg	11580
2022	Medina United	\N	42039
2017	Team Rhino	https://apiv2.allsportsapi.com/logo/23445_team-rhino.jpg	23445
1264	St Eloi Lupopo	https://apiv2.allsportsapi.com/logo/11423_fc-saint-eloi-lupopo.jpg	11423
1909	Fluminense U17	https://apiv2.allsportsapi.com/logo/36220_fluminense-u17.jpg	36220
2027	Falcons	https://apiv2.allsportsapi.com/logo/11732_falcons.jpg	11732
1963	Senegal	https://apiv2.allsportsapi.com/logo/720_senegal.jpg	720
2026	Steve Biko	https://apiv2.allsportsapi.com/logo/23444_steve-biko.jpg	23444
2028	TMT	https://apiv2.allsportsapi.com/logo/33911_tmt.jpg	33911
1968	Azam	https://apiv2.allsportsapi.com/logo/11615_azam.jpg	11615
1918	Santa Cruz RS	https://apiv2.allsportsapi.com/logo/8162_santa-cruz-rs.jpg	8162
1915	Brasil de Pelotas	https://apiv2.allsportsapi.com/logo/1746_brasil-de-pelotas.jpg	1746
1912	GA Farroupilha	https://apiv2.allsportsapi.com/logo/38101_farroupilha.jpg	38101
1969	Mashujaa	https://apiv2.allsportsapi.com/logo/32932_mashujaa.jpg	32932
1914	Guarany de Bage	https://apiv2.allsportsapi.com/logo/1705_guarany-de-bage.jpg	1705
1856	Eagle FC	\N	42504
1920	Sao Luis	\N	37983
1986	Kuressaare	https://apiv2.allsportsapi.com/logo/3472_kuressaare.jpg	3472
2023	Dutch Lions	https://apiv2.allsportsapi.com/logo/38514_dutch-lions.jpg	38514
1832	Tigre 2	https://apiv2.allsportsapi.com/logo/24568_tigre-res..jpg	24568
1897	FC Ulaanbaatar	https://apiv2.allsportsapi.com/logo/23046_ulaanbaatar.jpg	23046
2016	Gambia Ports	https://apiv2.allsportsapi.com/logo/11531_gpa.jpg	11531
1903	Atletico GO U17	\N	36213
2024	Samger	https://apiv2.allsportsapi.com/logo/23443_samger.jpg	23443
1994	Real Colorado	\N	42515
1964	Criciuma	https://apiv2.allsportsapi.com/logo/1802_criciuma.jpg	1802
1905	Vasco U17	\N	39220
2042	Bahia U17	https://apiv2.allsportsapi.com/logo/36214_bahia-u17.jpg	36214
978	Sao Paulo U20	https://apiv2.allsportsapi.com/logo/9120_sao-paulo-u20.jpg	9120
710	Londrina	https://apiv2.allsportsapi.com/logo/1785_londrina.jpg	1785
1899	Ulaangom City	\N	41020
1922	Tupan	https://apiv2.allsportsapi.com/logo/38124_tupan.jpg	38124
1908	Sao Paulo U17	https://apiv2.allsportsapi.com/logo/36219_sao-paulo-u17.jpg	36219
1970	Namungo	https://apiv2.allsportsapi.com/logo/8560_namungo.jpg	8560
1071	Gangjin Swans W	https://apiv2.allsportsapi.com/logo/10927_changnyeong-w.jpg	10927
1407	Atletico Union	https://apiv2.allsportsapi.com/logo/12724_union-villa-krause.jpg	12724
1902	Athletico-PR U17	https://apiv2.allsportsapi.com/logo/36322_athletico-pr-u17.jpg	36322
1907	Vitoria U17	\N	43062
1904	Bragantino U17	https://apiv2.allsportsapi.com/logo/36308_rb-bragantino-u17.jpg	36308
1900	America MG U17	\N	36208
1870	West Chester Utd	https://apiv2.allsportsapi.com/logo/7857_west-chester-united.jpg	7857
1954	Zlin	https://apiv2.allsportsapi.com/logo/2640_zlin.jpg	2640
1955	Petrzalka	https://apiv2.allsportsapi.com/logo/6587_fc-petralka.jpg	6587
1921	Araioses	\N	13387
1945	Britannia	https://apiv2.allsportsapi.com/logo/1034_britannia.jpg	1034
1896	Central Stallions	https://apiv2.allsportsapi.com/logo/32781_tuv-azarganuud.jpg	32781
794	Levanger	https://apiv2.allsportsapi.com/logo/5609_levanger.jpg	5609
2466	Keski-Uusimaa	https://apiv2.allsportsapi.com/logo/3506_pkku.jpg	3506
1747	Dodoma Jiji	https://apiv2.allsportsapi.com/logo/11646_dodoma-jiji.jpg	11646
2395	Klubi 04	https://apiv2.allsportsapi.com/logo/3537_klubi-04.jpg	3537
2068	Dakota	https://apiv2.allsportsapi.com/logo/1028_dakota.jpg	1028
2467	TPV	https://apiv2.allsportsapi.com/logo/3519_tpv.jpg	3519
2045	Palmeiras U17	https://apiv2.allsportsapi.com/logo/36215_palmeiras-u17.jpg	36215
2053	Nejmeh SC	https://apiv2.allsportsapi.com/logo/5203_al-nejmeh.jpg	5203
2169	Paro	https://apiv2.allsportsapi.com/logo/12634_paro-fc.jpg	12634
2044	Botafogo RJ U17	https://apiv2.allsportsapi.com/logo/36309_botafogo-u17.jpg	36309
309	Loco. Tbilisi	https://apiv2.allsportsapi.com/logo/220_lokomotivi-tbilisi.jpg	220
922	Snohomish United	https://apiv2.allsportsapi.com/logo/39570_snohomish-united.jpg	39570
274	San Martin S.J.	https://apiv2.allsportsapi.com/logo/940_san-martin-san-juan.jpg	940
2046	Cruzeiro U17	https://apiv2.allsportsapi.com/logo/36211_cruzeiro-u17.jpg	36211
213	Kongsvinger 2	https://apiv2.allsportsapi.com/logo/10932_kongsvinger-ii.jpg	10932
2464	Lucksta	https://apiv2.allsportsapi.com/logo/25370_lucksta.jpg	25370
2050	Fortaleza U17	https://apiv2.allsportsapi.com/logo/36210_fortaleza-u17.jpg	36210
705	Ulytau	https://apiv2.allsportsapi.com/logo/30997_ulytau-zhezkazgan.jpg	30997
2080	Novorizontino	https://apiv2.allsportsapi.com/logo/1805_novorizontino.jpg	1805
2052	Jwayya	\N	40953
2043	Santos U17	https://apiv2.allsportsapi.com/logo/36222_santos-u17.jpg	36222
470	Twin City Toucans	https://apiv2.allsportsapi.com/logo/7859_twin-city-toucans.jpg	7859
2051	Juventude U17	\N	39210
2103	Haka	https://apiv2.allsportsapi.com/logo/3552_haka.jpg	3552
2069	Sporting	https://apiv2.allsportsapi.com/logo/177_sporting-cp.jpg	177
2048	Flamengo RJ U17	https://apiv2.allsportsapi.com/logo/36209_flamengo-u17.jpg	36209
652	U. De Chile	https://apiv2.allsportsapi.com/logo/581_universidad-de-chile.jpg	581
2102	SJK Akatemia	https://apiv2.allsportsapi.com/logo/3530_sjk-akatemia.jpg	3530
2129	IFK Umea	https://apiv2.allsportsapi.com/logo/8383_ifk-ume.jpg	8383
19	Cape Verde	https://apiv2.allsportsapi.com/logo/732_cabo-verde.jpg	732
2245	WAF	https://apiv2.allsportsapi.com/logo/1136_waf-brigittenau.jpg	1136
263	Gimnasia Jujuy	https://apiv2.allsportsapi.com/logo/949_gimnasia-jujuy.jpg	949
1532	Linkoping W	https://apiv2.allsportsapi.com/logo/502_linkoping-w.jpg	502
2047	Corinthians U17	https://apiv2.allsportsapi.com/logo/36221_corinthians-u17.jpg	36221
2130	Vancouver FC	https://apiv2.allsportsapi.com/logo/30823_vancouver-fc.jpg	30823
130	Tunisia	https://apiv2.allsportsapi.com/logo/719_tunisia.jpg	719
1559	Vanersborgs IF	https://apiv2.allsportsapi.com/logo/8321_vanersborgs-if.jpg	8321
2394	Mikkeli	https://apiv2.allsportsapi.com/logo/3558_mp.jpg	3558
2131	Pacific FC	https://apiv2.allsportsapi.com/logo/8732_pacific.jpg	8732
1665	Nona	https://apiv2.allsportsapi.com/logo/25025_nona.jpg	25025
2157	Confianca	https://apiv2.allsportsapi.com/logo/1749_confianca.jpg	1749
2049	Atletico-MG U17	https://apiv2.allsportsapi.com/logo/36289_atletico-mineiro-u17.jpg	36289
1576	Karlskrona	https://apiv2.allsportsapi.com/logo/8328_karlskrona.jpg	8328
2246	Stadlau	https://apiv2.allsportsapi.com/logo/1132_stadlau.jpg	1132
2247	Helfort 15	https://apiv2.allsportsapi.com/logo/19627_dinamo-helfort.jpg	19627
2248	First V II	https://apiv2.allsportsapi.com/logo/37293_first-vienna-ii.jpg	37293
2249	RS Penzing	https://apiv2.allsportsapi.com/logo/12446_red-star-penzing.jpg	12446
2250	Hellas Kagran	https://apiv2.allsportsapi.com/logo/12813_hellas-kagran.jpg	12813
2251	FAC Wien	\N	40976
2252	Simmering	https://apiv2.allsportsapi.com/logo/12809_simmeringer-sc.jpg	12809
2253	Austria XIII	https://apiv2.allsportsapi.com/logo/1133_austria-xiii.jpg	1133
2254	1980 Wien	https://apiv2.allsportsapi.com/logo/12442_1980-wien.jpg	12442
2255	Mauerwerk	https://apiv2.allsportsapi.com/logo/1274_mauerwerk.jpg	1274
2256	Schwechat	https://apiv2.allsportsapi.com/logo/1131_schwechat.jpg	1131
2257	LAC-Inter	https://apiv2.allsportsapi.com/logo/37306_lac-inter.jpg	37306
2258	Stammersdorf	https://apiv2.allsportsapi.com/logo/1140_gerasdorf-stammersdorf.jpg	1140
2259	Wienerberg	https://apiv2.allsportsapi.com/logo/1128_wienerberg.jpg	1128
2262	Frydlant n. O.	https://apiv2.allsportsapi.com/logo/2608_frdlant.jpg	2608
2264	Sigma Olomouc B	https://apiv2.allsportsapi.com/logo/2525_sigma-olomouc-ii.jpg	2525
2265	Trinec	https://apiv2.allsportsapi.com/logo/2630_tinec.jpg	2630
2266	Svitavy	https://apiv2.allsportsapi.com/logo/16990_svitavy.jpg	16990
2267	Horni Redice	https://apiv2.allsportsapi.com/logo/36353_horni-edice.jpg	36353
2293	San Antonio	https://apiv2.allsportsapi.com/logo/7931_san-antonio.jpg	7931
2295	Rhode Island	https://apiv2.allsportsapi.com/logo/34269_rhode-island.jpg	34269
2301	Miami FC	https://apiv2.allsportsapi.com/logo/7935_miami.jpg	7935
186	Hartford Athletic	https://apiv2.allsportsapi.com/logo/7924_hartford-athletic.jpg	7924
690	Shenavarsazi Qeshm	https://apiv2.allsportsapi.com/logo/34353_shenavarsazi-qeshm.jpg	34353
330	Lidingo IFK	https://apiv2.allsportsapi.com/logo/8358_lidingo.jpg	8358
2244	Slovan HAC	https://apiv2.allsportsapi.com/logo/1141_slovan-hac.jpg	1141
2493	Stars FC	\N	39574
2744	Tombense	https://apiv2.allsportsapi.com/logo/1801_tombense.jpg	1801
2235	Ponte Preta	https://apiv2.allsportsapi.com/logo/1741_ponte-preta.jpg	1741
2707	CSA	https://apiv2.allsportsapi.com/logo/1739_csa.jpg	1739
601	Akron Togliatti 2	https://apiv2.allsportsapi.com/logo/32017_akron-ii.jpg	32017
2583	Dynamo Vladivostok	https://apiv2.allsportsapi.com/logo/19266_dinamo-vladivostok.jpg	19266
2586	Kirov	https://apiv2.allsportsapi.com/logo/16048_dinamo-kirov.jpg	16048
2587	Dynamo Moscow 2	https://apiv2.allsportsapi.com/logo/6219_dinamo-moskva-ii.jpg	6219
2592	Istaravshan	https://apiv2.allsportsapi.com/logo/10361_istaravshan.jpg	10361
1104	South East Utd.	https://apiv2.allsportsapi.com/logo/35342_south-east-united.jpg	35342
2585	Dynamo Stavropol	https://apiv2.allsportsapi.com/logo/6209_dinamo-stavropol.jpg	6209
2584	D. Bryansk	https://apiv2.allsportsapi.com/logo/6284_dinamo-bryansk.jpg	6284
2590	Zenit 2	https://apiv2.allsportsapi.com/logo/6218_zenit-ii.jpg	6218
2591	Kuban	https://apiv2.allsportsapi.com/logo/6200_kuban-krasnodar.jpg	6200
2588	Tyumen	https://apiv2.allsportsapi.com/logo/6250_tyumen.jpg	6250
2589	Alania Vladikavkaz	https://apiv2.allsportsapi.com/logo/6267_alaniya-vladikavkaz.jpg	6267
2706	Alagoinhas	https://apiv2.allsportsapi.com/logo/1816_atletico-alagoinhas.jpg	1816
2593	Istiqlol Dushanbe	https://apiv2.allsportsapi.com/logo/407_istiklol.jpg	407
2594	Sardor Tursunzoda	\N	42038
2595	Regar-TadAZ	https://apiv2.allsportsapi.com/logo/12614_regar-tadaz.jpg	12614
2598	Itabaiana	https://apiv2.allsportsapi.com/logo/1815_itabaiana.jpg	1815
2605	Meizhou Hakka	https://apiv2.allsportsapi.com/logo/2237_meizhou-hakka.jpg	2237
2606	Foshan Nanshi	https://apiv2.allsportsapi.com/logo/19586_foshan-nanshi.jpg	19586
2608	Nantong Zhiyun	https://apiv2.allsportsapi.com/logo/2247_nantong-zhiyun.jpg	2247
2609	Yanbian Longding	https://apiv2.allsportsapi.com/logo/19591_yanbian-longding.jpg	19591
2612	Tukums 2000 2	https://apiv2.allsportsapi.com/logo/24900_tukums-ii.jpg	24900
2614	RFS 2	https://apiv2.allsportsapi.com/logo/24897_rgas-fs-ii.jpg	24897
2615	Rezekne	https://apiv2.allsportsapi.com/logo/5193_rzekne-fa.jpg	5193
2618	Riga FC 2	https://apiv2.allsportsapi.com/logo/24898_riga-fc-ii.jpg	24898
2620	Skanste	https://apiv2.allsportsapi.com/logo/19173_skanste.jpg	19173
2635	Argentino MM	https://apiv2.allsportsapi.com/logo/24762_argentino-monte-maiz.jpg	24762
2641	Sarmiento de La Banda	https://apiv2.allsportsapi.com/logo/18421_sarmiento-de-la-banda.jpg	18421
2655	Germinal	https://apiv2.allsportsapi.com/logo/18360_germinal-de-rawson.jpg	18360
2656	Yaypan	\N	42729
2657	Olimpik-Mobiuz	https://apiv2.allsportsapi.com/logo/35094_olympic-ii.jpg	35094
1234	Qingdao Red Lions	https://apiv2.allsportsapi.com/logo/11909_qingdao-red-lions-fc.jpg	11909
1863	Seacoast Utd Phantoms	https://apiv2.allsportsapi.com/logo/7868_seacoast-united-phantoms.jpg	7868
2661	Shanghai Port B	https://apiv2.allsportsapi.com/logo/35008_shanghai-port-ii.jpg	35008
2685	Yenisey 2	https://apiv2.allsportsapi.com/logo/19432_yenisey-ii.jpg	19432
2708	ABC	https://apiv2.allsportsapi.com/logo/1755_abc.jpg	1755
2709	Maguary	https://apiv2.allsportsapi.com/logo/30509_maguary-pe.jpg	30509
2711	Galvez	https://apiv2.allsportsapi.com/logo/1768_galvez.jpg	1768
2712	Betim	https://apiv2.allsportsapi.com/logo/9699_ipatinga-fc.jpg	9699
2713	Operario MS	https://apiv2.allsportsapi.com/logo/1724_operario-fc-ms.jpg	1724
2714	Central SC	https://apiv2.allsportsapi.com/logo/282_central.jpg	282
2715	Laguna RN	https://apiv2.allsportsapi.com/logo/38097_laguna.jpg	38097
2716	CRAC	https://apiv2.allsportsapi.com/logo/1935_crac.jpg	1935
2717	Ivinhema	https://apiv2.allsportsapi.com/logo/13274_ivinhema.jpg	13274
2718	CSE	https://apiv2.allsportsapi.com/logo/1971_cse.jpg	1971
2719	Juazeirense	https://apiv2.allsportsapi.com/logo/1986_juazeirense.jpg	1986
2720	GAS	https://apiv2.allsportsapi.com/logo/2025_gas.jpg	2025
2721	Manaus	https://apiv2.allsportsapi.com/logo/1793_manaus.jpg	1793
2722	Independencia	https://apiv2.allsportsapi.com/logo/1772_independencia.jpg	1772
2723	Guapore	https://apiv2.allsportsapi.com/logo/1969_guapore.jpg	1969
2724	Jacuipense	https://apiv2.allsportsapi.com/logo/1794_jacuipense.jpg	1794
2725	ASA	https://apiv2.allsportsapi.com/logo/1973_asa.jpg	1973
2726	Lagarto	https://apiv2.allsportsapi.com/logo/1902_lagarto.jpg	1902
2727	Decisao	https://apiv2.allsportsapi.com/logo/1958_decisao-sertania.jpg	1958
2728	Manauara	https://apiv2.allsportsapi.com/logo/23871_manauara.jpg	23871
2729	Sao Raimundo RR	https://apiv2.allsportsapi.com/logo/1857_sao-raimundo-rr.jpg	1857
2730	Nacional-AM	https://apiv2.allsportsapi.com/logo/1830_nacional-am.jpg	1830
2731	Monte Roraima	https://apiv2.allsportsapi.com/logo/34807_monte-roraima.jpg	34807
2732	Porto Velho	https://apiv2.allsportsapi.com/logo/1962_porto-velho-ec.jpg	1962
2733	Humaita	https://apiv2.allsportsapi.com/logo/1771_humaita.jpg	1771
2734	Real Noroeste	https://apiv2.allsportsapi.com/logo/1821_real-noroeste.jpg	1821
2735	Democrata GV	https://apiv2.allsportsapi.com/logo/9700_democrata-gv.jpg	9700
2736	Retro	https://apiv2.allsportsapi.com/logo/1955_retro.jpg	1955
2737	Treze PB	https://apiv2.allsportsapi.com/logo/1799_treze-fc.jpg	1799
2739	Porto-BA	https://apiv2.allsportsapi.com/logo/35502_porto-ba.jpg	35502
2740	Sergipe	https://apiv2.allsportsapi.com/logo/1899_sergipe.jpg	1899
2741	Serra Branca	https://apiv2.allsportsapi.com/logo/30409_serra-branca.jpg	30409
2742	Sousa	https://apiv2.allsportsapi.com/logo/2007_sousa.jpg	2007
2743	America RN	https://apiv2.allsportsapi.com/logo/1757_america-rn.jpg	1757
2553	NEFC	\N	43194
2582	Amkar	https://apiv2.allsportsapi.com/logo/12548_amkar-perm.jpg	12548
2935	Vorwärts	https://apiv2.allsportsapi.com/logo/1234_vorwarts-steyr.jpg	1234
2747	Ouvidorense	https://apiv2.allsportsapi.com/logo/35089_abecat-ouvidorense.jpg	35089
2912	Magesi	https://apiv2.allsportsapi.com/logo/18568_magesi.jpg	18568
2838	Bulawayo Chiefs	https://apiv2.allsportsapi.com/logo/8114_bulawayo-chiefs.jpg	8114
2914	Saalfelden	https://apiv2.allsportsapi.com/logo/1290_pinzgau-saalfelden.jpg	1290
2844	Chabab Mohammedia	https://apiv2.allsportsapi.com/logo/5389_chabab-mohammedia.jpg	5389
2865	Rentistas	https://apiv2.allsportsapi.com/logo/7979_rentistas.jpg	7979
2845	Widad Temara	https://apiv2.allsportsapi.com/logo/5421_wydad-temara.jpg	5421
2843	Hardrock	\N	42047
2852	Conquista FC U20	https://apiv2.allsportsapi.com/logo/34248_conquista-u20.jpg	34248
2934	Schallerbach	https://apiv2.allsportsapi.com/logo/1156_bad-schallerbach.jpg	1156
2862	Viva Stumbo	\N	43274
2860	Magwanyana	\N	43273
2861	Madlenya	https://apiv2.allsportsapi.com/logo/29426_madlenya.jpg	29426
2913	Milford FC	https://apiv2.allsportsapi.com/logo/18584_milford.jpg	18584
2846	Amal Tiznit	\N	24708
2866	River Plate	https://apiv2.allsportsapi.com/logo/7973_river-plate.jpg	7973
2768	Jaro 2	\N	42962
2769	Hercules	https://apiv2.allsportsapi.com/logo/3524_js-hercules.jpg	3524
2770	Vaajakoski	https://apiv2.allsportsapi.com/logo/3532_vaajakoski.jpg	3532
2771	TP-47	https://apiv2.allsportsapi.com/logo/14009_tp-47.jpg	14009
2772	Narpes Kraft	https://apiv2.allsportsapi.com/logo/3525_kraft.jpg	3525
2773	Huima / Urho	https://apiv2.allsportsapi.com/logo/34530_huima--urho.jpg	34530
2774	VPS 2	https://apiv2.allsportsapi.com/logo/38770_vps-ii.jpg	38770
2775	GBK Kokkola	https://apiv2.allsportsapi.com/logo/3521_gbk.jpg	3521
2792	Transport United	https://apiv2.allsportsapi.com/logo/9671_transport-united-fc.jpg	9671
2813	Viana	https://apiv2.allsportsapi.com/logo/13384_viana.jpg	13384
2820	KCB	https://apiv2.allsportsapi.com/logo/5126_kcb.jpg	5126
2821	Bandari	https://apiv2.allsportsapi.com/logo/5129_bandari.jpg	5129
2822	Tusker	https://apiv2.allsportsapi.com/logo/5125_tusker.jpg	5125
2823	Police FC	\N	453
2832	Porto Football U20	https://apiv2.allsportsapi.com/logo/35274_porto-ferreira-u20.jpg	35274
2833	Sfera U20	https://apiv2.allsportsapi.com/logo/34255_sfera-u20.jpg	34255
2834	Icasa	https://apiv2.allsportsapi.com/logo/2043_icasa.jpg	2043
2835	Itapipoca	https://apiv2.allsportsapi.com/logo/9709_itapipoca.jpg	9709
2842	Scottland	https://apiv2.allsportsapi.com/logo/39104_scotland-mabvuku.jpg	39104
2853	Jacobina U20	https://apiv2.allsportsapi.com/logo/34962_jacobina-u20.jpg	34962
2847	Jeunesse Sportive Soualem	https://apiv2.allsportsapi.com/logo/5411_js-soualem.jpg	5411
2848	KAC Kenitra	https://apiv2.allsportsapi.com/logo/5416_kac-kenitra.jpg	5416
2849	Mouloudia Oujda	https://apiv2.allsportsapi.com/logo/5390_mouloudia-oujda.jpg	5390
2850	Stade Marocain	https://apiv2.allsportsapi.com/logo/5407_stade-marocain.jpg	5407
2851	Jeunesse Massira	https://apiv2.allsportsapi.com/logo/15360_el-massira.jpg	15360
2863	Amawele	\N	41300
2867	Cerrito	https://apiv2.allsportsapi.com/logo/7980_cerrito.jpg	7980
2868	Atenas	https://apiv2.allsportsapi.com/logo/7989_atenas.jpg	7989
2869	La Luz	https://apiv2.allsportsapi.com/logo/23843_la-luz.jpg	23843
2870	Paysandu FC	https://apiv2.allsportsapi.com/logo/25638_paysandu.jpg	25638
2871	Plaza Colonia	https://apiv2.allsportsapi.com/logo/7969_plaza-colonia.jpg	7969
2840	Dynamos	https://apiv2.allsportsapi.com/logo/8110_dynamos.jpg	8110
2864	Oriental	https://apiv2.allsportsapi.com/logo/26264_oriental.jpg	26264
2915	Dornbirn	https://apiv2.allsportsapi.com/logo/1228_dornbirn.jpg	1228
2916	Bischofshofen	https://apiv2.allsportsapi.com/logo/1288_bischofshofen.jpg	1288
2917	Hohenems	https://apiv2.allsportsapi.com/logo/1243_hohenems.jpg	1243
2918	Wacker Innsbruck	https://apiv2.allsportsapi.com/logo/1224_wacker-innsbruck.jpg	1224
2919	Altach U21	https://apiv2.allsportsapi.com/logo/12800_rheindorf-altach-ii.jpg	12800
2920	Kitzbuhel	https://apiv2.allsportsapi.com/logo/1295_kitzbuhel.jpg	1295
2921	Seekirchen	https://apiv2.allsportsapi.com/logo/1257_seekirchen.jpg	1257
2922	Lauterach	https://apiv2.allsportsapi.com/logo/1294_lauterach.jpg	1294
2923	Kufstein	https://apiv2.allsportsapi.com/logo/1297_kufstein.jpg	1297
2924	FC Lustenau	https://apiv2.allsportsapi.com/logo/1195_lustenau.jpg	1195
2926	Wals-Grunau	https://apiv2.allsportsapi.com/logo/1293_wals-grunau.jpg	1293
2927	Reichenau	https://apiv2.allsportsapi.com/logo/1246_svg-reichenau.jpg	1246
1516	Mbeya City	https://apiv2.allsportsapi.com/logo/11496_mbeya-city.jpg	11496
2746	Uberlandia	https://apiv2.allsportsapi.com/logo/1867_uberlandia.jpg	1867
2936	Micheldorf	https://apiv2.allsportsapi.com/logo/1151_grun-wei-micheldorf.jpg	1151
2937	Pregarten	https://apiv2.allsportsapi.com/logo/1150_pregarten.jpg	1150
2938	Ostermiething	https://apiv2.allsportsapi.com/logo/25750_ostermiething.jpg	25750
2939	Vöcklamarkt	https://apiv2.allsportsapi.com/logo/1249_union-vocklamarkt.jpg	1249
2940	St. Martin i.M	https://apiv2.allsportsapi.com/logo/1143_st.-martin-im-muhlkreis.jpg	1143
2941	Oedt	https://apiv2.allsportsapi.com/logo/1147_oedt.jpg	1147
2942	Mondsee	https://apiv2.allsportsapi.com/logo/1148_mondsee.jpg	1148
2943	Union Perg	https://apiv2.allsportsapi.com/logo/1158_union-perg.jpg	1158
3650	FA 2000	https://apiv2.allsportsapi.com/logo/2672_fa-2000.jpg	2672
2836	Agama	\N	42046
2841	TelOne	https://apiv2.allsportsapi.com/logo/8117_telone.jpg	8117
2947	Bad Ischl	https://apiv2.allsportsapi.com/logo/12803_bad-ischl.jpg	12803
2948	Gschwandt	\N	40974
2949	Edelweiß	https://apiv2.allsportsapi.com/logo/1144_union-edelwei.jpg	1144
2950	Hallwang	https://apiv2.allsportsapi.com/logo/1163_hallwang.jpg	1163
2951	Straßwalchen	https://apiv2.allsportsapi.com/logo/1167_strawalchen.jpg	1167
2952	Eugendorf	https://apiv2.allsportsapi.com/logo/1159_eugendorf.jpg	1159
2953	Thalgau	https://apiv2.allsportsapi.com/logo/1161_thalgau.jpg	1161
2954	Bramberg	https://apiv2.allsportsapi.com/logo/1164_bramberg.jpg	1164
2955	Siezenheim	https://apiv2.allsportsapi.com/logo/1171_siezenheim.jpg	1171
2956	Henndorf	https://apiv2.allsportsapi.com/logo/32287_union-henndorf.jpg	32287
2957	Bürmoos	https://apiv2.allsportsapi.com/logo/1160_burmoos.jpg	1160
2958	Anthering	\N	40975
2959	Neumarkt	https://apiv2.allsportsapi.com/logo/1162_neumarkt-am-wallersee.jpg	1162
2960	Grödig	https://apiv2.allsportsapi.com/logo/1253_grodig.jpg	1253
2961	Puch	https://apiv2.allsportsapi.com/logo/1172_puch.jpg	1172
2962	Hallein	https://apiv2.allsportsapi.com/logo/24635_ufc-hallein.jpg	24635
2963	Anif	https://apiv2.allsportsapi.com/logo/1289_anif.jpg	1289
2964	SAK	https://apiv2.allsportsapi.com/logo/1292_salzburger-ak.jpg	1292
2966	Kundl	https://apiv2.allsportsapi.com/logo/1175_kundl.jpg	1175
2967	Mils	https://apiv2.allsportsapi.com/logo/1177_mils.jpg	1177
2968	St. Johann	https://apiv2.allsportsapi.com/logo/1180_st.-johann-in-tirol.jpg	1180
2969	Völs	https://apiv2.allsportsapi.com/logo/1182_vols.jpg	1182
2970	Innsbrucker AC	https://apiv2.allsportsapi.com/logo/19511_innsbrucker-ac.jpg	19511
2971	Fügen	https://apiv2.allsportsapi.com/logo/1174_fugen.jpg	1174
2972	WSG Tirol II	https://apiv2.allsportsapi.com/logo/1299_wsg-tirol-ii.jpg	1299
2973	Telfs	https://apiv2.allsportsapi.com/logo/1300_telfs.jpg	1300
2974	Kematen	https://apiv2.allsportsapi.com/logo/1183_kematen.jpg	1183
2975	Silz / Mötz	https://apiv2.allsportsapi.com/logo/1173_silz--motz.jpg	1173
2976	Wörgl	https://apiv2.allsportsapi.com/logo/1248_worgl.jpg	1248
2977	Oberperfuss	https://apiv2.allsportsapi.com/logo/25752_oberperfuss.jpg	25752
2978	Volders	https://apiv2.allsportsapi.com/logo/1179_volders.jpg	1179
2979	Ebbs	https://apiv2.allsportsapi.com/logo/1181_ebbs.jpg	1181
2980	FC Wolfurt	https://apiv2.allsportsapi.com/logo/1267_wolfurt.jpg	1267
2981	Göfis	https://apiv2.allsportsapi.com/logo/1204_gofis.jpg	1204
2982	FC Bizau	https://apiv2.allsportsapi.com/logo/1191_bizau.jpg	1191
2983	BW Feldkirch	https://apiv2.allsportsapi.com/logo/1200_blau-wei-feldkirch.jpg	1200
2984	Lochau	https://apiv2.allsportsapi.com/logo/1197_lochau.jpg	1197
2985	Dornbirn	https://apiv2.allsportsapi.com/logo/1189_admira-dornbirn.jpg	1189
2986	DSV	https://apiv2.allsportsapi.com/logo/1256_dornbirner-sv.jpg	1256
2987	FC Egg	https://apiv2.allsportsapi.com/logo/1190_fc-egg.jpg	1190
2988	FC Nenzing	https://apiv2.allsportsapi.com/logo/1199_nenzing.jpg	1199
2989	Rotenberg	https://apiv2.allsportsapi.com/logo/1265_rotenberg.jpg	1265
2990	A Lustenau II	https://apiv2.allsportsapi.com/logo/1263_austria-lustenau-ii.jpg	1263
2991	Röthis	https://apiv2.allsportsapi.com/logo/1266_rothis.jpg	1266
2992	FC Hard	https://apiv2.allsportsapi.com/logo/1198_hard.jpg	1198
2993	Ludesch	https://apiv2.allsportsapi.com/logo/1201_ludesch.jpg	1201
2994	FS Trebic	https://apiv2.allsportsapi.com/logo/36157_fs-tebi.jpg	36157
2996	Humpolec	https://apiv2.allsportsapi.com/logo/2589_humpolec.jpg	2589
2997	Velka Bites	https://apiv2.allsportsapi.com/logo/2578_velka-bite.jpg	2578
2998	Sparta Brno	https://apiv2.allsportsapi.com/logo/16970_sparta-brno.jpg	16970
2999	Chotebor	https://apiv2.allsportsapi.com/logo/17024_chotbo.jpg	17024
3000	Sperice	https://apiv2.allsportsapi.com/logo/25939_dalnice-speice.jpg	25939
3001	Havlickuv Brod	https://apiv2.allsportsapi.com/logo/2583_havlikv-brod.jpg	2583
3002	Zdar nad Sazavou	https://apiv2.allsportsapi.com/logo/2585_ar-nad-sazavou.jpg	2585
3003	Kurim	https://apiv2.allsportsapi.com/logo/19611_kuim.jpg	19611
3004	Zdirec n. D.	https://apiv2.allsportsapi.com/logo/2582_direc-nad-doubravou.jpg	2582
3005	Znojmo	https://apiv2.allsportsapi.com/logo/2527_znojmo.jpg	2527
3006	Brumov	https://apiv2.allsportsapi.com/logo/2605_brumov.jpg	2605
3007	Lanzhot	https://apiv2.allsportsapi.com/logo/2580_sokol-lanhot.jpg	2580
3008	Nove Sady	https://apiv2.allsportsapi.com/logo/2604_nove-sady.jpg	2604
3009	Skastice	https://apiv2.allsportsapi.com/logo/2595_skatice.jpg	2595
3010	Cesky Tesin	https://apiv2.allsportsapi.com/logo/19653_esk-tin.jpg	19653
3011	Bilovec	https://apiv2.allsportsapi.com/logo/19325_bilovec.jpg	19325
3012	Rymarov	https://apiv2.allsportsapi.com/logo/2611_jiskra-rmaov.jpg	2611
3013	Pusta Polom	https://apiv2.allsportsapi.com/logo/17029_pusta-polom.jpg	17029
3014	Vratimov	https://apiv2.allsportsapi.com/logo/19324_fc-vratimov.jpg	19324
3015	Sumperk	https://apiv2.allsportsapi.com/logo/2601_umperk.jpg	2601
3016	Zabreh	https://apiv2.allsportsapi.com/logo/16933_zabeh.jpg	16933
3017	Novy Jicin	https://apiv2.allsportsapi.com/logo/2617_nov-jiin.jpg	2617
3018	Blansko	https://apiv2.allsportsapi.com/logo/2631_blansko.jpg	2631
3019	Hodonin	https://apiv2.allsportsapi.com/logo/2579_hodonin.jpg	2579
3020	Vsetin	https://apiv2.allsportsapi.com/logo/2599_vsetin.jpg	2599
3021	Karvina B	https://apiv2.allsportsapi.com/logo/2606_karvina-ii.jpg	2606
2945	Weißkirchen/A	https://apiv2.allsportsapi.com/logo/1146_union-weikirchen.jpg	1146
827	Villa San Carlos	https://apiv2.allsportsapi.com/logo/924_villa-san-carlos.jpg	924
3024	FK Pardubice U19	https://apiv2.allsportsapi.com/logo/11455_pardubice-u19.jpg	11455
3203	Justo Jose de Urquiza	https://apiv2.allsportsapi.com/logo/918_jj-urquiza.jpg	918
3210	Leandro N. Alem	https://apiv2.allsportsapi.com/logo/969_leandro-niceforo-alem.jpg	969
3192	Central Ballester	https://apiv2.allsportsapi.com/logo/980_central-ballester.jpg	980
3201	Berazategui	https://apiv2.allsportsapi.com/logo/959_berazategui.jpg	959
3193	Canuelas	https://apiv2.allsportsapi.com/logo/911_canuelas.jpg	911
3202	Deportivo Paraguayo	https://apiv2.allsportsapi.com/logo/978_deportivo-paraguayo.jpg	978
3025	Hradec Kralove U19	https://apiv2.allsportsapi.com/logo/11454_hradec-kralove-u19.jpg	11454
3026	Liberec U19	https://apiv2.allsportsapi.com/logo/32073_slovan-liberec-u19.jpg	32073
3027	Dukla Prague U19	https://apiv2.allsportsapi.com/logo/25745_dukla-praha-u19.jpg	25745
3028	Zlin U19	https://apiv2.allsportsapi.com/logo/11263_zlin-u19.jpg	11263
3030	FK Komarov	https://apiv2.allsportsapi.com/logo/8167_komarov.jpg	8167
3031	Milevsko	https://apiv2.allsportsapi.com/logo/11320_milevsko.jpg	11320
3032	Horovice	https://apiv2.allsportsapi.com/logo/2544_sk-hoovice.jpg	2544
3033	Benesov	https://apiv2.allsportsapi.com/logo/2502_beneov.jpg	2502
3034	Milin	https://apiv2.allsportsapi.com/logo/32858_milin.jpg	32858
3035	Krimice	\N	40213
3036	Povltavska FA	https://apiv2.allsportsapi.com/logo/2508_povltava-fa.jpg	2508
3037	Domazlice B	https://apiv2.allsportsapi.com/logo/26204_jiskra-domalice-ii.jpg	26204
3038	Tachov	https://apiv2.allsportsapi.com/logo/16929_tachov.jpg	16929
3040	TJ Prestice	https://apiv2.allsportsapi.com/logo/36498_tj-petice.jpg	36498
3041	Doubravka	https://apiv2.allsportsapi.com/logo/2537_doubravka.jpg	2537
3042	Louny	https://apiv2.allsportsapi.com/logo/2557_louny.jpg	2557
3043	Spoje Prague	https://apiv2.allsportsapi.com/logo/32156_spoje-praha.jpg	32156
3044	Marianske Lazne	https://apiv2.allsportsapi.com/logo/2541_marianske-lazn.jpg	2541
3045	Psary	\N	37315
3046	Olympie Brezova	https://apiv2.allsportsapi.com/logo/2560_olympie-bezova.jpg	2560
3047	Tempo Prague	https://apiv2.allsportsapi.com/logo/17001_tempo-praha.jpg	17001
3048	Ostrov	https://apiv2.allsportsapi.com/logo/2556_ostrov.jpg	2556
3049	Ujezd Prague	https://apiv2.allsportsapi.com/logo/25940_ujezd-praha-4.jpg	25940
3050	Predni Kopanina	https://apiv2.allsportsapi.com/logo/16939_pedni-kopanina.jpg	16939
3051	Karlovy Vary	https://apiv2.allsportsapi.com/logo/2504_fc-slavia-karlovy-vary.jpg	2504
3052	Slany	https://apiv2.allsportsapi.com/logo/2553_slan.jpg	2553
3053	Steti	https://apiv2.allsportsapi.com/logo/2561_tti.jpg	2561
3054	Sokolov	https://apiv2.allsportsapi.com/logo/2511_banik-sokolov.jpg	2511
3055	Chomutov	https://apiv2.allsportsapi.com/logo/2552_chomutov.jpg	2552
3056	Caslav	https://apiv2.allsportsapi.com/logo/2569_aslav.jpg	2569
3057	Chrudim B	https://apiv2.allsportsapi.com/logo/26205_chrudim-ii.jpg	26205
3058	Chlumec nad Cidlinou	https://apiv2.allsportsapi.com/logo/2481_chlumec-nad-cidlinou.jpg	2481
3059	Vysoke Myto	https://apiv2.allsportsapi.com/logo/2564_vysoke-mto.jpg	2564
3060	Dobrovice	https://apiv2.allsportsapi.com/logo/11654_dobrovice.jpg	11654
3061	Prepere	https://apiv2.allsportsapi.com/logo/2482_pepee.jpg	2482
3062	Hlinsko	https://apiv2.allsportsapi.com/logo/2571_fc-hlinsko.jpg	2571
3063	Brandys n. Labem	https://apiv2.allsportsapi.com/logo/2555_brands-nad-labem.jpg	2555
3064	Nachod	https://apiv2.allsportsapi.com/logo/2563_nachod.jpg	2563
3065	Hradek nad Nisou	https://apiv2.allsportsapi.com/logo/36450_fc-diepenbeek.jpg	36450
3067	Kosmonosy	https://apiv2.allsportsapi.com/logo/2566_kosmonosy.jpg	2566
3068	Trutnov	https://apiv2.allsportsapi.com/logo/2573_trutnov.jpg	2573
3069	Turnov	https://apiv2.allsportsapi.com/logo/16931_turnov.jpg	16931
739	Orkla	https://apiv2.allsportsapi.com/logo/10962_orkla.jpg	10962
805	CA Estudiantes	https://apiv2.allsportsapi.com/logo/934_estudiantes-caseros.jpg	934
3194	Central Cordoba	https://apiv2.allsportsapi.com/logo/960_central-cordoba.jpg	960
3195	Deportivo Espanol	https://apiv2.allsportsapi.com/logo/962_deportivo-espanol.jpg	962
3196	Claypole	https://apiv2.allsportsapi.com/logo/961_claypole.jpg	961
3197	Deportivo Muniz	https://apiv2.allsportsapi.com/logo/986_muniz.jpg	986
3198	Club Lujan	https://apiv2.allsportsapi.com/logo/970_lujan.jpg	970
3199	Yupanqui	https://apiv2.allsportsapi.com/logo/983_yupanqui.jpg	983
3200	Def. de Cambaceres	https://apiv2.allsportsapi.com/logo/977_cambaceres.jpg	977
3208	Juventud Unida S. M.	https://apiv2.allsportsapi.com/logo/982_juventud-unida.jpg	982
3209	Estrella Del Sur	https://apiv2.allsportsapi.com/logo/34714_estrella-del-sur.jpg	34714
3204	El Porvenir	https://apiv2.allsportsapi.com/logo/965_el-porvenir.jpg	965
3205	Atlas	https://apiv2.allsportsapi.com/logo/958_atlas.jpg	958
3206	Fenix	https://apiv2.allsportsapi.com/logo/917_fenix.jpg	917
3207	Leones de Rosario	\N	42052
773	Bodo/Glimt W	https://apiv2.allsportsapi.com/logo/34275_bod--glimt-women.jpg	34275
3211	Victoriano A.	https://apiv2.allsportsapi.com/logo/975_victoriano-arenas.jpg	975
3212	Lugano	https://apiv2.allsportsapi.com/logo/979_lugano.jpg	979
3213	Mercedes	https://apiv2.allsportsapi.com/logo/25087_mercedes.jpg	25087
3214	Puerto Nuevo	https://apiv2.allsportsapi.com/logo/985_puerto-nuevo.jpg	985
3022	Brno U19	https://apiv2.allsportsapi.com/logo/11264_zbrojovka-brno-u19.jpg	11264
3023	Slavia Prague U19	https://apiv2.allsportsapi.com/logo/11462_slavia-praha-u19.jpg	11462
3519	Ruzomberok W	https://apiv2.allsportsapi.com/logo/19379_ruomberok-w.jpg	19379
1574	Viggbyholms	https://apiv2.allsportsapi.com/logo/30817_viggbyholms-ik.jpg	30817
3323	JJK Jyvaskyla	https://apiv2.allsportsapi.com/logo/3523_jjk.jpg	3523
3622	Minas Boca U20	https://apiv2.allsportsapi.com/logo/35602_minas-boca-u20.jpg	35602
3423	Mashuk	https://apiv2.allsportsapi.com/logo/6207_mashuk-kmv.jpg	6207
3461	Dalian K'un City	https://apiv2.allsportsapi.com/logo/18489_dalian-kun-city-fc.jpg	18489
3518	Trnava W	https://apiv2.allsportsapi.com/logo/11676_spartak-trnava-w.jpg	11676
3623	Sao Joao del Rei U20	\N	42832
3475	Super Nova 2	\N	42659
3460	Changchun Yatai	https://apiv2.allsportsapi.com/logo/2233_changchun-yatai.jpg	2233
1110	Launceston U21	https://apiv2.allsportsapi.com/logo/35345_launceston-city-ii.jpg	35345
3216	Sacachispas	https://apiv2.allsportsapi.com/logo/920_sacachispas.jpg	920
3217	Argentino de Rosario	https://apiv2.allsportsapi.com/logo/987_argentino-rosario.jpg	987
3218	Sportivo Barracas	https://apiv2.allsportsapi.com/logo/981_sportivo-barracas.jpg	981
3219	General Lamadrid	https://apiv2.allsportsapi.com/logo/967_general-lamadrid.jpg	967
3322	KPV Kokkola	https://apiv2.allsportsapi.com/logo/3547_kpv.jpg	3547
3215	CSR Espanol	https://apiv2.allsportsapi.com/logo/984_centro-espanol.jpg	984
3324	VJS	https://apiv2.allsportsapi.com/logo/3520_vjs.jpg	3520
3325	Rovaniemi	https://apiv2.allsportsapi.com/logo/3545_rops.jpg	3545
904	Bani Ganse	https://apiv2.allsportsapi.com/logo/30270_bani-ganse.jpg	30270
3422	Kaluga	https://apiv2.allsportsapi.com/logo/6242_kaluga.jpg	6242
3424	Miass	https://apiv2.allsportsapi.com/logo/19263_torpedo-miass.jpg	19263
3425	Rodina Moscow 2	https://apiv2.allsportsapi.com/logo/25947_rodina-moskva-ii.jpg	25947
3426	Tekstilshtik	https://apiv2.allsportsapi.com/logo/6277_tekstilshchik.jpg	6277
3427	Omsk	https://apiv2.allsportsapi.com/logo/6280_irtysh-omsk.jpg	6280
3428	Veles Moscow	https://apiv2.allsportsapi.com/logo/6270_veles.jpg	6270
3429	Leningradets	https://apiv2.allsportsapi.com/logo/6223_leningradets.jpg	6223
3430	Volgar-Astrakhan	https://apiv2.allsportsapi.com/logo/6273_volgar-astrakhan.jpg	6273
3431	Sibir Novosibirsk	https://apiv2.allsportsapi.com/logo/6249_fk-sibir.jpg	6249
3432	Eskhata	https://apiv2.allsportsapi.com/logo/10359_eskhata.jpg	10359
3433	Khosilot Parkhar	https://apiv2.allsportsapi.com/logo/12628_khosilot-farkhor.jpg	12628
3434	Vakhsh	https://apiv2.allsportsapi.com/logo/10362_vakhsh-bokhtar.jpg	10362
3435	Ravshan	https://apiv2.allsportsapi.com/logo/457_ravshan.jpg	457
3437	Anapolis	https://apiv2.allsportsapi.com/logo/1933_anapolis.jpg	1933
3438	Guarani	https://apiv2.allsportsapi.com/logo/1747_guarani-sp.jpg	1747
989	Dianella White Eagle	https://apiv2.allsportsapi.com/logo/35340_dianella-white-eagles.jpg	35340
1144	Saturn Ramenskoye	https://apiv2.allsportsapi.com/logo/6233_saturn-ramenskoye.jpg	6233
3462	Nanjing City	https://apiv2.allsportsapi.com/logo/11827_nanjing-city.jpg	11827
3466	Dingnan Ganlian	https://apiv2.allsportsapi.com/logo/2249_dingnan-united.jpg	2249
3476	Feodosiya	\N	42666
3499	Changchun Xidu	https://apiv2.allsportsapi.com/logo/34787_changchun-xidu.jpg	34787
3502	Beijing Technology	https://apiv2.allsportsapi.com/logo/11815_beijing-bit.jpg	11815
1464	Lanzhou Longyuan	https://apiv2.allsportsapi.com/logo/31748_lanzhou-longyuan.jpg	31748
353	Portland Timbers 2	https://apiv2.allsportsapi.com/logo/16848_portland-timbers-ii.jpg	16848
3532	Brondby W	https://apiv2.allsportsapi.com/logo/39_brndby-women.jpg	39
3533	Aarhus W	https://apiv2.allsportsapi.com/logo/9487_agf-women.jpg	9487
3534	Fortuna Hjorring W	https://apiv2.allsportsapi.com/logo/33_fortuna-hjrring-w.jpg	33
3535	Nordsjaelland W	https://apiv2.allsportsapi.com/logo/9486_nordsjlland-w.jpg	9486
3536	Koge W	https://apiv2.allsportsapi.com/logo/9489_kge-w.jpg	9489
3537	KoldingQ W	https://apiv2.allsportsapi.com/logo/9485_kolding-women.jpg	9485
3538	ASA Aarhus W	\N	42798
3539	Thisted FC W	https://apiv2.allsportsapi.com/logo/9488_thy-thistedq-women.jpg	9488
3540	FC Copenhagen W	\N	42799
3541	Midtjylland W	\N	39402
3542	Odense Q W	https://apiv2.allsportsapi.com/logo/11463_odense-q-women.jpg	11463
3543	Osterbro W	\N	39399
3544	Petrzalka W	https://apiv2.allsportsapi.com/logo/11675_fc-petralka-w.jpg	11675
3545	Slovan Bratislava W	https://apiv2.allsportsapi.com/logo/11671_slovan-bratislava-w.jpg	11671
3546	Myjava W	https://apiv2.allsportsapi.com/logo/11672_spartak-myjava-w.jpg	11672
3547	Presov W	\N	41198
568	Dudley Redhead United	https://apiv2.allsportsapi.com/logo/38618_dudley-redhead-united.jpg	38618
3227	KaPa	https://apiv2.allsportsapi.com/logo/3501_kapa.jpg	3501
3624	Betim U20	https://apiv2.allsportsapi.com/logo/35604_betim-u20.jpg	35604
3625	Social U20	\N	42834
3626	Inter de Minas U20	https://apiv2.allsportsapi.com/logo/30475_inter-de-minas-u20.jpg	30475
3627	Coimbra U20	https://apiv2.allsportsapi.com/logo/34250_coimbra-u20.jpg	34250
3628	AE Altos	https://apiv2.allsportsapi.com/logo/1711_altos.jpg	1711
3629	Atletico-CE	https://apiv2.allsportsapi.com/logo/2037_fc-atletico-cearense.jpg	2037
3630	Ferroviario	https://apiv2.allsportsapi.com/logo/1795_ferroviario.jpg	1795
3631	Fluminense-PI	https://apiv2.allsportsapi.com/logo/1719_fluminense-pi.jpg	1719
3632	Piaui	https://apiv2.allsportsapi.com/logo/1717_piaui.jpg	1717
3633	Tirol	https://apiv2.allsportsapi.com/logo/24848_tirol.jpg	24848
3226	Jippo	https://apiv2.allsportsapi.com/logo/3533_jippo.jpg	3533
3728	MWOS	https://apiv2.allsportsapi.com/logo/39106_mwos.jpg	39106
3653	Naesby	https://apiv2.allsportsapi.com/logo/2665_nsby.jpg	2665
3794	IJsselmeervogels	https://apiv2.allsportsapi.com/logo/5486_ijsselmeervogels.jpg	5486
3691	Drukpa	\N	43049
3733	Manica	https://apiv2.allsportsapi.com/logo/8106_manica-diamonds.jpg	8106
3737	Laos W	https://apiv2.allsportsapi.com/logo/23159_laos-women.jpg	23159
3734	ZPC Kariba	https://apiv2.allsportsapi.com/logo/8109_kariba.jpg	8109
3731	Ngezi Platinum	https://apiv2.allsportsapi.com/logo/8105_ngezi-platinum.jpg	8105
3738	Chabab Benguerir	https://apiv2.allsportsapi.com/logo/5413_chabab-ben-guerir.jpg	5413
3727	Herentals	https://apiv2.allsportsapi.com/logo/8112_herentals.jpg	8112
930	Western Mass Pioneers	https://apiv2.allsportsapi.com/logo/7869_western-mass-pioneers.jpg	7869
3739	Moghreb Tetouan	https://apiv2.allsportsapi.com/logo/5392_moghreb-tetouan.jpg	5392
3726	Chicken Inn	https://apiv2.allsportsapi.com/logo/8103_chicken-inn.jpg	8103
3730	Platinum	https://apiv2.allsportsapi.com/logo/8102_platinum.jpg	8102
3668	EPS	https://apiv2.allsportsapi.com/logo/3509_eps.jpg	3509
3787	Tacuarembo	https://apiv2.allsportsapi.com/logo/7990_tacuarembo.jpg	7990
3654	Nykobing	https://apiv2.allsportsapi.com/logo/2669_nykbing.jpg	2669
3655	Vanlose	https://apiv2.allsportsapi.com/logo/2674_vanlse.jpg	2674
3656	BK Frem	https://apiv2.allsportsapi.com/logo/2657_frem.jpg	2657
3657	Sundby	https://apiv2.allsportsapi.com/logo/17194_sundby.jpg	17194
3658	Holbaek	https://apiv2.allsportsapi.com/logo/2666_holbk-bi.jpg	2666
3659	Vejgaard	https://apiv2.allsportsapi.com/logo/2718_vejgaard.jpg	2718
3660	Lyseng	https://apiv2.allsportsapi.com/logo/2716_lyseng.jpg	2716
3661	Odder	https://apiv2.allsportsapi.com/logo/2708_odder.jpg	2708
3662	HIFK	https://apiv2.allsportsapi.com/logo/3546_hifk.jpg	3546
3663	PEPO	https://apiv2.allsportsapi.com/logo/3505_pepo.jpg	3505
3664	Lahden Reipas	https://apiv2.allsportsapi.com/logo/3508_reipas.jpg	3508
3665	Union Plaani	https://apiv2.allsportsapi.com/logo/24599_union-plaani.jpg	24599
3785	Miramar	https://apiv2.allsportsapi.com/logo/16860_miramar-misiones.jpg	16860
3786	Huracan FC	\N	25636
3669	Abo	https://apiv2.allsportsapi.com/logo/14034_ifk.jpg	14034
3670	NJS	https://apiv2.allsportsapi.com/logo/3504_njs.jpg	3504
3671	Ilves 2	https://apiv2.allsportsapi.com/logo/3514_ilves-ii.jpg	3514
3672	P-Iirot Rauma	https://apiv2.allsportsapi.com/logo/3536_p-iirot.jpg	3536
3666	PuiU	https://apiv2.allsportsapi.com/logo/24411_puiu-helsinki.jpg	24411
3667	MyPa	https://apiv2.allsportsapi.com/logo/3502_mypa.jpg	3502
3698	Al Tadamon	https://apiv2.allsportsapi.com/logo/5184_al-tadhamon.jpg	5184
3699	Al-Fahaheel	https://apiv2.allsportsapi.com/logo/5180_al-fahaheel.jpg	5180
3700	Al Arabi	https://apiv2.allsportsapi.com/logo/5174_al-arabi.jpg	5174
3701	Al Qadisiya	https://apiv2.allsportsapi.com/logo/427_al-qadsia.jpg	427
3716	Penybont	https://apiv2.allsportsapi.com/logo/8096_penybont.jpg	8096
3717	Caerau Ely	https://apiv2.allsportsapi.com/logo/8095_caerau-ely.jpg	8095
3719	Portuguesa Santista U20	https://apiv2.allsportsapi.com/logo/23908_portuguesa-santista-u20.jpg	23908
3721	Osasco Audax U20	https://apiv2.allsportsapi.com/logo/10865_osasco-audax-u20.jpg	10865
3723	Bandeirante U20	https://apiv2.allsportsapi.com/logo/35278_bandeirante-u20.jpg	35278
3724	Vila Nova FC U20	https://apiv2.allsportsapi.com/logo/10888_vila-nova-u20.jpg	10888
3725	Atletico GO U20	https://apiv2.allsportsapi.com/logo/10817_atletico-go-u20.jpg	10817
3688	Hunters	https://apiv2.allsportsapi.com/logo/36668_hunters.jpg	36668
3690	RTC	https://apiv2.allsportsapi.com/logo/25383_rtc.jpg	25383
3740	Raja Beni Mellal	https://apiv2.allsportsapi.com/logo/5417_raja-beni-mellal.jpg	5417
3741	Chabab Atlas Khenifra	https://apiv2.allsportsapi.com/logo/5418_chabab-atlas-khenifra.jpg	5418
3742	USM Oujda	https://apiv2.allsportsapi.com/logo/21568_usm-oujda.jpg	21568
3743	US Boujaad	\N	41124
3744	Wydad Fes	https://apiv2.allsportsapi.com/logo/5409_wydad-fes.jpg	5409
3745	RAC Casablanca	https://apiv2.allsportsapi.com/logo/5414_racing-de-casablanca.jpg	5414
3746	Camacariense U20	https://apiv2.allsportsapi.com/logo/23913_camacariense-u20.jpg	23913
3747	Alagoinhas U20	https://apiv2.allsportsapi.com/logo/34999_atletico-alagoinhas-u20.jpg	34999
3748	Galicia U20	\N	39230
3749	SSA U20	https://apiv2.allsportsapi.com/logo/34969_ssa-u20.jpg	34969
3751	Grapiuna U20	https://apiv2.allsportsapi.com/logo/34973_grapiuna-u20.jpg	34973
3754	Fluminense de Feira U20	\N	39231
3755	Estrela De Marco U20	https://apiv2.allsportsapi.com/logo/34971_estrela-de-marco-u20.jpg	34971
3756	Jacuipense U20	https://apiv2.allsportsapi.com/logo/10882_jacuipense-u20.jpg	10882
3757	Vitoria da Conquista U20	https://apiv2.allsportsapi.com/logo/10868_vitoria-da-conquista-u20.jpg	10868
3758	Porto-BA U20	\N	39235
3759	Barcelona U20	https://apiv2.allsportsapi.com/logo/35000_barcelona-ba-u20.jpg	35000
3776	Academia Control Orientado	\N	43259
3784	Uruguay Montevideo	https://apiv2.allsportsapi.com/logo/12445_uruguay-montevideo.jpg	12445
3652	Horsholm-Usserod	https://apiv2.allsportsapi.com/logo/17082_hrsholm-usserd.jpg	17082
3788	Colon	https://apiv2.allsportsapi.com/logo/7992_colon.jpg	7992
3789	Fenix	https://apiv2.allsportsapi.com/logo/7970_fenix.jpg	7970
3673	Honka	https://apiv2.allsportsapi.com/logo/251_honka.jpg	251
3732	Simba Bhora	https://apiv2.allsportsapi.com/logo/31298_simba-bhora.jpg	31298
3736	Saudi Arabia W	https://apiv2.allsportsapi.com/logo/29912_saudi-arabia-w.jpg	29912
3913	Jazz Pori	https://apiv2.allsportsapi.com/logo/3515_jazz.jpg	3515
3875	PK-35	https://apiv2.allsportsapi.com/logo/3540_pk-35.jpg	3540
3807	Kuchl	https://apiv2.allsportsapi.com/logo/1286_kuchl.jpg	1286
1500	Czech Republic	https://apiv2.allsportsapi.com/logo/13_czechia.jpg	13
1748	Fountain Gate	https://apiv2.allsportsapi.com/logo/26540_fountain-gate.jpg	26540
1971	TRA United	https://apiv2.allsportsapi.com/logo/32933_tabora-united.jpg	32933
3815	Langenrohr	https://apiv2.allsportsapi.com/logo/1120_langenrohr.jpg	1120
2083	Coastal Union	https://apiv2.allsportsapi.com/logo/11648_coastal-union.jpg	11648
2082	Kinondoni MC	https://apiv2.allsportsapi.com/logo/11650_kmc.jpg	11650
3814	Kilb	https://apiv2.allsportsapi.com/logo/1124_kilb.jpg	1124
3816	Ardagger	https://apiv2.allsportsapi.com/logo/1115_ardagger--viehdorf.jpg	1115
3817	Wiener Neust	https://apiv2.allsportsapi.com/logo/1244_wiener-neustadt.jpg	1244
3818	Ybbs	https://apiv2.allsportsapi.com/logo/37448_ybbs.jpg	37448
3819	Ebreichsdorf	https://apiv2.allsportsapi.com/logo/12827_ebreichsdorf.jpg	12827
3820	St. Peter	https://apiv2.allsportsapi.com/logo/32281_st.-peter.jpg	32281
3821	Stockerau	https://apiv2.allsportsapi.com/logo/19236_stockerau.jpg	19236
3822	Korneuburg	https://apiv2.allsportsapi.com/logo/32282_korneuburg--stetten.jpg	32282
3823	Ortmann	https://apiv2.allsportsapi.com/logo/1119_ortmann.jpg	1119
3824	Zwettl	https://apiv2.allsportsapi.com/logo/1123_zwettl.jpg	1123
3825	Schrems	https://apiv2.allsportsapi.com/logo/1114_schrems.jpg	1114
3827	Artis Brno B	https://apiv2.allsportsapi.com/logo/32153_artis-brno-ii.jpg	32153
3828	Pelhrimov	https://apiv2.allsportsapi.com/logo/16981_pelhimov.jpg	16981
3829	Tasovice	https://apiv2.allsportsapi.com/logo/2586_sokol-tasovice.jpg	2586
3830	Batov	https://apiv2.allsportsapi.com/logo/25942_baov.jpg	25942
3831	Slavicin	https://apiv2.allsportsapi.com/logo/2592_slaviin.jpg	2592
3832	Bzenec	https://apiv2.allsportsapi.com/logo/2598_bzenec.jpg	2598
3833	Uhersky Brod	https://apiv2.allsportsapi.com/logo/2522_uhersk-brod.jpg	2522
3834	Strani	https://apiv2.allsportsapi.com/logo/2600_strani.jpg	2600
3835	Holesov	https://apiv2.allsportsapi.com/logo/17022_holeov.jpg	17022
3836	Bohumin	https://apiv2.allsportsapi.com/logo/2607_bospor-bohumin.jpg	2607
3837	Valasske Mezirici	https://apiv2.allsportsapi.com/logo/2602_valaske-meziii.jpg	2602
3838	Stonava	\N	40214
3839	Havirov	https://apiv2.allsportsapi.com/logo/2612_haviov.jpg	2612
3840	Brno B	https://apiv2.allsportsapi.com/logo/2581_zbrojovka-brno-ii.jpg	2581
3841	SK Hranice	https://apiv2.allsportsapi.com/logo/2594_hranice.jpg	2594
3842	FK Frydek-Mistek	https://apiv2.allsportsapi.com/logo/2517_frdek-mistek.jpg	2517
3843	Hlubina	https://apiv2.allsportsapi.com/logo/8163_unie-hlubina.jpg	8163
3844	Nove Mesto na Morave	https://apiv2.allsportsapi.com/logo/2524_vrchovina-nm.jpg	2524
3845	Hlucin	https://apiv2.allsportsapi.com/logo/2518_hluin.jpg	2518
3846	Ceske Budejovice U19	https://apiv2.allsportsapi.com/logo/11458_eske-budjovice-u19.jpg	11458
3847	Plzen U19	https://apiv2.allsportsapi.com/logo/11452_viktoria-plze-u19.jpg	11452
3848	Rokycany	https://apiv2.allsportsapi.com/logo/2535_rokycany.jpg	2535
3849	Sobeslav	https://apiv2.allsportsapi.com/logo/2539_spartak-sobslav.jpg	2539
1361	Treaty United	https://apiv2.allsportsapi.com/logo/4773_treaty-united.jpg	4773
3806	SC Imst	https://apiv2.allsportsapi.com/logo/1296_imst.jpg	1296
3877	Ekenas	https://apiv2.allsportsapi.com/logo/3556_eif.jpg	3556
3882	Al Sahel	https://apiv2.allsportsapi.com/logo/5204_shabab-al-sahel.jpg	5204
3883	Safa	https://apiv2.allsportsapi.com/logo/5206_safa.jpg	5206
3887	Al Hikma	https://apiv2.allsportsapi.com/logo/21384_al-hikma.jpg	21384
295	Vikingur 2	https://apiv2.allsportsapi.com/logo/3481_vikingur-ii.jpg	3481
3874	JaPS	https://apiv2.allsportsapi.com/logo/3498_japs.jpg	3498
3914	SalPa	https://apiv2.allsportsapi.com/logo/3518_salpa.jpg	3518
3915	KuPS Akatemia	https://apiv2.allsportsapi.com/logo/24719_kups-akatemia.jpg	24719
3944	Dordoi Bishkek	https://apiv2.allsportsapi.com/logo/432_dordoi-bishkek.jpg	432
3945	Ilbirs	https://apiv2.allsportsapi.com/logo/11380_ilbirs.jpg	11380
3946	Toktogul	\N	42611
3947	Asiagoal Bishkek	https://apiv2.allsportsapi.com/logo/39144_asiagoal.jpg	39144
3948	Abdysh-Ata	https://apiv2.allsportsapi.com/logo/11379_abdysh-ata.jpg	11379
3949	Neftchi Kochkor-Ata	https://apiv2.allsportsapi.com/logo/11503_neftchi.jpg	11503
3950	Bishkek City	https://apiv2.allsportsapi.com/logo/39146_bishkek-city.jpg	39146
3951	Asia Talas	\N	42323
3952	Muras United	https://apiv2.allsportsapi.com/logo/31466_muras-united.jpg	31466
3953	Alga	https://apiv2.allsportsapi.com/logo/11512_alga.jpg	11512
3954	Aldier	https://apiv2.allsportsapi.com/logo/31465_oshmu-aldier.jpg	31465
3955	Ozgon	https://apiv2.allsportsapi.com/logo/39001_ozgon.jpg	39001
3956	Bars	https://apiv2.allsportsapi.com/logo/39145_bars.jpg	39145
3957	Kyrgyzaltyn	https://apiv2.allsportsapi.com/logo/11383_kyrgyzaltyn.jpg	11383
3958	Talant	https://apiv2.allsportsapi.com/logo/24673_talant.jpg	24673
3959	Alay Osh	https://apiv2.allsportsapi.com/logo/470_alay.jpg	470
3960	Barkchi Hisor	https://apiv2.allsportsapi.com/logo/18783_barkchi-hisar.jpg	18783
3961	Khujand	https://apiv2.allsportsapi.com/logo/433_khujand.jpg	433
3962	CSKA Pomir Dushanbe	https://apiv2.allsportsapi.com/logo/10357_cska-pamir.jpg	10357
3963	Parvoz-Aeroport Khujand	\N	18785
3912	Inter Turku 2	https://apiv2.allsportsapi.com/logo/24276_inter-turku-ii.jpg	24276
4099	Al-Mabarrah	https://apiv2.allsportsapi.com/logo/34211_al-mabarrah.jpg	34211
4219	Dep. Santo Domingo	\N	26292
4112	Forge	https://apiv2.allsportsapi.com/logo/8727_forge.jpg	8727
3994	Itabirito U20	https://apiv2.allsportsapi.com/logo/39348_itabirito-u20.jpg	39348
3735	Triangle	https://apiv2.allsportsapi.com/logo/8108_triangle-united.jpg	8108
3995	Nacional de Muriae U20	\N	42833
3996	Atletico-MG U20	https://apiv2.allsportsapi.com/logo/9116_atletico-mineiro-u20.jpg	9116
3997	Uberabinha U20	\N	42835
4000	HPS	https://apiv2.allsportsapi.com/logo/13990_hps.jpg	13990
4002	GrIFK	https://apiv2.allsportsapi.com/logo/3510_grifk.jpg	3510
4003	HJS	https://apiv2.allsportsapi.com/logo/3511_hjs.jpg	3511
4004	EBK	https://apiv2.allsportsapi.com/logo/14015_ebk.jpg	14015
4005	MuSa	https://apiv2.allsportsapi.com/logo/3559_musa.jpg	3559
4006	JBK	https://apiv2.allsportsapi.com/logo/3522_jbk.jpg	3522
4007	SJK Akatemia 2	https://apiv2.allsportsapi.com/logo/24332_sjk-akatemia-ii.jpg	24332
4010	Al Naser	https://apiv2.allsportsapi.com/logo/5176_al-nasar.jpg	5176
4011	Kazma SC	https://apiv2.allsportsapi.com/logo/5175_kazma.jpg	5175
4012	Al Salmiya	https://apiv2.allsportsapi.com/logo/5177_al-salmiyah.jpg	5177
4013	Al Kuwait	https://apiv2.allsportsapi.com/logo/423_kuwait-sc.jpg	423
4026	Aguai U20	https://apiv2.allsportsapi.com/logo/35268_aguai-u20.jpg	35268
4027	Paulinense U20	\N	43198
4029	Mirassol U20	https://apiv2.allsportsapi.com/logo/10801_mirassol-u20.jpg	10801
4030	Desportivo U20	https://apiv2.allsportsapi.com/logo/10809_desportivo-brasil-u20.jpg	10809
4031	Sao Caetano U20	https://apiv2.allsportsapi.com/logo/10825_sao-caetano-u20.jpg	10825
4032	Ferroviaria U20	https://apiv2.allsportsapi.com/logo/10829_ferroviaria-u20.jpg	10829
4033	America SP U20	\N	38563
4034	Flamengo SP U20	https://apiv2.allsportsapi.com/logo/10849_flamengo-sp-u20.jpg	10849
4035	Guarani U20	https://apiv2.allsportsapi.com/logo/10864_guarani-u20.jpg	10864
4036	Gremio Prudente U20	https://apiv2.allsportsapi.com/logo/35286_gremio-prudente-u20.jpg	35286
4037	Tanabi U20	https://apiv2.allsportsapi.com/logo/10812_tanabi-sp-u20.jpg	10812
4038	Ituano U20	https://apiv2.allsportsapi.com/logo/10833_ituano-u20.jpg	10833
4039	Referencia U20	https://apiv2.allsportsapi.com/logo/35270_referencia-u20.jpg	35270
4040	Maua U20	https://apiv2.allsportsapi.com/logo/10847_maua-u20.jpg	10847
4041	Agua Santa U20	https://apiv2.allsportsapi.com/logo/10808_agua-santa-u20.jpg	10808
4042	Osasco Sporting U20	https://apiv2.allsportsapi.com/logo/10803_oeste-u20.jpg	10803
4043	Santo Andre U20	https://apiv2.allsportsapi.com/logo/10841_santo-andre-u20.jpg	10841
4044	Piracicaba U20	https://apiv2.allsportsapi.com/logo/10839_xv-de-piracicaba-u20.jpg	10839
4045	EC Sao Bernardo U20	https://apiv2.allsportsapi.com/logo/10869_ec-sao-bernardo-u20.jpg	10869
4046	Ponte Preta U20	https://apiv2.allsportsapi.com/logo/10815_ponte-preta-u20.jpg	10815
4047	Sao Bento U20	https://apiv2.allsportsapi.com/logo/10824_sao-bento-u20.jpg	10824
4048	Uniao Sao Joao U20	https://apiv2.allsportsapi.com/logo/23892_uniao-sao-joao-u20.jpg	23892
4049	Velo Clube U20	https://apiv2.allsportsapi.com/logo/10862_velo-clube-u20.jpg	10862
4050	Uniao Suzano U20	https://apiv2.allsportsapi.com/logo/30463_uniao-suzano-u20.jpg	30463
4051	Sertaozinho U20	https://apiv2.allsportsapi.com/logo/10826_sertaozinho-u20.jpg	10826
4052	XV de Jau U20	https://apiv2.allsportsapi.com/logo/10863_xv-de-novembro-jau-u20.jpg	10863
4053	Capivariano U20	https://apiv2.allsportsapi.com/logo/10810_capivariano-u20.jpg	10810
4055	Jabaquara U20	https://apiv2.allsportsapi.com/logo/35285_jabaquara-u20.jpg	35285
4057	Anapolis U20	\N	42781
4068	Vitkovice	https://apiv2.allsportsapi.com/logo/2613_vitkovice.jpg	2613
4069	Slovacko B	https://apiv2.allsportsapi.com/logo/2512_slovacko-ii.jpg	2512
4070	Jihlava U19	https://apiv2.allsportsapi.com/logo/25744_vysoina-jihlava-u19.jpg	25744
4071	Karvina U19	https://apiv2.allsportsapi.com/logo/11460_karvina-u19.jpg	11460
4072	Sparta Prague U19	https://apiv2.allsportsapi.com/logo/10138_sparta-praha-u19.jpg	10138
4073	Sigma Olomouc U19	https://apiv2.allsportsapi.com/logo/11457_sigma-olomouc-u19.jpg	11457
2839	Highlanders	https://apiv2.allsportsapi.com/logo/8107_highlanders.jpg	8107
4218	EL Nacional	https://apiv2.allsportsapi.com/logo/2744_el-nacional.jpg	2744
1592	Vancouver Whitecaps 2	https://apiv2.allsportsapi.com/logo/16846_vancouver-whitecaps-ii.jpg	16846
4098	Racing	https://apiv2.allsportsapi.com/logo/31967_racing.jpg	31967
4113	HFX Wanderers	https://apiv2.allsportsapi.com/logo/8731_hfx-wanderers.jpg	8731
4114	Inter Toronto	https://apiv2.allsportsapi.com/logo/8729_york-united.jpg	8729
4115	Cavalry	https://apiv2.allsportsapi.com/logo/11167_cavalry.jpg	11167
4116	Tampere Utd	https://apiv2.allsportsapi.com/logo/12496_tampere-united.jpg	12496
4117	OLS Oulu	https://apiv2.allsportsapi.com/logo/3526_ols.jpg	3526
487	Birmingham 2	https://apiv2.allsportsapi.com/logo/34747_birmingham-legion-ii.jpg	34747
4107	North Texas	https://apiv2.allsportsapi.com/logo/11094_north-texas.jpg	11094
4238	Nam Dinh	https://apiv2.allsportsapi.com/logo/8060_nam-nh.jpg	8060
4239	Ho Chi Minh	https://apiv2.allsportsapi.com/logo/438_cong-an-h-chi-minh.jpg	438
4240	Phu Dong Ninh Binh	https://apiv2.allsportsapi.com/logo/8051_ninh-binh.jpg	8051
4241	Viettel	https://apiv2.allsportsapi.com/logo/409_th-cong-viettel.jpg	409
4242	PPJ	https://apiv2.allsportsapi.com/logo/14028_ppj--ruoholahti.jpg	14028
4243	Atlantis	https://apiv2.allsportsapi.com/logo/3497_atlantis-helsinki.jpg	3497
4423	Venezuela W	https://apiv2.allsportsapi.com/logo/11575_venezuela-w.jpg	11575
4359	Stade Renard	https://apiv2.allsportsapi.com/logo/2176_stade-renard.jpg	2176
4286	Novorizontino U20	https://apiv2.allsportsapi.com/logo/10816_novorizontino-u20.jpg	10816
4267	Japan U20	https://apiv2.allsportsapi.com/logo/9018_japan-u20.jpg	9018
4443	Nigeria	https://apiv2.allsportsapi.com/logo/718_nigeria.jpg	718
4398	Gualaceo	https://apiv2.allsportsapi.com/logo/2741_gualaceo.jpg	2741
4309	Mlada Boleslav U19	https://apiv2.allsportsapi.com/logo/11392_mlada-boleslav-u19.jpg	11392
4264	Al Shabab	https://apiv2.allsportsapi.com/logo/5179_al-shabab.jpg	5179
4265	Al Jahra	https://apiv2.allsportsapi.com/logo/5183_al-jahra.jpg	5183
4268	Portugal U20	https://apiv2.allsportsapi.com/logo/9028_portugal-u20.jpg	9028
4266	Venezuela U20	https://apiv2.allsportsapi.com/logo/9503_venezuela-u20.jpg	9503
4422	Uruguay W	https://apiv2.allsportsapi.com/logo/12411_uruguay-w.jpg	12411
4287	Ibrachina U20	https://apiv2.allsportsapi.com/logo/23917_ibrachina-u20.jpg	23917
4288	Portuguesa U20	https://apiv2.allsportsapi.com/logo/10872_portuguesa-u20.jpg	10872
4289	Itapirense U20	https://apiv2.allsportsapi.com/logo/10828_itapirense-u20.jpg	10828
4292	Malaga	https://apiv2.allsportsapi.com/logo/7267_malaga.jpg	7267
4293	Las Palmas	https://apiv2.allsportsapi.com/logo/7289_las-palmas.jpg	7289
4298	Cape Town City	https://apiv2.allsportsapi.com/logo/6750_cape-town-city.jpg	6750
4300	FK Kozlovice	https://apiv2.allsportsapi.com/logo/2597_kozlovice.jpg	2597
4301	Breclav	https://apiv2.allsportsapi.com/logo/2587_beclav.jpg	2587
4302	Opava B	https://apiv2.allsportsapi.com/logo/2610_opava-ii.jpg	2610
4303	Bridlicna	https://apiv2.allsportsapi.com/logo/25943_bidlina.jpg	25943
4305	Zlin B	https://apiv2.allsportsapi.com/logo/2526_zlin-ii.jpg	2526
3029	Ostrava U19	https://apiv2.allsportsapi.com/logo/11453_banik-ostrava-u19.jpg	11453
4245	Guatemala	https://apiv2.allsportsapi.com/logo/662_guatemala.jpg	662
4310	Cesky Krumlov	https://apiv2.allsportsapi.com/logo/11261_slavoj-esk-krumlov.jpg	11261
4311	Hluboka nad Vltavou	https://apiv2.allsportsapi.com/logo/32625_hluboka-nad-vltavou.jpg	32625
4312	Meteor Prague	https://apiv2.allsportsapi.com/logo/2551_meteor-praha.jpg	2551
4313	Usti nad Labem B	https://apiv2.allsportsapi.com/logo/36590_usti-nad-labem-ii.jpg	36590
4349	Bamenda	https://apiv2.allsportsapi.com/logo/2175_pwd.jpg	2175
4350	Aigle Royal	https://apiv2.allsportsapi.com/logo/9249_aigle-royal.jpg	9249
4351	Panthere	https://apiv2.allsportsapi.com/logo/2183_panthere.jpg	2183
4352	Bafang	https://apiv2.allsportsapi.com/logo/9248_unisport-bafang.jpg	9248
4353	Dynamo Douala	https://apiv2.allsportsapi.com/logo/9242_dynamo-de-douala.jpg	9242
4354	Canon Yaounde	https://apiv2.allsportsapi.com/logo/2182_canon.jpg	2182
4355	Victoria United	\N	39741
4356	Colombe	https://apiv2.allsportsapi.com/logo/2188_colombe.jpg	2188
4269	Canada U20	https://apiv2.allsportsapi.com/logo/10023_canada-u20.jpg	10023
4273	Studenterna	\N	43139
4360	Gazelle	https://apiv2.allsportsapi.com/logo/8139_gazelle.jpg	8139
4361	Cotonsport	https://apiv2.allsportsapi.com/logo/2186_cotonsport.jpg	2186
4364	Atl. Ottawa	https://apiv2.allsportsapi.com/logo/11168_atletico-ottawa.jpg	11168
4365	Supra du Quebec	\N	42384
4387	Costa Rica	https://apiv2.allsportsapi.com/logo/516_costa-rica.jpg	516
4441	Iceland	https://apiv2.allsportsapi.com/logo/704_iceland.jpg	704
4399	Cumbaya	https://apiv2.allsportsapi.com/logo/2740_cumbaya.jpg	2740
4400	Ind. Juniors	https://apiv2.allsportsapi.com/logo/2739_independiente-juniors.jpg	2739
4401	Cuenca Juniors	https://apiv2.allsportsapi.com/logo/39511_deportivo-cuenca-juniors.jpg	39511
4402	San Antonio	https://apiv2.allsportsapi.com/logo/35009_san-antonio.jpg	35009
4403	LDU Portoviejo	https://apiv2.allsportsapi.com/logo/2748_ldu-portoviejo.jpg	2748
4406	BuxDu	\N	42703
4407	TerDU	\N	35143
4409	Gazalkent	\N	42702
2015	Real Banjul	https://apiv2.allsportsapi.com/logo/11556_real-de-banjul.jpg	11556
4308	Slovacko U19	https://apiv2.allsportsapi.com/logo/11459_slovacko-u19.jpg	11459
4424	Peru W	https://apiv2.allsportsapi.com/logo/21876_peru-w.jpg	21876
4425	Bolivia W	https://apiv2.allsportsapi.com/logo/9223_bolivia-w.jpg	9223
4426	Paraguay W	https://apiv2.allsportsapi.com/logo/9209_paraguay-w.jpg	9209
4427	Colombia W	https://apiv2.allsportsapi.com/logo/9201_colombia-w.jpg	9201
4428	Ecuador W	https://apiv2.allsportsapi.com/logo/9222_ecuador-w.jpg	9222
4429	Argentina W	https://apiv2.allsportsapi.com/logo/602_argentina-w.jpg	602
2756	Canberra Juventus	https://apiv2.allsportsapi.com/logo/35293_canberra-juventus.jpg	35293
4358	Fortuna Mfou	https://apiv2.allsportsapi.com/logo/2171_fortuna-mfou.jpg	2171
4446	Brazil W	https://apiv2.allsportsapi.com/logo/593_brazil-w.jpg	593
4447	USA W	https://apiv2.allsportsapi.com/logo/595_united-states-w.jpg	595
4472	D.R. Congo U20	https://apiv2.allsportsapi.com/logo/18956_congo-dr-u20.jpg	18956
4473	Saudi Arabia U21	\N	43204
4474	Colombia U19	https://apiv2.allsportsapi.com/logo/25339_colombia-u19.jpg	25339
4475	Tunisia U23	https://apiv2.allsportsapi.com/logo/18270_tunisia-u23.jpg	18270
4478	Balkan	https://apiv2.allsportsapi.com/logo/11692_balkan.jpg	11692
4484	Malmslatts AIK	\N	43136
4486	Unik FK	\N	43137
4488	Football Primetime	\N	43138
4493	Venezuela	https://apiv2.allsportsapi.com/logo/532_venezuela.jpg	532
4357	Fauve Azur Elite	\N	9244
4539	Kudrivka	https://apiv2.allsportsapi.com/logo/32565_kudrivka.jpg	32565
4495	Canada W	https://apiv2.allsportsapi.com/logo/597_canada-w.jpg	597
4538	Ahrobiznes Volochysk	https://apiv2.allsportsapi.com/logo/7772_ahrobiznes-volochysk.jpg	7772
4500	Bolivia	https://apiv2.allsportsapi.com/logo/534_bolivia.jpg	534
4504	Vorskla Poltava	https://apiv2.allsportsapi.com/logo/7787_vorskla.jpg	7787
4505	Zhytomyr 2	https://apiv2.allsportsapi.com/logo/36551_polissya-ii.jpg	36551
4506	Cascavel U20	https://apiv2.allsportsapi.com/logo/34854_cascavel-u20.jpg	34854
4507	Araucaria U20	https://apiv2.allsportsapi.com/logo/34851_araucaria-u20.jpg	34851
4512	Al-Hilal Omdurman II	\N	42134
4513	Al-Merreikh II	\N	42132
4526	Jong Sparta Rotterdam	https://apiv2.allsportsapi.com/logo/10431_sparta-rotterdam-ii.jpg	10431
4527	Groningen U21	\N	9296
4528	Derby Academie	\N	41923
4529	Mali Coura	\N	41927
4531	Korofina	https://apiv2.allsportsapi.com/logo/10339_asko.jpg	10339
4532	Onze Createurs	https://apiv2.allsportsapi.com/logo/10340_onze-createurs.jpg	10340
4533	Bakaridjan	https://apiv2.allsportsapi.com/logo/10338_bakaridjan.jpg	10338
4534	Brazil U17	https://apiv2.allsportsapi.com/logo/31467_brazil-u17.jpg	31467
4535	USA U17	https://apiv2.allsportsapi.com/logo/8923_united-states-u17.jpg	8923
3795	Excelsior Maassluis	https://apiv2.allsportsapi.com/logo/5480_excelsior-maassluis.jpg	5480
4494	Costa Rica W	https://apiv2.allsportsapi.com/logo/9205_costa-rica-w.jpg	9205
4540	Livyi Bereg	https://apiv2.allsportsapi.com/logo/19500_livyi-bereh.jpg	19500
4541	Oleksandriya	https://apiv2.allsportsapi.com/logo/7788_oleksandria.jpg	7788
4542	Atl. Nacional	https://apiv2.allsportsapi.com/logo/575_atletico-nacional.jpg	575
4543	Junior	https://apiv2.allsportsapi.com/logo/544_junior.jpg	544
4544	Almeria	https://apiv2.allsportsapi.com/logo/7260_almeria.jpg	7260
4545	Castellon	https://apiv2.allsportsapi.com/logo/7276_castellon.jpg	7276
4550	Liverpool M.	https://apiv2.allsportsapi.com/logo/582_liverpool.jpg	582
4551	Cerro Largo	https://apiv2.allsportsapi.com/logo/7975_cerro-largo.jpg	7975
4552	Yacoub El Mansour	https://apiv2.allsportsapi.com/logo/38026_yacoub-el-mansour.jpg	38026
4553	COD Meknes	https://apiv2.allsportsapi.com/logo/15359_codm-meknes.jpg	15359
4554	Kawkab Marrakech	https://apiv2.allsportsapi.com/logo/5419_kawkab-marrakech.jpg	5419
4555	Raja Casablanca	https://apiv2.allsportsapi.com/logo/5382_raja-casablanca.jpg	5382
4556	Renaissance Zemamra	https://apiv2.allsportsapi.com/logo/5395_renaissance-zemamra.jpg	5395
4557	Union Touarga	https://apiv2.allsportsapi.com/logo/5412_uts-rabat.jpg	5412
4558	Maghreb Fez	https://apiv2.allsportsapi.com/logo/5386_maghreb-fes.jpg	5386
4559	FAR Rabat	https://apiv2.allsportsapi.com/logo/5384_far-rabat.jpg	5384
4561	Ukraine U17	https://apiv2.allsportsapi.com/logo/23417_ukraine-u17.jpg	23417
4592	Hungary	https://apiv2.allsportsapi.com/logo/24_hungary.jpg	24
4593	Kazakhstan	https://apiv2.allsportsapi.com/logo/686_kazakhstan.jpg	686
4598	England W	https://apiv2.allsportsapi.com/logo/590_england-w.jpg	590
4599	Ukraine W	https://apiv2.allsportsapi.com/logo/9778_ukraine-w.jpg	9778
4600	Iceland W	https://apiv2.allsportsapi.com/logo/9786_iceland-w.jpg	9786
4601	Spain W	https://apiv2.allsportsapi.com/logo/594_spain-w.jpg	594
4602	Netherlands W	https://apiv2.allsportsapi.com/logo/600_netherlands-w.jpg	600
4603	Poland W	https://apiv2.allsportsapi.com/logo/9211_poland-w.jpg	9211
4604	Norway W	https://apiv2.allsportsapi.com/logo/588_norway-w.jpg	588
4605	Austria W	https://apiv2.allsportsapi.com/logo/9203_austria-w.jpg	9203
4606	Serbia W	https://apiv2.allsportsapi.com/logo/9214_serbia-w.jpg	9214
4608	Slovenia W	https://apiv2.allsportsapi.com/logo/9791_slovenia-w.jpg	9791
4609	Germany W	https://apiv2.allsportsapi.com/logo/586_germany-w.jpg	586
4610	Sweden W	https://apiv2.allsportsapi.com/logo/596_sweden-w.jpg	596
4611	Italy W	https://apiv2.allsportsapi.com/logo/598_italy-w.jpg	598
4612	Albania W	https://apiv2.allsportsapi.com/logo/9796_albania-w.jpg	9796
4613	Montenegro W	https://apiv2.allsportsapi.com/logo/9220_montenegro-w.jpg	9220
4614	Belarus W	https://apiv2.allsportsapi.com/logo/9803_belarus-w.jpg	9803
4615	Armenia W	https://apiv2.allsportsapi.com/logo/11591_armenia-w.jpg	11591
4616	Croatia W	https://apiv2.allsportsapi.com/logo/9783_croatia-w.jpg	9783
4617	Bulgaria W	https://apiv2.allsportsapi.com/logo/12455_bulgaria-w.jpg	12455
4618	Cyprus W	https://apiv2.allsportsapi.com/logo/9794_cyprus-w.jpg	9794
4619	Moldova W	https://apiv2.allsportsapi.com/logo/9789_moldova-w.jpg	9789
4620	Estonia W	https://apiv2.allsportsapi.com/logo/9790_estonia-w.jpg	9790
4621	Bosnia & Herzegovina W	https://apiv2.allsportsapi.com/logo/9787_bosnia-herzegovina-w.jpg	9787
4622	Finland W	https://apiv2.allsportsapi.com/logo/9797_finland-w.jpg	9797
4623	Portugal W	https://apiv2.allsportsapi.com/logo/9779_portugal-w.jpg	9779
4624	Georgia W	https://apiv2.allsportsapi.com/logo/9788_georgia-w.jpg	9788
4625	Greece W	https://apiv2.allsportsapi.com/logo/9801_greece-w.jpg	9801
4626	Gibraltar W	https://apiv2.allsportsapi.com/logo/19083_gibraltar-w.jpg	19083
4627	Kosovo W	https://apiv2.allsportsapi.com/logo/9792_kosovo-w.jpg	9792
4628	Hungary W	https://apiv2.allsportsapi.com/logo/9226_hungary-w.jpg	9226
4629	Andorra W	https://apiv2.allsportsapi.com/logo/24023_andorra-cf-w.jpg	24023
4630	Israel W	https://apiv2.allsportsapi.com/logo/9781_israel-w.jpg	9781
4631	Scotland W	https://apiv2.allsportsapi.com/logo/608_scotland-w.jpg	608
4633	Slovakia W	https://apiv2.allsportsapi.com/logo/9804_slovakia-w.jpg	9804
4634	Lithuania W	https://apiv2.allsportsapi.com/logo/9782_lithuania-w.jpg	9782
4635	Liechtenstein W	https://apiv2.allsportsapi.com/logo/12201_liechtenstein-w.jpg	12201
4636	Luxembourg W	https://apiv2.allsportsapi.com/logo/12202_luxembourg-w.jpg	12202
4637	Belgium W	https://apiv2.allsportsapi.com/logo/9202_belgium-w.jpg	9202
4638	Malta W	https://apiv2.allsportsapi.com/logo/9208_malta-w.jpg	9208
4639	Turkey W	https://apiv2.allsportsapi.com/logo/9793_turkiye-w.jpg	9793
4641	Switzerland W	https://apiv2.allsportsapi.com/logo/9206_switzerland-w.jpg	9206
4642	North Macedonia W	https://apiv2.allsportsapi.com/logo/9221_north-macedonia-w.jpg	9221
4643	Azerbaijan W	https://apiv2.allsportsapi.com/logo/9799_azerbaijan-w.jpg	9799
4644	Wales W	https://apiv2.allsportsapi.com/logo/9210_wales-w.jpg	9210
4645	Czech Republic W	https://apiv2.allsportsapi.com/logo/9777_czechia-w.jpg	9777
4646	France W	https://apiv2.allsportsapi.com/logo/592_france-w.jpg	592
4647	Ireland W	https://apiv2.allsportsapi.com/logo/9802_republic-of-ireland-w.jpg	9802
4648	22 de Julio	https://apiv2.allsportsapi.com/logo/39108_22-de-julio.jpg	39108
4649	Atletico FC	\N	42543
4650	Nueve de Octubre	https://apiv2.allsportsapi.com/logo/2756_9-de-octubre.jpg	2756
4651	Vinotinto	https://apiv2.allsportsapi.com/logo/31301_vinotinto-de-ecuador.jpg	31301
4652	Lochin	\N	10537
4653	Kattaqurgon	\N	39335
4656	Armenia	https://apiv2.allsportsapi.com/logo/703_armenia.jpg	703
4657	Moldova	https://apiv2.allsportsapi.com/logo/689_moldova.jpg	689
4659	Greece U19	https://apiv2.allsportsapi.com/logo/10616_greece-u19.jpg	10616
4660	Serbia U19	https://apiv2.allsportsapi.com/logo/10585_serbia-u19.jpg	10585
4661	Portugal U19	https://apiv2.allsportsapi.com/logo/10576_portugal-u19.jpg	10576
4662	Georgia U19	https://apiv2.allsportsapi.com/logo/10598_georgia-u19.jpg	10598
4663	Iceland U19	https://apiv2.allsportsapi.com/logo/10578_iceland-u19.jpg	10578
4664	Peru	https://apiv2.allsportsapi.com/logo/533_peru.jpg	533
4684	Japan W	https://apiv2.allsportsapi.com/logo/601_japan-w.jpg	601
4685	South Africa W	https://apiv2.allsportsapi.com/logo/605_south-africa-w.jpg	605
4700	Angola	https://apiv2.allsportsapi.com/logo/729_angola.jpg	729
4701	Central Africa	https://apiv2.allsportsapi.com/logo/731_central-african-republic.jpg	731
4702	Russia	https://apiv2.allsportsapi.com/logo/5_russia.jpg	5
4703	Trinidad & Tobago	https://apiv2.allsportsapi.com/logo/526_trinidad-and-tobago.jpg	526
4704	Australia W	https://apiv2.allsportsapi.com/logo/589_australia-w.jpg	589
4705	Mexico W	https://apiv2.allsportsapi.com/logo/9204_mexico-w.jpg	9204
4706	Cambodia	https://apiv2.allsportsapi.com/logo/358_cambodia.jpg	358
4707	Hong Kong	https://apiv2.allsportsapi.com/logo/645_hong-kong-china.jpg	645
4708	Belarus	https://apiv2.allsportsapi.com/logo/687_belarus.jpg	687
4709	Burkina Faso	https://apiv2.allsportsapi.com/logo/723_burkina-faso.jpg	723
4710	Oman	https://apiv2.allsportsapi.com/logo/649_oman.jpg	649
4711	Kuwait	https://apiv2.allsportsapi.com/logo/640_kuwait.jpg	640
4712	Bahrain	https://apiv2.allsportsapi.com/logo/643_bahrain.jpg	643
4713	Syria	https://apiv2.allsportsapi.com/logo/638_syria.jpg	638
4715	Chile	https://apiv2.allsportsapi.com/logo/528_chile.jpg	528
4716	New Zealand W	https://apiv2.allsportsapi.com/logo/603_new-zealand-w.jpg	603
4717	Morocco W	https://apiv2.allsportsapi.com/logo/18135_morocco-w.jpg	18135
4718	Azerbaijan	https://apiv2.allsportsapi.com/logo/678_azerbaijan.jpg	678
4719	San Marino	https://apiv2.allsportsapi.com/logo/701_san-marino.jpg	701
4720	Equatorial Guinea	https://apiv2.allsportsapi.com/logo/617_equatorial-guinea.jpg	617
4721	Comoros	https://apiv2.allsportsapi.com/logo/632_comoros.jpg	632
4722	Panama W	https://apiv2.allsportsapi.com/logo/9213_panama-w.jpg	9213
4723	Jamaica W	https://apiv2.allsportsapi.com/logo/606_jamaica-w.jpg	606
4725	El Salvador W	https://apiv2.allsportsapi.com/logo/11608_el-salvador-w.jpg	11608
4726	Moldova U21	https://apiv2.allsportsapi.com/logo/9902_moldova-u21.jpg	9902
4727	Georgia U21	https://apiv2.allsportsapi.com/logo/9916_georgia-u21.jpg	9916
4728	Philippines	https://apiv2.allsportsapi.com/logo/341_philippines.jpg	341
4729	Myanmar	https://apiv2.allsportsapi.com/logo/345_myanmar.jpg	345
4730	Ethiopia	https://apiv2.allsportsapi.com/logo/610_ethiopia.jpg	610
4731	Malawi	https://apiv2.allsportsapi.com/logo/637_malawi.jpg	637
4732	Indonesia W	https://apiv2.allsportsapi.com/logo/11936_indonesia-w.jpg	11936
4733	Cambodia W	https://apiv2.allsportsapi.com/logo/39524_cambodia-women.jpg	39524
4734	Zambia W	https://apiv2.allsportsapi.com/logo/11596_zambia-w.jpg	11596
4735	Kenya W	https://apiv2.allsportsapi.com/logo/11817_kenya-w.jpg	11817
4736	Zimbabwe W	https://apiv2.allsportsapi.com/logo/9998_zimbabwe-w.jpg	9998
4737	Burkina Faso W	https://apiv2.allsportsapi.com/logo/25545_burkina-faso-women.jpg	25545
4738	Konyaspor	https://apiv2.allsportsapi.com/logo/7692_konyaspor.jpg	7692
4742	Vendelso	\N	16453
4744	Sturehov IK	\N	43135
4746	China	https://apiv2.allsportsapi.com/logo/639_china-pr.jpg	639
4747	Thailand	https://apiv2.allsportsapi.com/logo/480_thailand.jpg	480
4748	Kyrgyzstan	https://apiv2.allsportsapi.com/logo/346_kyrgyz-republic.jpg	346
4749	Palestine	https://apiv2.allsportsapi.com/logo/339_palestine.jpg	339
4632	Latvia W	https://apiv2.allsportsapi.com/logo/9798_latvia-w.jpg	9798
4765	Cambodia U19	https://apiv2.allsportsapi.com/logo/25555_cambodia-u19.jpg	25555
4786	England U20 W	\N	41873
4751	United Arab Emirates U23	https://apiv2.allsportsapi.com/logo/9465_uae-u23.jpg	9465
4752	Togo	https://apiv2.allsportsapi.com/logo/633_togo.jpg	633
4753	Benin	https://apiv2.allsportsapi.com/logo/741_benin.jpg	741
4754	Indonesia	https://apiv2.allsportsapi.com/logo/484_indonesia.jpg	484
4755	Mozambique	https://apiv2.allsportsapi.com/logo/619_mozambique.jpg	619
4756	3 de Noviembre	\N	31825
4758	Myanmar W	https://apiv2.allsportsapi.com/logo/11935_myanmar-w.jpg	11935
4759	Thailand W	https://apiv2.allsportsapi.com/logo/609_thailand-w.jpg	609
4760	Botswana	https://apiv2.allsportsapi.com/logo/636_botswana.jpg	636
4750	Thailand U23	https://apiv2.allsportsapi.com/logo/9471_thailand-u23.jpg	9471
4772	China U23	https://apiv2.allsportsapi.com/logo/9462_china-pr-u23.jpg	9462
4773	Tajikistan U23	https://apiv2.allsportsapi.com/logo/10372_tajikistan-u23.jpg	10372
4774	Tanzania	https://apiv2.allsportsapi.com/logo/613_tanzania.jpg	613
4775	Rwanda	https://apiv2.allsportsapi.com/logo/627_rwanda.jpg	627
4776	Azerbaijan U21	https://apiv2.allsportsapi.com/logo/9909_azerbaijan-u21.jpg	9909
4777	Kyrgyzstan U20	https://apiv2.allsportsapi.com/logo/33674_kyrgyz-republic-u20.jpg	33674
4778	Tajikistan	https://apiv2.allsportsapi.com/logo/351_tajikistan.jpg	351
4779	India	https://apiv2.allsportsapi.com/logo/347_india.jpg	347
4780	Vanuatu	https://apiv2.allsportsapi.com/logo/711_vanuatu.jpg	711
4781	Fiji	https://apiv2.allsportsapi.com/logo/707_fiji.jpg	707
4782	Jordan W	https://apiv2.allsportsapi.com/logo/11593_jordan-w.jpg	11593
4783	Palestine W	https://apiv2.allsportsapi.com/logo/11939_palestine-w.jpg	11939
4763	Liberia	https://apiv2.allsportsapi.com/logo/624_liberia.jpg	624
4764	Australia U19	https://apiv2.allsportsapi.com/logo/33716_australia-u19.jpg	33716
4787	Japan U20 W	https://apiv2.allsportsapi.com/logo/26259_japan-u20-w.jpg	26259
4788	South Korea U20 W	https://apiv2.allsportsapi.com/logo/26262_korea-republic-u20-w.jpg	26262
4789	Finland U23 W	\N	41588
4790	Portugal U20 W	\N	43217
4791	Brazil U20 W	https://apiv2.allsportsapi.com/logo/11618_brazil-u20-women.jpg	11618
4792	Albion San Diego W	https://apiv2.allsportsapi.com/logo/37070_albion-san-diego-women.jpg	37070
4793	Philippines W	https://apiv2.allsportsapi.com/logo/11941_philippines-w.jpg	11941
4794	Ireland U21	https://apiv2.allsportsapi.com/logo/9899_republic-of-ireland-u21.jpg	9899
4795	Qatar U23	https://apiv2.allsportsapi.com/logo/9472_qatar-u23.jpg	9472
4796	Hilal Alsahil	https://apiv2.allsportsapi.com/logo/7306_al-hilal-port-sudan.jpg	7306
4797	Madani	https://apiv2.allsportsapi.com/logo/16281_al-ahli-wad-medani.jpg	16281
4798	Hilal El-Fasher	https://apiv2.allsportsapi.com/logo/7310_hilal-el-fasher.jpg	7310
4799	Al Wadi	https://apiv2.allsportsapi.com/logo/7303_hay-al-wadi.jpg	7303
4800	Umm Mughad	\N	38600
4801	Alfalah Atbra	https://apiv2.allsportsapi.com/logo/16298_al-fallah.jpg	16298
4804	Germany U19 W	https://apiv2.allsportsapi.com/logo/21730_germany-u19-w.jpg	21730
4805	USA U19 W	\N	34037
4806	Kleczew	https://apiv2.allsportsapi.com/logo/5852_soko-kleczew.jpg	5852
4808	R. Rzeszow	https://apiv2.allsportsapi.com/logo/5804_resovia-rzeszow.jpg	5804
4809	Ostrowiec Swietokrzyski	https://apiv2.allsportsapi.com/logo/5777_kszo-1929.jpg	5777
4810	Poland U20 W	\N	43254
4811	Mexico U20 W	https://apiv2.allsportsapi.com/logo/11619_mexico-u20-w.jpg	11619
4812	Russia U21	https://apiv2.allsportsapi.com/logo/9887_russia-u21.jpg	9887
4813	Iraq U23	https://apiv2.allsportsapi.com/logo/9807_iraq-u23.jpg	9807
4814	Algeria U23	https://apiv2.allsportsapi.com/logo/9816_algeria-u23.jpg	9816
4815	Mauritania U23	https://apiv2.allsportsapi.com/logo/24816_mauritania-u23.jpg	24816
4816	Egypt U19	\N	42545
4817	Russia U19	https://apiv2.allsportsapi.com/logo/10599_russia-u19.jpg	10599
4818	Latvia	https://apiv2.allsportsapi.com/logo/694_latvia.jpg	694
4819	Faroe Islands	https://apiv2.allsportsapi.com/logo/691_faroe-islands.jpg	691
4820	Lithuania	https://apiv2.allsportsapi.com/logo/684_lithuania.jpg	684
4821	Estonia	https://apiv2.allsportsapi.com/logo/688_estonia.jpg	688
4822	US Bougouni	https://apiv2.allsportsapi.com/logo/10343_bougouni.jpg	10343
4823	USFAS Bamako	https://apiv2.allsportsapi.com/logo/10336_usfas-bamako.jpg	10336
4824	Djoliba	https://apiv2.allsportsapi.com/logo/8551_djoliba.jpg	8551
4825	Real Bamako	https://apiv2.allsportsapi.com/logo/10330_real-bamako.jpg	10330
4826	Stade Malien	https://apiv2.allsportsapi.com/logo/8143_stade-malien-bamako.jpg	8143
4827	Binga	https://apiv2.allsportsapi.com/logo/20472_binga.jpg	20472
4828	Bougouba	https://apiv2.allsportsapi.com/logo/23704_us-bougouba.jpg	23704
4829	Diarra	https://apiv2.allsportsapi.com/logo/38392_diarra.jpg	38392
4830	Ukraine U19 W	\N	23265
4831	USA U18 W	\N	42630
4832	Morocco U23 W	\N	41597
4833	Benin W	https://apiv2.allsportsapi.com/logo/30967_benin-women.jpg	30967
4834	FUS Rabat	https://apiv2.allsportsapi.com/logo/5391_fus-rabat.jpg	5391
4836	Berkane	https://apiv2.allsportsapi.com/logo/742_rsb-berkane.jpg	742
4837	IR Tanger	https://apiv2.allsportsapi.com/logo/5385_ittihad-tanger.jpg	5385
4838	Wydad AC	https://apiv2.allsportsapi.com/logo/5381_wydad-casablanca.jpg	5381
4762	Mauritania	https://apiv2.allsportsapi.com/logo/730_mauritania.jpg	730
4785	Sierra Leone	https://apiv2.allsportsapi.com/logo/625_sierra-leone.jpg	625
1997	Staten Island ASC	https://apiv2.allsportsapi.com/logo/34752_staten-island-athletic.jpg	34752
2263	Petrvald na Morave	https://apiv2.allsportsapi.com/logo/32137_petvald-na-morav.jpg	32137
4348	Aigle Moungo	https://apiv2.allsportsapi.com/logo/30068_aigle-royal-de-moungo.jpg	30068
4936	Equatorial Guinea W	https://apiv2.allsportsapi.com/logo/9216_equatorial-guinea-women.jpg	9216
4911	Aral	https://apiv2.allsportsapi.com/logo/24828_aral.jpg	24828
4996	Sweden U19	https://apiv2.allsportsapi.com/logo/10622_sweden-u19.jpg	10622
4951	Brunei U19	https://apiv2.allsportsapi.com/logo/25547_brunei-u19.jpg	25547
4840	Dcheira	https://apiv2.allsportsapi.com/logo/5406_olympique-dcheira.jpg	5406
4841	Hassania Agadir	https://apiv2.allsportsapi.com/logo/5388_hassania-agadir.jpg	5388
3876	KTP	https://apiv2.allsportsapi.com/logo/3550_ktp.jpg	3550
4932	Ivory Coast U20	https://apiv2.allsportsapi.com/logo/18953_cote-divoire-u20.jpg	18953
4995	Bulgaria U17	https://apiv2.allsportsapi.com/logo/23215_bulgaria-u17.jpg	23215
4912	Metallurg Bekabad	https://apiv2.allsportsapi.com/logo/7999_metalourg.jpg	7999
4913	FarDU	https://apiv2.allsportsapi.com/logo/39141_fardu.jpg	39141
4914	Pakhtakor II	\N	42704
4915	Respublika FA	\N	42701
4916	Germany U23 W	\N	41546
4917	Denmark U23 W	https://apiv2.allsportsapi.com/logo/35748_denmark-u23-women.jpg	35748
4001	Kiffen	https://apiv2.allsportsapi.com/logo/3499_kiffen.jpg	3499
4910	Jayxun	https://apiv2.allsportsapi.com/logo/31431_jayxun.jpg	31431
4937	Haiti W	https://apiv2.allsportsapi.com/logo/18138_haiti-w.jpg	18138
4938	Bermuda W	https://apiv2.allsportsapi.com/logo/26244_bermuda-women.jpg	26244
4939	Belize W	https://apiv2.allsportsapi.com/logo/26241_belize-women.jpg	26241
4940	Uganda	https://apiv2.allsportsapi.com/logo/724_uganda.jpg	724
4941	Madagascar	https://apiv2.allsportsapi.com/logo/739_madagascar.jpg	739
4942	Italy U21	https://apiv2.allsportsapi.com/logo/9884_italy-u21.jpg	9884
4943	Albania U21	https://apiv2.allsportsapi.com/logo/9897_albania-u21.jpg	9897
4944	Ivory Coast W	\N	23205
4945	Cape Verde W	\N	41583
4946	Encarnacion FC	https://apiv2.allsportsapi.com/logo/34796_encarnacion.jpg	34796
4947	Sol de America	https://apiv2.allsportsapi.com/logo/5719_sol-de-america.jpg	5719
4761	Niger	https://apiv2.allsportsapi.com/logo/740_niger.jpg	740
4839	Olympique de Safi	https://apiv2.allsportsapi.com/logo/5383_olympic-safi.jpg	5383
4952	Thailand U19	https://apiv2.allsportsapi.com/logo/25548_thailand-u19.jpg	25548
4953	Malaysia U19	https://apiv2.allsportsapi.com/logo/25568_malaysia-u19.jpg	25568
4962	Belarus U21	https://apiv2.allsportsapi.com/logo/9910_belarus-u21.jpg	9910
4963	Kazakhstan U21	https://apiv2.allsportsapi.com/logo/9907_kazakhstan-u21.jpg	9907
4964	Norway U21	https://apiv2.allsportsapi.com/logo/9924_norway-u21.jpg	9924
4965	Finland U21	https://apiv2.allsportsapi.com/logo/9921_finland-u21.jpg	9921
4966	Latvia U19	https://apiv2.allsportsapi.com/logo/10581_latvia-u19.jpg	10581
4967	Estonia U19	https://apiv2.allsportsapi.com/logo/10623_estonia-u19.jpg	10623
4968	Japan U21	https://apiv2.allsportsapi.com/logo/18278_japan-u21.jpg	18278
4969	Ukraine U21	https://apiv2.allsportsapi.com/logo/9920_ukraine-u21.jpg	9920
4970	Sinop FC	https://apiv2.allsportsapi.com/logo/1841_sinop.jpg	1841
4971	Cacerense	https://apiv2.allsportsapi.com/logo/13349_cacerense.jpg	13349
4972	ZED	https://apiv2.allsportsapi.com/logo/13645_zed-fc.jpg	13645
4973	Wadi Degla	https://apiv2.allsportsapi.com/logo/2774_wadi-degla.jpg	2774
4974	Enppi	https://apiv2.allsportsapi.com/logo/2763_enppi.jpg	2763
4975	Al Masry	https://apiv2.allsportsapi.com/logo/2765_al-masry.jpg	2765
4976	Nigeria W	https://apiv2.allsportsapi.com/logo/587_nigeria-w.jpg	587
4978	Sweden U18 W	\N	41551
4979	Iceland U19 W	https://apiv2.allsportsapi.com/logo/21731_iceland-u19-women.jpg	21731
4980	Sweden U23 W	https://apiv2.allsportsapi.com/logo/12466_sweden-u23-women.jpg	12466
4981	Mexico U23 W	\N	41668
4982	Carabobo	https://apiv2.allsportsapi.com/logo/8025_carabobo.jpg	8025
4983	Puerto Cabello	https://apiv2.allsportsapi.com/logo/8030_academia-puerto-cabello.jpg	8030
4986	Saudi Arabia U20	https://apiv2.allsportsapi.com/logo/9030_saudi-arabia-u20.jpg	9030
4987	Panama U20	https://apiv2.allsportsapi.com/logo/9015_panama-u20.jpg	9015
4988	Iraq U20	https://apiv2.allsportsapi.com/logo/18090_iraq-u20.jpg	18090
4989	Jordan U20	https://apiv2.allsportsapi.com/logo/18080_jordan-u20.jpg	18080
4990	Baghdad	https://apiv2.allsportsapi.com/logo/9732_baghdad.jpg	9732
4991	Karbala	https://apiv2.allsportsapi.com/logo/30026_karbala.jpg	30026
4992	France U23 W	https://apiv2.allsportsapi.com/logo/12467_france-u23-women.jpg	12467
4993	USA U20 W	https://apiv2.allsportsapi.com/logo/26258_united-states-u20-w.jpg	26258
4560	Albania U17	https://apiv2.allsportsapi.com/logo/23273_albania-u17.jpg	23273
4950	Singapore U19	https://apiv2.allsportsapi.com/logo/25554_singapore-u19.jpg	25554
4997	Wales U19	https://apiv2.allsportsapi.com/logo/10583_wales-u19.jpg	10583
4998	North Macedonia U21	https://apiv2.allsportsapi.com/logo/9927_north-macedonia-u21.jpg	9927
4999	USA U20	https://apiv2.allsportsapi.com/logo/9021_united-states-u20.jpg	9021
5000	USA U21	https://apiv2.allsportsapi.com/logo/18277_united-states-u21.jpg	18277
5001	Uzbekistan U23	https://apiv2.allsportsapi.com/logo/9454_uzbekistan-u23.jpg	9454
4875	Los Angeles FC 2	https://apiv2.allsportsapi.com/logo/31396_los-angeles-ii.jpg	31396
290	Enkoping SK	https://apiv2.allsportsapi.com/logo/7402_enkoping.jpg	7402
3753	Juazeirense U20	https://apiv2.allsportsapi.com/logo/30474_juazeirense-u20.jpg	30474
3826	Bohunice	https://apiv2.allsportsapi.com/logo/16975_tatran-bohunice.jpg	16975
3886	Al Riyadi Abbasiyah	https://apiv2.allsportsapi.com/logo/34223_reyady-abaseya.jpg	34223
4028	CA Juventus U20	https://apiv2.allsportsapi.com/logo/10832_juventus-u20.jpg	10832
4056	Cerrado EC U20	https://apiv2.allsportsapi.com/logo/34824_cerrado-u20.jpg	34824
476	Charlotte Independ. 2	https://apiv2.allsportsapi.com/logo/7904_charlotte-independence-2.jpg	7904
1160	Ethiopia Nigd Bank	https://apiv2.allsportsapi.com/logo/33046_ethiopia-nigd-bank.jpg	33046
2710	Araguaina	https://apiv2.allsportsapi.com/logo/13301_araguaina.jpg	13301
2738	Rio Branco ES	https://apiv2.allsportsapi.com/logo/2065_rio-branco-es.jpg	2065
2925	TSV St. Johann	https://apiv2.allsportsapi.com/logo/1291_tsv-st.-johann.jpg	1291
2944	Vortuna BL	https://apiv2.allsportsapi.com/logo/32286_vortuna-bad-leonfelden.jpg	32286
2946	Friedburg	https://apiv2.allsportsapi.com/logo/1155_friedburg--pondorf.jpg	1155
2965	SV Schwarzach	https://apiv2.allsportsapi.com/logo/25748_sv-schwarzach.jpg	25748
2995	Velke Mezirici	https://apiv2.allsportsapi.com/logo/2523_velke-meziii.jpg	2523
3039	Petrin Plzen B	https://apiv2.allsportsapi.com/logo/36589_petin-plze-ii.jpg	36589
3066	Police nad Metuji	https://apiv2.allsportsapi.com/logo/36509_spartak-police-nmetuji.jpg	36509
88	Tallinna Kalev U21	https://apiv2.allsportsapi.com/logo/9069_tallinna-kalev-ii.jpg	9069
882	North Sunshine Eagles	https://apiv2.allsportsapi.com/logo/38648_north-sunshine-eagles.jpg	38648
1238	Shijiazhuang Gongfu	https://apiv2.allsportsapi.com/logo/19592_shijiazhuang-gongfu.jpg	19592
3651	Bronshoj	https://apiv2.allsportsapi.com/logo/2679_brnshj.jpg	2679
3697	Cordino EC	https://apiv2.allsportsapi.com/logo/2034_cordino.jpg	2034
4304	Polanka nad Odrou	https://apiv2.allsportsapi.com/logo/2615_polanka-nad-odrou.jpg	2615
2837	CAPS Utd	https://apiv2.allsportsapi.com/logo/8104_caps-united.jpg	8104
107	Northern Virginia	https://apiv2.allsportsapi.com/logo/7852_northern-virginia.jpg	7852
4408	Shortan Guzor	https://apiv2.allsportsapi.com/logo/10542_shortan.jpg	10542
4530	Foot Elite	https://apiv2.allsportsapi.com/logo/23706_afrique-football-elite.jpg	23706
1799	Deportivo Riestra 2	https://apiv2.allsportsapi.com/logo/34427_deportivo-riestra-res..jpg	34427
4607	Denmark W	https://apiv2.allsportsapi.com/logo/9785_denmark-w.jpg	9785
4640	Northern Ireland W	https://apiv2.allsportsapi.com/logo/9207_northern-ireland-w.jpg	9207
4658	Kazakhstan U19	https://apiv2.allsportsapi.com/logo/10612_kazakhstan-u19.jpg	10612
4724	Guatemala W	https://apiv2.allsportsapi.com/logo/9212_guatemala-w.jpg	9212
4757	General Caballero JLM	https://apiv2.allsportsapi.com/logo/5729_general-caballero-jlm.jpg	5729
4807	Polkowice	https://apiv2.allsportsapi.com/logo/5811_gornik-polkowice.jpg	5811
4835	Difaa El Jadidi	https://apiv2.allsportsapi.com/logo/5393_difaa-el-jadida.jpg	5393
4927	Northern Ireland	https://apiv2.allsportsapi.com/logo/682_northern-ireland.jpg	682
665	Bamboutos FC	https://apiv2.allsportsapi.com/logo/2173_bamboutos.jpg	2173
4977	Senegal W	https://apiv2.allsportsapi.com/logo/23201_senegal-w.jpg	23201
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
14	2	100.00	voucher_redeem	Voucher redeemed: HG57VT77GU2B	2026-06-07 20:19:12.043127+00
15	2	100.00	voucher_redeem	Voucher redeemed: DS2KSMNPB3TD	2026-06-07 20:20:22.695398+00
16	2	400.00	debit	Withdrawal — $400.00	2026-06-07 20:21:21.683228+00
17	2	100.00	voucher_redeem	Voucher redeemed: HH4URUFADG89	2026-06-07 20:44:24.593316+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role, created_at, first_name, last_name, phone_number, public_id) FROM stdin;
1	admin	admin@gowin.com	$2b$10$qlhT3j/2P4FHOWEXGus3SO9Eim8UG9dKdyU0QglmqtIFQU61spItO	admin	2026-06-07 18:53:03.965093+00	Serge	Mugisho	+27749019134	867608
2	testuser	user@gowin.com	$2b$10$/cAEq0Pe1hYRSwwZyiQ0buBGz2FMnybSIPDku5E/lJA3rDvOhcRAO	user	2026-06-07 18:54:16.008006+00	Selemani	Kabasele	+24399745145	353805
\.


--
-- Data for Name: vouchers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vouchers (id, code, value, is_redeemed, redeemed_by, redeemed_at, created_at) FROM stdin;
1	29HFE4FZYHKL	100.00	f	\N	\N	2026-06-07 20:18:30.765628+00
3	D8QVKMLYF2N5	100.00	f	\N	\N	2026-06-07 20:18:30.805646+00
4	XRWVWSY5PEMA	100.00	f	\N	\N	2026-06-07 20:18:30.809519+00
5	T7H9FXYR685H	100.00	f	\N	\N	2026-06-07 20:18:30.813501+00
6	WPMYPYZ6PXJJ	100.00	f	\N	\N	2026-06-07 20:18:30.818766+00
7	MPRGFWNCJLZX	100.00	f	\N	\N	2026-06-07 20:18:30.822246+00
8	7YBX49LJJP42	100.00	f	\N	\N	2026-06-07 20:18:30.82701+00
10	HG57VT77GU2B	100.00	t	2	2026-06-07 20:19:12.038+00	2026-06-07 20:18:30.836679+00
2	DS2KSMNPB3TD	100.00	t	2	2026-06-07 20:20:22.691+00	2026-06-07 20:18:30.80056+00
9	HH4URUFADG89	100.00	t	2	2026-06-07 20:44:24.588+00	2026-06-07 20:18:30.830646+00
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallets (id, user_id, balance) FROM stdin;
1	1	10000.00
2	2	0.00
\.


--
-- Data for Name: withdrawals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.withdrawals (id, user_id, amount, bank_details, status, admin_note, created_at, updated_at) FROM stdin;
1	2	100.00	+24399745145	paid	\N	2026-06-07 20:48:15.432469+00	2026-06-07 20:48:56.224+00
2	2	50.00	+24399745145	pending	\N	2026-06-07 20:49:52.158096+00	2026-06-07 20:49:52.158096+00
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

SELECT pg_catalog.setval('public.fixtures_id_seq', 2504, true);


--
-- Name: leagues_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leagues_id_seq', 9982, true);


--
-- Name: markets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.markets_id_seq', 2482, true);


--
-- Name: odds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.odds_id_seq', 7432, true);


--
-- Name: sports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sports_id_seq', 5, true);


--
-- Name: teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teams_id_seq', 14979, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 17, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: vouchers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vouchers_id_seq', 10, true);


--
-- Name: wallets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wallets_id_seq', 2, true);


--
-- Name: withdrawals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.withdrawals_id_seq', 2, true);


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
-- Name: fixtures fixtures_external_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_external_id_unique UNIQUE (external_id);


--
-- Name: fixtures fixtures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixtures
    ADD CONSTRAINT fixtures_pkey PRIMARY KEY (id);


--
-- Name: leagues leagues_external_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_external_id_unique UNIQUE (external_id);


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
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: sports sports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sports
    ADD CONSTRAINT sports_pkey PRIMARY KEY (id);


--
-- Name: teams teams_external_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_external_id_unique UNIQUE (external_id);


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
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_public_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_public_id_key UNIQUE (public_id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vouchers vouchers_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_code_key UNIQUE (code);


--
-- Name: vouchers vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


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
-- Name: vouchers vouchers_redeemed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_redeemed_by_fkey FOREIGN KEY (redeemed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: wallets wallets_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: withdrawals withdrawals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict DOOAZXUtSZlSF7CyhtlxllnwQn0IVN2hdP7ldvhbPHH8qOkST51cd7N4PXKHqKo

