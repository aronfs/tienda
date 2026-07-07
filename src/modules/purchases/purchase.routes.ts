import { Router } from "express";
import { createPurchaseSchema } from "./purchase.schema";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as purchaseController from "./purchase.controller";

const router = Router();

router.use(authenticate);

router.get("/", authorize("purchases:read"), purchaseController.findAll);
router.get("/:id", authorize("purchases:read"), purchaseController.findById);
router.post("/", authorize("purchases:create"), validate(createPurchaseSchema), purchaseController.create);

export default router;
