export const tokenChecker = (res,token) => {
  if(!token){
    return res.status(401).json({ message: 'UnAuthorized' });
  }
};