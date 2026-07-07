import { Router } from "express";
import { createSaleSchema } from "./sale.schema";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as saleController from "./sale.controller";

const router = Router();

router.use(authenticate);

router.get("/", authorize("sales:read"), saleController.findAll);
router.get("/:id", authorize("sales:read"), saleController.findById);
router.post("/", authorize("sales:create"), validate(createSaleSchema), saleController.create);
router.patch("/:id/cancel", authorize("sales:create"), saleController.cancel);

export default router;
