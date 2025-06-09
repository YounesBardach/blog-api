import asyncHandler from 'express-async-handler';
import * as commentService from '../services/commentService.js';

export const getPostComments = asyncHandler(async (req, res, next) => {
  const comments = await commentService.findCommentsByPostId(req.params.postId);
  res.status(200).json({ success: true, status: 'success', data: { comments } });
});

export const createComment = asyncHandler(async (req, res, next) => {
  // req.user is attached by the 'protect' middleware
  const comment = await commentService.create(req.params.postId, req.body, req.user.id);
  res.status(201).json({ success: true, status: 'success', data: { comment } });
});

export const updateComment = asyncHandler(async (req, res, next) => {
  // req.user is attached by the 'protect' middleware
  const updatedComment = await commentService.update(
    req.params.id,
    req.body,
    req.user.id,
    req.user.role
  );
  res.status(200).json({ success: true, status: 'success', data: { comment: updatedComment } });
});

export const deleteComment = asyncHandler(async (req, res, next) => {
  // req.user is attached by the 'protect' middleware
  await commentService.remove(req.params.id, req.user.id, req.user.role);
  res.status(200).json({ success: true, status: 'success', data: { message: 'Comment removed' } });
});
