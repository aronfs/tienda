import { Router } from "express";
import { createReturnSchema } from "./return.schema";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as returnController from "./return.controller";

const router = Router();

router.use(authenticate);

router.get("/", authorize("sales:read"), returnController.findAll);
router.post("/", authorize("sales:create"), validate(createReturnSchema), returnController.create);

export default router;
