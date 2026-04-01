import { ZodError } from "zod";
import { createPhotoProfile, userRegisterValue } from "../type/userTypes";
import { UserValidate } from "./user.validate";
import UserModel from "./user.model";
import { hashingPassword } from "../utils/hashPasword";
import ImageHelper from "../utils/image";

export default class UserWrite {
    constructor(
        private userValidate = new UserValidate(),
        private userModel = new UserModel(),
        private imageHelp = new ImageHelper("profile") 
    ) {}

    // Register a new user with hashed password
    register = async (req: userRegisterValue) => {
        try {
            const validated = this.userValidate.register(req);
            const hashedPassword = await hashingPassword(validated.password);
            
            const payload: userRegisterValue = {
                ...validated,
                password: hashedPassword,
            };
            
            return await this.userModel.register(payload);
        } catch (error) {
            throw this.handleError(error);
        }
    };

    // Update user verification status
    verify = async (id: string) => {
        try {
            return await this.userModel.verified(id);
        } catch (error) {
            throw this.handleError(error);
        }
    };

    // Upload and link a new profile photo
    uploadPhotoProfile = async (req: createPhotoProfile) => {
        try {
            const validated = this.userValidate.uploadImage(req);
            const url = await this.imageHelp.save(validated.image);
            
            return await this.userModel.editProfile({
                image: url,
                id: req.user_id
            });
        } catch (error) {
            throw this.handleError(error);
        }
    };

    // Replace existing profile photo with a new one
    editPhotoProfile = async (req: createPhotoProfile) => {
        try {
            const validated = this.userValidate.uploadImage(req);
            const oldUrl = await this.userModel.getProfile(req.user_id) ?? "";
            
            // ImageHelper.edit handles deletion of the old file
            const newUrl = await this.imageHelp.edit(oldUrl, validated.image);
            
            return await this.userModel.editProfile({
                image: newUrl,
                id: req.user_id,
                path: oldUrl
            });
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Remove profile photo from storage and database
    deletePhotoProfile = async (user_id: string) => {
        try {
            const url = await this.userModel.deleteProfile(user_id); 
            return this.imageHelp.delete(url);
        } catch (error) {
            throw this.handleError(error);
        }
    };

    // Centralized error mapping for Zod and internal errors
    private handleError(error: any) {
        if (error instanceof ZodError) {
            return {
                status: 422,
                message: error.issues[0].message,
                error: error.cause,
            };
        }
        return {
            status: error.status || 500,
            message: error.message || "Internal server error",
            error: error.error || "Internal server error",
        };
    }
}