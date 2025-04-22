import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';

const prisma = new PrismaClient();

// @desc    Create a comment
// @route   POST /api/posts/:postId/comments
// @access  Private
export const createComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { postId } = req.params;

  // Check if post exists
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    res.status(404);
    throw new Error('Post not found');
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

  res.status(201).json(comment);
});

// @desc    Update a comment
// @route   PUT /api/comments/:id
// @access  Private
export const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const comment = await prisma.comment.findUnique({
    where: { id: req.params.id },
    include: { author: true },
  });

  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }

  // Check if user is the author, post author, or an admin
  const post = await prisma.post.findUnique({
    where: { id: comment.postId },
  });

  if (
    comment.authorId !== req.user.id &&
    post.authorId !== req.user.id &&
    req.user.role !== 'ADMIN'
  ) {
    res.status(401);
    throw new Error('Not authorized to update this comment');
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

  res.json(updatedComment);
});

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await prisma.comment.findUnique({
    where: { id: req.params.id },
    include: { author: true },
  });

  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }

  // Check if user is the author, post author, or an admin
  const post = await prisma.post.findUnique({
    where: { id: comment.postId },
  });

  if (
    comment.authorId !== req.user.id &&
    post.authorId !== req.user.id &&
    req.user.role !== 'ADMIN'
  ) {
    res.status(401);
    throw new Error('Not authorized to delete this comment');
  }

  await prisma.comment.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Comment removed' });
});

// @desc    Get all comments for a post
// @route   GET /api/posts/:postId/comments
// @access  Public
export const getPostComments = asyncHandler(async (req, res) => {
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

  res.json(comments);
}); 