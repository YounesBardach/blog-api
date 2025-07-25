import * as postService from '../../src/services/postService.js';

// --- Mock Prisma ---
vi.mock('../../src/config/prisma.js', () => ({
  default: {
    post: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    comment: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const prisma = (await import('../../src/config/prisma.js')).default;

const samplePost = {
  id: 'post-1',
  title: 'Test Post',
  content: 'Some content',
  author: {
    id: 'user-1',
    name: 'Author Name',
    username: 'authoruser',
  },
  comments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('postService', () => {
  test('findAllPosts returns posts with authors and comments', async () => {
    prisma.post.findMany.mockResolvedValue([samplePost]);

    const result = await postService.findAllPosts();

    expect(prisma.post.findMany).toHaveBeenCalled();
    expect(result).toEqual([samplePost]);
  });

  test('findPostById returns post if found', async () => {
    prisma.post.findUnique.mockResolvedValue(samplePost);

    const result = await postService.findPostById('post-1');

    expect(prisma.post.findUnique).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      include: expect.any(Object),
    });
    expect(result).toEqual(samplePost);
  });

  test('findPostById throws if post not found', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(postService.findPostById('nonexistent')).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404,
    });
  });

  test('create creates a new post and returns it', async () => {
    prisma.post.create.mockResolvedValue(samplePost);

    const result = await postService.create(
      { title: samplePost.title, content: samplePost.content },
      'user-1'
    );

    expect(prisma.post.create).toHaveBeenCalledWith({
      data: {
        title: samplePost.title,
        content: samplePost.content,
        author: { connect: { id: 'user-1' } },
      },
      include: expect.any(Object),
    });
    expect(result).toEqual(samplePost);
  });

  test('update modifies a post if it exists', async () => {
    prisma.post.findUnique.mockResolvedValue(samplePost);
    prisma.post.update.mockResolvedValue({ ...samplePost, title: 'Updated' });

    const result = await postService.update('post-1', {
      title: 'Updated',
      content: 'New content',
    });

    expect(prisma.post.update).toHaveBeenCalled();
    expect(result.title).toBe('Updated');
  });

  test('update throws if post not found', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(
      postService.update('nonexistent', { title: 'x', content: 'y' })
    ).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404,
    });
  });

  test('remove deletes post and its comments in a transaction', async () => {
    prisma.post.findUnique.mockResolvedValue(samplePost);
    prisma.$transaction.mockImplementation(async (callback) => {
      await callback(prisma);
    });

    await postService.remove('post-1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.comment.deleteMany).toHaveBeenCalledWith({
      where: { postId: 'post-1' },
    });
    expect(prisma.post.delete).toHaveBeenCalledWith({
      where: { id: 'post-1' },
    });
  });

  test('remove throws if post not found', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(postService.remove('nonexistent')).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404,
    });
  });
});
