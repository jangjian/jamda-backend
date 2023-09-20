const cron = require('node-cron');

cron.schedule('*/10 * * * * *', () => {
    console.log('열 초기화가 완료되었습니다.');
});