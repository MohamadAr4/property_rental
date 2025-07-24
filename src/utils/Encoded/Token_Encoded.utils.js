import jwt from "jsonwebtoken";
const TokenSign = (user) => {
  const token = jwt.sign(
    { id: user.id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  return token;
};

export default TokenSign;
