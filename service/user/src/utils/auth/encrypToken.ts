import { nanoid } from "nanoid";
import { env } from "../../config";

const encode = (req: string) => new TextEncoder().encode(req);
const decode = (req: ArrayBuffer) => new TextDecoder().decode(req);

const getKey = async () => {
    const raw = encode(env.SECRET_KEY);
    const key = await crypto.subtle.digest("SHA-256", raw);
    return await crypto.subtle.importKey("raw", key, "AES-GCM", false, [
        "encrypt",
        "decrypt",
    ]);
};

export const encrypToken = async (val: string) => {
    const key = await getKey();
    const unique = nanoid(12);
    const iv = encode(unique);
    const buffer = encode(val);
    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv,
        },
        key,
        buffer,
    );
    const bytes = new Uint8Array(encrypted);
    const token = unique + bytes.toBase64();
    return token;
};

export const decrypToken = async (token: string) => {
    const key = await getKey();
    const unique = token.substring(0, 12);
    const iv = encode(unique);
    const rawToken = encode(token.slice(12));
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv,
        },
        key,
        rawToken,
    );
    return decode(decrypted);
};
