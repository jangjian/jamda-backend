const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const randomstring = require('randomstring')
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const connection = mysql.createConnection({
  host: '43.201.10.121',
  user: 'jamda',
  password: '1011',
  database: 'jamda_db'
});

// 회원가입 컨트롤러
exports.signup = (req, res) => {
  const { userid, pw, email } = req.body; // 인증코드(authCode) 추가
  
  const sql = 'INSERT INTO users (userid, pw, email) VALUES (?, ?, ?)';
  connection.query(sql, [userid, pw, email], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }
    console.log('User registered successfully');
    res.status(200).json({ message: 'User registered successfully' });
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
  const { accesstoken } = req.body; // 클라이언트에서 전달한 토큰
  const { name, bias, weight, goal_weight } = req.body; // 클라이언트에서 전달한 프로필 정보
  const image = req.files && req.files.image; // 이미지 파일

  const sql = 'UPDATE users SET name = ?, bias = ?, image = ?, weight = ?, goal_weight = ? WHERE accesstoken = ?';
  connection.query(sql, [name, bias, image, weight, goal_weight, accesstoken], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error during login' });
      return;
    }
    if (result.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    console.log('프로필 설정이 되었습니다.');
    res.status(200).json({ message: 'profile set successfully'  });
  });
};

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
  const { accesstoken } = req.user;

  // 사용자 정보 삭제
  const deleteSql = 'DELETE FROM users WHERE accesstoken = ?';
  connection.query(deleteSql, [accesstoken], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error during account deletion' });
      return;
    }

    // 사용자 규칙 정보 삭제
    const deleteRulesSql = 'DELETE FROM rules WHERE accesstoken = ?';
    connection.query(deleteRulesSql, [accesstoken], (err, result) => {
      if (err) {
        console.error(err);
      } else {
        console.log('User rules deleted successfully');
      }
    });

    // 사용자 캘린더 데이터 삭제
    const deleteCalendarSql = 'DELETE FROM calendar WHERE accesstoken = ?';
    connection.query(deleteCalendarSql, [accesstoken], (err, result) => {
      if (err) {
        console.error(err);
      } else {
        console.log('User calendar data deleted successfully');
      }
    });

    // 프로필 정보 삭제 및 이미지 삭제
    const deleteProfileAndImageSql = 'DELETE FROM users WHERE accesstoken = ?';
    connection.query(deleteProfileAndImageSql, [accesstoken], (err, result) => {
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

// 이메일 인증 코드 요청 컨트롤러
exports.certificate = async (req, res) => {
  const { email } = req.body;

  // 기존에 해당 이메일로 생성된 인증 코드가 있다면 삭제
  const deleteAuthCodeSql = 'DELETE FROM verification_codes WHERE email = ?';
  connection.query(deleteAuthCodeSql, [email], async (deleteErr, deleteResult) => {
    if (deleteErr) {
      console.error(deleteErr);
      return res.status(500).json({ error: '기존 인증 코드를 삭제하는 중 오류가 발생하였습니다.' });
    }

    // 새로운 랜덤한 4자리 숫자 생성
    const verificationCode = Math.floor(1000 + Math.random() * 9000);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "jamda831@gmail.com",
        pass: "nhvluiqogrktkieu",
      },
    });

    const mailOptions = {
      to: email,
      subject: "이메일 인증",
      html: `    <div style="margin: 5%; margin-bottom: 6px;"><p style="width: 50%; color:#FF6666; font-weight: bolder; font-size: 50px; margin-bottom: 0">JAMDA</p></div>
      <div style="height: 2px; width: 90%; margin-left: 5%; background-color: #FF8585;"></div>
      <h2 style="margin-left: 5%; margin-top: 30px; margin-bottom: 30px;">고객님의 인증번호는 다음과 같습니다.</h2>
      <div style=" height: 230px; width: 90%; margin-left: 5%; border: 2px solid #C1C1C1">
          <p style="color: #6B6B6B; text-align: center;">아래 인증번호 4자리를 인증번호 입력창에 입력해주세요</p>
          <div style="text-align: center; font-size: 80px; vertical-align: middle; letter-spacing: 10px;">${verificationCode}</div>
      </div>
      <p style="margin-left: 5%; margin-top: 20px;">
          인증번호를 요청하지 않았다면 이 메일을 무시하셔도 됩니다.<br>
          누군가 귀하의 이메일 주소를 잘못 입력한 것을 수도 있습니다.<br>
          <br>
          감사합니다.
      </p>`,
    };

    const insertAuthCodeSql = 'INSERT INTO verification_codes (email, code) VALUES (?, ?)';
    connection.query(insertAuthCodeSql, [email, verificationCode], async (insertErr, insertResult) => {
      if (insertErr) {
        console.error(insertErr);
        return res.status(500).json({ error: '이메일을 발송하는 중 오류가 발생하였습니다.' });
      }

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(info);
        return res.status(200).json({ message: "이메일이 성공적으로 전송되었습니다." });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "이메일 전송 중에 오류가 발생했습니다." });
      }
    });
  });
};

// 인증번호 확인 함수
exports.checkAuthCode = (req, res) => {
  const { email, code } = req.body;
  
  // 사용자가 입력한 이메일과 인증번호를 검색하여 확인
  const checkAuthCodeSql = 'SELECT * FROM verification_codes WHERE email = ? AND code = ?';
  connection.query(checkAuthCodeSql, [email, code], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error checking auth code' });
      return;
    }

    // 결과에서 매치되는 레코드를 찾지 못하면 인증 실패
    if (result.length === 0) {
      res.status(201).json({ message: '인증번호가 일치하지 않습니다.' });
      console.log(result);
      return;
    }

    // 인증 성공
    return res.status(200).json({ message: '인증번호가 확인되었습니다.' });
  });
};