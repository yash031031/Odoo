const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const QuaryModel = require("./models/quary.js");
const User = require("./models/user.js");

const app = express();

// --- Database Connection ---
mongoose.connect("mongodb://127.0.0.1:27017/Odoo")
    .then(() => console.log("Connected to DB"))
    .catch(err => console.error("DB Connection Error:", err));

// --- Middleware & View Engine Setup ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// --- Session & Passport Configuration ---
const sessionConfig = {
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};
app.use(session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// --- Custom Middleware ---
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    next();
};

const isSupportAgent = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== 'Support Agent') {
        return res.redirect('/allqury');
    }
    next();
};

// --- AUTHENTICATION ROUTES ---
app.get("/signup", (req, res) => { res.render("signup"); });
app.post("/signup", async (req, res, next) => { try { const { email, username, password, role } = req.body; const user = new User({ email, username, role }); const registeredUser = await User.register(user, password); req.login(registeredUser, err => { if (err) return next(err); res.redirect("/allqury"); }); } catch (e) { res.redirect("/signup"); } });
app.get("/login", (req, res) => { res.render("login"); });
app.post("/login", passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => { res.redirect('/allqury'); });
app.get('/logout', (req, res, next) => { req.logout(function(err) { if (err) { return next(err); } res.redirect('/allqury'); }); });


// --- QUERY, PROFILE, & STATUS ROUTES ---
app.get("/allqury", async (req, res) => {
    try {
        const { category, status, openOnly, sortBy } = req.query;
        const filter = {};
        let sortOption = {};

        if (openOnly === 'true') {
            filter.status = 'Open';
        } else if (status) {
            filter.status = status;
        }

        if (category) {
            filter.category = category;
        }

        if (sortBy === 'upvotes') {
            sortOption = { upvotes: -1 };
        }

        const queries = await QuaryModel.find(filter).sort(sortOption);
        const categories = await QuaryModel.distinct("category");
        
        const showOpenOnly = openOnly === 'true' || openOnly === undefined;

        res.render("allqury", {
            queries,
            categories,
            selectedCategory: category || "",
            selectedStatus: showOpenOnly ? '' : status || "",
            showOpenOnly: showOpenOnly,
            sortBy: sortBy || ""
        });
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
});


app.get("/user/:username", async (req, res) => {
    try {
        const { username } = req.params;
        const profileUser = await User.findOne({ username: username });
        if (!profileUser) { return res.status(404).send("User not found."); }
        
        const userQueries = await QuaryModel.find({ user: profileUser.username });

        // --- CHART DATA AGGREGATION ---
        const categoryCounts = {};
        userQueries.forEach(query => {
            categoryCounts[query.category] = (categoryCounts[query.category] || 0) + 1;
        });

        const chartData = {
            labels: Object.keys(categoryCounts),
            data: Object.values(categoryCounts)
        };
        // --- END CHART DATA AGGREGATION ---

        res.render("userProfile", { 
            profileUser, 
            queries: userQueries,
            chartData // Pass the new chart data to the template
        });
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/allqury/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const seeQury = await QuaryModel.findById(id);
        if (seeQury) {
            res.render("showqury", { seeQury });
        } else {
            res.status(404).send("Query not found");
        }
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
});

app.get("/addqury", isLoggedIn, (req, res) => { res.render("addqury"); });

app.post("/allqury", isLoggedIn, async (req, res) => {
    try {
        const { category, msg } = req.body;
        const newQuery = new QuaryModel({ user: req.user.username, category, msg });
        await newQuery.save();
        res.redirect("/allqury");
    } catch (err) {
        res.status(500).send("Failed to save query.");
    }
});

app.post("/allqury/:id/upvote", isLoggedIn, async (req, res) => {
    try {
        await QuaryModel.findByIdAndUpdate(req.params.id, { $inc: { upvotes: 1 } });
        res.redirect(req.get('referer') || '/allqury');
    } catch (err) {
        res.redirect(req.get('referer') || '/allqury');
    }
});

app.post("/allqury/:id/downvote", isLoggedIn, async (req, res) => {
    try {
        await QuaryModel.findByIdAndUpdate(req.params.id, { $inc: { downvotes: 1 } });
        res.redirect(req.get('referer') || '/allqury');
    } catch (err) {
        res.redirect(req.get('referer') || '/allqury');
    }
});

app.post("/allqury/:id/reply", isLoggedIn, async (req, res) => {
    try {
        const query = await QuaryModel.findById(req.params.id);
        if (req.user.username !== query.user && req.user.role !== 'Support Agent') {
            return res.redirect(`/allqury/${query._id}`);
        }
        const newReply = {
            text: req.body.replyText,
            author: req.user.username
        };
        query.replies.push(newReply);
        if (req.user.role === 'Support Agent' && query.status === 'Open') {
            query.status = 'Resolved';
        }
        await query.save();
        res.redirect(`/allqury/${query._id}`);
    } catch (e) {
        res.redirect(`/allqury/${req.params.id}`);
    }
});

app.post("/allqury/:id/close", isLoggedIn, async (req, res) => {
    try {
        const query = await QuaryModel.findById(req.params.id);
        if (req.user.username === query.user || req.user.role === 'Admin') {
            query.status = 'Closed';
            await query.save();
        }
        res.redirect('/allqury');
    } catch (err) {
        res.redirect('/allqury');
    }
});

// --- Start Server ---
app.listen(8080, () => {
    console.log("Server listening on http://localhost:8080/allqury");
});
