import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import PasswordChecker from "../../utils/checker/Password_checker.utils.js";
import TokenSign from "../../utils/Encoded/Token_Encoded.utils.js";
import { statusCode200, statusCode201 } from "../../utils/API/status_code/200/200.API.status_code.js";
import convertBigIntToString from "../../utils/Converter/ConverterBTS.utils.js";
const prisma = new PrismaClient();

//register is done
const register = async (req, res) => {
  //first step is to define what we will expext to come from the request body.
  const { name, email, phone_number, location, longitude, latitude, password } =
    req.body;

  //then we make the password hashed
  const hashedPassword = bcrypt.hashSync(password, 8);

  try {
    //make the connection with the ORM to create the user
    const user = await prisma.user.create({
      data: {
        name: name,
        email: email,
        phone_number: phone_number,
        location: location,
        password: hashedPassword,
        role: Role.USER,
      },
    });
    //create the token using user data and hash it
    const token = TokenSign(user);
    //get the password out of the user 
    const { password: _, ...userData } = user;
    //convert the id in the user form BigInt to string
    const userWithStringIds = {
      ...userData,
      id: userData.id.toString(),
      role: Role.USER,
    };
    //send status code of 201 created
    return statusCode201(res, "User created successfully", {
      user: userWithStringIds,
      token,
    });
  } catch (error) {
    //this error code to show that the user is already exists
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: `${error.meta.target} Already exists` });
    }
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

//login is done
const login = async (req, res) => {
  const { phone_number, email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { phone_number: phone_number, email: email },
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    //compair the password from the request body and the actual password
    await PasswordChecker(password, user, res);

    const token = TokenSign(user);

    const userData = convertBigIntToString(user);

    return statusCode200(res, "User retrieved successfully", {
      user: userData,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error,
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export { register  , login};
