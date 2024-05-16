const express = require("express");
const app = express();
const bp = require("body-parser");
const path = require("path");
const { MongoClient, ServerApiVersion } = require("mongodb");

//setting up templates
app.use(bp.urlencoded({ extended: false }));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

//Mongo setup
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const user = process.env.MONGO_DB_USERNAME;
const pass = process.env.MONGO_DB_PASSWORD;
const uri = `mongodb+srv://${user}:${pass}@cluster0.js9o3xy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const dbInfo = {
  db: process.env.MONGO_DB_NAME,
  collection: process.env.MONGO_COLLECTION,
};

process.stdin.setEncoding("utf8");
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

let portNum = process.argv[2];

//handling command line arguments and events
app.listen(portNum, () => {
  console.log(`Web server started and running at http://localhost:${portNum}`);
  process.stdout.write("Stop to shutdown the server: ");
  process.stdin.on("readable", function () {
    let input = process.stdin.read();
    if (input != null) {
      if (input.trim() === "stop") {
        process.stdout.write("Shutting down the server\n");
        process.exit(0);
      } else {
        process.stdout.write(`Invalid command: ${input.trim()}\n`);
      }

      process.stdout.write("Stop to shutdown the server: ");
      process.stdin.resume();
    }
  });
});
//hello
//rendering homepage with all options
app.get("/", async (req, res) => {
  try {
    await client.connect();
    res.render("homePage");
  } catch (err) {
    console.log(err);
  }
});

app.get("/brewSearch"),
  async (req, res) => {
    try {
      await client.connect();
      res.render("/brewSearch");
    } catch (err) {
      console.log(e);
    }
  };