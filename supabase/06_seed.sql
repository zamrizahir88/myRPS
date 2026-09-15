-- =====================================================================
-- myRPS — 06_seed.sql   (run SIXTH)
-- Grade scale, settings, and the UR6523007 curriculum for two intakes.
--
-- Credits and categories come straight from the printed structure and add up
-- exactly: 106 core + 6 elective + 12 common core + 14 university + 2
-- co-curriculum = 140.
--
-- planned_semester is RECONSTRUCTED from the grid. It reproduces the printed
-- per-semester totals (19/19/19/19/17/20/15/12) exactly, but a few individual
-- placements are inferred — check them against the academic guide book and fix
-- any you disagree with in Admin → Curriculum. Nothing else depends on it.
-- =====================================================================

-- ---------- grade scale (UniMAP scale, per the RPS Panduan) -----------------
insert into public.grade_scale (grade, points, is_pass, sort_order) values
  ('A', 4.00, true, 1), ('A-', 3.75, true, 2), ('B+', 3.50, true, 3),
  ('B', 3.00, true, 4), ('B-', 2.75, true, 5), ('C+', 2.50, true, 6),
  ('C', 2.00, true, 7), ('C-', 1.75, false, 8), ('D+', 1.50, false, 9),
  ('D', 1.00, false, 10), ('D-', 0.75, false, 11), ('F', 0.00, false, 12)
on conflict (grade) do update set points = excluded.points, is_pass = excluded.is_pass;
-- NOTE: B+ = 3.50 is inferred — the Panduan's table omits it, but every other
-- '+' grade is its base + 0.50. Correct it here if your faculty uses 3.25.
-- C- and below are non-passing for a core course under the UniMAP rules; adjust
-- is_pass if your programme differs.

-- ---------- settings ---------------------------------------------------------
insert into public.app_settings (key, value) values
  ('allowed_email_domain', 'studentmail.unimap.edu.my'),
  ('bootstrap_admin_email', 'CHANGE-ME@unimap.edu.my'),
  ('rps_whatsapp', '60123456789'),
  ('rps_name', 'Ts. Dr. Mohd Zamri bin Zahir Ahmad'),
  ('consent_version', '2025-v1')
on conflict (key) do nothing;
-- ^ Set bootstrap_admin_email to YOUR staff email BEFORE you register, or you
--   will not become the admin. See SETUP.md step 6.

-- ---------- credits required per block --------------------------------------
insert into public.curriculum_requirements (programme_code, intake_year, category, required_credits) values
  ('UR6523007','2025','core',106), ('UR6523007','2025','elective',6),
  ('UR6523007','2025','common_core',12), ('UR6523007','2025','university',14),
  ('UR6523007','2025','cocurriculum',2), ('UR6523007','2025','audit',0),
  ('UR6523007','2022','core',106), ('UR6523007','2022','elective',6),
  ('UR6523007','2022','common_core',12), ('UR6523007','2022','university',14),
  ('UR6523007','2022','cocurriculum',2), ('UR6523007','2022','audit',0)
on conflict (programme_code, intake_year, category) do update
  set required_credits = excluded.required_credits;

-- ---------- the courses ------------------------------------------------------
insert into public.curriculum_subjects
  (programme_code, intake_year, code, name_en, name_ms, credit, category,
   planned_semester, is_graded, counts_to_total)
values
  ('UR6523007','2025','NMK10103','Electric Circuit',null,3,'core',1,true,true),
  ('UR6523007','2025','NMK10203','Engineering Science',null,3,'core',1,true,true),
  ('UR6523007','2025','NMK10403','Digital Electronics',null,3,'core',1,true,true),
  ('UR6523007','2025','NMK11103','Electronic Engineering Skills',null,3,'core',1,true,true),
  ('UR6523007','2025','NMK12003','Engineering Materials',null,3,'core',1,true,true),
  ('UR6523007','2025','NMK10503','Electrical Engineering Technology',null,3,'core',2,true,true),
  ('UR6523007','2025','NMK10603','C Programming',null,3,'core',2,true,true),
  ('UR6523007','2025','NMK10702','Writing in Engineering Technology',null,2,'core',2,true,true),
  ('UR6523007','2025','NMK10803','Digital Systems',null,3,'core',2,true,true),
  ('UR6523007','2025','NMK34403','Engineering Technology Management',null,3,'core',2,true,true),
  ('UR6523007','2025','NMK20103','Microprocessor',null,3,'core',3,true,true),
  ('UR6523007','2025','NMK20203','Analog Electronic I',null,3,'core',3,true,true),
  ('UR6523007','2025','NMK20503','Signals and Systems',null,3,'core',3,true,true),
  ('UR6523007','2025','NMK20703','Object-Oriented Programming',null,3,'core',3,true,true),
  ('UR6523007','2025','NMK20603','Computer Architecture',null,3,'core',4,true,true),
  ('UR6523007','2025','NMK21103','Electromagnetic Theory',null,3,'core',4,true,true),
  ('UR6523007','2025','NMK21303','Analog Electronic II',null,3,'core',4,true,true),
  ('UR6523007','2025','NMK22003','Integrated Circuit Design',null,3,'core',4,true,true),
  ('UR6523007','2025','NMK30103','Communication Systems',null,3,'core',5,true,true),
  ('UR6523007','2025','NMK32003','Power Electronics',null,3,'core',5,true,true),
  ('UR6523007','2025','NMK32103','Digital Integrated Circuit Design',null,3,'core',5,true,true),
  ('UR6523007','2025','NMK32203','Microcontroller',null,3,'core',5,true,true),
  ('UR6523007','2025','NMK32303','Verification on Chip',null,3,'core',5,true,true),
  ('UR6523007','2025','NMK30004','Final Year Project 1',null,4,'core',6,true,true),
  ('UR6523007','2025','NMK31003','Digital Signal Processing',null,3,'core',6,true,true),
  ('UR6523007','2025','NMK31203','Modern Control System',null,3,'core',6,true,true),
  ('UR6523007','2025','NMK31704','Design Project',null,4,'core',6,true,true),
  ('UR6523007','2025','NMK44403','Engineering Technologist in Society',null,3,'core',6,true,true),
  ('UR6523007','2025','NMK40006','Final Year Project 2',null,6,'core',7,true,true),
  ('UR6523007','2025','NMK42003','Instrumentation',null,3,'core',7,true,true),
  ('UR6523007','2025','NMK40412','Industrial Training','Latihan Industri',12,'core',8,false,true),
  ('UR6523007','2025','NMK33003','Microelectronics Fabrication Technology',null,3,'elective',7,true,true),
  ('UR6523007','2025','NMK33103','Nanoelectronics',null,3,'elective',7,true,true),
  ('UR6523007','2025','NMK33203','Semiconductor Packaging',null,3,'elective',7,true,true),
  ('UR6523007','2025','NMK33303','Reliability and Failure Analysis',null,3,'elective',7,true,true),
  ('UR6523007','2025','NMK42103','Semiconductor Testing',null,3,'elective',7,true,true),
  ('UR6523007','2025','NMK42203','Analog Integrated Circuit Design',null,3,'elective',7,true,true),
  ('UR6523007','2025','NMK42403','IoT Technology',null,3,'elective',7,true,true),
  ('UR6523007','2025','NMK43103','Optoelectronic System',null,3,'elective',7,true,true),
  ('UR6523007','2025','NMK43003','MicroElectroMechanical System',null,3,'elective',7,true,true),
  ('UR6523007','2025','IMQ11103','Mathematics for Engineering Technology 1','Matematik untuk Teknologi Kejuruteraan 1',3,'common_core',1,true,true),
  ('UR6523007','2025','IMQ11203','Mathematics for Engineering Technology 2','Matematik untuk Teknologi Kejuruteraan 2',3,'common_core',2,true,true),
  ('UR6523007','2025','IMQ21303','Mathematics for Engineering Technology 3','Matematik untuk Teknologi Kejuruteraan 3',3,'common_core',3,true,true),
  ('UR6523007','2025','IMQ27303','Statistics for Engineering Technology','Statistik untuk Teknologi Kejuruteraan',3,'common_core',4,true,true),
  ('UR6523007','2025','SMB41002','University Malay Language','Bahasa Melayu Universiti',2,'university',2,true,true),
  ('UR6523007','2025','SMB20102','English for General Communication','Bahasa Inggeris untuk Komunikasi Am',2,'university',3,true,true),
  ('UR6523007','2025','SMU13002','Philosophy and Current Issues','Falsafah dan Isu Semasa',2,'university',3,true,true),
  ('UR6523007','2025','SMB31202','English for Technical Communication','Bahasa Inggeris untuk Komunikasi Teknikal',2,'university',4,true,true),
  ('UR6523007','2025','SMU12102','Integrity and Anti-Corruption','Integriti dan Antirasuah',2,'university',4,true,true),
  ('UR6523007','2025','SMU22402','Engineering Entrepreneurship','Keusahawanan Kejuruteraan',2,'university',5,true,true),
  ('UR6523007','2025','SMU13102','Appreciation of Ethics and Civilizations','Penghayatan Etika dan Peradaban',2,'university',6,true,true),
  ('UR6523007','2025','SMZXXX01','Co-Curriculum 1','Kokurikulum 1',1,'cocurriculum',1,true,true),
  ('UR6523007','2025','SMZXXX02','Co-Curriculum 2','Kokurikulum 2',1,'cocurriculum',6,true,true),
  ('UR6523007','2025','SMB10102','Preparatory English','Bahasa Inggeris Persediaan',2,'audit',1,true,false),
  ('UR6523007','2022','NMK10103','Electric Circuit',null,3,'core',1,true,true),
  ('UR6523007','2022','NMK10203','Engineering Science',null,3,'core',1,true,true),
  ('UR6523007','2022','NMK10403','Digital Electronics',null,3,'core',1,true,true),
  ('UR6523007','2022','NMK11103','Electronic Engineering Skills',null,3,'core',1,true,true),
  ('UR6523007','2022','NMK12003','Engineering Materials',null,3,'core',1,true,true),
  ('UR6523007','2022','NMK10503','Electrical Engineering Technology',null,3,'core',2,true,true),
  ('UR6523007','2022','NMK10603','C Programming',null,3,'core',2,true,true),
  ('UR6523007','2022','NMK10702','Writing in Engineering Technology',null,2,'core',2,true,true),
  ('UR6523007','2022','NMK10803','Digital Systems',null,3,'core',2,true,true),
  ('UR6523007','2022','NMK34403','Engineering Technology Management',null,3,'core',2,true,true),
  ('UR6523007','2022','NMK20103','Microprocessor',null,3,'core',3,true,true),
  ('UR6523007','2022','NMK20203','Analog Electronic I',null,3,'core',3,true,true),
  ('UR6523007','2022','NMK20503','Signals and Systems',null,3,'core',3,true,true),
  ('UR6523007','2022','NMK20703','Object-Oriented Programming',null,3,'core',3,true,true),
  ('UR6523007','2022','NMK20603','Computer Architecture',null,3,'core',4,true,true),
  ('UR6523007','2022','NMK21103','Electromagnetic Theory',null,3,'core',4,true,true),
  ('UR6523007','2022','NMK21303','Analog Electronic II',null,3,'core',4,true,true),
  ('UR6523007','2022','NMK22003','Integrated Circuit Design',null,3,'core',4,true,true),
  ('UR6523007','2022','NMK30103','Communication Systems',null,3,'core',5,true,true),
  ('UR6523007','2022','NMK32003','Power Electronics',null,3,'core',5,true,true),
  ('UR6523007','2022','NMK32103','Digital Integrated Circuit Design',null,3,'core',5,true,true),
  ('UR6523007','2022','NMK32203','Microcontroller',null,3,'core',5,true,true),
  ('UR6523007','2022','NMK32303','Verification on Chip',null,3,'core',5,true,true),
  ('UR6523007','2022','NMK30004','Final Year Project 1',null,4,'core',6,true,true),
  ('UR6523007','2022','NMK31003','Digital Signal Processing',null,3,'core',6,true,true),
  ('UR6523007','2022','NMK31203','Modern Control System',null,3,'core',6,true,true),
  ('UR6523007','2022','NMK31704','Design Project',null,4,'core',6,true,true),
  ('UR6523007','2022','NMK44403','Engineering Technologist in Society',null,3,'core',6,true,true),
  ('UR6523007','2022','NMK40006','Final Year Project 2',null,6,'core',7,true,true),
  ('UR6523007','2022','NMK42003','Instrumentation',null,3,'core',7,true,true),
  ('UR6523007','2022','NMK40412','Industrial Training','Latihan Industri',12,'core',8,false,true),
  ('UR6523007','2022','NMK33003','Microelectronics Fabrication Technology',null,3,'elective',7,true,true),
  ('UR6523007','2022','NMK33103','Nanoelectronics',null,3,'elective',7,true,true),
  ('UR6523007','2022','NMK33203','Semiconductor Packaging',null,3,'elective',7,true,true),
  ('UR6523007','2022','NMK33303','Reliability and Failure Analysis',null,3,'elective',7,true,true),
  ('UR6523007','2022','NMK42103','Semiconductor Testing',null,3,'elective',7,true,true),
  ('UR6523007','2022','NMK42203','Analog Integrated Circuit Design',null,3,'elective',7,true,true),
  ('UR6523007','2022','NMK42403','IoT Technology',null,3,'elective',7,true,true),
  ('UR6523007','2022','NMK43103','Optoelectronic System',null,3,'elective',7,true,true),
  ('UR6523007','2022','NMK43003','MicroElectroMechanical System',null,3,'elective',7,true,true),
  ('UR6523007','2022','SMQ11103','Mathematics for Engineering Technology 1','Matematik untuk Teknologi Kejuruteraan 1',3,'common_core',1,true,true),
  ('UR6523007','2022','SMQ11203','Mathematics for Engineering Technology 2','Matematik untuk Teknologi Kejuruteraan 2',3,'common_core',2,true,true),
  ('UR6523007','2022','SMQ21303','Mathematics for Engineering Technology 3','Matematik untuk Teknologi Kejuruteraan 3',3,'common_core',3,true,true),
  ('UR6523007','2022','SMQ27303','Statistics for Engineering Technology','Statistik untuk Teknologi Kejuruteraan',3,'common_core',4,true,true),
  ('UR6523007','2022','SMB41002','University Malay Language','Bahasa Melayu Universiti',2,'university',2,true,true),
  ('UR6523007','2022','SMB20102','English for General Communication','Bahasa Inggeris untuk Komunikasi Am',2,'university',3,true,true),
  ('UR6523007','2022','SMU13002','Philosophy and Current Issues','Falsafah dan Isu Semasa',2,'university',3,true,true),
  ('UR6523007','2022','SMB31202','English for Technical Communication','Bahasa Inggeris untuk Komunikasi Teknikal',2,'university',4,true,true),
  ('UR6523007','2022','SMU12102','Integrity and Anti-Corruption','Integriti dan Antirasuah',2,'university',4,true,true),
  ('UR6523007','2022','SMU22402','Engineering Entrepreneurship','Keusahawanan Kejuruteraan',2,'university',5,true,true),
  ('UR6523007','2022','SMU13102','Appreciation of Ethics and Civilizations','Penghayatan Etika dan Peradaban',2,'university',6,true,true),
  ('UR6523007','2022','SMZXXX01','Co-Curriculum 1','Kokurikulum 1',1,'cocurriculum',1,true,true),
  ('UR6523007','2022','SMZXXX02','Co-Curriculum 2','Kokurikulum 2',1,'cocurriculum',6,true,true),
  ('UR6523007','2022','SMB10102','Preparatory English','Bahasa Inggeris Persediaan',2,'audit',1,true,false)
on conflict (programme_code, intake_year, code) do update
  set name_en = excluded.name_en,
      name_ms = excluded.name_ms,
      credit = excluded.credit,
      category = excluded.category;

-- ---------- sanity check: should print 140 for each intake -------------------
-- select intake_year, sum(required_credits) from public.curriculum_requirements
-- group by intake_year;
