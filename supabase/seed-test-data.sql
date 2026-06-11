-- Seed test submissions (approved) with realistic powerlifting data
-- Run in Supabase SQL Editor against your DEV project
-- Produces 100 primary lifters + 20 alternate-equipment entries (120 rows total)
-- The leaderboard deduplicates by opl_username, showing best GL per lifter per equip tab

INSERT INTO submissions (
  opl_username, first_name, last_name, date, sex, age,
  weight_class, bodyweight_kg, squat_kg, bench_kg, deadlift_kg,
  total_kg, gl_points, equipment, entry_type, meet_name, federation, status
)
WITH

names_m (first_name) AS (VALUES
  ('James'),('Jack'),('Ryan'),('Tom'),('Ben'),('Will'),('Luke'),('Sam'),
  ('Dan'),('Matt'),('Chris'),('Adam'),('Josh'),('Jake'),('Alex'),('Harry'),
  ('Joe'),('Liam'),('Owen'),('Finn'),('George'),('Callum'),('Dylan'),('Sean'),
  ('Kieran'),('Nathan'),('Aaron'),('Lewis'),('Kyle'),('Rory')
),
names_f (first_name) AS (VALUES
  ('Emma'),('Sophie'),('Olivia'),('Chloe'),('Emily'),('Laura'),('Sarah'),
  ('Katie'),('Amy'),('Zoe'),('Hannah'),('Grace'),('Megan'),('Lucy'),
  ('Jessica'),('Ella'),('Abby'),('Beth'),('Anna'),('Ellie'),('Rachel'),
  ('Claire'),('Natalie'),('Rebecca'),('Charlotte'),('Lauren'),('Molly'),
  ('Izzy'),('Jade'),('Aimee')
),
last_names (last_name) AS (VALUES
  ('Smith'),('Jones'),('Williams'),('Brown'),('Taylor'),('Davies'),('Evans'),
  ('Wilson'),('Thomas'),('Roberts'),('Johnson'),('White'),('Martin'),
  ('Thompson'),('Robinson'),('Clark'),('Lewis'),('Walker'),('Hall'),('Allen'),
  ('Young'),('King'),('Wright'),('Scott'),('Green'),('Baker'),('Adams'),
  ('Nelson'),('Carter'),('Mitchell'),('Turner'),('Phillips'),('Campbell'),
  ('Parker'),('Collins'),('Edwards'),('Stewart'),('Morris'),('Rogers'),('Reed')
),
meets (meet_name, federation) AS (VALUES
  ('British Full Power Championships',  'BPU'),
  ('BPU National Championships',        'BPU'),
  ('Alton Winter Qualifier',            'BPU'),
  ('Camberley Classic',                 'BPU'),
  ('North West Qualifier',              'GPC-GB'),
  ('London Open',                       'GPC-GB'),
  ('British Finals',                    'GPC-GB'),
  ('South East Regional',               'EPA'),
  ('Midlands Championship',             'EPA'),
  ('Welsh Open',                        'IPF'),
  ('Scottish Championship',             'IPF'),
  ('North East Qualifier',              'BPU')
),

-- Generate 100 rows with randomised values
raw AS (
  SELECT
    i,
    -- 60 male, 40 female
    CASE WHEN i <= 60 THEN 'M' ELSE 'F' END AS sex,

    -- Random bodyweight within realistic ranges per sex
    CASE
      WHEN i <= 60 THEN round((60 + random() * 65)::numeric, 1)   -- Men 60–125 kg
      ELSE              round((46 + random() * 55)::numeric, 1)    -- Women 46–101 kg
    END AS bw,

    -- Random total — men roughly 500–1000 kg, women 250–550 kg
    CASE
      WHEN i <= 60 THEN round(((500 + random() * 500) / 2.5)::integer * 2.5, 1)
      ELSE              round(((250 + random() * 300) / 2.5)::integer * 2.5, 1)
    END AS total,

    -- Equipment
    (ARRAY['Raw','Raw','Raw','Wraps','Wraps','Single-ply'])[floor(random()*6+1)::int] AS equip,

    -- Age
    (18 + floor(random() * 28))::int AS age,

    -- Date spread across 2016–2025
    (DATE '2016-01-01' + (random() * (DATE '2025-12-31' - DATE '2016-01-01'))::int) AS comp_date,

    -- Name indices
    (floor(random() * 30 + 1))::int AS fn_idx,
    (floor(random() * 40 + 1))::int AS ln_idx,
    (floor(random() * 12 + 1))::int AS meet_idx,
    i AS num
  FROM generate_series(1, 100) AS i
),

-- Split total into squat / bench / deadlift (38% / 26% / 36% split with noise)
lifts AS (
  SELECT
    r.*,
    round((total * (0.35 + random()*0.06) / 2.5)::integer * 2.5, 1) AS squat,
    round((total * (0.23 + random()*0.06) / 2.5)::integer * 2.5, 1) AS bench,
    -- deadlift = whatever is left
    round((total - round((total*(0.35+random()*0.06)/2.5)::integer*2.5,1)
                 - round((total*(0.23+random()*0.06)/2.5)::integer*2.5,1)) / 2.5)::integer * 2.5 AS deadlift
  FROM raw r
),

-- Calculate IPF GL points inline
gl AS (
  SELECT
    l.*,
    CASE
      WHEN sex = 'M' THEN
        round((total / (1199.72839 - 1025.18162 * exp(-0.00921 * bw)) * 100)::numeric, 4)
      ELSE
        round((total / (610.32796  - 1045.59282 * exp(-0.03048  * bw)) * 100)::numeric, 4)
    END AS gl_pts,

    -- Weight class bucket based on sex + bw
    CASE
      WHEN sex = 'M' THEN
        CASE
          WHEN bw <=  59 THEN '59'
          WHEN bw <=  66 THEN '66'
          WHEN bw <=  74 THEN '74'
          WHEN bw <=  83 THEN '83'
          WHEN bw <=  93 THEN '93'
          WHEN bw <= 105 THEN '105'
          WHEN bw <= 120 THEN '120'
          ELSE '120+'
        END
      ELSE
        CASE
          WHEN bw <=  47 THEN '47'
          WHEN bw <=  52 THEN '52'
          WHEN bw <=  57 THEN '57'
          WHEN bw <=  63 THEN '63'
          WHEN bw <=  69 THEN '69'
          WHEN bw <=  76 THEN '76'
          WHEN bw <=  84 THEN '84'
          ELSE '84+'
        END
    END AS wc
  FROM lifts l
)

SELECT
  lower(fn.first_name || ln.last_name || g.num)        AS opl_username,
  fn.first_name,
  ln.last_name,
  g.comp_date::date                                     AS date,
  g.sex,
  g.age,
  g.wc                                                  AS weight_class,
  g.bw                                                  AS bodyweight_kg,
  g.squat                                               AS squat_kg,
  g.bench                                               AS bench_kg,
  g.deadlift                                            AS deadlift_kg,
  g.total                                               AS total_kg,
  g.gl_pts                                              AS gl_points,
  g.equip                                               AS equipment,
  'competition'                                         AS entry_type,
  m.meet_name,
  m.federation,
  'approved'                                            AS status
FROM gl g
-- Join names by modulo so indices stay in range
JOIN (SELECT first_name, row_number() OVER () AS rn FROM names_m) fn
  ON fn.rn = ((g.fn_idx - 1) % 30) + 1
JOIN (SELECT last_name,  row_number() OVER () AS rn FROM last_names) ln
  ON ln.rn = ((g.ln_idx - 1) % 40) + 1
JOIN (SELECT meet_name, federation, row_number() OVER () AS rn FROM meets) m
  ON m.rn = ((g.meet_idx - 1) % 12) + 1;

-- ── Alternate-equipment entries ───────────────────────────────────────────────
-- Pick 20 random lifters and give them a second row with a different equipment
-- type. This lets you test: "All" tab shows best GL overall, equipment tabs
-- show the correct per-equipment best.

INSERT INTO submissions (
  opl_username, first_name, last_name, date, sex, age,
  weight_class, bodyweight_kg, squat_kg, bench_kg, deadlift_kg,
  total_kg, gl_points, equipment, entry_type, meet_name, federation, status
)
WITH src AS (
  SELECT * FROM submissions WHERE status = 'approved'
  ORDER BY random() LIMIT 20
),
alt AS (
  SELECT
    src.*,
    -- Competition was earlier, slightly different bw
    (src.date - (floor(random() * 365 + 90))::int)::date               AS alt_date,
    round((src.bodyweight_kg * (0.96 + random() * 0.08))::numeric, 1)  AS alt_bw,
    -- Slightly lower total (previous competition)
    round((src.total_kg * (0.91 + random() * 0.08) / 2.5)::integer * 2.5, 1)::numeric AS alt_total,
    -- Flip equipment type
    CASE src.equipment
      WHEN 'Raw'        THEN 'Wraps'
      WHEN 'Wraps'      THEN 'Raw'
      WHEN 'Single-ply' THEN 'Raw'
      ELSE 'Raw'
    END AS alt_equip
  FROM src
),
splits AS (
  SELECT
    *,
    round((alt_total * 0.37 / 2.5)::integer * 2.5, 1)::numeric AS sq,
    round((alt_total * 0.25 / 2.5)::integer * 2.5, 1)::numeric AS bch
  FROM alt
)
SELECT
  opl_username,
  first_name,
  last_name,
  alt_date                                                              AS date,
  sex,
  age,
  weight_class,
  alt_bw                                                                AS bodyweight_kg,
  sq                                                                    AS squat_kg,
  bch                                                                   AS bench_kg,
  round((alt_total - sq - bch) / 2.5)::integer * 2.5                   AS deadlift_kg,
  alt_total                                                             AS total_kg,
  CASE sex
    WHEN 'M' THEN round((alt_total / (1199.72839 - 1025.18162 * exp(-0.00921 * alt_bw)) * 100)::numeric, 4)
    ELSE          round((alt_total / (610.32796  - 1045.59282 * exp(-0.03048  * alt_bw)) * 100)::numeric, 4)
  END                                                                   AS gl_points,
  alt_equip                                                             AS equipment,
  'competition'                                                         AS entry_type,
  'UK Alternative Championships'                                        AS meet_name,
  federation,
  'approved'                                                            AS status
FROM splits;
