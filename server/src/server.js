import 'dotenv/config'
import { connectToDatabase } from './database/db.js';
import { server } from './app.js';

const PORT = process.env.PORT || 5001

connectToDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`HTTP + Socket.IO server listening on PORT: ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Something went wrong while connecting to database:", error);
  })