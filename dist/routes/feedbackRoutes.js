"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const feedbackController_1 = require("../controllers/feedbackController");
const router = express_1.default.Router();
router.post("/", feedbackController_1.createFeedback);
router.get("/", feedbackController_1.listFeedback);
router.patch("/:id/approve", feedbackController_1.validateFeedback);
router.delete("/:id", feedbackController_1.deleteFeedback);
exports.default = router;
