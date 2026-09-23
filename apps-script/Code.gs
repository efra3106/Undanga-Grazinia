/**
 * Backend Wishes untuk undangan Grazinia Tiffany Angkol.
 * Deploy sebagai Web App: Execute as "Me", Who has access "Anyone".
 *
 * Struktur sheet (nama sheet = SHEET_NAME di bawah), baris pertama header:
 * A = ID | B = Timestamp | C = Nama | D = Ucapan | E = Konfirmasi Kehadiran
 */

const SPREADSHEET_ID = 'ISI_ID_SPREADSHEET_DI_SINI';
const SHEET_NAME = 'Wishes';

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 60;
const STATUS_MAX_LENGTH = 40;
const MESSAGE_MAX_LENGTH = 500;

function doGet(e) {
  try {
    const sheet = getSheet_();
    const rows = sheet.getDataRange().getValues();
    const data = [];

    // rows[0] = header (ID, Timestamp, Nama, Ucapan, Konfirmasi)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;

      data.push({
        id: String(row[0]),
        timestamp: row[1] instanceof Date ? row[1].toISOString() : String(row[1]),
        name: String(row[2] || ''),
        message: String(row[3] || ''),
        status: String(row[4] || ''),
      });
    }

    return jsonResponse_({ success: true, data: data });
  } catch (err) {
    return jsonResponse_({ success: false, message: 'Gagal mengambil data.' });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    const name = sanitizeText_(body.name).slice(0, NAME_MAX_LENGTH);
    const status = sanitizeText_(body.status).slice(0, STATUS_MAX_LENGTH);
    const message = sanitizeText_(body.message).slice(0, MESSAGE_MAX_LENGTH);

    if (name.length < NAME_MIN_LENGTH) {
      return jsonResponse_({ success: false, message: 'Nama minimal 2 karakter.' });
    }
    if (!message) {
      return jsonResponse_({ success: false, message: 'Ucapan tidak boleh kosong.' });
    }

    const sheet = getSheet_();
    const id = Utilities.getUuid();
    const timestamp = new Date();

    sheet.appendRow([id, timestamp, name, message, status]);

    return jsonResponse_({
      success: true,
      message: 'Ucapan berhasil disimpan',
      data: {
        id: id,
        timestamp: timestamp.toISOString(),
        name: name,
        message: message,
        status: status,
      },
    });
  } catch (err) {
    return jsonResponse_({ success: false, message: 'Gagal menyimpan ucapan.' });
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet "' + SHEET_NAME + '" tidak ditemukan.');
  }
  return sheet;
}

function sanitizeText_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
