import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

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