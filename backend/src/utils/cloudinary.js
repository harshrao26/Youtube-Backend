import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv'

dotenv.config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        });

        // console.log("File Upploaded on Cloudinary", response.url)



        fs.unlinkSync(localFilePath)

        return response
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        try {
            if (fs.existsSync(localFilePath)) {  // Check if file exists
                fs.unlinkSync(localFilePath);  // Delete the local file
            }
        } catch (unlinkError) {
            console.error("Error Deleting Local File:", unlinkError);  // Log any issues with deletion
        }

        return null;

    }
}

const deleteOnCloudinary = async (fileUrl) => {
    try {
        const response = await cloudinary.uploader.destroy(fileUrl, {
            resource_type: 'auto'
        });
        console.log("Deletion response from Cloudinary: ", response);
    } catch (error) {
        console.error("Error deleting image on Cloudinary: ", error);
    }
};


export { uploadOnCloudinary, deleteOnCloudinary }