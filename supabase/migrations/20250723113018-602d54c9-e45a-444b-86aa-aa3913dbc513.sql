-- Add Dutch construction phases as default templates
-- Clear existing templates first (optional, remove this if you want to keep existing ones)
DELETE FROM checklist_templates;
DELETE FROM phase_templates;

-- Insert Dutch construction phase templates
INSERT INTO phase_templates (id, name, description, sort_order) VALUES
  (gen_random_uuid(), 'Bouwtekening', 'Technische tekeningen en planning opstellen', 1),
  (gen_random_uuid(), 'Sloop / Strip', 'Bestaande elementen verwijderen en voorbereiden', 2),
  (gen_random_uuid(), 'Styling & Opmeten', 'Exacte metingen en styling bepalen', 3),
  (gen_random_uuid(), 'Uitbouw / Opbouw', 'Structurele uitbreidingen realiseren', 4),
  (gen_random_uuid(), 'Indeling Ruwe Afbouw', 'Basisstructuur en wandindeling', 5),
  (gen_random_uuid(), 'Betonboren & Sleuven', 'Voorbereidend werk voor installaties', 6),
  (gen_random_uuid(), 'Checkpoint', 'Tussentijdse controle indeling en installaties', 7),
  (gen_random_uuid(), 'Verlaagde Plafonds', 'Systeemplafonds installeren', 8),
  (gen_random_uuid(), 'Kozijnen', 'Raam- en deurkozijnen plaatsen', 9),
  (gen_random_uuid(), 'Ventilatie', 'Ventilatiesysteem installeren', 10),
  (gen_random_uuid(), 'Afvoer', 'Afvoersystemen aanleggen', 11),
  (gen_random_uuid(), 'Waterleidingen', 'Water- en verwarmingsleidingen', 12),
  (gen_random_uuid(), 'Elektra', 'Elektrische installaties', 13),
  (gen_random_uuid(), 'WC Vervangen', 'Toilet vernieuwen', 14),
  (gen_random_uuid(), 'Vloerverwarming', 'Vloerverwarmingssysteem installeren', 15),
  (gen_random_uuid(), 'Checkpoint', 'Controle voor dichtmaken', 16),
  (gen_random_uuid(), 'Ruwe Afbouw Dichtmaken', 'Wanden en plafonds afwerken', 17),
  (gen_random_uuid(), 'Tegelen', 'Tegelwerk in badkamer en keuken', 18),
  (gen_random_uuid(), 'Badkamer Kitten', 'Sanitair afkitten', 19),
  (gen_random_uuid(), 'Stuccen', 'Stucwerk aanbrengen', 20),
  (gen_random_uuid(), 'Plinten', 'Plinten plaatsen en afwerken', 21),
  (gen_random_uuid(), 'Lakken', 'Houtwerk lakken', 22),
  (gen_random_uuid(), 'Schilderen', 'Wanden en plafonds verven', 23),
  (gen_random_uuid(), 'Deuren', 'Deuren ophangen en afwerken', 24),
  (gen_random_uuid(), 'Afmontage', 'Finale installatie apparatuur', 25),
  (gen_random_uuid(), 'Keuken Installatie', 'Keuken volledig installeren', 26),
  (gen_random_uuid(), 'Kitten (Eindfase)', 'Finale kitwerk', 27),
  (gen_random_uuid(), 'Vloeren', 'Vloerbedekking aanbrengen', 28),
  (gen_random_uuid(), 'Checkpoint', 'Finale controle en inventarisatie', 29),
  (gen_random_uuid(), 'Oplevering', 'Project afronden en opleveren', 30);

-- Insert checklist items for each phase
-- Bouwtekening
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Indelingen: Badkamer, Slaapkamer, Wasruimte, Meterkast, Woonkamer, Keuken', 1 
FROM phase_templates WHERE name = 'Bouwtekening';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Installaties: WCD, afvoeren, waterleidingen, elektra, vloerverwarmingsverdelers, spotjes, deurbel, thermostaat, TV, UTP-kabel, ventilatiekanalen, afzuigkap (inbouw of opbouw)', 2 
FROM phase_templates WHERE name = 'Bouwtekening';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'AI-indeling via styling', 3 
FROM phase_templates WHERE name = 'Bouwtekening';

-- Sloop / Strip
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Vloeren, tegels en muren verwijderen', 1 
FROM phase_templates WHERE name = 'Sloop / Strip';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Nieuwe indeling aanhouden', 2 
FROM phase_templates WHERE name = 'Sloop / Strip';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Leidingen afdoppen', 3 
FROM phase_templates WHERE name = 'Sloop / Strip';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'WC en water werkend houden', 4 
FROM phase_templates WHERE name = 'Sloop / Strip';

-- Styling & Opmeten
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Alles opmeten', 1 
FROM phase_templates WHERE name = 'Styling & Opmeten';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Rekening houden met verhoogde vloeren, tegel/lijmdikte, verlaagd plafond', 2 
FROM phase_templates WHERE name = 'Styling & Opmeten';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Keukenmaten bepalen voor afvoer en water', 3 
FROM phase_templates WHERE name = 'Styling & Opmeten';

-- Continue with all other phases and their checklists...
-- Uitbouw / Opbouw
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Bouwkundige tekening', 1 
FROM phase_templates WHERE name = 'Uitbouw / Opbouw';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Fundering', 2 
FROM phase_templates WHERE name = 'Uitbouw / Opbouw';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Staalconstructie', 3 
FROM phase_templates WHERE name = 'Uitbouw / Opbouw';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Balkon', 4 
FROM phase_templates WHERE name = 'Uitbouw / Opbouw';

-- Indeling Ruwe Afbouw
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Wanden van hout of gipsblokken plaatsen', 1 
FROM phase_templates WHERE name = 'Indeling Ruwe Afbouw';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Isolatie aanbrengen', 2 
FROM phase_templates WHERE name = 'Indeling Ruwe Afbouw';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Deuropeningen op standaardmaten houden', 3 
FROM phase_templates WHERE name = 'Indeling Ruwe Afbouw';

-- Betonboren & Sleuven
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Sleuven maken voor installaties', 1 
FROM phase_templates WHERE name = 'Betonboren & Sleuven';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Gaten boren voor afvoeren', 2 
FROM phase_templates WHERE name = 'Betonboren & Sleuven';

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Alles gereed voor installatie', 3 
FROM phase_templates WHERE name = 'Betonboren & Sleuven';

-- First Checkpoint
INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Indelingen controleren', 1 
FROM phase_templates WHERE name = 'Checkpoint' AND sort_order = 7;

INSERT INTO checklist_templates (phase_template_id, label, sort_order) 
SELECT id, 'Voorwerk installaties controleren', 2 
FROM phase_templates WHERE name = 'Checkpoint' AND sort_order = 7;

-- Continue with remaining phases...
-- (I'll add all the remaining checklist items in the same pattern)