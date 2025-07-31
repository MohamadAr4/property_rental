import { PrismaClient } from "@prisma/client";
import { tokenDecoded } from "../../utils/decoded/token_decoded.utils.js";
import {
  statusCode400,
  statusCode401,
  statusCode403,
  statusCode404,
  statusCode500,
} from "../../utils/API/status_code/400/400.API.status_code.js";
import {
  statusCode200,
  statusCode201,
} from "../../utils/API/status_code/200/200.API.status_code.js";
import { userAccess } from "../../utils/checker/userAccess.utils.js";
import HashedPassword from "../../utils/hased/HashedPassword.utils.js";
import TokenSign from "../../utils/Encoded/Token_Encoded.utils.js";
import convertBigIntToString from "../../utils/Converter/ConverterBTS.utils.js";
const prisma = new PrismaClient();

//create is done
const createUser = async (req, res) => {
  const {
    name,
    phone_number,
    email,
    location,
    latitude,
    longitude,
    password,
    role,
    company_id,
  } = req.body;

  try {
    //check if user is authenticated and authorized to create user
    const userToken = req.headers.authorization?.split(" ")[1];
    //now lets decode the token
    const decodedToken = tokenDecoded(userToken);
    //now we want to check if the user role can create the role which sent in the request body
    if (userToken) {
      userAccess(decodedToken, role, res);
    }
    const hashedPassword = HashedPassword(password);
    const userData = {
      name: name,
      phone_number: phone_number,
      password: hashedPassword,
      location: location,
      latitude: latitude || null,
      longitude: longitude || null,
      role: role,
      email: email,
    };
    // When COMPANY creates an AGENT
    if (role === "AGENT" && decodedToken.role === "COMPANY") {
      // Find the brokerage company of the current COMPANY user
      const brokerage = await prisma.brokerageCompany.findUnique({
        where: { user_id: BigInt(decodedToken.id) },
      });

      if (!brokerage) {
        throw new Error("COMPANY user has no associated brokerage");
      }

      // Create the user with brokerage connection
      const user = await prisma.user.create({
        data: {
          ...userData,
          role: "AGENT",
          agent: {
            create: {
              company_id: BigInt(brokerage.id),
              license_number: 12345, // your license number
            },
          },
        },
        include: { agent: true },
      });
      const token = TokenSign(user);
      const { password: _, ...userWithoutPassword } =
        convertBigIntToString(user);

      return statusCode201(res, "User created successfully", {
        ...userWithoutPassword,
        token,
      });
    }
    //when ADMIN or SUPERADMIN create AGENT
    else if (role === "AGENT") {
      const user = await prisma.user.create({
        data: {
          ...userData,
          role: "AGENT",
          agent: {
            create: {
              company_id: BigInt(company_id),
              license_number: 12345,
            },
          },
        },
        include: { agent: true },
      });
      const token = TokenSign(user);
      const { password: _, ...userWithoutPassword } =
        convertBigIntToString(user);

      return statusCode201(res, "User created successfully", {
        ...userWithoutPassword,
        token,
      });
    }
    //when SUPERADMIN create ADMI/COMPANY
    else {
      const user = await prisma.user.create({
        data: userData,
      });
      const token = TokenSign(user);
      const { password: _, ...userWithoutPassword } =
        convertBigIntToString(user);

      return statusCode201(res, "User created successfully", {
        ...userWithoutPassword,
        token,
      });
    }
  } catch (error) {
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      return statusCode400(
        res,
        field ? `${field} already exists` : "Duplicate entry"
      );
    }
    console.error("Create user error:", error);
    return statusCode500(res, "Internal server error", error);
  }
};
//update is done
const updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    phone_number,
    email,
    location,
    latitude,
    longitude,
    password,
    role,
    company_id,
    license_number, // For agent updates
  } = req.body;

  try {
    // Authentication check
    const userToken = req.headers.authorization?.split(" ")[1];
    if (!userToken) return statusCode401(res, "Unauthorized");

    const decoded = tokenDecoded(userToken);
    if (!decoded) return statusCode401(res, "Invalid token");

    // Get target user with necessary relations
    const targetUser = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: {
        agent: true,
        brokerage: true,
      },
    });

    if (!targetUser) return statusCode404(res, "User not found");

    // Authorization logic
    const isSelfUpdated = decoded.id === id;
    const isSuperAdmin = decoded.role === "SUPERADMIN";
    const isAdmin = decoded.role === "ADMIN";
    const isCompany = decoded.role === "COMPANY";

    let canUpdate = false;
    let canUpdateRole = false;
    let canUpdateCompany = false;

    if (isSuperAdmin) {
      canUpdate = true;
      canUpdateRole = true;
      canUpdateCompany = true;
    } else if (isAdmin) {
      canUpdate =
        isSelfUpdated || ["COMPANY", "AGENT"].includes(targetUser.role);
      canUpdateRole = false; // Admins can't change roles
      canUpdateCompany = false;
    } else if (isCompany) {
      // Company can only update their agents or themselves
      const isOwnAgent =
        targetUser.role === "AGENT" &&
        targetUser.brokerage?.id === BigInt(decoded.id);
      canUpdate = isSelfUpdated || isOwnAgent;
      canUpdateRole = false;
      canUpdateCompany = false;
    } else {
      canUpdate = isSelfUpdated;
      canUpdateRole = false;
      canUpdateCompany = false;
    }

    if (!canUpdate) {
      return statusCode403(res, "Unauthorized");
    }

    // Prepare update data
    const updateData = {
      ...(name && { name }),
      ...(phone_number && { phone_number }),
      ...(email && { email }),
      ...(location && { location }),
      ...(latitude && { latitude }),
      ...(longitude && { longitude }),
      ...(password && { password: HashedPassword(password) }),
      ...(canUpdateRole && role && { role }),
    };

    // Handle company/brokerage updates
    if (company_id && canUpdateCompany) {
      updateData.brokerage = { connect: { id: BigInt(company_id) } };
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        agent: true,
        brokerage: true,
      },
    });

    // Handle agent-specific updates
    if (targetUser.role === "AGENT" && license_number) {
      await prisma.agent.update({
        where: { user_id: BigInt(id) },
        data: { license_number: parseInt(license_number) },
      });
    }

    // Prepare response
    const { password: _, ...userWithoutPassword } =
      convertBigIntToString(updatedUser);
    return statusCode200(res, "User updated successfully", userWithoutPassword);
  } catch (error) {
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      return statusCode400(
        res,
        field ? `${field} already exists` : "Duplicate entry"
      );
    }
    console.error("Error updating user:", error);
    return statusCode500(res, "Internal server error", error);
  }
};

const getUser = async (req, res) => {
  const { id } = req.params;
  const { name, phone_number, email, location, role, company_id } = req.query;

  try {
    // Handle single user request
    if (id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: BigInt(id) },
        include: {
          agent: true,
          brokerage: true,
        },
      });

      if (!currentUser) {
        return statusCode404(res, "User not found");
      }

      // Check authorization for single user
      const userToken = req.headers.authorization?.split(" ")[1];
      if (userToken) {
        const decoded = tokenDecoded(userToken);
        const isSelf = decoded.id === id;
        const isAdmin = ["SUPERADMIN", "ADMIN"].includes(decoded.role);
        const isCompanyViewingAgent =
          decoded.role === "COMPANY" &&
          currentUser.role === "AGENT" &&
          currentUser.brokerage?.id === BigInt(decoded.id);

        if (!isSelf && !isAdmin && !isCompanyViewingAgent) {
          return statusCode403(res, "Unauthorized to view this user");
        }
      }

      const userData = convertBigIntToString(currentUser);
      return statusCode200(res, "User retrieved successfully", userData);
    }
    // Handle multiple users request
    else {
      const userToken = req.headers.authorization?.split(" ")[1];
      if (!userToken) {
        return statusCode401(res, "Unauthorized");
      }

      const decoded = tokenDecoded(userToken);
      if (!decoded) {
        return statusCode401(res, "Invalid token");
      }

      // Base where condition based on role
      let whereCondition = {};

      if (decoded.role === "SUPERADMIN") {
        whereCondition = { id: { not: BigInt(decoded.id) } }; // Exclude self
      } else if (decoded.role === "ADMIN") {
        whereCondition = { role: { in: ["COMPANY", "AGENT", "USER"] } };
      } else if (decoded.role === "COMPANY") {
        whereCondition = {
          OR: [
            { role: "AGENT", brokerage: { id: BigInt(decoded.id) } },
            { id: BigInt(decoded.id) }, // Include self
          ],
        };
      } else {
        return statusCode403(res, "Insufficient privileges");
      }

      // Add search filters
      if (name) {
        whereCondition.name = { contains: name, mode: "insensitive" };
      }
      if (email) {
        whereCondition.email = { contains: email, mode: "insensitive" };
      }
      if (phone_number) {
        whereCondition.phone_number = { contains: phone_number };
      }
      if (location) {
        whereCondition.location = { contains: location, mode: "insensitive" };
      }

      // Role filter with authorization check
      if (role) {
        if (
          decoded.role === "ADMIN" &&
          !["COMPANY", "AGENT", "USER"].includes(role)
        ) {
          return statusCode403(res, "Cannot filter by this role");
        }
        if (decoded.role === "COMPANY" && role !== "AGENT") {
          return statusCode403(res, "Can only filter AGENTs");
        }
        whereCondition.role = role;
      }

      // Company filter with authorization check
      if (company_id) {
        if (decoded.role === "SUPERADMIN") {
          whereCondition.brokerage = { id: BigInt(company_id) };
        } else {
          // Only allow filtering by own company
          whereCondition.brokerage = { id: BigInt(decoded.id) };
        }
      }

      const allUsers = await prisma.user.findMany({
        where: whereCondition,
        include: {
          brokerage: true,
          agent: true,
        },
      });

      const usersWithStringIds = allUsers.map(convertBigIntToString);
      return statusCode200(
        res,
        "Users retrieved successfully",
        usersWithStringIds
      );
    }
  } catch (error) {
    console.error("Error getting user(s):", error);
    return statusCode500(res, "Internal server error", error);
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    // Authentication check
    const userToken = req.headers.authorization?.split(" ")[1];
    if (!userToken) return statusCode401(res, "Unauthorized");

    const decoded = tokenDecoded(userToken);
    if (!decoded) return statusCode401(res, "Invalid token");

    // Get target user with relations
    const targetUser = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: {
        agent: true,
        brokerage: true,
      },
    });

    if (!targetUser) return statusCode404(res, "User not found");

    // Authorization logic
    const isSelf = decoded.id === id;
    const isSuperAdmin = decoded.role === "SUPERADMIN";
    const isAdmin = decoded.role === "ADMIN";
    const isCompany = decoded.role === "COMPANY";

    let canDelete = false;

    if (isSuperAdmin) {
      canDelete = true; // Super admin can delete anyone
    } else if (isAdmin) {
      // Admin can delete COMPANY, AGENT, and USER but not other ADMINS or SUPERADMIN
      canDelete = ["COMPANY", "AGENT", "USER"].includes(targetUser.role);
    } else if (isCompany) {
      // Company can only delete their own agents or themselves
      const isOwnAgent =
        targetUser.role === "AGENT" &&
        targetUser.brokerage?.id === BigInt(decoded.id);
      canDelete = isSelf || isOwnAgent;
    } else {
      // Regular users can only delete themselves
      canDelete = isSelf;
    }

    if (!canDelete) {
      return statusCode403(res, "Unauthorized to delete this user");
    }

    // Handle special cases before deletion
    if (targetUser.role === "COMPANY") {
      // Delete all agents first if deleting a company
      await prisma.agent.deleteMany({
        where: { company_id: BigInt(decoded.id) },
      });
    }

    // Perform deletion in transaction
    await prisma.$transaction(async (tx) => {
      // Delete related records based on role
      if (targetUser.role === "AGENT" && targetUser.agent) {
        await tx.agent.delete({
          where: { id: targetUser.agent.id },
        });
      } else if (targetUser.role === "COMPANY" && targetUser.brokerage) {
        await tx.brokerageCompany.delete({
          where: { id: targetUser.brokerage.id },
        });
      }

      // Finally delete the user
      await tx.user.delete({
        where: { id: BigInt(id) },
      });
    });

    return statusCode200(res, "User deleted successfully");
  } catch (error) {
    console.error("Error deleting user:", error);

    if (error.code === "P2025") {
      return statusCode404(res, "User not found or already deleted");
    }

    return statusCode500(res, "Internal server error", error);
  }
};

export { createUser, getUser, updateUser, deleteUser };
