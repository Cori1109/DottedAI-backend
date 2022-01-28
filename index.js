const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(
  cors({
    origin: "*",
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const client = new MongoClient(
  "mongodb+srv://razor:9ByZ1memea5SRFIz@dottedai.mohrw.mongodb.net/dottedai?retryWrites=true&w=majority"
);
let connectedDB = false;

const connectToMongo = async () => {
  try {
    await client.connect();
    console.log("Connected correctly to Mongodb server");

    connectedDB = true;
  } catch (err) {
    console.log("**", err.stack);
  }
};

connectToMongo().catch(console.dir);

app.post("/api/users/register", async (req, res) => {
  console.log("=== user register post api is called ===");
  let status = { success: false };

  if (!connectedDB) {
    console.log("=== mongodb connection is not established yet ===");
    res.json(status);
    return;
  }
  const db = client.db("dottedai");
  const accountDoc = req.body.user;

  // compare hash
  const givenHash = req.headers["secret"];
  const calculatedHash = crypto
    .createHash("sha256")
    .update(accountDoc.email + "" + accountDoc.password)
    .digest("hex");

  console.log(givenHash);
  console.log(calculatedHash);

  if (givenHash !== calculatedHash) {
    console.log("=== hash value is not the same in user register post api ===");
    res.json(status);
    return;
  }

  const accountCollection = db.collection("accounts");
  const isDouble = await accountCollection.findOne({
    email: accountDoc.email,
  });
  if (isDouble) {
    console.log("=== email exist ===");
    res.json(status);
    return;
  } else {
    await accountCollection.updateOne(
      { email: accountDoc.email, password: accountDoc.password },
      { $setOnInsert: accountDoc },
      { upsert: true }
    );

    status.success = true;
    res.json(status);
  }
});

app.post("/api/users/login", async (req, res) => {
  console.log("=== account login post api is called ===");

  let status = { success: false };

  if (!connectedDB) {
    console.log("=== mongodb connection is not established yet ===");
    res.json(status);
    return;
  }
  const db = client.db("dottedai");
  const accountData = req.body.user;

  // compare hash
  const givenHash = req.headers["secret"];
  const calculatedHash = crypto
    .createHash("sha256")
    .update(accountData.email + "" + accountData.password)
    .digest("hex");

  console.log(givenHash);
  console.log(calculatedHash);

  if (givenHash !== calculatedHash) {
    console.log(
      "=== hash value is not the same in account login post api ===",
      status
    );
    res.json(status);
    return;
  }

  const accountCollection = db.collection("accounts");

  const accountDoc = await accountCollection
    .find({ email: accountData.email, password: accountData.password })
    .toArray();

  console.log(accountDoc);
  console.log("length == ", accountDoc.length);

  if (accountDoc.length > 0) {
    status.success = true;
    res.json(status);
  } else {
    res.json(status);
  }
});

app.listen(process.env.PORT, () =>
  console.log("Your app is listening on port " + process.env.PORT)
);

app.addListener("close", async () => {
  console.log("closing connection to the Mongodb...");
  await client.close();
  clearInterval(myInterval);
});
