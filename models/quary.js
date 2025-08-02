const mongoose = require("mongoose")
const Schema = mongoose.Schema;
const quarySchema = new mongoose.Schema({
  user: { type: String, required: true },
  category: { type: String, required: true },
  msg: { type: String, required: true },
  
});

const quary = new mongoose.model("Quary", quarySchema);

module.exports = quary;