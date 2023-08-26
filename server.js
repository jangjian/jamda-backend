const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const userRoutes = require('./routes/user_routes');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/'); // 이미지를 저장할 디렉토리 설정
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // 파일 이름 설정
  }
});

const upload = multer({ storage: storage });

// 회원가입 라우트 사용
app.use('/users', userRoutes);

// 이미지 업로드 라우트 추가
app.post('/upload', upload.single('image'), (req, res) => {
  // 이미지 업로드 처리 로직
  console.log('Image uploaded:', req.file); // 업로드된 이미지 정보 확인
  res.send('Image uploaded successfully');
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
