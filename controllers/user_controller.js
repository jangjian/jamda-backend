const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1011',
  database: 'jamda_backend'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL Database');
});

// 회원가입 컨트롤러
exports.signup = (req, res) => {
  const { userid, pw, tel } = req.body;

  const sql = 'INSERT INTO users (userid, pw, tel) VALUES (?, ?, ?)';
  connection.query(sql, [userid, pw, tel], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }

    console.log('User registered successfully');
    res.status(200).json({ message: 'User registered successfully' });
  });
};

// 아이디 중복 확인 컨트롤러
exports.checkDuplicate = (req, res) => {
  const { userid } = req.body;

  const checkDuplicateSql = 'SELECT COUNT(*) AS count FROM users WHERE userid = ?';
  connection.query(checkDuplicateSql, [userid], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error checking duplicate user' });
      return;
    }

    res.status(200).json({ isDuplicate: result[0].count > 0 });
  });
};

// 로그인 컨트롤러 (추가)
exports.login = (req, res) => {
  const { userid, pw } = req.body;

  const sql = 'SELECT * FROM users WHERE userid = ? AND pw = ?';
  connection.query(sql, [userid, pw], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error during login' });
      return;
    }

    if (result.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    console.log('Login successful');
    res.status(200).json({ message: 'Login successful' });
  });
};

// 프로필 설정 엔드포인트 추가
exports.setProfile = (req, res) => {
  const { userid, name, bias } = req.body;

  // 여기서 userid에 해당하는 고객을 찾아서 name과 bias를 업데이트하는 로직을 수행해야 합니다.
  updateProfile(userid, name, bias, (err, updatedProfile) => {
    if (err) {
      res.status(500).send({
        message: err.message || "Error updating profile."
      });
      return;
    }

    res.status(200).send({
      message: "Profile updated successfully.",
      profile: updatedProfile
    });
  });
};

// 프로필 업데이트 로직
function updateProfile(userid, name, bias, callback) {
  const updateProfileSql = 'UPDATE users SET name = ?, bias = ? WHERE userid = ?';
  connection.query(updateProfileSql, [name, bias, userid], (err, result) => {
    if (err) {
      console.error(err);
      return callback(err, null);
    }

    // 업데이트된 프로필 정보를 가져옴
    const updatedProfile = {
      userid: userid,
      name: name,
      bias: bias
    };

    callback(null, updatedProfile);
  });
}