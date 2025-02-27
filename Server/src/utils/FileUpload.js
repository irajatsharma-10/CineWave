import { v2 as Cloudinary } from "cloudinary";
import fs from "fs";

const uploadOnCloudinary = async (localFilePath, height, quality, folder) => {
    try {
        if (!localFilePath) {
            throw new Error("Could not find the path");
            return;
        }
        const options = { folder }; // create the options object with folder as the key value pair in it (folder as the key and its value which we get from the parameter as the value)
        if (height) {
            options.height = height;
        }
        if (quality) {
            options.quality = quality;
        }
        options.resource_type = "auto";

        // const response = await Cloudinary.uploader.upload(localFilePath,{
        //     resource_type: "auto"
        // })
        const response = await Cloudinary.uploader.upload(localFilePath, options);
        if (!response) {
            throw new ApiError(404, "File not found locally");
        }


        // file has been uploaded successfully
        console.log("File is uploaded on cloudinary", response);


        // we know we are using cloudinary only when the file is present in the local server
        // if not found local file path or not uploaded on cloudinary
        // then remove the malicious files present in the server
        // this will remove the file link from the directory
        // fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        console.log("Error uploading on cloudinary ", error);
        return null;
    }
};

export { uploadOnCloudinary };
