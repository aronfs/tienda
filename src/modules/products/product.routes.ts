import { Router } from "express";
import { createProductSchema, updateProductSchema } from "./product.schema";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as productController from "./product.controller";

const router = Router();

router.use(authenticate);

router.get("/", productController.findAll);
router.get("/low-stock", productController.getLowStock);
router.get("/:id", productController.findById);
router.post("/", authorize("products:create"), validate(createProductSchema), productController.create);
router.put("/:id", authorize("products:update"), validate(updateProductSchema), productController.update);
router.patch("/:id/deactivate", authorize("products:delete"), productController.deactivate);

export default router;
