const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const userRoutes = require('./routes/user_routes'); // 사용자 라우트 가져오기

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// 회원가입 라우트 사용
app.use('/users', userRoutes); // '/users' 경로에 대해 userRoutes를 사용

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
