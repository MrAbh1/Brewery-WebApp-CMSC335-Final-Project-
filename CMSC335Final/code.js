const express = require("express");
const app = express();
const bp = require("body-parser");
const path = require("path");
const axios = require("axios");
const { MongoClient, ServerApiVersion } = require("mongodb");

//setting up templates
app.use(bp.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static('public'));
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
const ROOT = `http://localhost:${portNum}`;

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
//test
app.get("/brew", async (req, res) => {
  res.render("brewSearch");
});

app.post("/brewState", async (req, res) => {
  let { state } = req.body;
  let info = { state: state };
  const response = await axios.get(
    `https://api.openbrewerydb.org/breweries?by_state=${state}`
  );
  let breweries = response.data;
  //check if input exists in API before DB entry
  if (breweries.length < 1) {
    res.status(404).send("No breweries found :(");
  } else {
    try {
      // Insert the city info into MongoDB
      const entry = await client
        .db(dbInfo.db)
        .collection(dbInfo.collection)
        .insertOne(info);

      // Fetching the breweries from Open Brewery DB API
      const response = await axios.get(
        `https://api.openbrewerydb.org/breweries?by_state=${state}`
      );
      let breweries = response.data;
      breweries = breweries.filter(
        (brewery) => brewery.state.toLowerCase() === state.toLowerCase()
      );

      // Create an HTML table with the breweries data
      let table = genBrewTable(breweries);

      // Render the EJS template with the table
      res.render("brewDisplay", { table: table });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
});

app.post("/brewCity", async (req, res) => {
  let { city } = req.body;
  let info = { city: city };
  const response = await axios.get(
    `https://api.openbrewerydb.org/breweries?by_city=${city}`
  );
  let breweries = response.data;
  //check if the input exists in API before DB entry
  if (breweries.length < 1) {
    res.status(404).send("No breweries found :(");
  } else {
    try {
      // Insert the city info into MongoDB
      const entry = await client
        .db(dbInfo.db)
        .collection(dbInfo.collection)
        .insertOne(info);

      // Fetching the breweries from Open Brewery DB API
      breweries = breweries.filter(
        (brewery) => brewery.city.toLowerCase() === city.toLowerCase()
      );

      // Create an HTML table with the breweries data
      let table = genBrewTable(breweries);

      // Render the EJS template with the table
      res.render("brewDisplay", { table: table });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
});
app.post("/brewType", async (req, res) => {
  let { type } = req.body;
  let info = { type: type };

  try {
    // Insert the city info into MongoDB
    const entry = await client
      .db(dbInfo.db)
      .collection(dbInfo.collection)
      .insertOne(info);

    // Fetching the breweries from Open Brewery DB API
    const response = await axios.get(
      `https://api.openbrewerydb.org/breweries?by_type=${type}`
    );
    const breweries = response.data;

    // Create an HTML table with the breweries data
    let table = genBrewTable(breweries);

    // Render the EJS template with the table
    res.render("brewDisplay", { table: table });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/recentSearches", async (req, res) => {
  let searchVal = req.query.filter;
  let title = searchVal.toUpperCase();
  try {
    await client.connect();
    const query = {};
    query[searchVal] = { $exists: true, $ne: null };
    const searches = await client
      .db(dbInfo.db)
      .collection(dbInfo.collection)
      .find(query)
      .toArray();
    list = `<h2><u>${title}</u></h2><ul>`;
    searches.reverse().forEach((i) => {
      list += `<li>${i[searchVal]}</li>`;
    });
    list += "<ul>";
    res.render("recentSearches", { list, list });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/processRemove", async(req, res)=>{
  try{
      const result = await client.db(dbInfo.db).collection(dbInfo.collection).deleteMany({});
      console.log(result.deletedCount);
  } catch(err){
      console.error(err)
}
})

function genBrewTable(breweries) {
  let table = `
        <table border="1">
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Street</th>
            <th>City</th>
            <th>State</th>
            <th>Website</th>
          </tr>
      `;
  breweries.forEach((brewery) => {
    table += `
          <tr>
            <td>${brewery.name}</td>
            <td>${brewery.brewery_type}</td>
            <td>${brewery.street}</td>
            <td>${brewery.city}</td>
            <td>${brewery.state}</td>
            <td>${
              brewery.website_url
                ? `<a href="${brewery.website_url}">${brewery.website_url}</a>`
                : "N/A"
            }</td>
          </tr>
        `;
  });
  table += `</table>`;
  return table;
}

