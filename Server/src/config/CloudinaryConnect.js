import {v2 as Cloudinary} from "cloudinary";
import dotenv from "dotenv";
dotenv.config();
const cloudinaryConnect = async () => {
    try {
    const cloudData = await Cloudinary.config({
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.API_KEY,
        api_secret: process.env.API_SECRET,
    });
    // console.log("cloudinary data: ", cloudData);
    } catch (error) {
    console.log("Error while uploading data to cloudinary", error);
    }
};

export default cloudinaryConnect;
