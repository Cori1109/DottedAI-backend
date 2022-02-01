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

app.get("/api/users/register", async (req, res) => {
  console.log("=== user register post api is called ===", req.query);
  let status = { success: false, msg: "Success" };

  if (!connectedDB) {
    console.log("=== mongodb connection is not established yet ===");
    status.msg = "DB Connection failed!";
    res.json(status);
    return;
  }
  const db = client.db("dottedai");
  const accountDoc = JSON.parse(req.query.data);

  // compare hash
  const givenHash = JSON.parse(req.query.headers).secret;
  const calculatedHash = crypto
    .createHash("sha256")
    .update(accountDoc.email + "" + accountDoc.password)
    .digest("hex");

  console.log(givenHash);
  console.log(calculatedHash);

  if (givenHash !== calculatedHash) {
    console.log("=== hash value is not the same in user register post api ===");
    status.msg = "Incorrect account!";
    res.json(status);
    return;
  }

  const accountCollection = db.collection("accounts");
  const accountIndex = await accountCollection.countDocuments();
  const isDouble = await accountCollection.findOne({
    email: accountDoc.email,
  });
  if (isDouble) {
    console.log("=== email exist ===", accountIndex);
    status.msg = "Email Already Exist!";
    res.json(status);
    return;
  } else {
    await accountCollection.updateOne(
      {
        email: accountDoc.email,
        password: accountDoc.password,
        index: accountIndex + 1,
      },
      { $setOnInsert: accountDoc },
      { upsert: true }
    );

    status.success = true;
    res.json(status);
  }
});

app.get("/api/users/login", async (req, res) => {
  console.log("=== account login get api is called ===", req.query);

  let status = { success: false, msg: "Success" };

  if (!connectedDB) {
    console.log("=== mongodb connection is not established yet ===");
    status.msg = "DB Connection failed!";
    res.json(status);
    return;
  }
  const db = client.db("dottedai");
  const accountEmail = req.query.email;
  const accountPwd = req.query.password;

  // compare hash
  const givenHash = req.query.headers;
  const calculatedHash = crypto
    .createHash("sha256")
    .update(accountEmail + "" + accountPwd)
    .digest("hex");

  console.log(givenHash);
  console.log(calculatedHash);

  if (givenHash !== calculatedHash) {
    console.log(
      "=== hash value is not the same in account login post api ===",
      status
    );
    status.msg = "Incorrect account!";
    res.json(status);
    return;
  }

  const accountCollection = db.collection("accounts");

  const isDouble = await accountCollection.findOne({ email: accountEmail });

  const accountDoc = await accountCollection
    .find({ email: accountEmail, password: accountPwd })
    .toArray();

  console.log(accountDoc);
  console.log("length == ", accountDoc.length);

  if (accountDoc.length > 0) {
    status.success = true;
    res.json(status);
  } else {
    if (isDouble) {
      status.msg = "Incorrect password!";
    } else {
      status.msg = "Incorrect email!";
    }
    res.json(status);
  }
});

app.get("/api/admin", async (req, res) => {
  console.log("=== admin getAll api is called ===", req.query);

  let usersJson = { user: [] };

  if (!connectedDB) {
    console.log("=== mongodb connection is not established yet ===");
    res.json(usersJson);
    return;
  }
  const db = client.db("dottedai");
  const accountCollection = db.collection("accounts");
  const accountDoc = await accountCollection.find({}).toArray();
  usersJson.user = accountDoc;
  res.json(usersJson);
});

app.get("/api/admin/:id", async (req, res) => {
  console.log("=== admin getbyID api is called ===", req.params.id);
  const userId = parseInt(req.params.id);
  let userJson = [];
  let status = { success: false };

  if (!connectedDB) {
    console.log("=== mongodb connection is not established yet ===");
    res.json(status);
    return;
  }
  const db = client.db("dottedai");
  const accountCollection = db.collection("accounts");
  const accountlength = await accountCollection.countDocuments();
  if (userId > accountlength) {
    res.json(userJson);
    return;
  }
  const accountDoc = await accountCollection.findOne({ index: userId });
  userJson = accountDoc;
  res.json(userJson);
});

app.get("/api/admin/update/:id", async (req, res) => {
  console.log("=== admin update api is called ===", req.query);
  const userId = parseInt(req.params.id);
  let status = { success: false };

  if (!connectedDB) {
    console.log("=== mongodb connection is not established yet ===");
    status.msg = "DB Connection failed!";
    res.json(status);
    return;
  }
  const db = client.db("dottedai");
  const accountDoc = JSON.parse(req.query.data);

  // compare hash
  const givenHash = JSON.parse(req.query.headers).secret;
  const calculatedHash = crypto
    .createHash("sha256")
    .update(accountDoc.email + "" + accountDoc.password)
    .digest("hex");

  if (givenHash !== calculatedHash) {
    console.log("=== hash value is not the same in user register post api ===");
    status.msg = "Incorrect account!";
    res.json(status);
    return;
  }

  const accountCollection = db.collection("accounts");
  const accountlength = await accountCollection.countDocuments();
  if (userId === undefined || userId > accountlength) {
    res.json(status);
    return;
  }
  const resUpdate = await accountCollection.findOneAndUpdate(
    { index: userId },
    { $set: { email: accountDoc.email, password: accountDoc.password } }
  );
  console.log("update", resUpdate);
  status.success = true;
  res.json(status);
});

app.delete("/api/admin/:id", async (req, res) => {
  console.log("=== admin delete api is called ===", req.params.id);
  const userId = parseInt(req.params.id);
  console.log("userId", userId);
  let status = { success: false };

  if (!connectedDB) {
    console.log("=== mongodb connection is not established yet ===");
    res.json(status);
    return;
  }
  const db = client.db("dottedai");
  const accountCollection = db.collection("accounts");
  const accountlength = await accountCollection.countDocuments();
  const resDel = await accountCollection.findOneAndDelete({ index: userId });
  let cnt = accountlength - userId;
  for (let i = 0; i < cnt; i++) {
    await accountCollection.updateOne({ index: { $eq: userId + i + 1 } }, [
      { $set: { index: userId + i } },
    ]);
  }
  console.log("Delete", resDel);
  res.json(userId);
});

app.listen(process.env.PORT, () =>
  console.log("Your app is listening on port " + process.env.PORT)
);

app.addListener("close", async () => {
  console.log("closing connection to the Mongodb...");
  await client.close();
  clearInterval(myInterval);
});
