const express = require('express');
const { Client } = require('pg');
const sqlite3 = require('sqlite3');
const YAML = require('js-yaml');
const fs = require('fs');

const THREE_MINUTES = 6000
const app = express();
const port = 3000;

// Load configuration from YAML
const config = YAML.load(fs.readFileSync('config.yaml', 'utf8'));

// SQLite connection & init
const sqliteClient = new sqlite3.Database('results.db');
const sqliteInit = `
  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_name TEXT,
    result TEXT
  );
`;

sqliteClient.exec(sqliteInit, (err) => {
    if (err) {
        console.error('Error initializing SQLite database:', err.message);
    } else {
        console.log('SQLite database initialized successfully.');
    }
});

// PostgreSQL connection
const postgresClient = new Client({
    connectionString: config.postgresConnectionString,
});
postgresClient.connect();

async function executeQueries() {
    for (const query of config.queries) {
        try {
            const result = await postgresClient.query(query.sql);
            // Store result in SQLite
            const insertStatement = `INSERT INTO results (query_name, result) VALUES (?, ?)`;
            sqliteClient.run(insertStatement, [query.name, JSON.stringify(result.rows)]);
            console.log(`Query '${query.name}' executed successfully. Result:`, result.rows);
        } catch (error) {
            console.error(`Error executing query '${query.name}':`, error.message);
        }
    }
}

setInterval(executeQueries, THREE_MINUTES);

app.get('/getdata', (req, res) => {
    sqliteClient.all('SELECT * FROM results', (err, rows) => {
        if (err) {
            console.error('Error retrieving results from SQLite:', err.message);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(rows);
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
