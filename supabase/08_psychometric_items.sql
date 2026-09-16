-- =====================================================================
-- myRPS — 08_psychometric_items.sql   (run EIGHTH)
-- The 70 statements of Lampiran 1, MODUL RPS 2025.
--
-- Instrument: Multiple Intelligences Test, V Chislett MSc & A Chapman
-- (2005-06), based on Howard Gardner's MI model, free from businessballs.com.
-- Used here with the lecturer's authorisation, for his own advisees only.
--
-- Each statement maps to one of seven intelligences, decoded from the shaded
-- answer grid in the module: exactly 10 statements each, so every intelligence
-- scores out of 40.
--
-- The Bahasa Melayu column is a translation for the UI. Edit any wording you'd
-- phrase differently, here or in the Supabase table editor.
-- =====================================================================

insert into public.psychometric_items (question_no, intelligence, text_en, text_ms) values
  (1, 'intrapersonal', 'I like to learn more about myself', 'Saya suka mengenali diri saya dengan lebih mendalam'),
  (2, 'musical', 'I can play a musical instrument', 'Saya boleh bermain alat muzik'),
  (3, 'kinesthetic', 'I find it easiest to solve problems when I am doing something physical', 'Saya lebih mudah menyelesaikan masalah sambil melakukan aktiviti fizikal'),
  (4, 'musical', 'I often have a song or piece of music in my head', 'Saya sering terbayang lagu atau melodi dalam fikiran'),
  (5, 'logical', 'I find budgeting and managing my money easy', 'Saya mudah menguruskan bajet dan kewangan saya'),
  (6, 'linguistic', 'I find it easy to make up stories', 'Saya mudah mereka cerita'),
  (7, 'kinesthetic', 'I have always been physically well co-ordinated', 'Saya sentiasa mempunyai koordinasi fizikal yang baik'),
  (8, 'linguistic', 'When talking to someone, I tend to listen to the words they use not just what they mean', 'Semasa berbual, saya memberi perhatian kepada pemilihan perkataan, bukan sekadar maksudnya'),
  (9, 'linguistic', 'I enjoy crosswords, word searches or other word puzzles', 'Saya suka teka silang kata atau teka-teki perkataan'),
  (10, 'logical', 'I don''t like ambiguity, I like things to be clear', 'Saya tidak suka perkara yang kabur; saya suka sesuatu yang jelas'),
  (11, 'logical', 'I enjoy logic puzzles such as ''sudoku''', 'Saya suka teka-teki logik seperti ''sudoku'''),
  (12, 'intrapersonal', 'I like to meditate', 'Saya suka bermeditasi atau bermuhasabah diri'),
  (13, 'musical', 'Music is very important to me', 'Muzik sangat penting bagi saya'),
  (14, 'linguistic', 'I am a convincing liar (if I want to be)', 'Saya boleh berbohong dengan meyakinkan (jika saya mahu)'),
  (15, 'kinesthetic', 'I play a sport or dance', 'Saya bermain sukan atau menari'),
  (16, 'intrapersonal', 'I am very interested in psychometrics (personality testing) and IQ tests', 'Saya sangat berminat dengan ujian psikometrik (ujian personaliti) dan ujian IQ'),
  (17, 'logical', 'People behaving irrationally annoy me', 'Saya rimas dengan orang yang bertindak tanpa logik'),
  (18, 'musical', 'I find that the music that appeals to me is often based on how I feel emotionally', 'Muzik yang saya minati selalunya bergantung pada perasaan saya ketika itu'),
  (19, 'interpersonal', 'I am a very social person and like being with other people', 'Saya seorang yang peramah dan suka bersama orang lain'),
  (20, 'logical', 'I like to be systematic and thorough', 'Saya suka bekerja secara sistematik dan teliti'),
  (21, 'spatial', 'I find graphs and charts easy to understand', 'Saya mudah memahami graf dan carta'),
  (22, 'kinesthetic', 'I can throw things well - darts, skimming pebbles, frisbees, etc', 'Saya pandai membaling sesuatu - dart, batu di air, frisbee dan sebagainya'),
  (23, 'linguistic', 'I find it easy to remember quotes or phrases', 'Saya mudah mengingati petikan atau ungkapan'),
  (24, 'spatial', 'I can always recognise places that I have been before, even when I was very young', 'Saya sentiasa dapat mengecam tempat yang pernah saya kunjungi, walaupun sejak kecil'),
  (25, 'musical', 'I enjoy a wide variety of musical styles', 'Saya menikmati pelbagai jenis aliran muzik'),
  (26, 'spatial', 'When I am concentrating I tend to doodle', 'Saya cenderung mencoret-coret ketika sedang menumpukan perhatian'),
  (27, 'interpersonal', 'I could manipulate people if I choose to', 'Saya boleh mempengaruhi orang lain jika saya mahu'),
  (28, 'intrapersonal', 'I can predict my feelings and behaviours in certain situations fairly accurately', 'Saya boleh menjangka perasaan dan tingkah laku saya dalam situasi tertentu dengan agak tepat'),
  (29, 'logical', 'I find mental arithmetic easy', 'Saya mudah membuat kiraan congak'),
  (30, 'musical', 'I can identify most sounds without seeing what causes them', 'Saya boleh mengecam kebanyakan bunyi tanpa melihat puncanya'),
  (31, 'linguistic', 'At school one of my favourite subjects is / was English', 'Semasa di sekolah, Bahasa Inggeris antara subjek kegemaran saya'),
  (32, 'logical', 'I like to think through a problem carefully, considering all the consequences', 'Saya suka memikirkan masalah secara mendalam dengan mengambil kira segala kesannya'),
  (33, 'linguistic', 'I enjoy debates and discussions', 'Saya suka berdebat dan berbincang'),
  (34, 'kinesthetic', 'I love adrenaline sports and scary rides', 'Saya suka sukan lasak dan permainan yang mendebarkan'),
  (35, 'intrapersonal', 'I enjoy individual sports best', 'Saya lebih suka sukan individu'),
  (36, 'interpersonal', 'I care about how those around me feel', 'Saya mengambil berat tentang perasaan orang di sekeliling saya'),
  (37, 'spatial', 'My house is full of pictures and photographs', 'Rumah saya dipenuhi gambar dan foto'),
  (38, 'kinesthetic', 'I enjoy and am good at making things - I''m good with my hands', 'Saya suka dan pandai membuat sesuatu - saya mahir menggunakan tangan'),
  (39, 'musical', 'I like having music on in the background', 'Saya suka memasang muzik sebagai latar'),
  (40, 'logical', 'I find it easy to remember telephone numbers', 'Saya mudah mengingati nombor telefon'),
  (41, 'intrapersonal', 'I set myself goals and plans for the future', 'Saya menetapkan matlamat dan merancang masa depan saya'),
  (42, 'kinesthetic', 'I am a very tactile person', 'Saya seorang yang suka menyentuh dan merasa sesuatu'),
  (43, 'interpersonal', 'I can tell easily whether someone likes me or dislikes me', 'Saya mudah mengesan sama ada seseorang menyukai saya atau tidak'),
  (44, 'spatial', 'I can easily imagine how an object would look from another perspective', 'Saya mudah membayangkan rupa sesuatu objek dari sudut yang berbeza'),
  (45, 'kinesthetic', 'I never use instructions for flat-pack furniture', 'Saya tidak pernah membaca manual semasa memasang perabot'),
  (46, 'interpersonal', 'I find it easy to talk to new people', 'Saya mudah berbual dengan orang yang baru dikenali'),
  (47, 'kinesthetic', 'To learn something new, I need to just get on and try it', 'Untuk mempelajari sesuatu yang baharu, saya perlu terus mencubanya'),
  (48, 'spatial', 'I often see clear images when I close my eyes', 'Saya kerap melihat imej yang jelas apabila memejamkan mata'),
  (49, 'logical', 'I don''t use my fingers when I count', 'Saya tidak menggunakan jari semasa mengira'),
  (50, 'linguistic', 'I often talk to myself - out loud or in my head', 'Saya kerap bercakap sendiri - secara kuat atau dalam hati'),
  (51, 'musical', 'At school I loved / love music lessons', 'Semasa di sekolah, saya suka kelas muzik'),
  (52, 'linguistic', 'When I am abroad, I find it easy to pick up the basics of another language', 'Ketika di luar negara, saya mudah mempelajari asas bahasa lain'),
  (53, 'kinesthetic', 'I find ball games easy and enjoyable', 'Saya mudah dan seronok bermain permainan bola'),
  (54, 'logical', 'My favourite subject at school is / was maths', 'Matematik adalah subjek kegemaran saya di sekolah'),
  (55, 'intrapersonal', 'I always know how I am feeling', 'Saya sentiasa tahu apa yang saya rasakan'),
  (56, 'intrapersonal', 'I am realistic about my strengths and weaknesses', 'Saya realistik tentang kekuatan dan kelemahan diri'),
  (57, 'intrapersonal', 'I keep a diary', 'Saya menulis diari'),
  (58, 'interpersonal', 'I am very aware of other people''s body language', 'Saya sangat peka terhadap bahasa badan orang lain'),
  (59, 'spatial', 'My favourite subject at school was / is art', 'Seni adalah subjek kegemaran saya di sekolah'),
  (60, 'linguistic', 'I find pleasure in reading', 'Saya seronok membaca'),
  (61, 'spatial', 'I can read a map easily', 'Saya mudah membaca peta'),
  (62, 'interpersonal', 'It upsets me to see someone cry and not be able to help', 'Saya sedih melihat seseorang menangis tanpa dapat membantu'),
  (63, 'interpersonal', 'I am good at solving disputes between others', 'Saya pandai meleraikan pertelingkahan antara orang lain'),
  (64, 'musical', 'I have always dreamed of being a musician or singer', 'Saya sentiasa bercita-cita menjadi pemuzik atau penyanyi'),
  (65, 'interpersonal', 'I prefer team sports', 'Saya lebih suka sukan berpasukan'),
  (66, 'musical', 'Singing makes me feel happy', 'Menyanyi membuatkan saya gembira'),
  (67, 'spatial', 'I never get lost when I am on my own in a new place', 'Saya tidak pernah sesat walaupun bersendirian di tempat baharu'),
  (68, 'spatial', 'If I am learning how to do something, I like to see drawings and diagrams of how it works', 'Ketika mempelajari sesuatu, saya suka melihat lukisan dan rajah cara ia berfungsi'),
  (69, 'intrapersonal', 'I am happy spending time alone', 'Saya gembira menghabiskan masa bersendirian'),
  (70, 'interpersonal', 'My friends always come to me for emotional support and advice', 'Rakan-rakan sering datang kepada saya untuk sokongan emosi dan nasihat')
on conflict (question_no) do update
  set intelligence = excluded.intelligence,
      text_en = excluded.text_en,
      text_ms = excluded.text_ms;

-- Sanity check — should return 7 rows, each with count 10:
-- select intelligence, count(*) from public.psychometric_items group by 1;
