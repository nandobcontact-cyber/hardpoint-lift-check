# Hardpoint Lift Check

Een webapp van Hardpoint Safety voor kraanbedrijven, machinisten en riggers. Hiermee controleer je snel of een hijs kan.

## Wat zit erin

| Map | Inhoud |
|---|---|
| `app/index.html` | De app Hardpoint Lift Check, in één bestand |
| `website/index.html` | De website van Hardpoint Safety, met de hijsmiddelen-webshop |

## Functies van de app

- **Kranendatabase:** 28 Liebherr LTM-typen van 60 tot 450 t, met bouwjaren, maximale last, mastlengte, lattice jib, hijshoogte, vlucht, ballast, assen en motor. Bron per type: Liebherr of openbare gegevens. Er zijn geen voorbeeldkranen meer: de lasttabel komt uit het officiële boekje van de eigen kraan, per bouwjaar, ballast, jib-configuratie en afstempeling.
- **Vlucht berekenen:** kies een kraan en vul ballast, mastlengte, vlucht en last in op de tekening. Je ziet meteen of de hijs kan.
- **Welke kraan bestellen?:** vul de vlucht en het gewicht in en zie welke kraan geschikt is.
- **Hijskaart:** de aanslagfactoren voor recht (×1), snoerend (×0,8) en U-bocht (×2), met de hoek (EN 1492). Daarnaast advies over hijsmiddelen (EN 13414, EN 818) en het totale gewicht aan de haak.
- **Last inspecteren en kraan herkennen:** analyse van een foto met AI. Dit werkt alleen binnen Claude.
- **Steunpootdruk en ondergrond:** de druk onder de schotten vergeleken met wat de grond kan dragen.
- **Hijsplan:** een volledig plan met handtekeningen, dat je kunt printen of als PDF opslaan.
- **Hijslogboek:** wie welke hijs heeft gedaan, met welke kraan, inclusief kritische hijsen en foto's.
- **Wagenpark en eigen kranen:** voeg lasttabellen per bouwjaar toe.
- **Marine:** schepen, kades, bolders, aanloopplanning en een 3D-weergave.
- **Talen:** Nederlands, Engels, Duits, Frans en Spaans.

## Openen

Open `app/index.html` in een browser. Je hoeft niets te installeren.

## Via GitHub Pages online zetten

1. Upload deze map naar een repository op GitHub.
2. Ga naar **Settings → Pages** en kies de branch `main` met de map `/ (root)`.
3. De app staat daarna op `https://<gebruikersnaam>.github.io/<repository>/app/`.

## Let op

- Dit is een prototype met verzonnen voorbeeldwaarden. Gebruik het niet op de bouwplaats.
- De officiële lasttabel en de lastmomentbegrenzer van de kraan gaan altijd voor.
- De foto- en video-analyse werkt alleen binnen Claude. Buiten Claude heb je daarvoor een eigen koppeling met een AI-dienst nodig.
- Gegevens zoals kranen, het logboek en schepen worden nu alleen in de browser opgeslagen.

© Hardpoint Safety
