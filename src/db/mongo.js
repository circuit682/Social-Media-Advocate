const mongoose = require("mongoose");

async function connectToMongo(mongoUri) {
  if (!mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  try {
    await mongoose.connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });

    console.log("✅ MongoDB connected");

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1); // fail fast (important for Docker later)
  }
}

module.exports = {
  connectToMongo
};