import { Link } from "wouter";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const YEAR = new Date().getFullYear();

export default function BettingRules() {
  const { language, t } = useSiteSettings();
  const fr = language === "fr";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card/60 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">
              {fr ? "Règles de Paris" : "Betting Rules"}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            {fr ? `Dernière mise à jour : 1er janvier ${YEAR}` : `Last updated: January 1, ${YEAR}`}
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-4">
            {fr ? "Règles de Paris — Go Win RDC" : "Betting Rules — Go Win RDC"}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {fr
              ? "Les règles suivantes s'appliquent à tous les paris placés sur Go Win RDC. En plaçant un pari, vous acceptez d'être lié par ces règles. Go Win RDC se réserve le droit de modifier ces règles à tout moment ; les versions en vigueur au moment du placement du pari s'appliquent."
              : "The following rules apply to all bets placed on Go Win RDC. By placing a bet, you agree to be bound by these rules. Go Win RDC reserves the right to amend these rules at any time; the version in force at the time the bet is placed applies."}
          </p>
        </div>

        {/* ── 1. GENERAL ──────────────────────────────────────────────── */}
        <RuleSection title={fr ? "1. Règles Générales de Paris Sportifs" : "1. General Sports Betting Rules"}>

          <SubSection id="1.1" title={fr ? "Généralités" : "General"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Go Win RDC accepte les paris sur les résultats d'événements sportifs conformément aux règles énoncées dans le présent document. Go Win RDC se réserve le droit de refuser, limiter ou annuler tout pari, à sa seule discrétion.</li>
                <li>Les paris ne peuvent être annulés ou modifiés par le client une fois confirmés.</li>
                <li>En cas d'erreur manifeste dans les cotes affichées (erreur technique, faute de frappe ou cote clairement incorrecte), Go Win RDC se réserve le droit d'annuler les paris concernés et de rembourser les mises.</li>
                <li>Tout pari placé sur un événement dont le résultat est déjà connu au moment de la mise sera annulé.</li>
                <li>Go Win RDC n'est pas responsable des interruptions de service causées par des problèmes techniques indépendants de sa volonté.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Go Win RDC accepts bets on the outcomes of sporting events in accordance with the rules set out herein. Go Win RDC reserves the right to refuse, limit, or void any bet at its sole discretion.</li>
                <li>Bets cannot be cancelled or altered by the customer once confirmed.</li>
                <li>In the event of a manifest error in displayed odds (technical error, typographical mistake, or clearly incorrect price), Go Win RDC reserves the right to void the affected bets and refund stakes.</li>
                <li>Any bet placed on an event whose result is already known at the time of wagering will be voided.</li>
                <li>Go Win RDC is not liable for service interruptions caused by technical issues beyond its reasonable control.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="1.2" title={fr ? "Types de Paris" : "Bet Types"}>
            {fr ? (
              <ul className="space-y-2">
                <li><strong className="text-foreground">Simple :</strong> pari sur un seul événement. Le gain est calculé en multipliant la mise par la cote.</li>
                <li><strong className="text-foreground">Combiné (Accumulator) :</strong> pari combinant plusieurs sélections. Toutes les sélections doivent être gagnantes pour que le pari soit payé. Les cotes sont multipliées entre elles. Si une sélection est annulée (void), sa cote est remplacée par 1,00 dans le calcul.</li>
                <li>Deux sélections ou plus portant sur le même événement et ayant des résultats liés entre eux ne peuvent pas être combinées dans un même pari.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li><strong className="text-foreground">Single:</strong> a bet on one event. The payout is calculated by multiplying the stake by the odds.</li>
                <li><strong className="text-foreground">Accumulator (Combo):</strong> a bet combining multiple selections. All selections must win for the bet to pay out. Odds are multiplied together. If a selection is voided, its odds are replaced by 1.00 in the calculation.</li>
                <li>Two or more selections from the same event with related outcomes cannot be combined in the same accumulator bet.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="1.3" title={fr ? "Changement de Lieu" : "Change of Venue"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Si un match est déplacé dans un stade différent mais se déroule toujours sur le terrain de l'équipe à domicile désignée, les paris restent valides.</li>
                <li>Si un match est déplacé sur le terrain de l'équipe visiteuse ou sur un terrain neutre non annoncé à l'avance, Go Win RDC se réserve le droit d'annuler les paris.</li>
                <li>Les paris sur les rencontres dont le statut domicile/extérieur est inversé seront annulés.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>If a match is relocated to a different stadium but still takes place at the designated home team's ground, bets remain valid.</li>
                <li>If a match is moved to the away team's ground or to a neutral venue not announced in advance, Go Win RDC reserves the right to void bets.</li>
                <li>Bets on matches where the home/away status is reversed will be voided.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="1.4" title={fr ? "Paris Dépendants" : "Dependent Bets"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les sélections dont les résultats sont directement liés (par exemple, « équipe A gagne » et « équipe A marque en premier » dans le même match) sont considérées comme des paris dépendants.</li>
                <li>Les paris dépendants ne sont pas autorisés dans les combinés. Go Win RDC se réserve le droit d'annuler tout pari combiné contenant des sélections dépendantes.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Selections whose outcomes are directly related (e.g. "Team A wins" and "Team A scores first" in the same match) are considered dependent bets.</li>
                <li>Dependent bets are not permitted in accumulators. Go Win RDC reserves the right to void any accumulator containing dependent selections.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="1.5" title={fr ? "Affichage des Matchs" : "Display of Matches"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les informations sur les matchs (équipes, heure de début, cotes) sont affichées à titre indicatif. En cas d'erreur d'affichage, les règles officielles de la compétition et le résultat officiel prévalent.</li>
                <li>Go Win RDC s'efforce d'afficher les informations à jour mais ne garantit pas l'exactitude absolue des données en temps réel.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Match information (teams, kick-off time, odds) is displayed for guidance only. In the event of a display error, the official competition rules and official result prevail.</li>
                <li>Go Win RDC endeavours to display up-to-date information but does not guarantee the absolute accuracy of real-time data.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="1.6" title={fr ? "Paris en Direct (Live Betting)" : "Live Betting"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les paris en direct sont acceptés sur les événements en cours, sous réserve de disponibilité des cotes. Go Win RDC peut suspendre les marchés en direct à tout moment sans préavis.</li>
                <li>Les paris en direct sont soumis aux mêmes règles que les paris avant match, sauf indication contraire spécifique.</li>
                <li>En cas de retard ou d'interruption dans la transmission des données en direct, Go Win RDC se réserve le droit de suspendre ou d'annuler les marchés concernés.</li>
                <li>Les paris acceptés après la fin officielle d'un événement ou d'une période seront annulés.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Live bets are accepted on ongoing events subject to odds availability. Go Win RDC may suspend live markets at any time without prior notice.</li>
                <li>Live bets are subject to the same rules as pre-match bets unless specifically stated otherwise.</li>
                <li>In the event of a delay or interruption in live data transmission, Go Win RDC reserves the right to suspend or void the affected markets.</li>
                <li>Bets accepted after the official end of an event or period will be voided.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="1.7" title={fr ? "Le Résultat Officiel Fait Foi" : "Official Result Stands"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le règlement des paris est basé sur le résultat officiel tel que communiqué par l'organe directeur de la compétition concernée.</li>
                <li>Les révisions de résultat survenant après le règlement initial (par exemple, décisions disciplinaires ou appels) ne donnent pas lieu à une révision des paris déjà réglés, sauf décision contraire explicite de Go Win RDC.</li>
                <li>En l'absence de résultat officiel, Go Win RDC peut utiliser des sources d'information reconnues pour régler les paris.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Bet settlement is based on the official result as communicated by the governing body of the relevant competition.</li>
                <li>Result revisions occurring after initial settlement (e.g. disciplinary decisions or appeals) do not give rise to a revision of already-settled bets, unless Go Win RDC explicitly decides otherwise.</li>
                <li>In the absence of an official result, Go Win RDC may use recognised information sources to settle bets.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="1.8" title={fr ? "Erreur de Cash Out" : "Incorrect Cash Out"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Go Win RDC se réserve le droit de corriger toute erreur manifeste dans le calcul d'une offre de Cash Out et d'annuler ou d'ajuster les transactions concernées.</li>
                <li>En cas d'erreur technique affectant une offre de Cash Out, le pari sera maintenu jusqu'à son dénouement normal.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Go Win RDC reserves the right to correct any manifest error in a Cash Out offer calculation and to cancel or adjust the affected transactions.</li>
                <li>In the event of a technical error affecting a Cash Out offer, the bet will be held open until its normal conclusion.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="1.9" title={fr ? "Affichage de l'Heure" : "Time Display"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les heures de début affichées sont fournies à titre indicatif et peuvent varier en fonction du fuseau horaire local de l'utilisateur.</li>
                <li>Go Win RDC ne peut être tenu responsable des paris mal placés en raison d'une confusion sur l'heure de début d'un événement.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Displayed kick-off times are provided for guidance and may vary depending on the user's local time zone.</li>
                <li>Go Win RDC cannot be held liable for mis-placed bets resulting from confusion over the start time of an event.</li>
              </ul>
            )}
          </SubSection>
        </RuleSection>

        {/* ── 2. FOOTBALL ─────────────────────────────────────────────── */}
        <RuleSection title={fr ? "2. Règles de Paris Football" : "2. Football (Soccer) Betting Rules"}>

          <SubSection id="2.1" title={fr ? "Durée du Match" : "Match Length"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les marchés Football sont réglés sur la base du résultat à la fin du temps réglementaire (90 minutes + arrêts de jeu), sauf indication contraire explicite dans la description du marché.</li>
                <li>Les prolongations et les tirs au but ne sont pas pris en compte dans le règlement des marchés standard, sauf pour les marchés spécifiquement libellés « Vainqueur du tournoi » ou « Vainqueur avec prolongation/TAB ».</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Football markets are settled on the result at the end of regular time (90 minutes plus stoppage time), unless the market description explicitly states otherwise.</li>
                <li>Extra time and penalty shoot-outs are not counted for standard market settlement, except for markets specifically labelled "Tournament Winner" or "Winner including Extra Time / Penalties".</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="2.2" title={fr ? "Match Abandonné ou Suspendu" : "Abandoned or Suspended Match"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Si un match est abandonné avant la fin du temps réglementaire, les paris seront annulés et les mises remboursées, sauf si le résultat au moment de l'abandon est déjà certain quel que soit le développement ultérieur (par exemple, mi-temps réglée dans un pari sur la mi-temps uniquement).</li>
                <li>Si un match suspendu est repris et complété dans les 48 heures, les paris restent valides.</li>
                <li>Au-delà de 48 heures sans reprise, tous les paris sur ce match sont annulés.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>If a match is abandoned before the end of regular time, bets will be voided and stakes refunded, unless the result at the point of abandonment is already certain regardless of further play (e.g. a half-time-only bet already settled).</li>
                <li>If a suspended match is resumed and completed within 48 hours, bets remain valid.</li>
                <li>Beyond 48 hours without resumption, all bets on that match are voided.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="2.3" title={fr ? "Marché 1X2 (Résultat du Match)" : "1X2 Market (Match Result)"}>
            {fr ? (
              <ul className="space-y-2">
                <li><strong className="text-foreground">1 :</strong> victoire de l'équipe à domicile à l'issue du temps réglementaire.</li>
                <li><strong className="text-foreground">X :</strong> match nul à l'issue du temps réglementaire.</li>
                <li><strong className="text-foreground">2 :</strong> victoire de l'équipe visiteuse à l'issue du temps réglementaire.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li><strong className="text-foreground">1:</strong> home team wins at the end of regular time.</li>
                <li><strong className="text-foreground">X:</strong> draw at the end of regular time.</li>
                <li><strong className="text-foreground">2:</strong> away team wins at the end of regular time.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="2.4" title={fr ? "Buts Totaux (Over/Under)" : "Total Goals (Over/Under)"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le marché Over/Under porte sur le nombre total de buts marqués au cours du temps réglementaire.</li>
                <li>Les buts marqués en prolongation ne sont pas comptabilisés dans ce marché.</li>
                <li>Si le nombre total de buts est exactement égal à la ligne (ex. : Over/Under 2,5 — 2 buts), les paris seront réglés selon la sélection exacte : Over 2,5 est perdant avec 2 buts, Under 2,5 est gagnant avec 2 buts.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The Over/Under market covers the total number of goals scored during regular time.</li>
                <li>Goals scored in extra time are not counted in this market.</li>
                <li>If the total goals exactly equal the line (e.g. Over/Under 2.5 — 2 goals), bets are settled according to the exact selection: Over 2.5 loses with 2 goals, Under 2.5 wins with 2 goals.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="2.5" title={fr ? "Les Deux Équipes Marquent (BTTS)" : "Both Teams to Score (BTTS)"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le marché BTTS est réglé sur la base des buts marqués pendant le temps réglementaire uniquement.</li>
                <li><strong className="text-foreground">Oui :</strong> les deux équipes ont marqué au moins un but pendant le temps réglementaire.</li>
                <li><strong className="text-foreground">Non :</strong> au moins une équipe n'a pas marqué pendant le temps réglementaire.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The BTTS market is settled on goals scored during regular time only.</li>
                <li><strong className="text-foreground">Yes:</strong> both teams scored at least one goal during regular time.</li>
                <li><strong className="text-foreground">No:</strong> at least one team did not score during regular time.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="2.6" title={fr ? "Handicap" : "Handicap"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le handicap s'applique au score final à l'issue du temps réglementaire. Le handicap est ajouté ou soustrait au score de l'équipe concernée pour déterminer le résultat du pari.</li>
                <li>Si le résultat après application du handicap est un match nul et que le marché ne propose pas l'option nul, les paris sont annulés.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The handicap applies to the final score at the end of regular time. The handicap is added or subtracted from the relevant team's score to determine the bet result.</li>
                <li>If the result after applying the handicap is a draw and the market does not offer a draw option, bets are voided.</li>
              </ul>
            )}
          </SubSection>
        </RuleSection>

        {/* ── 3. BASKETBALL ───────────────────────────────────────────── */}
        <RuleSection title={fr ? "3. Règles de Paris Basketball" : "3. Basketball Betting Rules"}>

          <SubSection id="3.1" title={fr ? "Durée du Match" : "Match Length"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les marchés Basketball sont réglés sur la base du score à la fin du temps réglementaire (quatre quart-temps), sauf indication contraire.</li>
                <li>Les prolongations sont incluses dans le règlement uniquement pour les marchés libellés explicitement « Vainqueur (avec prolongation) ».</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Basketball markets are settled based on the score at the end of regular time (four quarters), unless stated otherwise.</li>
                <li>Overtime is included in settlement only for markets explicitly labelled "Winner (including overtime)".</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="3.2" title={fr ? "Match Abandonné" : "Abandoned Match"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Si un match est abandonné avant la fin du temps réglementaire, tous les paris sont annulés, sauf si le résultat est déjà certain.</li>
                <li>Si le match est repris dans les 48 heures, les paris restent valides.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>If a match is abandoned before the end of regular time, all bets are voided unless the outcome is already certain.</li>
                <li>If the match is resumed within 48 hours, bets remain valid.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="3.3" title={fr ? "Total de Points (Over/Under)" : "Total Points (Over/Under)"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le marché Over/Under porte sur le total de points marqués pendant le temps réglementaire uniquement, sauf indication contraire.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The Over/Under market covers the total points scored during regular time only, unless otherwise stated.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="3.4" title={fr ? "Handicap" : "Handicap"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le handicap est appliqué au score à l'issue du temps réglementaire. En cas de résultat nul après handicap sur un marché sans option nul, les paris sont annulés.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The handicap is applied to the score at the end of regular time. If the result is tied after the handicap on a market without a draw option, bets are voided.</li>
              </ul>
            )}
          </SubSection>
        </RuleSection>

        {/* ── 4. TENNIS ───────────────────────────────────────────────── */}
        <RuleSection title={fr ? "4. Règles de Paris Tennis" : "4. Tennis Betting Rules"}>

          <SubSection id="4.1" title={fr ? "Généralités" : "General"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les marchés Tennis sont réglés sur la base du résultat officiel du match, y compris les retraits et les abandons en cours de match.</li>
                <li>Si un joueur se retire avant le début du match, tous les paris sur ce match sont annulés.</li>
                <li>Si un joueur abandonne en cours de match, les paris sur le vainqueur du match sont réglés en faveur du joueur encore en jeu, sauf indication contraire dans les règles spécifiques du marché.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Tennis markets are settled based on the official match result, including retirements and mid-match withdrawals.</li>
                <li>If a player withdraws before the start of the match, all bets on that match are voided.</li>
                <li>If a player retires during the match, bets on the match winner are settled in favour of the player still in play, unless the specific market rules state otherwise.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="4.2" title={fr ? "Nombre de Sets" : "Number of Sets"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les marchés portant sur le nombre de sets joués sont réglés sur la base du nombre total de sets complétés dans le match.</li>
                <li>Si un joueur abandonne, le marché est réglé sur le nombre de sets complétés au moment du retrait, à condition qu'au moins un set complet ait été joué.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Markets on the number of sets played are settled based on the total number of sets completed in the match.</li>
                <li>If a player retires, the market is settled on the number of sets completed at the time of withdrawal, provided at least one full set has been played.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="4.3" title={fr ? "Résultat du Set" : "Set Result"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les marchés sur le résultat d'un set spécifique sont réglés uniquement si ce set est complété. En cas d'abandon avant la fin du set concerné, le pari est annulé.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Markets on the result of a specific set are settled only if that set is completed. If a player retires before the relevant set ends, the bet is voided.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="4.4" title={fr ? "Jeux Totaux" : "Total Games"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les marchés Over/Under sur le nombre total de jeux sont réglés sur la base des jeux complétés pendant le match. Un jeu de tie-break compte pour un jeu.</li>
                <li>En cas d'abandon, si le nombre minimum de jeux requis pour le règlement n'a pas été joué, le pari est annulé.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Over/Under markets on the total number of games are settled based on games completed during the match. A tie-break counts as one game.</li>
                <li>In the event of a retirement, if the minimum number of games required for settlement has not been played, the bet is voided.</li>
              </ul>
            )}
          </SubSection>
        </RuleSection>

        {/* ── 5. CRICKET ──────────────────────────────────────────────── */}
        <RuleSection title={fr ? "5. Règles de Paris Cricket" : "5. Cricket Betting Rules"}>

          <SubSection id="5.1" title={fr ? "Généralités" : "General"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les marchés Cricket sont réglés sur la base du résultat officiel publié par l'organe directeur de la compétition concernée (ICC, conseil national, etc.).</li>
                <li>Un match est considéré comme valide pour le règlement des paris si au moins un ballon a été lancé, sauf indication contraire dans les règles du marché.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Cricket markets are settled based on the official result published by the relevant governing body (ICC, national board, etc.).</li>
                <li>A match is considered valid for bet settlement if at least one ball has been bowled, unless stated otherwise in the market rules.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.2" title={fr ? "Match Abandonné ou Nul" : "Abandoned or Drawn Match"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Si un match est abandonné sans résultat (aucun vainqueur désigné par l'organe directeur), tous les paris sont annulés et les mises remboursées.</li>
                <li>Un match nul officiel (résultat déclaré nul par l'organe directeur) est réglé comme tel, et non comme un abandon.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>If a match is abandoned with no result (no winner declared by the governing body), all bets are voided and stakes refunded.</li>
                <li>An official tie/draw (result officially declared tied or drawn by the governing body) is settled as such, not as an abandonment.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.3" title={fr ? "Méthode D/L (Duckworth–Lewis)" : "D/L Method (Duckworth–Lewis)"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Si le résultat d'un match est déterminé par la méthode Duckworth–Lewis–Stern (DLS) en raison d'une interruption due aux conditions météorologiques ou à d'autres facteurs, ce résultat est considéré comme officiel et les paris sont réglés en conséquence.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>If the result of a match is determined by the Duckworth–Lewis–Stern (DLS) method due to interruption by weather or other factors, that result is treated as official and bets are settled accordingly.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.4" title={fr ? "Formats de Match" : "Match Formats"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les règles s'appliquent à tous les formats : Test, One Day International (ODI) et Twenty20 (T20). Toute règle spécifique au format est indiquée dans la description du marché.</li>
                <li>Les marchés sur les matchs Test peuvent être réglés sur un résultat de match nul si aucune équipe ne gagne à l'issue des cinq jours de jeu.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Rules apply to all formats: Test, One Day International (ODI), and Twenty20 (T20). Any format-specific rule is indicated in the market description.</li>
                <li>Markets on Test matches may be settled on a draw result if neither team wins by the end of five days' play.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.5" title={fr ? "Vainqueur du Match" : "Match Winner"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le marché Vainqueur du Match est réglé sur l'équipe désignée vainqueur par l'organe directeur à l'issue du match.</li>
                <li>Si le marché ne propose pas d'option « Nul » et que le match se termine sur un nul officiel, tous les paris sont annulés.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The Match Winner market is settled on the team declared the winner by the governing body at the conclusion of the match.</li>
                <li>If the market does not offer a "Draw" option and the match officially ends in a draw, all bets are voided.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.6" title={fr ? "Total de Guichets (Over/Under)" : "Total Wickets (Over/Under)"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le marché Over/Under sur les guichets porte sur le nombre total de guichets tombés au cours d'une manche ou du match, selon la description du marché.</li>
                <li>En cas d'interruption ou d'abandon avant la fin de la période couverte par le marché, les paris sont annulés si le nombre de guichets requis pour le règlement n'a pas été atteint.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The Over/Under wickets market covers the total number of wickets to fall during an innings or the match, as described in the market.</li>
                <li>In the event of interruption or abandonment before the end of the period covered by the market, bets are voided if the number of wickets required for settlement has not been reached.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.7" title={fr ? "Total de Runs (Over/Under)" : "Total Runs (Over/Under)"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le marché Over/Under sur les runs porte sur le nombre total de runs marqués au cours d'une manche, d'un over ou du match entier, selon la description du marché.</li>
                <li>Les extras (wide balls, no balls, byes, leg byes) sont inclus dans le décompte des runs, sauf indication contraire.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The Over/Under runs market covers the total number of runs scored during an innings, an over, or the full match, as described in the market.</li>
                <li>Extras (wide balls, no balls, byes, leg byes) are included in the run count unless stated otherwise.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.8" title={fr ? "Performance d'un Batteur (Over/Under)" : "Batsman Performance (Over/Under)"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les marchés portant sur le score d'un batteur individuel sont réglés sur le score officiel de ce batteur dans la manche spécifiée.</li>
                <li>Si un batteur ne prend pas son tour à la batte en raison d'une blessure, d'un abandon ou d'une décision de l'équipe, les paris sur ce batteur sont annulés.</li>
                <li>Un batteur déclaré « retired hurt » est considéré comme ayant complété sa manche pour les besoins du règlement.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Markets on an individual batsman's score are settled on that batsman's official score in the specified innings.</li>
                <li>If a batsman does not take their turn to bat due to injury, abandonment, or a team decision, bets on that batsman are voided.</li>
                <li>A batsman declared "retired hurt" is treated as having completed their innings for settlement purposes.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.9" title={fr ? "Performance d'un Lanceur (Over/Under)" : "Bowler Performance (Over/Under)"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Les marchés portant sur les guichets pris par un lanceur individuel sont réglés sur le nombre de guichets officiellement attribués à ce lanceur dans la manche spécifiée.</li>
                <li>Si un lanceur est incapable de lancer en raison d'une blessure et ne lance pas du tout dans la manche concernée, les paris sur ce lanceur sont annulés.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>Markets on wickets taken by an individual bowler are settled on the number of wickets officially credited to that bowler in the specified innings.</li>
                <li>If a bowler is unable to bowl due to injury and does not bowl at all in the relevant innings, bets on that bowler are voided.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.10" title={fr ? "Vainqueur du Tirage au Sort (Toss)" : "Toss Winner"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le marché Toss est réglé sur l'équipe ayant remporté le tirage au sort tel qu'annoncé officiellement avant le match.</li>
                <li>Si le match est abandonné avant le tirage au sort, les paris sur le Toss sont annulés.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The Toss market is settled on the team that wins the coin toss as officially announced before the match.</li>
                <li>If the match is abandoned before the toss, Toss bets are voided.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.11" title={fr ? "Premier Guichet" : "First Wicket"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le marché Premier Guichet porte sur la manière dont le premier guichet de la manche spécifiée tombe (caught, bowled, LBW, run out, stumped, etc.).</li>
                <li>Si aucun guichet ne tombe au cours de la manche (exemple : tous les batteurs déclarés « not out »), les paris sont annulés.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The First Wicket market covers how the first wicket of the specified innings falls (caught, bowled, LBW, run out, stumped, etc.).</li>
                <li>If no wicket falls during the innings (e.g. all batsmen remain not out), bets are voided.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.12" title={fr ? "Meilleur Batteur du Match" : "Top Match Batsman"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le marché Meilleur Batteur est réglé sur le batteur ayant marqué le plus grand nombre de runs dans la manche ou le match spécifié.</li>
                <li>En cas d'égalité, les règles de partage des cotes ou d'annulation s'appliquent telles que décrites dans le marché.</li>
                <li>Si un joueur sélectionné ne prend pas son tour à la batte, le pari est annulé.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The Top Batsman market is settled on the batsman who scores the most runs in the specified innings or match.</li>
                <li>In the event of a tie, dead-heat or void rules apply as described in the market.</li>
                <li>If a selected player does not bat, the bet is voided.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.13" title={fr ? "Meilleur Lanceur du Match" : "Top Match Bowler"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le marché Meilleur Lanceur est réglé sur le lanceur ayant pris le plus grand nombre de guichets dans la manche ou le match spécifié.</li>
                <li>En cas d'égalité sur le nombre de guichets, la moyenne (economy rate) peut être utilisée pour départager, selon les règles du marché.</li>
                <li>Si un lanceur sélectionné ne lance pas dans la manche concernée, le pari est annulé.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The Top Bowler market is settled on the bowler who takes the most wickets in the specified innings or match.</li>
                <li>In the event of a tie on wickets, economy rate may be used as a tiebreaker, depending on the market rules.</li>
                <li>If a selected bowler does not bowl in the relevant innings, the bet is voided.</li>
              </ul>
            )}
          </SubSection>

          <SubSection id="5.14" title={fr ? "Handicap de Runs" : "Run Handicap"}>
            {fr ? (
              <ul className="space-y-2">
                <li>Le marché Handicap de Runs s'applique au résultat final (total de runs) après ajout ou soustraction du handicap à l'une des équipes.</li>
                <li>Le handicap est réglé sur la base des runs marqués dans la ou les manches spécifiées dans la description du marché.</li>
                <li>Si la manche ou le match est abandonné avant d'être complété, et que le nombre minimum de overs requis n'a pas été joué, les paris sont annulés.</li>
              </ul>
            ) : (
              <ul className="space-y-2">
                <li>The Run Handicap market applies to the final result (total runs) after adding or subtracting the handicap from one of the teams.</li>
                <li>The handicap is settled based on runs scored in the innings or innings specified in the market description.</li>
                <li>If the innings or match is abandoned before completion and the minimum number of required overs has not been bowled, bets are voided.</li>
              </ul>
            )}
          </SubSection>
        </RuleSection>

        {/* Footer */}
        <div className="border-t border-border pt-8 text-center text-xs text-muted-foreground/60 space-y-2">
          <p>© {YEAR} Go Win RDC. {t("footer.rights")}</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
            <span>·</span>
            <Link href="/" className="hover:text-foreground transition-colors">{t("footer.back_home")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-black text-foreground border-l-4 border-primary pl-4 py-1">{title}</h2>
      <div className="space-y-5 pl-1">{children}</div>
    </section>
  );
}

function SubSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-bold text-foreground">
        <span className="text-primary mr-2">{id}</span>{title}
      </h3>
      <ul className="list-none space-y-1.5 text-sm text-muted-foreground leading-relaxed pl-4 border-l border-border">
        {children}
      </ul>
    </div>
  );
}
