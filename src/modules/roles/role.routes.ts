import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as roleController from "./role.controller";

const router = Router();

router.use(authenticate);
router.get("/", authorize("users:manage"), roleController.findAll);

export default router;
