const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const FormData = require("form-data");
const cors = require("cors");
const app = express();
const port = 5000;

app.use(cors({
  origin: 'https://backend-proxy.vercel.app'
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => res.json("SERVER is WORKING"));

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


const IpRisk = async (ip) => {
  const endpoint = `https://scamalytics.com/ip/${ip}`;
  const response = await axios.get(endpoint);
  const html = response.data;
  const $ = cheerio.load(html);

  const risk = $(".panel_title.high_risk").text();
  const score = $(".score").text();
  const details = $(".panel_body").text().replace("Scamalytics", "We").trim();

  return { ip, risk, score, details };
};

const Location = async (ip) => {
  const endpoint = `https://ipwhois.app/json/${ip}`;
  const response = await axios.get(endpoint);
  return response.data;
};

const IpState = async (proxy) => {
  //console.log(proxy); 
  const endpoint = `https://api.proxy-checker.net/api/proxy-checker/`;
  const formData = new FormData();
  formData.append("proxy_list", proxy);
  const response = await axios.post(endpoint, formData, {
    headers: formData.getHeaders(),
  });
  //console.log(response);
  return response.data[0];
};

const apiKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NDg2MWI5NTFlMWFkNDMzMWQwYTljMmQiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2NDg2MjM1NmZiYTU2ZTMyOWQxZTIyYTcifQ.03cADWZjonvQDQP4hmqX5rThDXIUb4C-x473LYtjqmM";

const ipCrack = async (proxy) => {
  const [host, port, username, password] = proxy.split(":");
  const type = "http";
  //const endpoint = `https://api.gologin.com/browser/check_proxy`;
  await sleep(1000)
  const endpoint = 'https://www.courier.com/api/tools/domain-ip-lookup/?domain=' + host;
  const response = await axios.get(endpoint);
  return response.data.result[response.data.result.length - 1];
};

const proxyCrack = async (proxy) => {
  const real_host = await ipCrack(proxy);
  const [host, port, username, password] = proxy.split(":");
  const type = "http";
  if (username && password) {
    return real_host + ":" + port + ":" + username + ":" + password;
  } else {
    return real_host + ":" + port;
  }
};

app.get("/", (req, res) => res.json("SERVER is WORKING"));

app.post("/check-ip", async (req, res) => {
  const proxyArr = await Promise.all(req.body.ip.split("\n"));
  console.log("proxyArr:::", proxyArr)////
  const ipArr = await Promise.all(proxyArr.map((proxy) => ipCrack(proxy)));
  console.log("ipArr:::", ipArr)
  const res_proxyArr = await Promise.all(
    proxyArr.map((proxy) => {
      let p1 = proxyCrack(proxy)
      return p1 === proxy ? null : p1
    })
  );

  //console.log("res_proxyArr:::", res_proxyArr)

  const res_IpRisk = await Promise.all(ipArr.map((ip) => IpRisk(ip)));
  const res_location = await Promise.all(ipArr.map((ip) => Location(ip)));
  const res_state = await Promise.all(
    res_proxyArr.map((proxy) => {
      //console.log(proxy);
      if(proxy === null) {
        return {flag : 'Fail'}
      }else{
        return IpState(proxy);
      }
      proxy === null ? {flag : 'Fail'} : IpState(proxy); 
    })
  );/**/
  const ProxyPort = proxyArr.map((proxy) => {
    return {'port': proxy.split(':')[1]};
  })
  res.json({
    risk: res_IpRisk,
    location: res_location,
    state: ProxyPort,
  });/**/
  return;
});

app.listen(port, () => {
  console.log(`IP Checker app listening at http://localhost:${port}`);
});