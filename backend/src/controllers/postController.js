import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';

const prisma = new PrismaClient();

// @desc    Get all published posts
// @route   GET /api/posts
// @access  Public
export const getPosts = asyncHandler(async (req, res) => {
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

  res.json(posts);
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
export const getPostById = asyncHandler(async (req, res) => {
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
    res.status(404);
    throw new Error('Post not found');
  }

  res.json(post);
});

// @desc    Create a post
// @route   POST /api/posts
// @access  Private/Author
export const createPost = asyncHandler(async (req, res) => {
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

  res.status(201).json(post);
});

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private/Author
export const updatePost = asyncHandler(async (req, res) => {
  const { title, content, published } = req.body;

  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: { author: true },
  });

  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  // Check if user is the author or an admin
  if (post.authorId !== req.user.id && req.user.role !== 'ADMIN') {
    res.status(401);
    throw new Error('Not authorized to update this post');
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

  res.json(updatedPost);
});

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private/Author
export const deletePost = asyncHandler(async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: { author: true },
  });

  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  // Check if user is the author or an admin
  if (post.authorId !== req.user.id && req.user.role !== 'ADMIN') {
    res.status(401);
    throw new Error('Not authorized to delete this post');
  }

  // Delete all comments first due to foreign key constraints
  await prisma.comment.deleteMany({
    where: { postId: req.params.id },
  });

  await prisma.post.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Post removed' });
}); 