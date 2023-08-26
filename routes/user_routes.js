const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller'); // 사용자 컨트롤러 가져오기

// 회원가입 라우트
router.post('/signup', userController.signup);

// 아이디 중복 확인 라우트
router.post('/check-duplicate', userController.checkDuplicate);

// 로그인 라우트
router.post('/login', userController.login);

// 프로필 설정 라우트
router.post("/setProfile", userController.setProfile);

// 규칙 추가 라우트 
router.post("/rules", userController.rules);

// 카운트 증가 추가 라우트 
router.post("/increaseCount", userController.increaseCount);



module.exports = router;
