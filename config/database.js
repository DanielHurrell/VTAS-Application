const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vtas'
});

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }

    console.log('Connected to VTAS database!');
});

connection.query('SHOW TABLES', (err, results) => {
    if (err) {
        console.error('Error retrieving tables:', err);
        return;
    }

    console.log('Database tables:', results);
});

module.exports = connection;