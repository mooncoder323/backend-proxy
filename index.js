const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const app = express();
const port = 5000;

app.use(
  cors({
    origin: ["https://front-proxy.vercel.app"],
    methods: "GET, PUT, POST, OPTIONS",
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => res.json("SERVER is WORKING"))

app.post("/check-ip", async (req, res) => {
  const checkIpRisk = async (ip) => {
    const endpoint = `https://scamalytics.com/ip/${ip}`;
    const response = await axios.get(endpoint);
    const html = response.data;
    const $ = cheerio.load(html);

    const risk = $(".panel_title.high_risk").text();
    const score = $(".score").text();
    const details = $(".panel_body").text().replace("Scamalytics", "We").trim();

    return { ip, risk, score, details };
  };

  const checkIpLocation = async (ip) => {
    const endpoint = `https://ipwhois.app/json/${ip}`;
    const response = await axios.get(endpoint);
    return response.data;
  };

  const FormData = require("form-data");

  const checkProxy = async (proxy) => {
    const formData = new FormData();
    formData.append("proxy_list", proxy);

    try {
      const response = await axios.post(
        "https://api.proxy-checker.net/api/proxy-checker/",
        formData,
        {
          headers: formData.getHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error(error);
    }
  };

  const apiKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NDg2MWI5NTFlMWFkNDMzMWQwYTljMmQiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2NDg2MjM1NmZiYTU2ZTMyOWQxZTIyYTcifQ.03cADWZjonvQDQP4hmqX5rThDXIUb4C-x473LYtjqmM";

  const checkGoLoginProxy = async (proxy) => {
    const [host, port, username, password] = proxy.split(":");
    const type = "http";
    const endpoint = `https://api.gologin.com/browser/check_proxy`;
    const response = await axios.post(
      endpoint,
      {
        type,
        host,
        port,
        username,
        password,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    if (response.data.status == "success") {
      return response.data.origin;
    }
    return host;
  };

  const checkGoLoginOutputProxy = async (proxy) => {
    const [host, port, username, password] = proxy.split(":");
    const type = "http";
    const endpoint = `https://api.gologin.com/browser/check_proxy`;
    const response = await axios.post(
      endpoint,
      {
        type,
        host,
        port,
        username,
        password,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    if (response.data.status == "success") {
      return (
        response.data.origin + ":" + port + ":" + username + ":" + password
      );
    }
    if (username && password) {
      return host + ":" + port + ":" + username && username + ":" + password;
    } else {
      return host + ":" + port;
    }
  };

  try {
    const results_host = await Promise.all(
      req.body.ip.split("\n").map((proxy) => checkGoLoginProxy(proxy))
    );
    const results_proxy = await Promise.all(
      req.body.ip.split("\n").map((proxy) => checkGoLoginOutputProxy(proxy))
    );

    const results_risk = await Promise.all(
      results_host.map((ip) => checkIpRisk(ip))
    );
    const results_state = await Promise.all(
      results_proxy.map((proxy) => checkProxy(proxy))
    );
    const results_location = await Promise.all(
      results_host.map((ip) => checkIpLocation(ip))
    );

    res.json({
      risk: results_risk,
      state: results_state,
      location: results_location,
    });
  } catch (error) {
    res.status(500).json({
      error:
        "An error occurred while processing your request. Please try again.",
    });
  }
});

app.listen(port, () => {
  console.log(`IP Checker app listening at http://localhost:${port}`);
});

module.exports = app;
