import { Router } from "express";
import { list, get, create, update, remove, join, listMembers, updateMember, removeMember } from "../controllers/workspace.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// All workspace routes require authentication
router.use(authenticate);

router.get("/", list);
router.post("/", create);
router.get("/:id", get);
router.patch("/:id", update);
router.delete("/:id", remove);

// Member routes
router.post("/:id/join", join);
router.get("/:id/members", listMembers);
router.patch("/:id/members/:memberId", updateMember);
router.delete("/:id/members/:memberId", removeMember);

export default router;
