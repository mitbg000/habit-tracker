// Chép toàn bộ dữ liệu từ file SQLite sang database MySQL khai báo trong .env.
// Dừng project trước khi chạy. File SQLite chỉ được đọc, không bị thay đổi.
// Chạy được bất kể DB_CLIENT trong .env đang là gì; đổi DB_CLIENT=mysql sau khi chép xong.
const path = require('path');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });
process.env.DB_CLIENT = 'mysql'; // đặt trước khi nạp server/db.js để `db` trỏ tới MySQL

const Database = require('better-sqlite3');
const { db, migrate } = require('../server/db');

// Bảng cha trước bảng con để không vướng khoá ngoại
const TABLES = ['users', 'habits', 'entries', 'days', 'notes', 'tasks'];
const CHUNK = 200;

const normalize = (value) => (value === null || value === undefined ? null : String(value));

function sameRows(source, target) {
  if (source.length !== target.length) return false;
  return source.every((row, i) => Object.keys(row).every((col) => normalize(row[col]) === normalize(target[i][col])));
}

async function main() {
  if (!process.env.DB_NAME || !process.env.DB_USER) {
    throw new Error('Chưa khai báo DB_NAME và DB_USER trong .env.');
  }
  const file = path.resolve(root, process.env.SQLITE_FILE || './data/habit.sqlite');
  const sqlite = new Database(file, { readonly: true, fileMustExist: true });

  const hasTable = sqlite.prepare("select 1 from sqlite_master where type = 'table' and name = ?");
  const rows = {};
  for (const table of TABLES) {
    rows[table] = hasTable.get(table) ? sqlite.prepare(`select * from ${table} order by id`).all() : [];
  }
  sqlite.close();

  await migrate();

  for (const table of TABLES) {
    const { c } = await db(table).count({ c: '*' }).first();
    if (Number(c) > 0) {
      throw new Error(`Bảng ${table} trên MySQL đã có ${c} dòng. Không chép đè, hãy dùng database trống.`);
    }
  }

  // Chung một giao dịch: lỗi ở bất kỳ đâu thì MySQL trở lại trống. id giữ nguyên để các liên kết còn đúng.
  await db.transaction(async (trx) => {
    for (const table of TABLES) {
      for (let i = 0; i < rows[table].length; i += CHUNK) {
        await trx(table).insert(rows[table].slice(i, i + CHUNK));
      }
      // Đọc lại để phát hiện dữ liệu bị đổi âm thầm, ví dụ database không dùng utf8mb4
      const saved = await trx(table).select('*').orderBy('id');
      if (!sameRows(rows[table], saved)) {
        throw new Error(`Dữ liệu bảng ${table} trên MySQL khác với SQLite. Kiểm tra database có dùng utf8mb4 không.`);
      }
      console.log(`${table}: ${rows[table].length} dòng`);
    }
  });

  console.log('Đã chép xong. Đổi DB_CLIENT=mysql trong .env rồi Start project.');
}

main()
  .catch((err) => {
    console.error('Lỗi, chưa có gì được chép:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
