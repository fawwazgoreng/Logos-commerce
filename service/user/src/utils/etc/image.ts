import * as path from "path";
import * as fs from "fs";
import { nanoid } from "nanoid";

export default class ImageHelper {
    private location = "";

    constructor(dir: string) {
        // Define base directory for images
        const baseLocation = path.join(process.cwd(), `public/images/${dir}`);

        // Ensure directory exists synchronously during initialization
        if (!fs.existsSync(baseLocation)) {
            fs.mkdirSync(baseLocation, { recursive: true });
        }

        this.location = baseLocation;
    }

    // Save image to disk and return the public URL
    save = async (image: File) => {
        // Generate unique filename to prevent overwriting
        const unique = nanoid(12);
        const fileName = unique + "-" + image.name.replace(/\s+/g, "_");
        const fullPath = path.join(this.location, fileName);

        // Use Bun's optimized async write
        await Bun.write(fullPath, image);

        // Generate relative URL for database storage
        const publicPath = path.join(process.cwd(), "public");
        return fullPath.replace(publicPath, "");
    };

    // Replace an existing image with a new one
    edit = async (oldUrl: string, newImage?: File) => {
        // Delete the old file first if it exists
        this.delete(oldUrl);

        // If new image is provided, save it and return the new URL
        if (newImage) {
            return await this.save(newImage);
        }
        return "";
    };

    // Remove image file from the system
    delete = (url: string) => {
        // Resolve the absolute path from the public URL
        const absolutePath = path.join(process.cwd(), "public", url);

        // Only attempt deletion if file exists to prevent crashing
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
    };
}
