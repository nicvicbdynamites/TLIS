import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import generateRouter from "./generate.js";
import integrationsRouter from "./integrations.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(generateRouter);
router.use(integrationsRouter);

export default router;
