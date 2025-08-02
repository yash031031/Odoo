const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const QuaryModel = require("./models/quary.js");

const app = express();

// --- DATABASE CONNECTION ---
mongoose.connect("mongodb://127.0.0.1:27017/Odoo")
    .then(() => console.log("Connected to DB"))
    .catch(err => console.error("DB Connection Error:", err));

// --- MIDDLEWARE & SETUP ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// --- ROUTES ---

// GET /allqury: Display all queries with filtering
app.get("/allqury", async (req, res) => {
    try {
        const { category } = req.query; // Get category from URL (e.g., /allqury?category=Technical)
        
        let filter = {};
        if (category) {
            filter.category = category; // If a category is present, create a filter for it
        }

        // Use the filter to find matching queries (or all queries if filter is empty)
        const filteredQueries = await QuaryModel.find(filter); 
        
        // Fetch all unique category strings from the database
        const allCategories = await QuaryModel.distinct("category"); 

        // Render the page, passing all the necessary variables
        res.render("allqury", { 
            queries: filteredQueries,
            categories: allCategories,          // This provides the categories for the dropdown
            selectedCategory: category || ""    // This helps the dropdown remember its state
        });

    } catch (err) {
        console.error("Error fetching queries:", err);
        res.status(500).send("Internal Server Error");
    }
});

// GET /allqury/:id: Display a single query's details
app.get("/allqury/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const seeQury = await QuaryModel.findById(id);
        // Assuming you have a 'showqury.ejs' file to render this
        if(seeQury) {
             res.render("showqury", { seeQury });
        } else {
            res.status(404).send("Query not found");
        }
    } catch (err) {
        console.error("Error fetching single query:", err);
        res.status(500).send("Internal Server Error");
    }
});

// GET /addqury: Show the form to add a new query
app.get("/addqury", (req, res) => {
    // Assuming you have an 'addqury.ejs' file
    res.render("addqury");
});

// POST /allqury: Handle the submission of a new query
app.post("/allqury", async (req, res) => {
    try {
        const { user, category, msg } = req.body;
        const newQuery = new QuaryModel({ user, category, msg });
        await newQuery.save(); 
        console.log("Query saved:", newQuery);
        res.redirect("/allqury");
    } catch (err) {
        console.error("Error saving query:", err);
        res.status(500).send("Failed to save query.");
    }
});
app.post("/allqury/:id/upvote", async (req, res) => {
    try {
        const { id } = req.params;
        // Use MongoDB's $inc operator to increment the count
        await QuaryModel.findByIdAndUpdate(id, { $inc: { upvotes: 1 } });
        // Redirect back to the main page
        res.redirect("/allqury");
    } catch (err) {
        console.error("Upvote Error:", err);
        res.redirect("/allqury");
    }
});

// POST /allqury/:id/downvote: Handle the downvote action
app.post("/allqury/:id/downvote", async (req, res) => {
    try {
        const { id } = req.params;
        await QuaryModel.findByIdAndUpdate(id, { $inc: { downvotes: 1 } });
        res.redirect("/allqury");
    } catch (err) {
        console.error("Downvote Error:", err);
        res.redirect("/allqury");
    }
});


// --- START SERVER ---
app.listen(8080, () => {
    console.log("Server listening on http://localhost:8080/allqury");
});