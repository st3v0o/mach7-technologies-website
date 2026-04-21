import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactRouter from "./contact";
import portalRouter from "./portal";
import metroProxy from "./metro-proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contactRouter);
router.use("/portal", portalRouter);

if (process.env.NODE_ENV !== "production") {
  router.use(metroProxy);
}

export default router;
