const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const randomstring = require('randomstring')
const cron = require('node-cron');
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
  connection.query(updateProfileSql, [name, bias, imageName, weight, height, goal_weight, userid], (err, result) => {
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
  const uuid = randomstring.generate(40);
  const sql = 'INSERT INTO rules (uuid, userid, activity, exercise, activity_num, unit, count_min, count_max) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  connection.query(sql, [uuid, userid, activity, exercise, activity_num, unit, count_min, count_max], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }

    console.log('규칙추가완료');

    // 매일 자정에 count 값을 초기화하는 스케줄링
    const resetCountCron = '0 0 * * *'; // 매일 자정에 실행
    cron.schedule(resetCountCron, () => {
      connection.query('UPDATE rules SET count = 0 WHERE uuid = ?', [uuid], (err, result) => {
        if (err) {
          console.error(err);
          return;
        }

        console.log('Count reset successful');
      });
    });

    res.status(200).json({ message: '규칙 추가 완료' });
  });
};

// 운동량 누적 컨트롤러
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

// 캘린더 컨트롤러 (스탬프)
exports.Calendar = (req, res)=> {
  const { userid } = req.body;
  const completedate = new Date();
  const color = req.body.color; // 클라이언트에서 전송한 컬러 값

  const sql = 'INSERT INTO calendar (userid, completedate, color) VALUES (?, ?, ?)';
  connection.query(sql, [userid, completedate, color], (err, result)=>{
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error adding date to calendar' });
      return;
    }

    console.log('Date added to calendar');
    res.status(200).json({ message: 'Date added to calendar' });
  });
};

// 로그아웃 컨트롤러
exports.logout = (req, res) => {
  const { userid } = req.body;

  // 토큰을 데이터베이스에서 삭제 또는 무효화하는 작업 수행
  // 여기서는 예시로 데이터베이스에서 해당 사용자의 토큰을 삭제하는 로직을 사용
  connection.query('UPDATE users SET accesstoken = NULL WHERE userid = ?', [userid], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error during logout' });
      return;
    }

    console.log('Logout successful');
    res.status(200).json({ message: 'Logout successful' });
  });
};

// 탈퇴 컨트롤러
exports.leave = (req, res) => {
  const { userid } = req.body;

  // 사용자 정보 삭제
  const deleteSql = 'DELETE FROM users WHERE userid = ?';
  connection.query(deleteSql, [userid], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error during account deletion' });
      return;
    }

    // 사용자 규칙 정보 삭제
    const deleteRulesSql = 'DELETE FROM rules WHERE userid = ?';
    connection.query(deleteRulesSql, [userid], (err, result) => {
      if (err) {
        console.error(err);
      } else {
        console.log('User rules deleted successfully');
      }
    });

    // 사용자 캘린더 데이터 삭제
    const deleteCalendarSql = 'DELETE FROM calendar WHERE userid = ?';
    connection.query(deleteCalendarSql, [userid], (err, result) => {
      if (err) {
        console.error(err);
      } else {
        console.log('User calendar data deleted successfully');
      }
    });

    // 프로필 정보 삭제 및 이미지 삭제
    const deleteProfileAndImageSql = 'DELETE FROM users WHERE userid = ?';
    connection.query(deleteProfileAndImageSql, [userid], (err, result) => {
      if (err) {
        console.error(err);
        return callback(err, null);
      }

      console.log('Profile and image deleted successfully');

      // 이미지 파일을 파일 시스템에서 삭제
      if (result.length > 0 && result[0].image) {
        const imagePath = path.join(__dirname, '..', 'public', result[0].image);
        fs.unlink(imagePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting image:', unlinkErr);
          } else {
            console.log('Image file deleted successfully');
          }
        });
      }
    });

    console.log('Account deleted successfully');
    res.status(200).json({ message: 'Account deleted successfully' });
  });
};

