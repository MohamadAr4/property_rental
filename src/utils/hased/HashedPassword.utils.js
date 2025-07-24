import bcrypt from "bcryptjs";

const HashedPassword = (password) => {
  const hashedPassword = bcrypt.hashSync(password, 8);
  return hashedPassword;
};
export default HashedPassword;
