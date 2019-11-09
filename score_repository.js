class GameRepository {

    constructor(dao) {
        this.dao = dao;
    }

    createTable() {
        const sql = `
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            winner TEXT NOT NULL,
            loser TEXT NOT NULL,
            turns INTEGER NOT NULL,
            play_date TEXT NOT NULL
            )`
        return this.dao.run(sql);
    }

    create(game) {
        return this.dao.run(
            `INSERT INTO games (winner, loser, turns, play_date) VALUES (?, ?, ?, ?)`,
            [game.winner, game.loser, game.turns, game.play_date]);
    }

    update(game) {
        return this.dao.run(
            `UPDATE games
             SET winner = ?,
                 loser = ?,
                 turns = ?,
                 play_date = ?
             WHERE id = ?`,
            [game.winner, game.loser, game.turns, game.play_date]);
    }

    delete(id) {
        return this.dao.run(
            `DELETE FROM games WHERE id = ?`,
            [id]);
    }

    getById(id) {
        return this.dao.get(
            `SELECT * FROM games WHERE id = ?`,
            [id]);
    }

    getAll() {
        return this.dao.all(`SELECT * FROM games`);
    }
}

module.exports = UserRepository;
