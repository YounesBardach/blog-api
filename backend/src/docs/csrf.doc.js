/**
 * @swagger
 * /api/csrf-token:
 *   get:
 *     summary: Get CSRF Token
 *     description: Get a CSRF token for making authenticated requests. This token is required for all non-GET requests. The token is automatically set as a cookie and will be used by the Swagger UI for subsequent requests.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: CSRF token set successfully and returned in response body. The XSRF-TOKEN cookie is also set.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: XSRF-TOKEN=abc123xyz; Path=/; HttpOnly; Secure; SameSite=Strict
 *             description: Sets the XSRF-TOKEN cookie. The actual token value will vary.
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
 *                   example: CSRF token set successfully
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
