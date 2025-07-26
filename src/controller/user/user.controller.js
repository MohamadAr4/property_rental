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

const getUser = async (req, res) => {};

const deleteUser = async (req, res) => {};

export { createUser, getUser, updateUser, deleteUser };
