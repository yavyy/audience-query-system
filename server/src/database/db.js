import mongoose from "mongoose"

export const connectToDatabase = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
    console.log("MONGDODB CONNECTION SUCCESSFULL, connection instance:", connectionInstance.connection.host);
  } catch (error) {
    console.error("MongoDB Connection failed:", error);
    process.exit(1);
  }
}