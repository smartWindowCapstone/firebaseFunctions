const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

const database = admin.database();

exports.predictedApi = functions
    .region("asia-northeast3")
    // 스케줄러 (크론표시법 분,시,일,월 요일); 값을 적으면 해당 시간에 작동한다.
    // 미세먼지 데이터는 정각기준 15분 전후로 업데이트 된다. 20분에 값을 받아오도록 설정되었다.
    .pubsub.schedule("20 * * * *")
    .timeZone("Asia/Seoul")
    .onRun(async (context) => {
      try {
        // 한국환경공단에서 미세먼지 데이터를 받아온다. 관측소 기준이므로 상대동(진주)의 값을 받아온다.
        const response = await axios.get(
            `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?stationName=상대동(진주)&numOfRows=1&dataTerm=DAILY&pageNo=1&ver=1.0&numOfRows=100&returnType=json&serviceKey=XruUJ8qt0zIFd6SOXRSTxUTjQf5FYoWg0EvN4SDuwQKepEtek%2Fj3L4RnqJ2ntfHA1fweotfs4brzI4hTOvL6CA%3D%3D`,
        );
        const pm10Value = response.data.response.body.items[0].pm10Value;
        const pm25Value = response.data.response.body.items[0].pm25Value;
        const khaiGrade = response.data.response.body.items[0].khaiGrade;
        // pm10,pm2.5,미세먼지 값에 따른 대기상태를 Firebase realtimeDatabase에 저장한다.
        await database.ref("/pm10").set(pm10Value);
        await database.ref("/pm25").set(pm25Value);
        await database.ref("/khaiGrade").set(khaiGrade);

        console.log("Data saved to database.");
      } catch (error) {
        console.error(error);
      }
    });
