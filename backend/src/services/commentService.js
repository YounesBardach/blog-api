import prisma from '../config/prisma.js';

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
    const error = new Error('Post not found when finding comments.'); // More specific message
    error.name = 'NotFoundError';
    error.statusCode = 404;
    error.errors = {
      resource: 'post',
      id: postId,
      operation: 'find_comments_by_post_id',
      code: 'RELATED_POST_NOT_FOUND',
      details: `Post with ID '${postId}' does not exist, cannot retrieve comments.`,
    };
    throw error;
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
    const error = new Error('Cannot create comment: Post not found.');
    error.name = 'NotFoundError';
    error.statusCode = 404;
    error.errors = {
      resource: 'post',
      id: postId,
      operation: 'create_comment',
      code: 'POST_NOT_FOUND_FOR_COMMENT', // More specific code
      details: `Post with ID '${postId}' does not exist, cannot create comment.`,
    };
    throw error;
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
    const error = new Error('Comment not found for update.');
    error.name = 'NotFoundError';
    error.statusCode = 404;
    error.errors = {
      resource: 'comment',
      id: commentId,
      operation: 'update_comment',
      code: 'COMMENT_NOT_FOUND',
      details: `Comment with ID '${commentId}' was not found.`,
    };
    throw error;
  }

  // Authorization check
  if (comment.authorId !== userId && userRole !== 'ADMIN') {
    const error = new Error('Not authorized to update this comment');
    error.name = 'ForbiddenError';
    error.statusCode = 403;
    error.errors = {
      resource: 'comment',
      id: commentId,
      operation: 'update_comment',
      code: 'UNAUTHORIZED_COMMENT_UPDATE',
      requiredRole: 'ADMIN',
      userRole,
      details: 'User is not the author or an admin.',
    };
    throw error;
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
    const error = new Error('Comment not found for deletion.');
    error.name = 'NotFoundError';
    error.statusCode = 404;
    error.errors = {
      resource: 'comment',
      id: commentId,
      operation: 'delete_comment',
      code: 'COMMENT_NOT_FOUND',
      details: `Comment with ID '${commentId}' was not found.`,
    };
    throw error;
  }

  // Authorization check
  if (comment.authorId !== userId && userRole !== 'ADMIN') {
    const error = new Error('Not authorized to delete this comment');
    error.name = 'ForbiddenError';
    error.statusCode = 403;
    error.errors = {
      resource: 'comment',
      id: commentId,
      operation: 'delete_comment',
      code: 'UNAUTHORIZED_COMMENT_DELETE',
      requiredRole: 'ADMIN',
      userRole,
      details: 'User is not the author or an admin.',
    };
    throw error;
  }

  return prisma.comment.delete({
    where: { id: commentId },
  });
};
