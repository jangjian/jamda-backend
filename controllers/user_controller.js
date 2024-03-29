const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const randomstring = require('randomstring')
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1011',
  database: 'jamda_backend'
});


cron.schedule('0 0 * * *', () => {

  const resetSql = 'UPDATE rules SET count = 0, today_count = count_min, complete_count = 0'; // 변경해야 할 SQL 쿼리 작성
  connection.query(resetSql, (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
  });
});


// 회원가입 컨트롤러
exports.signup = (req, res) => {
  const { userid, pw, email } = req.body;
  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); 
  const day = currentDate.getDate().toString().padStart(2, '0');
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds = currentDate.getSeconds().toString().padStart(2, '0');

  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  const sql = 'INSERT INTO users (userid, pw, email, registration_date) VALUES (?, ?, ?, ?)';
  connection.query(sql, [userid, pw, email, formattedDate], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }
    const sql = 'INSERT INTO message (userid, message, uuid) VALUES (?, ?, ?)';


    const uuid = randomstring.generate(40); 

    connection.query(sql, [userid, "최애의 메시지를 입력해보세요!", uuid], (err, result) => {
      if (err) {
        console.error(err);
      }
    });  
    
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
  const token = randomstring.generate(40);
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
      hasProfile: result[0].hasProfile, 
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
  // const image = `/images/${req.file.filename}`;

  const sql = 'UPDATE users SET name = ?, bias = ?, image = null, weight = ?, goal_weight = ?, previousWeight = ?, hasProfile = 1 WHERE accesstoken = ?';
  connection.query(sql, [name, bias, weight, goal_weight, weight, accesstoken], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: '프로필 업데이트 중 오류가 발생했습니다.' });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(401).json({ error: '잘못된 자격 증명' });
      return;
    }
    console.log('프로필 설정이 되었습니다.');
    res.status(200).json({ message: '프로필이 성공적으로 설정되었습니다.' });
  });
};

// 프로필 수정 컨트롤러
exports.updateProfile = (req, res) => {
  const { accesstoken } = req.user;
  const { name, bias, weight, goal_weight } = req.body;
  const image = req.files && req.files.image;
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

// 사용자의 정보를 가져오는 컨트롤러
exports.getUserInfo = (req, res) => {
  const { accesstoken } = req.user;
  const getUserInfoSql = 'SELECT name, bias, weight, goal_weight, previousWeight, registration_date FROM users WHERE accesstoken = ?';
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
    const userName = result[0].name;
    const userBias = result[0].bias;
    const userWeight = result[0].weight;
    const userGoalWeight = result[0].goal_weight;
    const previousWeight = result[0].previousWeight;
    const registration_date = result[0].registration_date;
    
    res.status(200).json({
      name: userName,
      bias: userBias,
      weight: userWeight,
      goal_weight: userGoalWeight,
      previousWeight: previousWeight,
      registration_date: registration_date
    });
  });
};

// 규칙을 불러오는 컨트롤러
exports.getRules = (req, res) => {
  const { userid } = req.user;

  const getRuleInfoSql = 'SELECT activity, exercise, activity_num, count_min, count_max, unit, count, uuid FROM rules WHERE userid = ?';
  connection.query(getRuleInfoSql, [userid], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error fetching user information' });
      return;
    }
    if (result.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    const likeDo = result.map(row => row.activity);
    const exerciseTitle = result.map(row => row.exercise);
    const exerciseRule = result.map(row => row.activity_num);
    const exerciseUnit = result.map(row => row.unit);
    const count_min = result.map(row => row.count_min);
    const count_max = result.map(row => row.count_max);
    const baseExerCount = result.map(row => row.count);
    const uuid = result.map(row => row.uuid);

    res.status(200).json({
      activity: likeDo,
      exercise: exerciseTitle,
      activityNum: exerciseRule,
      unit: exerciseUnit,
      count_min: count_min,
      count_max: count_max,
      count: baseExerCount,
      uuid : uuid
    });
  });
};

// "uuid" 값을 사용하여 모든 규칙을 불러오는 컨트롤러
exports.getAllRulesByUuid = (req, res) => {
  const { uuid } = req.body; 

  const getRulesByUuidSql = 'SELECT activity, exercise, activity_num, unit, count_min, count_max,count, uuid FROM rules WHERE uuid = ?';
  connection.query(getRulesByUuidSql, [uuid], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: '규칙 불러오기 중 오류가 발생했습니다.' });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: '해당 UUID에 연관된 규칙을 찾을 수 없습니다.' });
      return;
    }
    const activity = result.map(row => row.activity);
    const exercise = result.map(row => row.exercise);
    const activity_num = result.map(row => row.activity_num);
    const unit = result.map(row => row.unit);
    const count_min = result.map(row => row.count_min);
    const count_max = result.map(row => row.count_max);
    const count = result.map(row => row.count);
    const uuid = result.map(row => row.uuid);

    res.status(200).json({
      activity: activity,
      exercise: exercise,
      activityNum: activity_num,
      unit: unit,
      count_min: count_min,
      count_max: count_max,
      count: count,
      uuid: uuid
    });
  });
};

// 규칙 컨트롤러
exports.rules = (req, res) => {
  const { userid, activity, exercise, activity_num, unit, count_min, count_max } = req.body;
  const uuid = randomstring.generate(40);
  const sql = 'INSERT INTO rules (uuid, userid, activity, exercise, activity_num, unit, count_min, count_max, count, today_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  
  connection.query(sql, [uuid, userid, activity, exercise, activity_num, unit, count_min, count_max, 0, count_min], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Error adding rule' });
      }
      
      
      return res.status(200).json({ message: '규칙 추가 완료' });
  });
};

// 규칙 삭제 컨트롤러
exports.deleteRule = (req, res) => {
  const { uuid } = req.body;

  const deleteRuleSql = 'DELETE FROM rules WHERE uuid = ?';
  connection.query(deleteRuleSql, [uuid], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error deleting rule' });
      return;
    }
    
    if (result.affectedRows === 0) {
      res.status(404).json({ error: '해당 UUID에 대한 규칙을 찾을 수 없습니다.' });
      return;
    }
    
    res.status(200).json({ message: '규칙이 성공적으로 삭제되었습니다.' });
  });
};

// 규칙 수정 컨트롤러
exports.updateRules = (req, res) => {
  const { uuid } = req.body;
  const { activity, exercise, activity_num, unit, count_min, count_max } = req.body;

  const updateProfileSql = 'UPDATE rules SET activity = ?, exercise = ?, activity_num = ?, unit = ?, count_min = ?, count_max = ? WHERE uuid = ?';
  connection.query(
    updateProfileSql,
    [activity, exercise, activity_num, unit, count_min, count_max, uuid],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error during rule update' });
        return;
      }
      if (result.affectedRows === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      console.log('규칙이 변경되었습니다.');
      res.status(200).json({ message: '규칙이 변경되었습니다.' });
    }
  );
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
    res.status(200).json({ message: '증가' });
  })
}

// 운동량 감소 컨트롤러
exports.decreaseCount = (req, res)=> {
  const {uuid} = req.body;
  const sql = 'UPDATE rules SET count = count-1 WHERE uuid = ?;';
  connection.query(sql, [uuid], (err, result)=>{
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }
    res.status(200).json({ message: '증가' });
  })
}

// 오늘의 목표 카운트 값 불러오기
exports.getTodayCount = (req, res) => {
  const { userid } = req.body;

  const getUserRulesSql = 'SELECT today_count FROM rules WHERE userid = ?';
  connection.query(getUserRulesSql, [userid], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: '사용자 규칙 불러오기 중 오류가 발생했습니다.' });
      return;
    }
    const today_count = result.map(row => row.today_count);
    
    // 결과를 JSON 형식으로 응답합니다.
    res.status(200).json({
      today_count: today_count,
      
    });
  });
};

// 오늘의 목표 카운트 값 저장 컨트롤러 
exports.updateCounts = (req, res) => {
  const updates = req.body.updates; 

  const sql = 'UPDATE rules SET today_count = ? WHERE uuid = ?';

  for (const update of updates) {
    const { today_count, uuid } = update;

    if (Array.isArray(today_count)) {
      for (let i = 0; i < today_count.length; i++) {
        const goalDate = today_count[i];
        connection.query(sql, [goalDate, uuid[i]], (err, result) => {
          if (err) {
            console.error(err);
          }
        });
      }
    }
  }

  res.status(200).json({ message: 'Updates completed successfully' });
};

// 캘린더 컨트롤러
exports.calendar = (req, res) => {
  const { userid } = req.body;
  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // 월은 0부터 시작하므로 +1 필요
  const day = currentDate.getDate().toString().padStart(2, '0');
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds = currentDate.getSeconds().toString().padStart(2, '0');

  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  const sql = 'INSERT INTO calendar_date (userid, completedate) VALUES (?, ?)';
  connection.query(sql, [userid, formattedDate], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }
    res.status(200).json({ message: 'User registered successfully' });
  });
};

// 색깔 추가 컨트롤러
exports.calendarColor = (req, res)=> {
  const { userid, color } = req.body;

  const checkColorSql = 'SELECT COUNT(*) AS count FROM calendar WHERE userid = ?';
  connection.query(checkColorSql, [userid], (checkErr, checkResult) => {
    if (checkErr) {
      console.error(checkErr);
      return res.status(500).json({ error: '컬러 확인 중 오류가 발생했습니다.' });
    }
    if (checkResult[0].count === 0) {

      const insertColorSql = 'INSERT INTO calendar (userid, color) VALUES (?, ?)';
      connection.query(insertColorSql, [userid, color], (insertErr, insertResult) => {
        if (insertErr) {
          console.error(insertErr);
          return res.status(500).json({ error: '컬러 추가 중 오류가 발생했습니다.' });
        }
        console.log('새로운 컬러 추가');
        res.status(200).json({ message: '새로운 컬러가 추가되었습니다.' });
      });
    } else {
      // 이미 해당 사용자에 대한 컬러 값이 있는 경우, 컬러 값을 업데이트
      const updateColorSql = 'UPDATE calendar SET color = ? WHERE userid = ?';
      connection.query(updateColorSql, [color, userid], (updateErr, updateResult) => {
        if (updateErr) {
          console.error(updateErr);
          return res.status(500).json({ error: '컬러 업데이트 중 오류가 발생했습니다.' });
        }
        console.log('컬러 업데이트');
        res.status(200).json({ message: '컬러가 업데이트되었습니다.' });
      });
    }
  });
};

// 캘린더 컨트롤러 (스탬프) - color 값을 가져오는 컨트롤러
exports.getCalendarColor = (req, res)=> {
  const { userid } = req.user;
  const sql = 'SELECT color FROM calendar WHERE userid = ?';
  connection.query(sql, [userid], (err, result)=>{
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error fetching calendar color' });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: 'Calendar color not found for the user' });
      return;
    }
    const color = result[0].color;
    res.status(200).json({ color: color });
  });
};

// 날짜 불러오는 컨트롤러
exports.getCompleteDate = (req, res) => {
  const { userid } = req.user;

  const getCompleteDateSql = 'SELECT completedate FROM calendar_date WHERE userid = ?';
  connection.query(getCompleteDateSql, [userid], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error fetching completedate' });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: 'Completedate not found for the user' });
      return;
    }
    const completedate = result.map(row => row.completedate);


    // 결과를 JSON 형식으로 응답합니다.
    res.status(200).json({ completedate: completedate });
  
  });
};

// 로그아웃 컨트롤러
exports.logout = (req, res) => {
  const { userid } = req.body;
  
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
    // 사용자 캘린더 데이터 삭제
    const deleteCalendar_dateSql = 'DELETE FROM calendar_date WHERE userid = ?';
    connection.query(deleteCalendar_dateSql, [userid], (err, result) => {
      if (err) {
        console.error(err);
      } else {
        console.log('User calendar data deleted successfully');
      }
    });
    // 사용자 메시지 데이터 삭제
    const message_dateSql = 'DELETE FROM message WHERE userid = ?';
    connection.query(message_dateSql, [userid], (err, result) => {
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
  const { accesstoken, userid } = req.user;
  const { id } = req.body;

  const updateUserIdSql = 'UPDATE users SET userid = ? WHERE accesstoken = ?';
  connection.query(updateUserIdSql, [id, accesstoken], (err, updateResult) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error updating user ID' });
      return;
    }
    const updateRuleUserIdSql = 'UPDATE rules SET userid = ? WHERE userid = ?';
    connection.query(updateRuleUserIdSql, [id, userid], (err, result) => {
      if (err) {
        console.error(err);
      } else {
      }
    });
    const updateCalendarUserIdSql = 'UPDATE calendar SET userid = ? WHERE userid = ?';
    connection.query(updateCalendarUserIdSql, [id, userid], (err, result) => {
      if (err) {
        console.error(err);
      } else {
      }
    });
    const updateCalendarDateUserIdSql = 'UPDATE calendar_date SET userid = ? WHERE userid = ?';
    connection.query(updateCalendarDateUserIdSql, [id, userid], (err, result) => {
      if (err) {
        console.error(err);
      } else {
      }
    });
    res.status(200).json({ message: '사용자 ID가 성공적으로 변경되었습니다.' });
  });
};

// 비밀번호 변경 컨트롤러
exports.changePassword = (req, res) => {
  const { accesstoken } = req.user;
  const {currentPassword, newPassword} = req.body;

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

// 비밀번호 찾기  변경 컨트롤러
exports.loginChangePassword = (req, res) => {
  const { userid } = req.body; 
  const { newPassword } = req.body; 

  // 비밀번호를 새로운 비밀번호로 업데이트
  const updatePasswordSql = 'UPDATE users SET pw = ? WHERE userid = ?';
  connection.query(updatePasswordSql, [newPassword, userid], (updateErr, updateResult) => {
    if (updateErr) {
      console.error(updateErr);
      return res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
    }
    console.log('비밀번호가 성공적으로 변경되었습니다.');
    res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  });
};


// 아이디 찾기 컨트롤러
exports.findUserId = (req, res) => {
  const { email } = req.body;
  // 이메일을 사용하여 사용자 아이디를 검색
  const findUserIdSql = 'SELECT userid FROM users WHERE email = ?';
  connection.query(findUserIdSql, [email], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error finding user ID' });
      return;
    }
    // 결과에서 매치되는 레코드를 찾지 못하면 해당 이메일로 가입된 사용자가 없음
    if (result.length === 0) {
      res.status(404).json({ error: '해당 이메일로 가입된 사용자가 없습니다.' });
      return;
    }
    // 사용자 아이디를 클라이언트에게 응답
    const userId = result[0].userid;
    res.status(200).json({ userId: userId });
  });
};

// 비밀번호 찾기 컨트롤러
exports.findPassword = (req, res) => {
  const { userid, email } = req.body;
  // 입력된 아이디와 이메일로 사용자를 검색
  const findUserSql = 'SELECT * FROM users WHERE userid = ? AND email = ?';
  connection.query(findUserSql, [userid, email], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error finding user' });
      return;
    }
    // 결과에서 매치되는 레코드를 찾지 못하면 해당 아이디 또는 이메일로 가입된 사용자가 없음
    if (result.length === 0) {
      res.status(404).json({ error: '해당 아이디 또는 이메일로 가입된 사용자가 없습니다.' });
      return;
    }
      res.status(200).json();
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

// 응원 메시지 저장 컨트롤러 
exports.message = (req, res) => {
  const updates = req.body.updates; 

  const sql = 'INSERT INTO message (userid, message, uuid) VALUES (?, ?, ?)';

  for (const update of updates) {
    const { userid, message } = update;
    const uuid = randomstring.generate(40); 
    // today_count가 배열일 경우 각각의 값을 처리
    if (Array.isArray(message)) {
      for (let i = 0; i < message.length; i++) {
        const message1 = message[i];
        connection.query(sql, [userid, message1, uuid], (err, result) => {
          if (err) {
            console.error(err);
          }
        });
      }
    }
  }

  res.status(200).json({ message: 'Updates completed successfully' });
};

// 응원 메시지 불러오는 컨트롤러
exports.getMessage = (req, res) => {
  const { userid } = req.body;

  const getCompleteDateSql = 'SELECT message, uuid FROM message WHERE userid = ?';
  connection.query(getCompleteDateSql, [userid], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error getting completedate' });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: 'complete_count not found for the rules' });
      return;
    }
    const message = result.map(row => row.message);
    const uuid = result.map(row => row.uuid);
    const first_message = result.map(row => row.first_message);

    res.status(200).json({ message : message, uuid : uuid, first_message : first_message });
  });
};

// 메시지 수정 컨트롤러
exports.changeMessage = (req, res) => {
  const updates = req.body.updates; 

  const sql = 'UPDATE message SET message = ? WHERE uuid = ?';

  for (const update of updates) {
    const { message, uuid } = update;
    if (Array.isArray(message)) {
      for (let i = 0; i < message.length; i++) {
        const message1 = message[i];
        connection.query(sql, [message1, uuid], (err, result) => {
          if (err) {
            console.error(err);
          }
        });
      }
    }
  }

  res.status(200).json({ message: 'Updates completed successfully' });
};

// 메시지 삭제 컨트롤러
exports.deleteMessage = (req, res) => {
  const { uuid } = req.body;

  const updateProfileSql = 'DELETE FROM message WHERE uuid = ?';
  connection.query(
    updateProfileSql,[uuid],(err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error during message delete' });
        return;
      }
      if (result.affectedRows === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      res.status(200).json({ message: '메시지가 삭제되었습니다.' });
    }
  );
};

// 현재 운동량 누적 컨트롤러
exports.postCompleteCount = (req, res)=> {
  const {uuid, complete_count} = req.body;
  const sql = 'UPDATE rules SET complete_count = ? WHERE uuid = ?;';
  connection.query(sql, [complete_count, uuid], (err, result)=>{
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }
    res.status(200).json({ message: '증가' });
  })
}

// 현재 운동량 불러오는 컨트롤러
exports.getNowCount = (req, res) => {
  const { userid } = req.body;

  const getCompleteDateSql = 'SELECT complete_count FROM rules WHERE userid = ?';
  connection.query(getCompleteDateSql, [userid], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error getting completedate' });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: 'complete_count not found for the rules' });
      return;
    }
    const complete_count = result.map(row => row.complete_count);

    res.status(200).json({ complete_count: complete_count });
  });
}
