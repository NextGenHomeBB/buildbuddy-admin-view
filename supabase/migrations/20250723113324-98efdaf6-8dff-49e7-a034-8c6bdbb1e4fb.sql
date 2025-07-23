-- Complete the Dutch construction phase checklist items

-- Verlaagde Plafonds
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Latjes, balken, schroeven en beugels monteren', 1 
FROM phase_templates WHERE name = 'Verlaagde Plafonds';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Hoogte controleren', 2 
FROM phase_templates WHERE name = 'Verlaagde Plafonds';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Plafondranden met PUR afdichten tegen scheurvorming', 3 
FROM phase_templates WHERE name = 'Verlaagde Plafonds';

-- Kozijnen
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Afmetingen controleren', 1 
FROM phase_templates WHERE name = 'Kozijnen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Materiaal: hout of staal bepalen', 2 
FROM phase_templates WHERE name = 'Kozijnen';

-- Ventilatie
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Duco-ventilatie plaatsen', 1 
FROM phase_templates WHERE name = 'Ventilatie';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'WTW-unit installeren', 2 
FROM phase_templates WHERE name = 'Ventilatie';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Luchtkanalen leggen', 3 
FROM phase_templates WHERE name = 'Ventilatie';

-- Afvoer
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Afvoerleidingen aanleggen (PVC 40/50/110)', 1 
FROM phase_templates WHERE name = 'Afvoer';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Sanibroyeur overwegen', 2 
FROM phase_templates WHERE name = 'Afvoer';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Standleiding in kaart brengen', 3 
FROM phase_templates WHERE name = 'Afvoer';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Hoogtes controleren (inbouw of opbouw)', 4 
FROM phase_templates WHERE name = 'Afvoer';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Ruimtes: washok, badkamer, WC, keuken', 5 
FROM phase_templates WHERE name = 'Afvoer';

-- Waterleidingen
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Koud- en warmwaterleidingen leggen', 1 
FROM phase_templates WHERE name = 'Waterleidingen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Isolatie aanbrengen', 2 
FROM phase_templates WHERE name = 'Waterleidingen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Punten: Badkamer, WC, Keuken, Washok', 3 
FROM phase_templates WHERE name = 'Waterleidingen';

-- Elektra
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Hoogtes en routes bepalen', 1 
FROM phase_templates WHERE name = 'Elektra';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Voorzetwanden vs. beton vs. gips markeren', 2 
FROM phase_templates WHERE name = 'Elektra';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Standaard afmetingen en hoogtes toepassen', 3 
FROM phase_templates WHERE name = 'Elektra';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Nieuwe keuken-afmetingen verwerken', 4 
FROM phase_templates WHERE name = 'Elektra';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Spiegelverlichting badkamer', 5 
FROM phase_templates WHERE name = 'Elektra';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Groepenkast (1- of 3-fasig) bepalen', 6 
FROM phase_templates WHERE name = 'Elektra';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Kabels & buizen trekken', 7 
FROM phase_templates WHERE name = 'Elektra';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Brandwerende WCD en spotjes gebruiken', 8 
FROM phase_templates WHERE name = 'Elektra';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Afmetingen badkamermeubels checken', 9 
FROM phase_templates WHERE name = 'Elektra';

-- WC Vervangen
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Oude WC verwijderen', 1 
FROM phase_templates WHERE name = 'WC Vervangen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Nieuwe WC plaatsen', 2 
FROM phase_templates WHERE name = 'WC Vervangen';

-- Vloerverwarming
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Vloer leeg en waterpas maken', 1 
FROM phase_templates WHERE name = 'Vloerverwarming';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Fermacell of noppenplaat leggen / direct frezen', 2 
FROM phase_templates WHERE name = 'Vloerverwarming';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Locatie verdeler bepalen', 3 
FROM phase_templates WHERE name = 'Vloerverwarming';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Afsmeren en egaliseren', 4 
FROM phase_templates WHERE name = 'Vloerverwarming';

-- Second Checkpoint (sort_order = 16)
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Installatie controleren vóór dichtmaken', 1 
FROM phase_templates WHERE name = 'Checkpoint' AND sort_order = 16;

-- Ruwe Afbouw Dichtmaken
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Isolatie plaatsen', 1 
FROM phase_templates WHERE name = 'Ruwe Afbouw Dichtmaken';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Gipsplaten monteren', 2 
FROM phase_templates WHERE name = 'Ruwe Afbouw Dichtmaken';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Groene gipsplaten in badkamer', 3 
FROM phase_templates WHERE name = 'Ruwe Afbouw Dichtmaken';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Blauwe gipsplaten voor extra isolatie', 4 
FROM phase_templates WHERE name = 'Ruwe Afbouw Dichtmaken';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Stuc-klaar opleveren', 5 
FROM phase_templates WHERE name = 'Ruwe Afbouw Dichtmaken';

-- Tegelen
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Muren op vlakheid controleren', 1 
FROM phase_templates WHERE name = 'Tegelen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Afvoer aangesloten', 2 
FROM phase_templates WHERE name = 'Tegelen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Inbouw- of opbouwkranen checken', 3 
FROM phase_templates WHERE name = 'Tegelen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Elektra op juiste posities', 4 
FROM phase_templates WHERE name = 'Tegelen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Kimbanden en tegellijm toepassen', 5 
FROM phase_templates WHERE name = 'Tegelen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Juiste tegels volgens tekening', 6 
FROM phase_templates WHERE name = 'Tegelen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Voegen aanbrengen', 7 
FROM phase_templates WHERE name = 'Tegelen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Plaats meubels bepalen', 8 
FROM phase_templates WHERE name = 'Tegelen';

-- Badkamer Kitten
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Alle naden in badkamer afkitten', 1 
FROM phase_templates WHERE name = 'Badkamer Kitten';

-- Stuccen
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Wanden en plafonds stukadoren', 1 
FROM phase_templates WHERE name = 'Stuccen';

-- Plinten
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Plinten plaatsen', 1 
FROM phase_templates WHERE name = 'Plinten';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Kitnaden afwerken', 2 
FROM phase_templates WHERE name = 'Plinten';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Aflakken', 3 
FROM phase_templates WHERE name = 'Plinten';

-- Lakken
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Alle houtdelen lakken', 1 
FROM phase_templates WHERE name = 'Lakken';

-- Schilderen
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Eerst lakken, dan schilderen', 1 
FROM phase_templates WHERE name = 'Schilderen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Primer aanbrengen', 2 
FROM phase_templates WHERE name = 'Schilderen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Houtwerk (kozijnen) lakken', 3 
FROM phase_templates WHERE name = 'Schilderen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Wanden en plafonds verven', 4 
FROM phase_templates WHERE name = 'Schilderen';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Kleuren RAL 4040 toepassen', 5 
FROM phase_templates WHERE name = 'Schilderen';

-- Deuren
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Deuren afhangen', 1 
FROM phase_templates WHERE name = 'Deuren';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Beslag monteren', 2 
FROM phase_templates WHERE name = 'Deuren';

-- Afmontage
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Badkamermeubels plaatsen', 1 
FROM phase_templates WHERE name = 'Afmontage';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Spots en WCD aansluiten', 2 
FROM phase_templates WHERE name = 'Afmontage';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Thermostaat installeren', 3 
FROM phase_templates WHERE name = 'Afmontage';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Intercom aansluiten', 4 
FROM phase_templates WHERE name = 'Afmontage';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Schakelaars monteren', 5 
FROM phase_templates WHERE name = 'Afmontage';

-- Keuken Installatie
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Keukenmeubels plaatsen', 1 
FROM phase_templates WHERE name = 'Keuken Installatie';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Apparatuur aansluiten', 2 
FROM phase_templates WHERE name = 'Keuken Installatie';

-- Kitten (Eindfase)
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Plinten, keuken, badkamermeubels en WC afkitten', 1 
FROM phase_templates WHERE name = 'Kitten (Eindfase)';

-- Vloeren
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Ondervloer leggen', 1 
FROM phase_templates WHERE name = 'Vloeren';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'PVC of laminaat plaatsen', 2 
FROM phase_templates WHERE name = 'Vloeren';

-- Third Checkpoint (sort_order = 29)
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Offerte en opleverlijst doornemen', 1 
FROM phase_templates WHERE name = 'Checkpoint' AND sort_order = 29;

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Laatste punten inventariseren', 2 
FROM phase_templates WHERE name = 'Checkpoint' AND sort_order = 29;

-- Oplevering
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Laatste punten nalopen', 1 
FROM phase_templates WHERE name = 'Oplevering';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Eventuele reparaties uitvoeren', 2 
FROM phase_templates WHERE name = 'Oplevering';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Project mooi afronden', 3 
FROM phase_templates WHERE name = 'Oplevering';