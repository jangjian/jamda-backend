const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1011',
    database: 'jamda_backend'
});

const getUser = async (req, res, next) => {
    const sql = 'SELECT * FROM users WHERE accesstoken = (accesstoken) VALUES (?)';
    connection.query(sql, [req.headers.authorization], (err, result) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: 'Error registering user' });
          return;
        }
        console.log('User registered successfully');
        if (result) {
            req.user = result;
            next();
        } else {
            return res.status(404).json({ message: 'Users Not Found!' });
        }
    });
};
exports.getUser = getUser;