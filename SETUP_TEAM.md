# Persoonlijke accounts, projecten en foto's

Status: implementatie voor aansluiting op Supabase. Niet live, niet verbonden en nog niet met een echte database getest. De bestaande demo-inlog en het lokale logboek blijven beschikbaar; ze zijn geen echte accounts en worden niet automatisch gemigreerd.

## Activeren

1. Maak een Supabase-project aan. Kies zelf het abonnement; de code koopt of activeert geen betaald plan.
2. Voer `supabase/migrations/202611020001_team.sql` één keer uit in een nieuw project. De migratie maakt tabellen, rechten, accountfuncties en een private fotobucket aan.
3. Stel bij Supabase Auth de site-URL en e-mailbevestiging in. Configureer een eigen SMTP-dienst voor e-mail aan echte medewerkers; de standaard ontwikkelmaildienst is niet geschikt voor algemeen gebruik. Configureer wachtwoordbeleid, minimaal 12 tekens, en rate limits.
4. Voeg in Vercel de omgevingsvariabelen `SUPABASE_URL` en `SUPABASE_PUBLISHABLE_KEY` toe. Gebruik de publieke publishable key of legacy anon key. Gebruik hier NOOIT een secret/service-role key. De configuratie-endpoint weigert die.
5. Deploy de branch op Vercel. GitHub Pages kan de `/api/team-config` serverfunctie niet uitvoeren.
6. Open `/app/team.html`, registreer een persoonlijk account, bevestig de e-mail, log in en maak het bedrijf aan. Dit eerste account heeft de kantoorrol binnen dat nieuwe bedrijf.
7. Maak uitnodigingscodes voor medewerkers. Zij registreren hun eigen account en gebruiken de eenmalige code om aan te sluiten. Codes verlopen na 48 uur. De app verstuurt geen uitnodigingen.
8. Maak een project aan, wijs medewerkers toe, laat een medewerker een hijs registreren en een foto toevoegen. Controleer dit vervolgens met het kantooraccount op een ander apparaat.

## Rechten en gegevens

- Rollen: kantoor, rigger en machinist. Alleen kantoor maakt projecten, uitnodigingen en toewijzingen binnen het eigen bedrijf.
- Alle writes naar de projecttabellen lopen via databasefuncties. De browser kan niet zelf rollen, bedrijf of uploader kiezen.
- Medewerkers kunnen alleen toegewezen projecten lezen en daaraan hijsen/foto's toevoegen. Kantoor heeft toegang tot alle projecten van het eigen bedrijf.
- Uploader en tijdstip worden server-side vastgelegd. Foto's zijn privé; kijklinks verlopen na vijf minuten. Een reeds uitgegeven link blijft tot dat tijdstip geldig.
- De medewerker kiest een herkenbaar kraannummer bij een hijs. Koppeling met de lokale kraancatalogus en import van oude demo-hijsen zijn nog niet geïmplementeerd.
- Teamgegevens staan online; de bestaande prototypegegevens worden niet stilzwijgend geïmporteerd. Tokens worden in sessionStorage bewaard. Uitloggen wist de zichtbare teamgegevens.
- Geen achtergrondverversing: gebruik Vernieuwen voor nieuwe gegevens van collega's.
- Nog geen wachtwoordherstel-UI, accountverwijdering, beheer van uitdiensttreding of herstel van per ongeluk geregistreerde hijsen. Maak deze beheerfuncties gereed voor brede productie-uitrol.

## Validatie

`node --test tests/team.cjs` test de configuratie en browserflows met een nagebootste Supabase-client. Dit bewijst de databasebeveiliging niet. Voer vóór livegang integratietests uit op een apart Supabase-testproject, inclusief: twee bedrijven; kantoor versus medewerker; niet-toegewezen medewerker; gemanipuleerde API-calls; dubbele/gebruikte/verlopen uitnodigingen; upload naar andermans pad; intrekken van projecttoegang. Test e-mailbevestiging en werkelijke upload op iPhone en Android.

Geen databaseverbinding, echte e-mailaflevering of online opslag is gevalideerd zolang het project niet aangesloten is.
