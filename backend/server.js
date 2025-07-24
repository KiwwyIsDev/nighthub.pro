require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const redirect = require("./routes/redirect");
const lootlab = require("./routes/lootlab");
const keyRoutes = require("./routes/key");
const userRoutes = require("./routes/user");
const clickRoutes = require("./routes/click");

const app = express();

// Middleware
app.use(cors({
  origin: "https://nighthub.pro",
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/", redirect);
app.use("/key", keyRoutes);
app.use("/user", userRoutes);
app.use("/lootlab", lootlab);
app.use("/click", clickRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("MongoDB connected.");
  app.listen(process.env.PORT || 4546, () => {
    console.log("ads-api server running on port", process.env.PORT || 4546);
  });
}).catch(err => {
  console.error("MongoDB connection failed:", err);
});
