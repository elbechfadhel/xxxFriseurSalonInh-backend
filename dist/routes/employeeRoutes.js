"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const employeeController_1 = require("../controllers/employeeController");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// Get all employees
router.get('/', employeeController_1.getAllEmployees);
// Get employee photo
router.get('/:id/photo', employeeController_1.getEmployeePhoto); // <-- Add this route
// Get single employee
router.get('/:id', employeeController_1.getEmployeeById);
// Create employee (with optional photo upload)
router.post('/', upload_1.upload.single('photo'), employeeController_1.createEmployee);
// Update employee (with optional photo upload)
router.put('/:id', upload_1.upload.single('photo'), employeeController_1.updateEmployee);
// Delete employee
router.delete('/:id', employeeController_1.deleteEmployee);
exports.default = router;
