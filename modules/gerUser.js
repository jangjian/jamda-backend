const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: '43.201.10.121',
    user: 'jamda',
    password: '1011',
    database: 'jamda_db'
});

const getUser = (req, res, next) => {
    const accessToken = req.headers.authorization; // 클라이언트에서 헤더에 넣은 토큰

    if (!accessToken) {
        return res.status(401).json({ message: 'Access token not provided' });
    }

    const sql = 'SELECT * FROM users WHERE accesstoken = ?';
    connection.query(sql, [accessToken], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error retrieving user' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 사용자 정보를 요청 객체에 추가
        req.user = results[0];
        next();
    });
};

module.exports = getUser;
