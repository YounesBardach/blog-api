import prisma from '../config/prisma.js';

// Helper to select common fields for author
const authorSelect = {
  id: true,
  name: true,
  username: true,
};

export const findAllPosts = async () => {
  return prisma.post.findMany({
    include: {
      author: { select: authorSelect },
      comments: {
        include: {
          author: { select: authorSelect },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const findPostById = async (postId) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: { select: authorSelect },
      comments: {
        include: {
          author: { select: authorSelect },
        },
        orderBy: { createdAt: 'desc' }, // Order comments within the post
      },
    },
  });

  if (!post) {
    const error = new Error('Post not found.');
    error.name = 'NotFoundError';
    error.statusCode = 404;
    error.errors = {
      resource: 'post',
      id: postId,
      operation: 'find_post_by_id',
      code: 'POST_NOT_FOUND',
      details: `Post with ID '${postId}' was not found.`,
    };
    throw error;
  }
  return post;
};

export const create = async (postData, authorId) => {
  const { title, content } = postData;
  return prisma.post.create({
    data: {
      title,
      content,
      author: {
        connect: { id: authorId },
      },
    },
    include: {
      author: { select: authorSelect },
    },
  });
};

export const update = async (postId, postData, userId, userRole) => {
  const { title, content } = postData;

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    const error = new Error('Post not found for update.');
    error.name = 'NotFoundError';
    error.statusCode = 404;
    error.errors = {
      resource: 'post',
      id: postId,
      operation: 'update_post',
      code: 'POST_NOT_FOUND',
      details: `Post with ID '${postId}' was not found.`,
    };
    throw error;
  }

  // Authorization check
  if (post.authorId !== userId && userRole !== 'ADMIN') {
    const error = new Error('Not authorized to update this post');
    error.name = 'ForbiddenError';
    error.statusCode = 403;
    error.errors = {
      resource: 'post',
      id: postId,
      operation: 'update_post',
      code: 'UNAUTHORIZED_POST_UPDATE',
      requiredRole: 'ADMIN',
      userRole,
      details: 'User is not the author or an admin.',
    };
    throw error;
  }

  return prisma.post.update({
    where: { id: postId },
    data: {
      title,
      content,
    },
    include: {
      author: { select: authorSelect },
    },
  });
};

export const remove = async (postId, userId, userRole) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    const error = new Error('Post not found for deletion.');
    error.name = 'NotFoundError';
    error.statusCode = 404;
    error.errors = {
      resource: 'post',
      id: postId,
      operation: 'delete_post',
      code: 'POST_NOT_FOUND',
      details: `Post with ID '${postId}' was not found.`,
    };
    throw error;
  }

  // Authorization check
  if (post.authorId !== userId && userRole !== 'ADMIN') {
    const error = new Error('Not authorized to delete this post');
    error.name = 'ForbiddenError';
    error.statusCode = 403;
    error.errors = {
      resource: 'post',
      id: postId,
      operation: 'delete_post',
      code: 'UNAUTHORIZED_POST_DELETE',
      requiredRole: 'ADMIN',
      userRole,
      details: 'User is not the author or an admin.',
    };
    throw error;
  }

  // Transaction to delete comments and then the post
  return prisma.$transaction(async (tx) => {
    await tx.comment.deleteMany({
      where: { postId: postId },
    });
    await tx.post.delete({
      where: { id: postId },
    });
  });
};
