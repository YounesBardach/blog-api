import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

// Helper to select common fields for author
const authorSelect = {
  id: true,
  name: true,
  username: true,
};

export const findAllPosts = async () => {
  return prisma.post.findMany({
    where: { published: true },
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
    throw new AppError('Post not found', 404, {
      resource: 'post',
      id: postId,
      code: 'RESOURCE_NOT_FOUND',
    });
  }
  return post;
};

export const create = async (postData, authorId) => {
  const { title, content, published = false } = postData;
  return prisma.post.create({
    data: {
      title,
      content,
      published,
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
  const { title, content, published } = postData;

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    throw new AppError('Post not found', 404, {
      resource: 'post',
      id: postId,
      code: 'RESOURCE_NOT_FOUND',
    });
  }

  // Authorization check
  if (post.authorId !== userId && userRole !== 'ADMIN') {
    throw new AppError('Not authorized to update this post', 403, {
      resource: 'post',
      id: postId,
      code: 'UNAUTHORIZED_ACCESS',
      requiredRole: 'ADMIN',
      userRole,
    });
  }

  return prisma.post.update({
    where: { id: postId },
    data: {
      title,
      content,
      published,
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
    throw new AppError('Post not found', 404, {
      resource: 'post',
      id: postId,
      code: 'RESOURCE_NOT_FOUND',
    });
  }

  // Authorization check
  if (post.authorId !== userId && userRole !== 'ADMIN') {
    throw new AppError('Not authorized to delete this post', 403, {
      resource: 'post',
      id: postId,
      code: 'UNAUTHORIZED_ACCESS',
      requiredRole: 'ADMIN',
      userRole,
    });
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