/**
 * @swagger
 * tags:
 *   name: 1. General
 *   description: General-purpose endpoints
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get API status
 *     tags: [1. General]
 *     description: >
 *       Simple health check to verify the API is running.
 *       For CSRF, use the JSON endpoint `GET /api/csrf-token` which returns `{ csrfToken }`.
 *     responses:
 *       200:
 *         description: API is running.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Welcome to the Blog API
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
