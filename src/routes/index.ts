import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";
import roleRoutes from "../modules/roles/role.routes";
import categoryRoutes from "../modules/categories/category.routes";
import productRoutes from "../modules/products/product.routes";
import providerRoutes from "../modules/providers/provider.routes";
import clientRoutes from "../modules/clients/client.routes";
import purchaseRoutes from "../modules/purchases/purchase.routes";
import saleRoutes from "../modules/sales/sale.routes";
import inventoryRoutes from "../modules/inventory/inventory.routes";
import cashRegisterRoutes from "../modules/cash-register/cashRegister.routes";
import returnRoutes from "../modules/returns/return.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import analyticsRoutes from "../modules/analytics/analytics.routes";
import setupRoutes from "../modules/setup/setup.routes";
import companyRoutes from "../modules/company/company.routes";
import branchRoutes from "../modules/branches/branch.routes";
import taxRoutes from "../modules/taxes/tax.routes";
import billingRoutes from "../modules/billing/billing.routes";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import * as auditService from "../modules/audit/audit.service";

const router = Router();

router.use("/auth", authRoutes);
router.use("/setup", setupRoutes);

router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/company", companyRoutes);
router.use("/branches", branchRoutes);
router.use("/taxes", taxRoutes);
router.use("/billing", billingRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/providers", providerRoutes);
router.use("/clients", clientRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/sales", saleRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/cash-register", cashRegisterRoutes);
router.use("/returns", returnRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/analytics", analyticsRoutes);

router.get(
  "/audit",
  authenticate,
  authorize("users:manage"),
  asyncHandler(async (_req, res) => {
    const logs = await auditService.findAll();
    sendSuccess(res, logs);
  })
);

export default router;