export const roleChecker = (allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(401).json({ message: "Unauthorized: Insufficient permissions" }); // ⚠️ Must use `return`
  }
  next(); // Only proceed if role is allowed
};