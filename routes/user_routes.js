const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller'); // 사용자 컨트롤러 가져오기
const { getUser } = require('../modules/getUser');

// 회원가입 라우트
router.post('/signup', userController.signup);

// 아이디 중복 확인 라우트
router.post('/check-duplicate', userController.checkDuplicate);

// 로그인 라우트
router.post('/login', userController.login);

// 로그아웃 라우트 (DELETE)
router.post('/logout', userController.logout);

// 탈퇴 라우트 (DELETE)
router.post('/leave', getUser, userController.leave);

// 프로필 설정 라우트
router.post("/setProfile", getUser, userController.setProfile);

// 프로필 수정 라우트
router.post('/update-profile', getUser, userController.updateProfile);

// 프로필 가져오는 라우트
router.get("/getUserInfo", getUser, userController.getUserInfo);

// 사용자 ID 변경 라우트
router.post('/change-user-id', getUser, userController.changeUserId);

// 사용자 PW 변경 라우트
router.post('/change-password', getUser, userController.changePassword);

// 아이디 찾기 라우트
router.post('/findUserId', userController.findUserId);

// 규칙 추가 라우트 
router.post("/rules", userController.rules);

// 규칙 불러오기 라우트 
router.get("/getRules",getUser, userController.getRules);

// 규칙 불러오기(uuid) 라우트 
router.post("/getAllRulesByUuid",userController.getAllRulesByUuid);

// 규칙 추가 라우트 
router.get("/getColor",getUser, userController.getCalendarColor);

// 카운트 증가 추가 라우트 
router.post("/increaseCount", userController.increaseCount);

// count 수가 1 이상인 규칙 불러오는 라우트
router.get("/getUserRulesWithCount", getUser,userController.getUserRulesWithCount);

// 색깔 변경 라우트 
router.post("/updateColor", userController.Calendar);

// 인증번호 라우트 
router.post("/certificate", userController.certificate);

// 인증번호 확인 라우트
router.post("/check-auth-code", userController.checkAuthCode);



module.exports = router;
