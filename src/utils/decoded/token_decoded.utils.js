import jwt from 'jsonwebtoken';

export const tokenDecoded = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded;
};