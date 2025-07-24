import { Router } from "express";
import { login, register } from "../../controller/auth/auth.controller.js";
import {
  loginSchema,
  registerSchema,
  validate,
} from "../../validations/auth/auth.validation.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

export default router;
