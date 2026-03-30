export type userLogin = {
    email: string;
    password: string;
};

export type userToken = {
    id: string;
    email: string;
    username: string;
    role: "user" | "seller";
    expired: Date;
    created_at: Date;
};

export type monitoring = {
    id: string;
    ip_addres: string;
    device_type: string;
    id_user: string;
    roles: string;
    failed: boolean;
    action: string;
    failed_message: string;
};

export type userRegisterValue = {
    email: string;
    password: string;
    username: string;
    role: "user" | "seller";
};

export type refreshTokenCreate = {
    user_id: string;
    expired: Date;
    created_at: Date;
};

export type refreshToken = {
    id: string,
    role: "seller" | "user",
    created_at: Date,
    expired: Date
} 
