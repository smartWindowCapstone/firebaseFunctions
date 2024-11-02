const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
admin.initializeApp();
const database = admin.database();

exports.predictWeather = functions
    .region("asia-northeast3")
    // 스케줄러 (크론표시법 분,시,일,월 요일); 값을 적으면 해당 시간에 작동한다.
    // 날씨 정보는 45분에 배포되며 10분마다 업데이트 된다.
    .pubsub.schedule("45,55,05,15,25,35 * * * *")
    .timeZone("Asia/Seoul")
    .onRun(async (context) => {
      try {
        // 현재시간에 맞는 api값을 받아오기 위해서 현재 시간,분을 변수에 저장한다.
        const curr = new Date();
        const utc = curr.getTime() + curr.getTimezoneOffset() * 60 * 1000;
        const kr = new Date(utc + 9 * 60 * 60 * 1000);
        const year = kr.getUTCFullYear();
        const month = kr.getUTCMonth() + 1;
        const date = kr.getUTCDate();
        const hours = kr.getUTCHours();
        const minutes = kr.getUTCMinutes();
        const basemonth = `${month < 10 ? "0" + month : month}`;
        const basedate = `${date < 10 ? "0" + date : date}`;
        const basehours = `${hours < 10 ? "0" + hours : hours}`;
        const basemin = `${minutes < 10 ? "0" + minutes : minutes}`;
        // 기상청의 날씨를 RESTful api 형태로 받아온다.
        // 초단기 실황
        const response = await axios.get(
            `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=XruUJ8qt0zIFd6SOXRSTxUTjQf5FYoWg0EvN4SDuwQKepEtek%2Fj3L4RnqJ2ntfHA1fweotfs4brzI4hTOvL6CA%3D%3D&numOfRows=100&pageNo=1&base_date=${year}${basemonth}${basedate}&base_time=${basehours}${basemin}&nx=81&ny=75&dataType=JSON`,
        );

        // 초단기 예측
        const response2 = await axios.get(
            `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst?serviceKey=XruUJ8qt0zIFd6SOXRSTxUTjQf5FYoWg0EvN4SDuwQKepEtek%2Fj3L4RnqJ2ntfHA1fweotfs4brzI4hTOvL6CA%3D%3D&numOfRows=100&pageNo=1&base_date=${year}${basemonth}${basedate}&base_time=${basehours}${basemin}&nx=81&ny=75&dataType=JSON`,
        );

        const forecastData = response2.data.response.body.items.item;
        const temp = response.data.response.body.items.item[3].obsrValue;
        const rain = response.data.response.body.items.item[0].obsrValue;
        const wet = response.data.response.body.items.item[1].obsrValue;
        // 초단기예측에서 sky값
        const preSky = response2.data.response.body.items.item[7].fcstValue;
        // Firebase realtimedatabase에 각 값들을 저장한다.
        // 기온
        await database.ref("/temp").set(temp);
        // 날씨
        await database.ref("/rain").set(rain);
        // 습도
        await database.ref("/wet").set(wet);
        // 예측 날씨
        await database.ref("/preSky").set(preSky);
        // 1시간 별 예측 값들
        await database.ref("/forecastData").set(forecastData);
        console.log("Data saved to database.");
      } catch (error) {
        console.error(error);
      }
    });
