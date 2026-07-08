import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { setupInitializeSchema } from "./setup.schema";
import * as setupController from "./setup.controller";

const router = Router();

router.get("/status", setupController.getStatus);
router.post("/initialize", authenticate, authorize("setup:initialize"), validate(setupInitializeSchema), setupController.initialize);

export default router;