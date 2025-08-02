const mongoose = require("mongoose");
const sampleQuary = require("./data.js");
const Quary = require("../models/quary.js");
// const User = require("../models/user");

const MONGO_URL = "mongodb://127.0.0.1:27017/Odoo";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  await Quary.deleteMany({});
  
  await Quary.insertMany(sampleQuary.data);
  console.log("data was initialized");
};
initDB();