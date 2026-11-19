import mongoose from "mongoose";

// One connection per process. Serverless instances are reused between
// requests, so the promise is kept and later calls wait on the same one.
let connecting = null;

export const connectDB = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, maxPoolSize: 5 })
      .then((connection) => {
        console.log("Connected to MongoDB");
        return connection;
      })
      .catch((error) => {
        connecting = null;
        throw error;
      });
  }
  return connecting;
};
