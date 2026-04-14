import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactRouter from "./contact";
import metroProxy from "./metro-proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contactRouter);

if (process.env.NODE_ENV !== "production") {
  router.use(metroProxy);
}

export default router;
