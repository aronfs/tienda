import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { createBranchSchema, updateBranchSchema } from "./branch.schema";
import * as branchController from "./branch.controller";

const router = Router();
router.use(authenticate);

router.get("/", authorize("branches:read"), branchController.findAll);
router.get("/:id", authorize("branches:read"), branchController.findById);
router.post("/", authorize("branches:create"), validate(createBranchSchema), branchController.create);
router.put("/:id", authorize("branches:update"), validate(updateBranchSchema), branchController.update);
router.patch("/:id/status", authorize("branches:update"), branchController.updateStatus);
router.patch("/:id/set-main", authorize("branches:update"), branchController.setMain);
router.delete("/:id", authorize("branches:delete"), branchController.remove);

export default router;