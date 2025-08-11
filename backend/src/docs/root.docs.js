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
 *       For CSRF, use the JSON endpoint `GET /api/csrf-token`. It returns `{ csrfToken }` and sets the
 *       readable `XSRF-TOKEN` cookie for cross-origin use. For POST/PUT/PATCH/DELETE, include the value
 *       in the `X-XSRF-TOKEN` header. The cookie attributes are `Secure; SameSite=None` in production
 *       to support cross-site requests.
 *     responses:
 *       200:
 *         description: API is running and CSRF token cookie is set.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: XSRF-TOKEN=...; Path=/; Secure; SameSite=None
 *             description: >
 *               The `XSRF-TOKEN` cookie is set with attributes compatible with cross-origin usage.
 *               Send the same token back in the `X-XSRF-TOKEN` header for subsequent protected requests.
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
