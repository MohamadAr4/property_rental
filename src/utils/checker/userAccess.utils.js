import { statusCode403 } from "../API/status_code/400/400.API.status_code.js";

export const userAccess = (decoded, role, res) => {
  if (
    (decoded.role === "ADMIN" ||
      decoded.role === "OWNER" ||
      decoded.role === "AGENT") &&
    (role === "SUPER_ADMIN" || role === "ADMIN")
  ) {
    return res.status(500).json({ message: "unauthoraized" });
  } else if (decoded.role === "CUSTOMER" || role === "CUSTOMER") {
    return statusCode403(res, "Unauthorized role assignment");
  }
};
