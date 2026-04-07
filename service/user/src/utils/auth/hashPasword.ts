export const hashingPassword = async (password : string) => {
    return await Bun.password.hash(password, 'bcrypt');
}

export const checkPassword = async (req: { password: string, hashed: string }) => {
    return await Bun.password.verify(req.password, req.hashed, 'bcrypt');
}