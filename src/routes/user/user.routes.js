import { Router } from "express";
import { createUser, updateUser } from "../../controller/user/user.controller.js";

const router = Router();

router.post('/',createUser);
router.put('/:id',updateUser);


export default router;