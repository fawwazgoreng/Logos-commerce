export interface createEmailType {
    user_id: string,
    code: string,
    status: string,
    expired: Date,
}

export type emailType = {
    id: string,
    user_id: string,
    code: string,
    status: string,
    expired: Date,
}

export type emailTypeWithUser = emailType & {
    user: {
        id: string
    }
}

export interface createEmailTypeWithHashed {
    user_id: string,
    code: string,
    hashedCode: string,
    status: string,
    expired: Date,
}
