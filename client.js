require('dotenv').config();
const axios = require('axios');
const PORT = process.env.PORT || 3535;
const host = `http://localhost:${PORT}`;

const axios_instance = axios.create({
  baseURL: host,
  headers: {
    'Content-Type': 'application/json'
  }
});

let access_token = 'bad'; // change to "good" for direct API access without refreshing the token
let refreshing_token = null;

function refresh_token() {
  console.log('Refreshing access token');
  return axios.get(`${host}/refresh`);
}

function responseSuccessIntercept(response) {
  return response;
}

async function responseErrorIntercept(error) {
  const originalReq = error.config;

  // Check status code and retry flag
  if (error?.response?.status === 401 && !originalReq?._retry) {
    originalReq._retry = true;

    try {
      refreshing_token = refreshing_token ? refreshing_token : refresh_token();
      let res = await refreshing_token;
      refreshing_token = null;

      if (res.data.access_token) {
        // console.log('new refresh_token: ', res.data.refresh_token);
        access_token = res.data.access_token;
      }

      return axios_instance(originalReq);
    } catch (err) {
      console.error('Refresh token error!');
      return Promise.reject(err);
    }
  }

  // return Promise
  return Promise.reject(error);
}

/*  ############# Axios Request Interceptor ############# */
axios_instance.interceptors.request.use(
  config => {
    config.headers['access_token'] = access_token;
    return config;
  },
  error => Promise.reject(error)
);

/*  ############# Axios Response Interceptor ############# */
axios_instance.interceptors.response.use(responseSuccessIntercept, responseErrorIntercept);

/* ############# Request function ############# */
function request() {
  console.log('Start request');
  axios_instance
    .get('/access')
    .then(function (response) {
      console.log('Response Data: ', JSON.stringify(response.data));
    })
    .catch(err => {
      console.log(`Response - Error ${err.response.status}`);
    });
}

request();

// Uncomment it if you want to check multiple request in same time.
// request();
// request();
