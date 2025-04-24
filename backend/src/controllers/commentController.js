import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the comment
 *         content:
 *           type: string
 *           description: The comment content
 *         postId:
 *           type: string
 *           description: The ID of the post this comment belongs to
 *         authorId:
 *           type: string
 *           description: The ID of the comment author
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the comment was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the comment was last updated
 */

/**
 * @swagger
 * /posts/{postId}/comments:
 *   post:
 *     summary: Create a new comment on a post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: string
 *         required: true
 *         description: The post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Post not found
 */
export const createComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new AppError('Post not found', 404);
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        post: {
          connect: { id: postId },
        },
        author: {
          connect: { id: req.user.id },
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      comment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Update a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to update this comment
 *       404:
 *         description: Comment not found
 */
export const updateComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: { author: true },
    });

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    // Check if user is the comment author or an admin
    if (comment.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('Not authorized to update this comment', 403);
    }

    const updatedComment = await prisma.comment.update({
      where: { id: req.params.id },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    res.json({
      success: true,
      comment: updatedComment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to delete this comment
 *       404:
 *         description: Comment not found
 */
export const deleteComment = async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: { author: true },
    });

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    // Check if user is the comment author or an admin
    if (comment.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('Not authorized to delete this comment', 403);
    }

    await prisma.comment.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Comment removed'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /posts/{postId}/comments:
 *   get:
 *     summary: Get all comments for a post
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: string
 *         required: true
 *         description: The post ID
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 */
export const getPostComments = async (req, res, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: req.params.postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      comments
    });
  } catch (error) {
    next(error);
  }
}; 