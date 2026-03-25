import { secret_key } from "../config";

const encode = (req: string) => new TextEncoder().encode(req);
const decode = (req: Buffer) => new TextDecoder().decode(req);

const getKey = async () => {
    const key = crypto.getRandomValues(Buffer.from(secret_key , "utf-8"));
    return await crypto.subtle.importKey(
        "raw",key,"AES-GCM",true , ["encrypt" , "decrypt"]
    );
}

export const encrypToken = () => {
    
}

export const decrypToken = () => {
    
}