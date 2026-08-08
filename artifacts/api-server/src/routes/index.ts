import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicationsRouter from "./publications";
import authRouter from "./auth";
import storageRouter from "./storage";
import editorialRouter from "./editorial";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicationsRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(editorialRouter);

export default router;
