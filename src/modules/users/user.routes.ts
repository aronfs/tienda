import { Router } from "express";
import { createUserSchema, updateUserSchema } from "./user.schema";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as userController from "./user.controller";

const router = Router();

router.use(authenticate);

router.get("/", authorize("users:manage"), userController.findAll);
router.get("/:id", authorize("users:manage"), userController.findById);
router.post("/", authorize("users:manage"), validate(createUserSchema), userController.create);
router.put("/:id", authorize("users:manage"), validate(updateUserSchema), userController.update);
router.patch("/:id/deactivate", authorize("users:manage"), userController.deactivate);

export default router;
