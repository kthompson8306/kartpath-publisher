import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicationsRouter from "./publications";
import authRouter from "./auth";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicationsRouter);
router.use(authRouter);
router.use(storageRouter);

export default router;
