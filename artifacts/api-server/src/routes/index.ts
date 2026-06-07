import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import walletRouter from "./wallet";
import sportsRouter from "./sports";
import settleRouter from "./settle";
import betsRouter from "./bets";
import adminRouter from "./admin";
import vouchersRouter from "./vouchers";
import profileRouter from "./profile";
import withdrawalsRouter from "./withdrawals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(walletRouter);
router.use(sportsRouter);
router.use(settleRouter);
router.use(betsRouter);
router.use(adminRouter);
router.use(vouchersRouter);
router.use(profileRouter);
router.use(withdrawalsRouter);

export default router;
