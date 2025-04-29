/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Error message
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Error detail 1", "Error detail 2"]
 *         stack:
 *           type: string
 *           description: Error stack trace (only in development)
 *           example: "Error: ..."
 */ 