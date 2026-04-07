import { createPhotoProfile, userRegisterValue } from "../type/userTypes";
import { UserValidate } from "./user.validate";
import UserModel from "./user.model";
import { hashingPassword } from "../utils/auth/hashPasword";
import ImageHelper from "../utils/etc/image";
import { AppError } from "../utils/error";

export default class UserWrite {
    constructor(
        private userValidate = new UserValidate(),
        private userModel = new UserModel(),
        private imageHelp = new ImageHelper("profile"),
    ) {}

    // REGISTER
    register = async (req: userRegisterValue) => {
        // 1. validate
        const validated = this.userValidate.register(req);

        // 2. hash password
        const hashedPassword = await hashingPassword(validated.password);

        // 3. create user
        const payload: userRegisterValue = {
            ...validated,
            password: hashedPassword,
        };

        return this.userModel.create(payload);
    };

    // VERIFY USER
    verify = async (id: string) => {
        const user = await this.userModel.findById(id);

        if (!user) {
            throw new AppError("User not found", 404, "USER_NOT_FOUND");
        }

        return this.userModel.verify(id);
    };

    // UPLOAD PHOTO
    uploadPhotoProfile = async (req: createPhotoProfile) => {
        // 1. validate
        const validated = this.userValidate.uploadImage(req);

        // 2. check user exist
        const user = await this.userModel.getId(req.user_id);
        if (!user) {
            throw new AppError("User not found", 404, "USER_NOT_FOUND");
        }

        // 3. save image
        const url = await this.imageHelp.save(validated.image);

        // 4. update DB
        return this.userModel.updateProfileImage({
            id: req.user_id,
            image: url,
        });
    };

    // EDIT PHOTO
    editPhotoProfile = async (req: createPhotoProfile) => {
        // 1. validate
        const validated = this.userValidate.uploadImage(req);

        // 2. get current image
        const current = await this.userModel.getProfileImage(req.user_id);

        if (!current) {
            throw new AppError("User not found", 404, "USER_NOT_FOUND");
        }

        const oldUrl = current.image || "";

        // 3. replace image (auto delete old)
        const newUrl = await this.imageHelp.edit(oldUrl, validated.image);

        // 4. update DB
        return this.userModel.updateProfileImage({
            id: req.user_id,
            image: newUrl,
            path: oldUrl,
        });
    };

    // DELETE PHOTO
    deletePhotoProfile = async (user_id: string) => {
        // 1. get current image
        const current = await this.userModel.getProfileImage(user_id);

        if (!current) {
            throw new AppError("User not found", 404, "USER_NOT_FOUND");
        }

        const url = current.image;

        // 2. delete from storage
        if (url) {
            this.imageHelp.delete(url);
        }

        // 3. clear DB
        return this.userModel.clearProfileImage(user_id);
    };
}
