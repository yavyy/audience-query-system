import 'dotenv/config'
import { connectToDatabase } from './database/db.js';
import { app } from './app.js';

const PORT = process.env.PORT || 5001

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Server is running on PORT:", PORT)
    })
  })
  .catch((error) => {
    console.error("Something went wrong while connecting to database:", error);
  })