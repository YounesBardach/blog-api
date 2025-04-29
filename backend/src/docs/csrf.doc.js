/**
 * @swagger
 * /api/csrf-token:
 *   get:
 *     summary: Get CSRF Token
 *     description: Get a CSRF token for making authenticated requests. This token is required for all non-GET requests. The token is automatically set as a cookie and will be used by the Swagger UI for subsequent requests.
 *     tags: [Authentication]
 *     responses:
 *       204:
 *         description: CSRF token cookie set successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Sets the XSRF-TOKEN cookie for subsequent requests
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */ 