export type userLogin = {
    email: string,
    password: string
} 

export type userRegister = {
    email: string,
    password: string,
    username: string,
    role: "user" | "seller",
    image: string
}