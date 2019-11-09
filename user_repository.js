class UserRepository {

    constructor(dao) {
        this.dao = dao;
    }

    createTable() {
        const sql = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            register_date TEXT NOT NULL)`
        return this.dao.run(sql);
    }

    create(user) {
        return this.dao.run(
            `INSERT INTO users (username, password, register_date) VALUES (?, ?, ?)`,
            [user.username, user.password, user.register_date]);
    }

    update(user) {
        return this.dao.run(
            `UPDATE users
             SET name = ?,
                 passord = ?,
                 register_date = ?
             WHERE id = ?`,
            [user.username, user.password, user.register_date, id]);
    }

    delete(id) {
        return this.dao.run(
            `DELETE FROM users WHERE id = ?`,
            [id]);
    }

    getById(id) {
        return this.dao.get(
            `SELECT * FROM users WHERE id = ?`,
            [id]);
    }
    
    getByName(name) {
        return this.dao.get(
            `SELECT * FROM users WHERE username = ?`,
            [name]);
    }

    getAll() {
        return this.dao.all(`SELECT * FROM users`);
    }
}

module.exports = UserRepository;
