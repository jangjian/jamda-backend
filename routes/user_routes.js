const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller'); // 사용자 컨트롤러 가져오기

// 회원가입 라우팅
router.post('/signup', userController.signup);

// 아이디 중복 확인 라우트
router.post('/check-duplicate', userController.checkDuplicate);

// 로그인 라우팅 (추가)
router.post('/login', userController.login);

 // 프로필 설정
router.post("/setProfile", userController.setProfile);

module.exports = router;
