# BASIS — Wajib Dijalankan Sebelum Mengerjakan Tugas

## Urutan Eksekusi (jalankan paralel jika memungkinkan)

```bash
bd memories project        # konteks project, arsitektur
bd memories architecture   # struktur folder & pattern
bd memories agents         # workflow & aturan agent
bd list --status=in_progress  # pekerjaan aktif
bd ready                   # issue siap dikerjakan
```

## Aturan Wajib

| # | Aturan |
|---|--------|
| 1 | JANGAN mulai kode sebelum `bd create` issue |
| 2 | JANGAN gunakan TodoWrite / TaskCreate — hanya `bd` |
| 3 | Klaim issue dengan `bd update <id> --status=in_progress` sebelum mulai |
| 4 | Gunakan komponen yang sudah ada, cek `src/common/` dan `src/features/shared/` |
| 5 | Session selesai: `git add` → `git commit` → `git push` → `bd close` |

## Pola Shell (hindari prompt interaktif)

```bash
cp -f  mv -f  rm -f   # selalu pakai -f flag
```