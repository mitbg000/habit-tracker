const path = require('path');
const fs = require('fs');
const knexLib = require('knex');

const client = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

function buildConfig() {
  if (client === 'mysql') {
    return {
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        charset: 'utf8mb4',
        dateStrings: true,
      },
      pool: { min: 0, max: 10 },
    };
  }

  const file = path.resolve(__dirname, '..', process.env.SQLITE_FILE || './data/habit.sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return {
    client: 'better-sqlite3',
    connection: { filename: file },
    useNullAsDefault: true,
    pool: {
      afterCreate(conn, done) {
        conn.pragma('journal_mode = WAL');
        conn.pragma('foreign_keys = ON');
        done();
      },
    },
  };
}

const db = knexLib(buildConfig());

/**
 * Tạo bảng nếu chưa có. An toàn khi chạy nhiều lần,
 * và tương thích với database đã import sẵn từ database/*.sql.
 */
async function migrate() {
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('username', 32).notNullable().unique();
      t.string('password_hash', 100).notNullable();
      t.integer('failed_attempts').notNullable().defaultTo(0);
      t.bigInteger('locked_until').nullable();
      t.bigInteger('created_at').notNullable();
    });
  }

  if (!(await db.schema.hasTable('habits'))) {
    await db.schema.createTable('habits', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      t.string('name', 60).notNullable();
      // build: thói quen tốt cần làm | quit: thói quen xấu cần tránh | number: đo bằng con số
      t.string('type', 10).notNullable().defaultTo('build');
      t.string('unit', 20).nullable();
      t.integer('target').nullable(); // với number: mức tối đa mong muốn
      t.integer('sort').notNullable().defaultTo(0);
      t.boolean('archived').notNullable().defaultTo(false);
      t.bigInteger('created_at').notNullable();
      t.index(['user_id']);
    });
  }

  // Màu và biểu tượng của thói quen (khoá trong bảng màu/bộ icon ở client); thêm cho database cũ
  for (const [col, len] of [['color', 16], ['icon', 24]]) {
    if (!(await db.schema.hasColumn('habits', col))) {
      await db.schema.alterTable('habits', (t) => { t.string(col, len).nullable(); });
    }
  }

  // Lịch lặp ("1,3,5" = thứ hai, tư, sáu; null = mỗi ngày) và mục tiêu chuỗi (số ngày/lần)
  if (!(await db.schema.hasColumn('habits', 'days'))) {
    await db.schema.alterTable('habits', (t) => { t.string('days', 13).nullable(); });
  }
  if (!(await db.schema.hasColumn('habits', 'goal'))) {
    await db.schema.alterTable('habits', (t) => { t.integer('goal').nullable(); });
  }

  // Mức điểm của thói quen: 1 nhẹ, 2 vừa, 3 quan trọng
  if (!(await db.schema.hasColumn('habits', 'points'))) {
    await db.schema.alterTable('habits', (t) => { t.integer('points').notNullable().defaultTo(1); });
  }

  if (!(await db.schema.hasTable('entries'))) {
    await db.schema.createTable('entries', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      t.integer('habit_id').unsigned().notNullable()
        .references('id').inTable('habits').onDelete('CASCADE');
      t.string('date', 10).notNullable(); // YYYY-MM-DD theo giờ địa phương của người dùng
      // build/quit: 1 = đạt (đã làm / giữ được), 0 = không đạt (bỏ lỡ / tái phạm)
      // number: giá trị đo được (ví dụ số phút)
      t.integer('value').notNullable();
      t.text('meta').nullable(); // JSON: { time, place, feeling, note } khi tái phạm
      t.unique(['habit_id', 'date']);
      t.index(['user_id', 'date']);
    });
  }

  if (!(await db.schema.hasTable('notes'))) {
    await db.schema.createTable('notes', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      t.text('body').notNullable();
      t.bigInteger('created_at').notNullable();
      t.bigInteger('updated_at').nullable();
      t.string('color', 16).nullable(); // màu nền tuỳ chọn (khoá trong bảng màu ở client)
      t.index(['user_id', 'id']);
    });
  }
  if (!(await db.schema.hasColumn('notes', 'color'))) {
    await db.schema.alterTable('notes', (t) => { t.string('color', 16).nullable(); });
  }

  // Việc đã làm trong một ngày, ghi tự do và không lặp lại như thói quen
  if (!(await db.schema.hasTable('tasks'))) {
    await db.schema.createTable('tasks', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      t.string('date', 10).notNullable();
      t.string('title', 120).notNullable();
      t.integer('points').notNullable().defaultTo(1); // 1, 2 hoặc 3 như thói quen
      t.bigInteger('created_at').notNullable();
      t.index(['user_id', 'date']);
    });
  }

  if (!(await db.schema.hasTable('days'))) {
    await db.schema.createTable('days', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      t.string('date', 10).notNullable();
      t.integer('mood').nullable(); // 1..5
      t.text('note').nullable();
      t.unique(['user_id', 'date']);
    });
  }
}

module.exports = { db, migrate, client };
