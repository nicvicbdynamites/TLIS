import { Router, type IRouter } from "express";
import healthRouter        from "./health.js";
import generateRouter      from "./generate.js";
import integrationsRouter  from "./integrations.js";
import trendsRouter        from "./trends.js";
import redditRouter        from "./reddit.js";
import searchConsoleRouter from "./search-console.js";
import ahrefsRouter        from "./ahrefs.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(generateRouter);
router.use(integrationsRouter);
router.use(trendsRouter);
router.use(redditRouter);
router.use(searchConsoleRouter);
router.use(ahrefsRouter);

export default router;
