# Portal Pengurusan DELIMa – ICT Email V7

Perubahan V7:
- Email ibu bapa/penjaga wajib.
- No. WhatsApp pilihan dan boleh dikosongkan.
- Backend `submitICTHelp` menerima `email` dan tidak lagi mewajibkan `phone`.
- `ICT_REQUESTS` menyimpan EMAIL, EMAIL_STATUS dan EMAIL_ERROR.
- Admin membalas melalui `replyICTRequest`, yang menghantar email menggunakan `MailApp`.
- Fungsi sedia ada Portal, Live Chat dan FCM dikekalkan.

Penting: kemas kini backend Apps Script menggunakan `backend-full-with-ict.gs`. Google akan meminta authorization MailApp apabila penghantaran email pertama kali digunakan.
