import asyncHandler from 'express-async-handler';
import * as postService from '../services/postService.js';

export const getPosts = asyncHandler(async (req, res, next) => {
  const posts = await postService.findAllPosts();
  res.status(200).json({ success: true, status: 'success', data: { posts } });
});

export const getPostById = asyncHandler(async (req, res, next) => {
  const post = await postService.findPostById(req.params.id);
  res.status(200).json({ success: true, status: 'success', data: { post } });
});

export const createPost = asyncHandler(async (req, res, next) => {
  // req.user is attached by the 'protect' middleware
  const post = await postService.create(req.body, req.user.id);
  res.status(201).json({ success: true, status: 'success', data: { post } });
});

export const updatePost = asyncHandler(async (req, res, next) => {
  // req.user is attached by the 'protect' middleware
  const updatedPost = await postService.update(req.params.id, req.body, req.user.id, req.user.role);
  res.status(200).json({ success: true, status: 'success', data: { post: updatedPost } });
});

export const deletePost = asyncHandler(async (req, res, next) => {
  // req.user is attached by the 'protect' middleware
  await postService.remove(req.params.id, req.user.id, req.user.role);
  res.status(200).json({ success: true, status: 'success', data: { message: 'Post removed' } });
}); 