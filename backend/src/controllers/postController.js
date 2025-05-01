import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

export const getPosts = async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      posts
    });
  } catch (error) {
    next(error);
  }
};

export const getPostById = async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new AppError('Post not found', 404, {
        resource: 'post',
        id: req.params.id,
        code: 'RESOURCE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      post
    });
  } catch (error) {
    next(error);
  }
};

export const createPost = async (req, res, next) => {
  try {
    const { title, content, published = false } = req.body;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published,
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
      post
    });
  } catch (error) {
    next(error);
  }
};

export const updatePost = async (req, res, next) => {
  try {
    const { title, content, published } = req.body;

    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { author: true },
    });

    if (!post) {
      throw new AppError('Post not found', 404, {
        resource: 'post',
        id: req.params.id,
        code: 'RESOURCE_NOT_FOUND'
      });
    }

    // Check if user is the author or an admin
    if (post.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('Not authorized to update this post', 403, {
        resource: 'post',
        id: req.params.id,
        code: 'UNAUTHORIZED_ACCESS',
        requiredRole: 'ADMIN',
        userRole: req.user.role
      });
    }

    const updatedPost = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        title,
        content,
        published,
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

    res.json({
      success: true,
      post: updatedPost
    });
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { author: true },
    });

    if (!post) {
      throw new AppError('Post not found', 404, {
        resource: 'post',
        id: req.params.id,
        code: 'RESOURCE_NOT_FOUND'
      });
    }

    // Check if user is the author or an admin
    if (post.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('Not authorized to delete this post', 403, {
        resource: 'post',
        id: req.params.id,
        code: 'UNAUTHORIZED_ACCESS',
        requiredRole: 'ADMIN',
        userRole: req.user.role
      });
    }

    // Delete all comments first due to foreign key constraints
    await prisma.comment.deleteMany({
      where: { postId: req.params.id },
    });

    await prisma.post.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Post removed'
    });
  } catch (error) {
    next(error);
  }
}; 