const mongoose = require("mongoose")
const Schema = mongoose.Schema;
const quarySchema = new mongoose.Schema({
  user: { type: String, required: true },
  category: { type: String, required: true },
  msg: { type: String, required: true },
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  },
  status: {
        type: String,
        enum: ['Open', 'Resolved', 'Closed'],
        default: 'Open'
    },
  replies: [
        {
            text: { type: String, required: true },
            author: { type: String, required: true }, // Stores the username of the agent
            createdAt: { type: Date, default: Date.now }
        }
    ]
});

const quary = new mongoose.model("Quary", quarySchema);

module.exports = quary;