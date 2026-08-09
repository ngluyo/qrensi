-- =========================================================
-- QRensi — Seed default (0002)
-- Data awal EDITABLE via UI admin. Angka jam = default sementara,
-- menunggu SK resmi jam kerja ASN Kotabaru (lihat docs/SETUP_CHECKLIST §6).
-- Konvensi hari: 1=Minggu, 2=Senin, ... 7=Sabtu.
-- =========================================================

do $$
declare
  v_instansi uuid;
  v_pola_jumat uuid;   -- pola "Senin-Jumat"
  v_pola_sabtu uuid;   -- pola "Senin-Sabtu"
  d int;
begin
  -- Instansi contoh
  insert into instansi (nama, kode, radius_geofence_meter, latitude, longitude, timezone)
  values ('Pemerintah Kabupaten Kotabaru', 'PEMKAB-KOTABARU', 100, -3.2410000, 116.2810000, 'Asia/Makassar')
  returning id into v_instansi;

  -- Pola hari kerja
  insert into pola_hari_kerja (instansi_id, nama, hari_aktif)
  values (v_instansi, 'Senin-Jumat', array[2,3,4,5,6]) returning id into v_pola_jumat;
  insert into pola_hari_kerja (instansi_id, nama, hari_aktif)
  values (v_instansi, 'Senin-Sabtu', array[2,3,4,5,6,7]) returning id into v_pola_sabtu;

  -- ---- Pola Senin-Jumat ----
  -- Senin-Kamis (2..5): masuk + istirahat + pulang
  for d in 2..5 loop
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, urutan)
      values (v_instansi, v_pola_jumat, d, 'masuk', '07:15', '07:45', '10:00', 1);
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, urutan)
      values (v_instansi, v_pola_jumat, d, 'istirahat', '12:30', '13:30', 2);
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_wajar_akhir, urutan)
      values (v_instansi, v_pola_jumat, d, 'pulang', '16:30', '17:30', '16:30', 3);
  end loop;
  -- Jumat (6): masuk + pulang (tanpa istirahat)
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, urutan)
    values (v_instansi, v_pola_jumat, 6, 'masuk', '07:15', '07:45', '10:00', 1);
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_wajar_akhir, urutan)
    values (v_instansi, v_pola_jumat, 6, 'pulang', '11:00', '12:00', '11:00', 3);

  -- ---- Pola Senin-Sabtu ---- (Senin-Kamis sama; Jumat sama; Sabtu pulang 12:00-13:00)
  for d in 2..5 loop
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, urutan)
      values (v_instansi, v_pola_sabtu, d, 'masuk', '07:15', '07:45', '10:00', 1);
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, urutan)
      values (v_instansi, v_pola_sabtu, d, 'istirahat', '12:30', '13:30', 2);
    insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_wajar_akhir, urutan)
      values (v_instansi, v_pola_sabtu, d, 'pulang', '16:30', '17:30', '16:30', 3);
  end loop;
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, urutan)
    values (v_instansi, v_pola_sabtu, 6, 'masuk', '07:15', '07:45', '10:00', 1);
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_wajar_akhir, urutan)
    values (v_instansi, v_pola_sabtu, 6, 'pulang', '11:00', '12:00', '11:00', 3);
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_batas_akhir, urutan)
    values (v_instansi, v_pola_sabtu, 7, 'masuk', '07:15', '07:45', '10:00', 1);
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, urutan)
    values (v_instansi, v_pola_sabtu, 7, 'istirahat', '12:30', '13:30', 2);
  insert into jam_kerja_sesi (instansi_id, pola_hari_kerja_id, hari, jenis_sesi, jam_buka, jam_tutup, jam_wajar_akhir, urutan)
    values (v_instansi, v_pola_sabtu, 7, 'pulang', '12:00', '13:00', '12:00', 3);

  -- Pengaturan potongan default (contoh; sesuaikan aturan TPP/TKD Kotabaru)
  insert into pengaturan_potongan (instansi_id, jenis, menit_dari, menit_sampai, persen_potongan) values
    (v_instansi, 'terlambat', 1, 30, 0.50),
    (v_instansi, 'terlambat', 31, 60, 1.00),
    (v_instansi, 'terlambat', 61, 90, 1.25),
    (v_instansi, 'terlambat', 91, null, 2.50),
    (v_instansi, 'tidak_hadir', 0, null, 5.00);
end $$;
