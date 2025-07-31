import { Router } from "express";
import { createUser, getUser, updateUser } from "../../controller/user/user.controller.js";

const router = Router();

router.post('/',createUser);
router.get('/',getUser);
router.get('/:id',getUser);
router.put('/:id',updateUser);


export default router;