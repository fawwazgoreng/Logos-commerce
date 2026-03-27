export type userLogin = {
    email: string;
    password: string;
};

export type userRegister = {
    email: string;
    password: string;
    username: string;
    role: "user" | "seller";
    image: File;
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
    image: string;
};

export type refresh_token_create = {
    user_id: string;
    expired: Date;
    created_at: Date;
};
