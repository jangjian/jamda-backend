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
  const { userid, pw, email } = req.body;

  // 현재 날짜를 가져옵니다.
  const currentDate = new Date();

  const sql = 'INSERT INTO users (userid, pw, email, registration_date) VALUES (?, ?, ?, ?)';
  connection.query(sql, [userid, pw, email, currentDate], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }
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


exports.login = (req, res) => {
  const { userid, pw } = req.body;
  const token = randomstring.generate(40); // 새로운 토큰 생성

  const sql = 'SELECT * FROM users WHERE userid = ? AND pw = ?';
  connection.query(sql, [userid, pw], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
      return;
    }
    if (result.length === 0) {
      res.status(401).json({ error: '잘못된 자격 증명' });
      return;
    }

    const userData = {
      userid: result[0].userid,
      token: token,
      hasProfile: result[0].hasProfile, // hasProfile 값을 반환
    };

    // 사용자 정보에 토큰 업데이트
    connection.query('UPDATE users SET accesstoken = ? WHERE userid = ?', [token, userid], (updateErr, updateResult) => {
      if (updateErr) {
        console.error(updateErr);
        res.status(500).json({ error: '토큰 업데이트 중 오류가 발생했습니다.' });
        return;
      }

      res.status(200).json(userData);
    });
  });
};



// 프로필 설정 컨트롤러
exports.setProfile = (req, res) => {
  const { accesstoken } = req.user;
  const { name, bias, weight, goal_weight } = req.body;
  const image = req.files && req.files.image;

  // 이미지 파일 업로드 및 경로 얻기 (사용하는 라이브러리에 따라 다를 수 있음)
  let imagePath = null;
  if (image) {
    const imageName = `profile_${accesstoken}_${Date.now()}.jpg`;
    imagePath = `/path/to/upload/folder/${imageName}`;
    image.mv(imagePath, (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error uploading image' });
        return;
      }
    });
  }

  // SQL 쿼리 수정: 이미지 파일 경로를 포함하여 업데이트
  const sql = 'UPDATE users SET name = ?, bias = ?, image = ?, weight = ?, goal_weight = ?, hasProfile = 1 WHERE accesstoken = ?';
  connection.query(sql, [name, bias, imagePath, weight, goal_weight, accesstoken], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error during profile update' });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    console.log('프로필 설정이 되었습니다.');

    // 프로필 설정이 완료되면 hasProfile 값을 업데이트합니다.
    // hasProfile은 1로 설정됩니다.
    res.status(200).json({ message: 'Profile set successfully' });
  });
};


// 프로필 수정 컨트롤러
exports.updateProfile = (req, res) => {
  const { accesstoken } = req.user;
  const { name, bias, weight, goal_weight } = req.body;
  const image = req.files && req.files.image;

  // 이미지 파일 업로드 및 경로 얻기 (사용하는 라이브러리에 따라 다를 수 있음)
  let imagePath = null;
  if (image) {
    const imageName = `profile_${accesstoken}_${Date.now()}.jpg`;
    imagePath = `/path/to/upload/folder/${imageName}`;
    image.mv(imagePath, (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error uploading image' });
        return;
      }
    });
  }

  // SQL 쿼리 수정: 이미지 파일 경로를 포함하여 업데이트
  const updateProfileSql = 'UPDATE users SET name = ?, bias = ?, image = ?, weight = ?, goal_weight = ? WHERE accesstoken = ?';
  connection.query(
    updateProfileSql,
    [name, bias, imagePath, weight, goal_weight, accesstoken],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error during profile update' });
        return;
      }
      if (result.affectedRows === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      console.log('프로필이 성공적으로 업데이트되었습니다.');
      res.status(200).json({ message: '프로필이 성공적으로 업데이트되었습니다.' });
    }
  );
};


exports.getUserInfo = (req, res) => {
  const { accesstoken } = req.user;

  // 사용자 정보를 가져옵니다.
  const getUserInfoSql = 'SELECT name, bias, weight, goal_weight, registration_date FROM users WHERE accesstoken = ?';
  connection.query(getUserInfoSql, [accesstoken], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error fetching user information' });
      return;
    }

    if (result.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // 사용자의 가입 날짜를 가져옵니다.
    const registrationDate = result[0].registration_date;

    // 현재 날짜를 가져옵니다.
    const currentDate = new Date();

    // 날짜 차이를 계산합니다.
    const timeDifference = currentDate - registrationDate;

    // 밀리초를 일로 변환합니다 (1일 = 24시간 * 60분 * 60초 * 1000밀리초)
    const daysDifference = Math.floor(timeDifference / (24 * 60 * 60 * 1000)) + 1;

    // 사용자 정보 및 일 단위로 표시된 날짜 차이를 클라이언트에 반환합니다.
    const userName = result[0].name;
    const userBias = result[0].bias;
    const userWeight = result[0].weight;
    const userGoalWeight = result[0].goal_weight;
    
    res.status(200).json({
      name: userName,
      bias: userBias,
      weight: userWeight,
      goal_weight: userGoalWeight,
      daysSinceRegistration: daysDifference
    });
  });
};



// 규칙 컨트롤러
exports.rules = (req, res) => {
  const { userid, activity, exercise, activity_num, unit, count_min, count_max } = req.body;
  const uuid = randomstring.generate(40);
  const sql = 'INSERT INTO rules (uuid, userid, activity, exercise, activity_num, unit, count_min, count_max, count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  
  connection.query(sql, [uuid, userid, activity, exercise, activity_num, unit, count_min, count_max, 0], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Error adding rule' });
      }

      console.log('규칙 추가 완료');

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

      return res.status(200).json({ message: '규칙 추가 완료' });
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
  const { userid } = req.body;

  // 사용자 정보 삭제
  const deleteSql = 'DELETE FROM users WHERE accesstoken = ?';
  connection.query(deleteSql, [accesstoken], (err, result) => {
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

// ID 변경 컨트롤러
exports.changeUserId = (req, res) => {
  const { accesstoken } = req.user;
  const { userid } = req.body;

  // 새로운 사용자 ID로 업데이트
  const updateUserIdSql = 'UPDATE users SET userid = ? WHERE accesstoken = ?';
  connection.query(updateUserIdSql, [userid, accesstoken], (err, updateResult) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error updating user ID' });
      return;
    }
    res.status(200).json({ message: '사용자 ID가 성공적으로 변경되었습니다.' });
  });
};

// 비밀번호 변경 컨트롤러
exports.changePassword = (req, res) => {
  const { accesstoken } = req.user;
  const {currentPassword, newPassword} = req.body;

  // 현재 비밀번호가 일치하는지 확인
  const checkCurrentPasswordSql = 'SELECT * FROM users WHERE accesstoken = ? AND pw = ?';
  connection.query(checkCurrentPasswordSql, [accesstoken, currentPassword], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
      return;
    }

    if (result.length === 0) {
      res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다.' });
      return;
    }

    // 비밀번호를 새로운 비밀번호로 업데이트
    const updatePasswordSql = 'UPDATE users SET pw = ? WHERE accesstoken = ?';
    connection.query(updatePasswordSql, [newPassword, accesstoken], (updateErr, updateResult) => {
      if (updateErr) {
        console.error(updateErr);
        res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
        return;
      }

      console.log('비밀번호가 성공적으로 변경되었습니다.');
      res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    });
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