const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const QuaryModel = require("./models/quary.js");

// const Student = require("./sample/student.js"); 

const app = express();

// Database connection
mongoose.connect("mongodb://127.0.0.1:27017/Odoo")
    .then(() => console.log("Connected to DB"))
    .catch(err => console.error("DB Error:", err));

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public"))); // Optional static folder


//routes


app.get("/allqury", async (req, res) => {
    try {
        const allQueries = await QuaryModel.find({});
        res.render("allqury", { queries: allQueries }); // Better variable name
    } catch (err) {
        console.error("Error fetching queries:", err);
        res.status(500).send("Internal Server Error");
    }
});
app.get("/allqury/:id", async (req, res) => {
    const { id } = req.params;
    const seeQury = await QuaryModel.findById(id);
    res.render("showqury", { seeQury });
});

app.get("/addqury", async (req, res) => {
    res.render("addqury")
})


app.post("/allqury", async (req, res) => {
  const { user, category, msg } = req.body;

  const newQuery = new QuaryModel({
    user,
    category,
    msg
  });

  try {
    await newQuery.save(); 
    console.log("Query saved:", newQuery);
    res.redirect("/allqury");
  } catch (err) {
    console.error("Error saving query:", err);
    res.status(500).send("Failed to save query.");
  }
});



app.listen(8080, () => {
    console.log("Listening on port 8080");
});

