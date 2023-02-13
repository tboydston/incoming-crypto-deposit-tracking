/* eslint-disable no-param-reassign */

const fs = require("fs");
const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const sigMan = require("../lib/signatureManager");

const pubKey = fs.readFileSync(`../keys/pub.pem`);

const app = express();
app.use(
  bodyParser.text({
    type: () => "text",
  })
);

app.post("/*", async (req, res) => {
  console.log("HEADERS", req.headers);
  console.log("BODY", req.body);

  res = res.status(200);

  if (req.get("Content-Type")) {
    console.log(`Content-Type: ${req.get("Content-Type")}`);
    res = res.type(req.get("Content-Type"));
  }

  const response = {
    received: req.body,
    sigValid: await sigMan.verify(pubKey, req.body, req.headers.signature),
  };
  console.log(response);
  res.send(response);
});

http.createServer(app).listen(7001);
