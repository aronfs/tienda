import { Router } from "express";
import { createCategorySchema, updateCategorySchema } from "./category.schema";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import * as categoryController from "./category.controller";

const router = Router();

router.use(authenticate);

router.get("/", categoryController.findAll);
router.post("/", authorize("products:create"), validate(createCategorySchema), categoryController.create);
router.put("/:id", authorize("products:update"), validate(updateCategorySchema), categoryController.update);
router.patch("/:id/deactivate", authorize("products:delete"), categoryController.deactivate);

export default router;
