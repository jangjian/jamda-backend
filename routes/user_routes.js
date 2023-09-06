const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller'); // 사용자 컨트롤러 가져오기
const { getUser } = require('../modules/gerUser');

// 회원가입 라우트
router.post('/signup', userController.signup);

// 아이디 중복 확인 라우트
router.post('/check-duplicate', userController.checkDuplicate);

// 로그인 라우트
router.post('/login', userController.login);

// 로그아웃 라우트 (DELETE)
router.delete('/logout', userController.logout);

// 탈퇴 라우트 (DELETE)
router.delete('/leave', getUser,userController.leave);

// 프로필 설정 라우트
router.post("/setProfile", userController.setProfile);

// 규칙 추가 라우트 
router.post("/rules", userController.rules);

// 카운트 증가 추가 라우트 
router.post("/increaseCount", userController.increaseCount);

// 색깔 변경 라우트 
router.post("/updateColor", userController.Calendar);

// 인증번호 라우트 
router.post("/certificate", userController.certificate);

// 인증번호 확인 라우트
router.post("/check-auth-code", userController.checkAuthCode);


// router.get('/GetSearchList/:text', getUser, GetSearchList);



module.exports = router;
