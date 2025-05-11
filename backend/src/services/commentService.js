import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

// Helper to select common fields for author
const authorSelect = {
  id: true,
  name: true,
  username: true,
};

export const findCommentsByPostId = async (postId) => {
  // Ensure post exists first (optional, but good practice)
  const postExists = await prisma.post.findUnique({ where: { id: postId } });
  if (!postExists) {
    throw new AppError('Post not found', 404, { resource: 'post', id: postId, code: 'RESOURCE_NOT_FOUND' });
  }

  return prisma.comment.findMany({
    where: { postId: postId },
    include: {
      author: { select: authorSelect },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const create = async (postId, commentData, authorId) => {
  const { content } = commentData;

  // Ensure post exists
  const postExists = await prisma.post.findUnique({ where: { id: postId } });
  if (!postExists) {
    throw new AppError('Post not found', 404, { resource: 'post', id: postId, code: 'RESOURCE_NOT_FOUND' });
  }

  return prisma.comment.create({
    data: {
      content,
      post: {
        connect: { id: postId },
      },
      author: {
        connect: { id: authorId },
      },
    },
    include: {
      author: { select: authorSelect },
    },
  });
};

export const update = async (commentId, commentData, userId, userRole) => {
  const { content } = commentData;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new AppError('Comment not found', 404, {
      resource: 'comment',
      id: commentId,
      code: 'RESOURCE_NOT_FOUND',
    });
  }

  // Authorization check
  if (comment.authorId !== userId && userRole !== 'ADMIN') {
    throw new AppError('Not authorized to update this comment', 403, {
      resource: 'comment',
      id: commentId,
      code: 'UNAUTHORIZED_ACCESS',
      requiredRole: 'ADMIN',
      userRole,
    });
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: {
      author: { select: authorSelect },
    },
  });
};

export const remove = async (commentId, userId, userRole) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new AppError('Comment not found', 404, {
      resource: 'comment',
      id: commentId,
      code: 'RESOURCE_NOT_FOUND',
    });
  }

  // Authorization check
  if (comment.authorId !== userId && userRole !== 'ADMIN') {
    throw new AppError('Not authorized to delete this comment', 403, {
      resource: 'comment',
      id: commentId,
      code: 'UNAUTHORIZED_ACCESS',
      requiredRole: 'ADMIN',
      userRole,
    });
  }

  return prisma.comment.delete({
    where: { id: commentId },
  });
}; 