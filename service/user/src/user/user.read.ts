import { userLogin, refreshToken, refreshTokenCreate } from "../type/userTypes";
import { UserValidate } from "./user.validate";
import UserModel from "./user.model";
import RefreshTokenModel from "./refresh.model";
import { decrypToken, encrypToken } from "../utils/auth/encrypToken";
import { checkPassword } from "../utils/auth/hashPasword";
import { AppError } from "../utils/error";

export default class UserRead {
    constructor(
        private validate = new UserValidate(),
        private userModel = new UserModel(),
        private refreshTokenModel = new RefreshTokenModel(),
    ) {}

    // LOGIN
    login = async (req: userLogin) => {
        // 1. validate input
        const payload = this.validate.login(req);

        // 2. find user
        const user = await this.userModel.findByEmail(payload.email);
        if (!user) {
            throw new AppError(
                "Invalid credentials",
                401,
                "INVALID_CREDENTIALS",
            );
        }

        if (!user.is_verify) {
            throw new AppError(
                "please veriy your gmail first",
                401,
                "INVALID_CREDENTIALS",
            );
        }

        // 3. check password
        const isValid = checkPassword({
            password: payload.password,
            hashed: user.password,
        });

        if (!isValid) {
            throw new AppError(
                "Invalid credentials",
                401,
                "INVALID_CREDENTIALS",
            );
        }

        // 4. build response
        const now = new Date();
        const expired = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

        const userResponse = {
            id: user.id,
            username: user.username,
            role: user.roles as "seller" | "user",
            email: user.email,
            created_at: now,
        };

        // 5. create refresh token (DB)
        const refreshPayload: refreshTokenCreate = {
            user_id: user.id,
            expired,
            created_at: now,
        };

        const refreshToken =
            await this.refreshTokenModel.create(refreshPayload);

        // 6. encrypt refresh token
        const refreshRaw = {
            id: refreshToken?.id,
            role: user.roles as "seller" | "user",
            created_at: now,
            expired,
        };

        const token = await encrypToken(JSON.stringify(refreshRaw));

        return {
            user: userResponse,
            token,
        };
    };

    // REFRESH TOKEN
    refresh = async (rawToken?: string) => {
        if (!rawToken) {
            throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
        }

        let parsed: refreshToken;

        // 1. decrypt token
        try {
            const decrypted = await decrypToken(rawToken);
            parsed = JSON.parse(decrypted);
        } catch {
            throw new AppError("Invalid token", 401, "INVALID_TOKEN");
        }

        const existedToken = await this.refreshTokenModel.find("", parsed.id);
        if (!existedToken) {
            throw new AppError("Invalid token", 401, "INVALID_TOKEN");
        }

        // 2. get user
        const user = await this.userModel.findById(parsed.id);

        if (!user) {
            throw new AppError("User not found", 404, "USER_NOT_FOUND");
        }

        // 3. return new payload
        return {
            id: user.id,
            username: user.username,
            role: user.roles as "seller" | "user",
            email: user.email,
            created_at: new Date(),
        };
    };
}
