import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicationsRouter from "./publications";
import authRouter from "./auth";
import storageRouter from "./storage";
import editorialRouter from "./editorial";
import staffRouter from "./staff";
import engagementRouter from "./engagement";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicationsRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(editorialRouter);
router.use(staffRouter);
router.use(engagementRouter);

export default router;
