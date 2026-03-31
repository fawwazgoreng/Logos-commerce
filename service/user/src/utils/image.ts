import * as path from "path";
import * as fs from "fs";
import { nanoid } from "nanoid";

export default class ImageHelper {
    private location = "";
    constructor(dir: string) {
        const baseLocation = path.join(process.cwd() , `public/images/${dir}`);
        if (!fs.existsSync(baseLocation)) {
            fs.mkdirSync(baseLocation,{recursive: true});
        }
        
        this.location = baseLocation;
    }
    private saveImage = (File) => {
        try {
            const unique = nanoid(20);
            
        } catch (error) {
            
        }
    }
    save = (image: File) => {
        try {
            const 
            
        } catch (error) {
            
        }
    } 
    edit = () => {
        
    }
    delete = () => {
        
    }
}