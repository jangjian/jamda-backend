const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const randomstring = require('randomstring')
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1011',
  database: 'jamda_backend'
});

// database 연결
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

// 로그인 컨트롤러
exports.login = (req, res) => {
  const { userid, pw } = req.body;
  var token = randomstring.generate(40);


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
    connection.query('UPDATE users SET accesstoken = ? WHERE userid = ?', [token, userid]);
    console.log('Login successful');
    res.status(200).json({ token });
  });
};

// 프로필 설정 엔드포인트 추가
exports.setProfile = (req, res) => {
  const { userid, name, bias, weight, height, goal_weight } = req.body;
  const image = req.files && req.files.image; // 이미지 파일

  // 이미지 업로드 및 프로필 업데이트 로직
  updateProfileWithImage(userid, name, bias, image, weight, height, goal_weight, (err, updatedProfile) => {
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

// 프로필 업데이트 및 이미지 업로드
function updateProfileWithImage(userid, name, bias, image, weight, height, goal_weight, callback) {
  if (image) {
    // 이미지 업로드 경로
    const uploadPath = path.join(__dirname, '..', 'public', image.name);

    // 이미지 파일을 업로드 경로로 저장
    image.mv(uploadPath, (err) => {
      if (err) {
        console.error(err);
        return callback(err, null);
      }

      // 이미지 업로드 후 프로필 정보 업데이트
      updateProfileAndImageInDB(userid, name, bias, image.name, weight, height, goal_weight, callback);
    });
  } else {
    // 이미지 없이 프로필 정보만 업데이트
    updateProfileAndImageInDB(userid, name, bias, null, weight, height, goal_weight, callback);
  }
}

// 데이터베이스 업데이트 로직
function updateProfileAndImageInDB(userid, name, bias, imageName, weight, height, goal_weight, callback) {
  const updateProfileSql = 'UPDATE users SET name = ?, bias = ?, image = ?, weight = ?, height = ?, goal_weight = ? WHERE userid = ?';
  connection.query(updateProfileSql, [name, bias, imageName, weight, height, userid], (err, result) => {
    if (err) {
      console.error(err);
      return callback(err, null);
    }

    // 업데이트된 프로필 정보를 가져옴
    const updatedProfile = {
      userid: userid,
      name: name,
      bias: bias,
      image: imageName, // 이미지 파일명
      weight : weight,
      height : height,
      goal_weight : goal_weight,
    };

    callback(null, updatedProfile);
  });
}

// 규칙 컨트롤러
exports.rules = (req, res) => {
  const { userid, activity, exercise, activity_num, unit, count_min, count_max } = req.body;
  const uuid = randomstring.generate(40)
  const sql = 'INSERT INTO rules (uuid, userid, activity, exercise, activity_num, unit, count_min, count_max) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  connection.query(sql, [uuid, userid, activity, exercise, activity_num, unit, count_min, count_max], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }

    console.log('규칙추가완료');
    res.status(200).json({ message: '규칙 추가 완료' });
  });
};

exports.increaseCount = (req, res)=> {
  const {uuid} = req.body;
  const sql = 'UPDATE rules SET count = count+1 WHERE uuid = ?;';
  connection.query(sql, [uuid], (err, result)=>{
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }

    console.log('증가');
    res.status(200).json({ message: '증가' });
  })
}

exports.Calendar = (req, res)=> {
  const {userid} = req.body;
  const completedate = new Date();
  const sql = 'INSERT INTO calendar (userid, completedate) VALUES (?, ?)';
  connection.query(sql, [userid, completedate], (err, result)=>{
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }

    console.log('증가');
    res.status(200).json({ message: '증가' });
  })
}