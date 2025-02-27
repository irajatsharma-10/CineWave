import dotenv from "dotenv";
import dbConnect from "./config/dbConnect.js"
import cloudinaryConnect from "./config/CloudinaryConnect.js"
import {app} from "./app.js"

dotenv.config();
cloudinaryConnect();
dbConnect().then(() => {
  app.listen(process.env.PORT || 8000, () => {
    console.log(`Server is running at port: ${process.env.PORT}`);
  });
}).catch((error)=>{
    console.log("MONGODB connection failed", error)
})
