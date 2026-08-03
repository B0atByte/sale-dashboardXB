// ตั้ง env จำลองก่อนโหลดโมดูลแอป (config.js จะ exit ถ้าไม่มี SHEET_CSV_URL/API_KEY)
// รันด้วย: node --import ./test/setup.mjs --test
process.env.SHEET_CSV_URL ||= 'https://docs.google.com/spreadsheets/d/TEST/export?format=csv&gid=0';
process.env.API_KEY ||= 'test-api-key';
process.env.PIN_PEPPER ||= 'test-pepper';
process.env.NODE_ENV ||= 'test';
