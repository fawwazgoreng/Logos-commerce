export interface createEmailType {
    user_id: string,
    code: string,
    status: string,
    expired: Date,
}

export interface createEmailTypeWithHashed {
    user_id: string,
    code: string,
    hashedCode: string,
    status: string,
    expired: Date,
}
