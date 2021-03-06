import entity from './index';

test('provides empty resolver for data without relationship', () =>
    expect(entity('posts', { posts: [] })).toEqual({}));

const data = {
    posts: [
        { id: 1, title: 'Lorem Ipsum', user_id: 123 },
        { id: 2, title: 'Ut enim ad minim', user_id: 456 },
        { id: 3, title: 'Sic Dolor amet', user_id: 123 },
    ],
    users: [{ id: 123, name: 'John Doe' }, { id: 456, name: 'Jane Doe' }],
    comments: [
        { id: 987, post_id: 1, body: 'Consectetur adipiscing elit' },
        { id: 995, post_id: 1, body: 'Nam molestie pellentesque dui' },
        { id: 998, post_id: 2, body: 'Sunt in culpa qui officia' },
    ],
};

test('provides many to one relationship reolvers', () => {
    const { User } = entity('posts', data);
    expect(User(data.posts[0])).toEqual({ id: 123, name: 'John Doe' });
    expect(User(data.posts[1])).toEqual({ id: 456, name: 'Jane Doe' });
    const { Post } = entity('comments', data);
    expect(Post(data.comments[0])).toEqual({
        id: 1,
        title: 'Lorem Ipsum',
        user_id: 123,
    });
    expect(Post(data.comments[1])).toEqual({
        id: 1,
        title: 'Lorem Ipsum',
        user_id: 123,
    });
    expect(Post(data.comments[2])).toEqual({
        id: 2,
        title: 'Ut enim ad minim',
        user_id: 456,
    });
});

test('provides one to many relationship reolvers', () => {
    const { Comments } = entity('posts', data);
    expect(Comments(data.posts[0])).toEqual([
        { id: 987, post_id: 1, body: 'Consectetur adipiscing elit' },
        { id: 995, post_id: 1, body: 'Nam molestie pellentesque dui' },
    ]);
    expect(Comments(data.posts[1])).toEqual([
        { id: 998, post_id: 2, body: 'Sunt in culpa qui officia' },
    ]);
    expect(Comments(data.posts[2])).toEqual([]);
    const { Posts } = entity('users', data);
    expect(Posts(data.users[0])).toEqual([
        { id: 1, title: 'Lorem Ipsum', user_id: 123 },
        { id: 3, title: 'Sic Dolor amet', user_id: 123 },
    ]);
    expect(Posts(data.users[1])).toEqual([
        { id: 2, title: 'Ut enim ad minim', user_id: 456 },
    ]);
});

test('allows filtering one to many relationships', () => {
    const { Comments } = entity('posts', data);
    expect(Comments(data.posts[0], { filter: { q: 'adipiscing' } })).toEqual([
        { id: 987, post_id: 1, body: 'Consectetur adipiscing elit' },
    ]);
});

test('supports specifying relationship info', () => {
    const overrideData = {
        posts: [
            {
                id: 1,
                title: 'Lorem Ipsum',
                views: 254,
                author_id: 123,
            },
            {
                id: 2,
                title: 'Sic Dolor amet',
                views: 65,
                author_id: 456,
            },
            {
                id: 3,
                title: 'Sunt in culpa qui officia',
                views: 23,
                author_id: 123,
            },
        ],
        users: [
            {
                id: 123,
                name: 'John Doe',
            },
            {
                id: 456,
                name: 'Jane Doe',
            },
        ],
    };

    const relationships = {
        posts: {
            author_id: {
                ref: 'users',
                field: 'Author',
                foreignField: 'AuthoredPosts',
            },
        },
    };
    const postResolvers = entity('posts', overrideData, relationships);
    expect(Object.keys(postResolvers)).not.toContain('User');
    const { Author } = postResolvers;
    expect(Author(overrideData.posts[0])).toEqual({
        id: 123,
        name: 'John Doe',
    });
    expect(Author(overrideData.posts[1])).toEqual({
        id: 456,
        name: 'Jane Doe',
    });

    const userResolvers = entity('users', overrideData, relationships);
    expect(Object.keys(userResolvers)).not.toContain('Posts');
    const { AuthoredPosts } = userResolvers;
    expect(AuthoredPosts(overrideData.users[0])).toEqual([
        { author_id: 123, id: 1, title: 'Lorem Ipsum', views: 254 },
        {
            author_id: 123,
            id: 3,
            title: 'Sunt in culpa qui officia',
            views: 23,
        },
    ]);
    expect(AuthoredPosts(overrideData.users[1])).toEqual([
        { author_id: 456, id: 2, title: 'Sic Dolor amet', views: 65 },
    ]);
});

const manyToManyData = {
    posts: [
        {
            id: 1,
            title: 'Lorem Ipsum',
            views: 254,
            user_ids: [123, 456],
            fan_ids: [123],
        },
        {
            id: 2,
            title: 'Sic Dolor amet',
            views: 65,
            user_ids: [456],
            fan_ids: [123, 456],
        },
    ],
    users: [
        {
            id: 123,
            name: 'John Doe',
        },
        {
            id: 456,
            name: 'Jane Doe',
        },
    ],
};

const manyToManyConfig = {
    posts: {
        fan_ids: {
            ref: 'users',
            field: 'Fans',
            foreignField: 'Favorited',
        },
    },
};

test('provides many to many resolvers', () => {
    const { Users } = entity('posts', manyToManyData, manyToManyConfig);
    expect(Users(manyToManyData.posts[0])).toEqual([
        { id: 123, name: 'John Doe' },
        { id: 456, name: 'Jane Doe' },
    ]);
    expect(Users(manyToManyData.posts[0], { filter: { q: 'jane' } })).toEqual([
        { id: 456, name: 'Jane Doe' },
    ]);
    expect(Users(manyToManyData.posts[1])).toEqual([
        { id: 456, name: 'Jane Doe' },
    ]);

    const { Posts } = entity('users', manyToManyData, manyToManyConfig);
    expect(Posts(manyToManyData.users[0])).toEqual([
        {
            id: 1,
            title: 'Lorem Ipsum',
            views: 254,
            user_ids: [123, 456],
            fan_ids: [123],
        },
    ]);
    expect(Posts(manyToManyData.users[1])).toEqual([
        {
            id: 1,
            title: 'Lorem Ipsum',
            views: 254,
            user_ids: [123, 456],
            fan_ids: [123],
        },
        {
            id: 2,
            title: 'Sic Dolor amet',
            views: 65,
            user_ids: [456],
            fan_ids: [123, 456],
        },
    ]);
    expect(Posts(manyToManyData.users[1], { filter: { q: 'ipsum' } })).toEqual([
        {
            id: 1,
            title: 'Lorem Ipsum',
            views: 254,
            user_ids: [123, 456],
            fan_ids: [123],
        },
    ]);
});

test('provides many to many resolvers with config', () => {
    const { Fans } = entity('posts', manyToManyData, manyToManyConfig);
    expect(Fans(manyToManyData.posts[0])).toEqual([
        { id: 123, name: 'John Doe' },
    ]);
    expect(Fans(manyToManyData.posts[1])).toEqual([
        { id: 123, name: 'John Doe' },
        { id: 456, name: 'Jane Doe' },
    ]);
    expect(Fans(manyToManyData.posts[1], { filter: { q: 'jane' } })).toEqual([
        { id: 456, name: 'Jane Doe' },
    ]);

    const { Favorited } = entity('users', manyToManyData, manyToManyConfig);
    expect(Favorited(manyToManyData.users[0])).toEqual([
        {
            id: 1,
            title: 'Lorem Ipsum',
            views: 254,
            user_ids: [123, 456],
            fan_ids: [123],
        },
        {
            id: 2,
            title: 'Sic Dolor amet',
            views: 65,
            user_ids: [456],
            fan_ids: [123, 456],
        },
    ]);
    expect(
        Favorited(manyToManyData.users[0], { filter: { q: 'ipsum' } })
    ).toEqual([
        {
            id: 1,
            title: 'Lorem Ipsum',
            views: 254,
            user_ids: [123, 456],
            fan_ids: [123],
        },
    ]);
    expect(Favorited(manyToManyData.users[1])).toEqual([
        {
            id: 2,
            title: 'Sic Dolor amet',
            views: 65,
            user_ids: [456],
            fan_ids: [123, 456],
        },
    ]);
});
