import * as commentService from '../src/services/commentService.js';

// --- Mock Prisma ---
vi.mock('../src/config/prisma.js', () => ({
  default: {
    post: {
      findUnique: vi.fn(),
    },
    comment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const prisma = (await import('../src/config/prisma.js')).default;

const samplePostId = 'post-1';
const sampleCommentId = 'comment-1';
const sampleUserId = 'user-1';
const sampleAdminId = 'admin-1';

const sampleComment = {
  id: sampleCommentId,
  content: 'Nice post!',
  authorId: sampleUserId,
  author: {
    id: sampleUserId,
    name: 'John Doe',
    username: 'johndoe',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('commentService', () => {
  test('findCommentsByPostId returns comments if post exists', async () => {
    prisma.post.findUnique.mockResolvedValue({ id: samplePostId });
    prisma.comment.findMany.mockResolvedValue([sampleComment]);

    const result = await commentService.findCommentsByPostId(samplePostId);
    expect(result).toEqual([sampleComment]);
  });

  test('findCommentsByPostId throws if post not found', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(commentService.findCommentsByPostId('missing-post')).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404,
    });
  });

  test('create adds a comment if post exists', async () => {
    prisma.post.findUnique.mockResolvedValue({ id: samplePostId });
    prisma.comment.create.mockResolvedValue(sampleComment);

    const result = await commentService.create(samplePostId, { content: 'Nice!' }, sampleUserId);

    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        content: 'Nice!',
        post: { connect: { id: samplePostId } },
        author: { connect: { id: sampleUserId } },
      },
      include: expect.any(Object),
    });
    expect(result).toEqual(sampleComment);
  });

  test('create throws if post not found', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(
      commentService.create('missing-post', { content: 'x' }, sampleUserId)
    ).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404,
    });
  });

  test('update modifies comment if user is author', async () => {
    prisma.comment.findUnique.mockResolvedValue(sampleComment);
    prisma.comment.update.mockResolvedValue({ ...sampleComment, content: 'Updated' });

    const result = await commentService.update(
      sampleCommentId,
      { content: 'Updated' },
      sampleUserId,
      'READER'
    );

    expect(result.content).toBe('Updated');
  });

  test('update allows admin to update any comment', async () => {
    prisma.comment.findUnique.mockResolvedValue(sampleComment);
    prisma.comment.update.mockResolvedValue({ ...sampleComment, content: 'Admin update' });

    const result = await commentService.update(
      sampleCommentId,
      { content: 'Admin update' },
      sampleAdminId,
      'ADMIN'
    );

    expect(result.content).toBe('Admin update');
  });

  test('update throws if comment not found', async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(
      commentService.update(sampleCommentId, { content: 'x' }, sampleUserId, 'READER')
    ).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404,
    });
  });

  test('update throws if not author or admin', async () => {
    prisma.comment.findUnique.mockResolvedValue({ ...sampleComment, authorId: 'someone-else' });

    await expect(
      commentService.update(sampleCommentId, { content: 'x' }, sampleUserId, 'READER')
    ).rejects.toMatchObject({
      name: 'ForbiddenError',
      statusCode: 403,
    });
  });

  test('remove deletes comment if user is author', async () => {
    prisma.comment.findUnique.mockResolvedValue(sampleComment);
    prisma.comment.delete.mockResolvedValue({ id: sampleCommentId });

    const result = await commentService.remove(sampleCommentId, sampleUserId, 'READER');

    expect(result.id).toBe(sampleCommentId);
  });

  test('remove allows admin to delete any comment', async () => {
    prisma.comment.findUnique.mockResolvedValue(sampleComment);
    prisma.comment.delete.mockResolvedValue({ id: sampleCommentId });

    const result = await commentService.remove(sampleCommentId, sampleAdminId, 'ADMIN');

    expect(result.id).toBe(sampleCommentId);
  });

  test('remove throws if comment not found', async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(
      commentService.remove('missing-comment', sampleUserId, 'READER')
    ).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404,
    });
  });

  test('remove throws if not author or admin', async () => {
    prisma.comment.findUnique.mockResolvedValue({ ...sampleComment, authorId: 'someone-else' });

    await expect(
      commentService.remove(sampleCommentId, sampleUserId, 'READER')
    ).rejects.toMatchObject({
      name: 'ForbiddenError',
      statusCode: 403,
    });
  });
});
