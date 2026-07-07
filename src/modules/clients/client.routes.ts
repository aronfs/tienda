import { Router } from "express";
import { createClientSchema, updateClientSchema } from "./client.schema";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as clientController from "./client.controller";

const router = Router();

router.use(authenticate);

router.get("/", clientController.findAll);
router.post("/", authorize("sales:create"), validate(createClientSchema), clientController.create);
router.put("/:id", authorize("sales:create"), validate(updateClientSchema), clientController.update);

export default router;
