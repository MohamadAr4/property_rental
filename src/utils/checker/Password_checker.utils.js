import bcrypt from "bcryptjs";
const PasswordChecker = (password , user , res) => {
 if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid password" });
    };
};

export default PasswordChecker;