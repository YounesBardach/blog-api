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
 *     summary: Get API status and CSRF Token
 *     tags: [1. General]
 *     description: >
 *       This endpoint can be used as a simple health check to see if the API is running.
 *       More importantly, making a GET request to this endpoint will set the `XSRF-TOKEN` cookie,
 *       which is required for making any subsequent state-changing requests (POST, PUT, DELETE).
 *       The Swagger UI will automatically handle this cookie and include the `X-XSRF-TOKEN` header
 *       in protected requests after you've hit this endpoint once.
 *     responses:
 *       200:
 *         description: API is running and CSRF token cookie is set.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: XSRF-TOKEN=...; Path=/; Secure; SameSite=Strict
 *             description: >
 *               The `XSRF-TOKEN` cookie is set in the browser. It contains the CSRF token
 *               that must be sent in the `X-XSRF-TOKEN` header for subsequent protected requests.
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
