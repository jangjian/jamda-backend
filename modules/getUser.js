const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1011',
    database: 'jamda_backend'
  });

const getUser = async (req, res, next) => {
  const sql = 'SELECT * FROM users WHERE accesstoken = ?';
  connection.query(sql, [req.headers.authorization], (err, result) => {
      if (err) {
          console.error(err);
          res.status(500).json({ error: 'Error registering user' });
          return;
      }
      if (result.length > 0) {
          req.user = result[0]; 
          next();
      } else {
          return res.status(404).json({ message: 'User Not Found!' });
      }
  });
};

exports.getUser = getUser;