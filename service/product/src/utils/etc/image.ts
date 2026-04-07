import * as path from "path";
import * as fs from "fs";
import { AppError } from "../error";

// Utility for handling image file storage
export class writeFile {
    // Define directory target (ex: article, category)
    constructor(public direct: string) {}

    // Save new uploaded file to disk
    write = async (file: File) => {
        try {
            // Build directory path for storing images
            const fileDir = path.join(
                process.cwd(),
                `public/image/${this.direct}`,
            );

            // Create directory if it does not exist
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }

            // Generate random filename to avoid collision
            const url = path.join(
                fileDir,
                Math.random().toString(15).substring(2, 7) + file.name,
            );

            // Write file using Bun runtime
            Bun.write(url, file);

            // Convert absolute path to public URL path
            const splitUrl = path.join(process.cwd(), "public");
            const finalUrl = url.split(splitUrl);

            return finalUrl[1];
        } catch (error: any) {
            throw new AppError(error.message || "internal server error", 500, "IMAGE_WRITE_ERROR");
        }
    };

    // Replace existing image with new file
    update = (lastFile: string, file?: File | null) => {
        try {
            // Ensure image directory exists
            const fileDir = path.join(
                process.cwd(),
                `public/image/${this.direct}`,
            );

            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }

            // Resolve previous image path
            const lastImage = path.join(process.cwd(), lastFile);

            // Delete old image if exists
            if (fs.existsSync(lastImage)) {
                fs.rmdirSync(lastImage);
            }

            // Stop if no new file provided
            if (!file) return;

            // Generate new file path
            const url = path.join(
                fileDir,
                Math.random().toString(15).substring(2, 7) + file.name,
            );

            // Write new file to disk
            Bun.write(url, file);

            // Convert absolute path to public URL
            const splitUrl = path.join(process.cwd(), "public");
            const finalUrl = url.split(splitUrl);

            return finalUrl[1];
        } catch (error: any) {
            throw new AppError(error.message || "internal server error", 500, "IMAGE_WRITE_ERROR");
        }
    };
}
