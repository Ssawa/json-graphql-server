import {
    GraphQLBoolean,
    GraphQLID,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from 'graphql';
import getSchemaFromData from './getSchemaFromData';

const data = {
    posts: [
        {
            id: 1,
            title: 'Lorem Ipsum',
            views: 254,
            user_id: 123,
        },
        {
            id: 2,
            title: 'Sic Dolor amet',
            views: 65,
            user_id: 456,
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

const PostType = new GraphQLObjectType({
    name: 'Post',
    fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        views: { type: new GraphQLNonNull(GraphQLInt) },
        user_id: { type: new GraphQLNonNull(GraphQLID) },
        User: { type: UserType },
    }),
});

const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        Posts: { type: new GraphQLList(PostType) },
    }),
});

/*
const ListMetadataType = new GraphQLObjectType({
    name: 'ListMetadata',
    fields: {
        count: { type: GraphQLInt },
    },
});

const QueryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
        getPost: {
            type: PostType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
        },
        getPageOfPost: {
            type: new GraphQLList(PostType),
            args: {
                page: { type: GraphQLInt },
                perPage: { type: GraphQLInt },
                sortField: { type: GraphQLString },
                sortOrder: { type: GraphQLString },
                filter: { type: GraphQLString },
            },
        },
        getUser: {
            type: UserType,
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
            },
        },
        getPageOfUser: {
            type: new GraphQLList(UserType),
            args: {
                page: { type: GraphQLInt },
                perPage: { type: GraphQLInt },
                sortField: { type: GraphQLString },
                sortOrder: { type: GraphQLString },
                filter: { type: GraphQLString },
            },
        },
    },
});
*/

test('creates one type per data type', () => {
    const typeMap = getSchemaFromData(data).getTypeMap();
    expect(typeMap['Post'].name).toEqual(PostType.name);
    expect(Object.keys(typeMap['Post'].getFields())).toEqual(
        Object.keys(PostType.getFields())
    );
    expect(typeMap['User'].name).toEqual(UserType.name);
    expect(Object.keys(typeMap['User'].getFields())).toEqual(
        Object.keys(UserType.getFields())
    );
});

test('creates one field per relationship', () => {
    const typeMap = getSchemaFromData(data).getTypeMap();
    expect(Object.keys(typeMap['Post'].getFields())).toContain('User');
});

test('creates one field per reverse relationship', () => {
    const typeMap = getSchemaFromData(data).getTypeMap();
    expect(Object.keys(typeMap['User'].getFields())).toContain('Posts');
    const [arg] = typeMap['User'].getFields()['Posts'].args;
    expect(arg.name).toEqual('filter');
    expect(arg.type.name).toEqual('PostFilter');
});

test('creates three query fields per data type', () => {
    const queries = getSchemaFromData(data).getQueryType().getFields();
    expect(queries['Post'].type.name).toEqual(PostType.name);
    expect(queries['Post'].args).toEqual([
        {
            defaultValue: undefined,
            description: null,
            name: 'id',
            type: new GraphQLNonNull(GraphQLID),
        },
    ]);
    expect(queries['allPosts'].type.toString()).toEqual('[Post]');
    expect(queries['allPosts'].args[0].name).toEqual('page');
    expect(queries['allPosts'].args[0].type).toEqual(GraphQLInt);
    expect(queries['allPosts'].args[1].name).toEqual('perPage');
    expect(queries['allPosts'].args[1].type).toEqual(GraphQLInt);
    expect(queries['allPosts'].args[2].name).toEqual('sortField');
    expect(queries['allPosts'].args[2].type).toEqual(GraphQLString);
    expect(queries['allPosts'].args[3].name).toEqual('sortOrder');
    expect(queries['allPosts'].args[3].type).toEqual(GraphQLString);
    expect(queries['allPosts'].args[4].name).toEqual('filter');
    expect(queries['allPosts'].args[4].type.toString()).toEqual('PostFilter');
    expect(queries['_allPostsMeta'].type.toString()).toEqual('ListMetadata');

    expect(queries['User'].type.name).toEqual(UserType.name);
    expect(queries['User'].args).toEqual([
        {
            defaultValue: undefined,
            description: null,
            name: 'id',
            type: new GraphQLNonNull(GraphQLID),
        },
    ]);
    expect(queries['allUsers'].type.toString()).toEqual('[User]');
    expect(queries['allUsers'].args[0].name).toEqual('page');
    expect(queries['allUsers'].args[0].type).toEqual(GraphQLInt);
    expect(queries['allUsers'].args[1].name).toEqual('perPage');
    expect(queries['allUsers'].args[1].type).toEqual(GraphQLInt);
    expect(queries['allUsers'].args[2].name).toEqual('sortField');
    expect(queries['allUsers'].args[2].type).toEqual(GraphQLString);
    expect(queries['allUsers'].args[3].name).toEqual('sortOrder');
    expect(queries['allUsers'].args[3].type).toEqual(GraphQLString);
    expect(queries['allUsers'].args[4].name).toEqual('filter');
    expect(queries['allUsers'].args[4].type.toString()).toEqual('UserFilter');
    expect(queries['_allPostsMeta'].type.toString()).toEqual('ListMetadata');
});

test('creates three mutation fields per data type', () => {
    const mutations = getSchemaFromData(data).getMutationType().getFields();
    expect(mutations['createPost'].type.name).toEqual(PostType.name);
    expect(mutations['createPost'].args).toEqual([
        {
            name: 'id',
            type: new GraphQLNonNull(GraphQLID),
            defaultValue: undefined,
            description: null,
        },
        {
            name: 'title',
            type: new GraphQLNonNull(GraphQLString),
            defaultValue: undefined,
            description: null,
        },
        {
            name: 'views',
            type: new GraphQLNonNull(GraphQLInt),
            defaultValue: undefined,
            description: null,
        },
        {
            name: 'user_id',
            type: new GraphQLNonNull(GraphQLID),
            defaultValue: undefined,
            description: null,
        },
    ]);
    expect(mutations['updatePost'].type.name).toEqual(PostType.name);
    expect(mutations['updatePost'].args).toEqual([
        {
            name: 'id',
            type: new GraphQLNonNull(GraphQLID),
            defaultValue: undefined,
            description: null,
        },
        {
            name: 'title',
            type: GraphQLString,
            defaultValue: undefined,
            description: null,
        },
        {
            name: 'views',
            type: GraphQLInt,
            defaultValue: undefined,
            description: null,
        },
        {
            name: 'user_id',
            type: GraphQLID,
            defaultValue: undefined,
            description: null,
        },
    ]);
    expect(mutations['removePost'].type.name).toEqual(GraphQLBoolean.name);
    expect(mutations['removePost'].args).toEqual([
        {
            name: 'id',
            type: new GraphQLNonNull(GraphQLID),
            defaultValue: undefined,
            description: null,
        },
    ]);
    expect(mutations['createUser'].type.name).toEqual(UserType.name);
    expect(mutations['createUser'].args).toEqual([
        {
            name: 'id',
            type: new GraphQLNonNull(GraphQLID),
            defaultValue: undefined,
            description: null,
        },
        {
            name: 'name',
            type: new GraphQLNonNull(GraphQLString),
            defaultValue: undefined,
            description: null,
        },
    ]);
    expect(mutations['updateUser'].type.name).toEqual(UserType.name);
    expect(mutations['updateUser'].args).toEqual([
        {
            name: 'id',
            type: new GraphQLNonNull(GraphQLID),
            defaultValue: undefined,
            description: null,
        },
        {
            name: 'name',
            type: GraphQLString,
            defaultValue: undefined,
            description: null,
        },
    ]);
    expect(mutations['removeUser'].type.name).toEqual(GraphQLBoolean.name);
    expect(mutations['removeUser'].args).toEqual([
        {
            defaultValue: undefined,
            description: null,
            name: 'id',
            type: new GraphQLNonNull(GraphQLID),
        },
    ]);
});

test('pluralizes and capitalizes correctly', () => {
    const data = {
        feet: [{ id: 1, size: 42 }, { id: 2, size: 39 }],
        categories: [{ id: 1, name: 'foo' }],
    };
    const queries = getSchemaFromData(data).getQueryType().getFields();
    expect(queries).toHaveProperty('Foot');
    expect(queries).toHaveProperty('Category');
    expect(queries).toHaveProperty('allFeet');
    expect(queries).toHaveProperty('allCategories');
    const types = getSchemaFromData(data).getTypeMap();
    expect(types).toHaveProperty('Foot');
    expect(types).toHaveProperty('Category');
});

test('Allows setting relationship overrides', () => {
    const typeMap = getSchemaFromData(
        {
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
        },
        {
            relationships: {
                posts: {
                    author_id: {
                        ref: 'users',
                        field: 'Author',
                        foreignField: 'AuthoredPosts',
                    },
                },
            },
        }
    ).getTypeMap();
    expect(Object.keys(typeMap['Post'].getFields())).not.toContain('User');
    expect(Object.keys(typeMap['User'].getFields())).not.toContain('Posts');

    expect(Object.keys(typeMap['Post'].getFields())).toContain('Author');
    expect(typeMap['Post'].getFields()['Author'].type.name).toEqual('User');

    expect(Object.keys(typeMap['User'].getFields())).toContain('AuthoredPosts');
    expect(
        typeMap['User'].getFields()['AuthoredPosts'].type.ofType.name
    ).toEqual('Post');
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
    relationships: {
        posts: {
            fan_ids: {
                ref: 'users',
                field: 'Fans',
                foreignField: 'Favorited',
            },
        },
    },
};

const manyToManyTypeMap = getSchemaFromData(
    manyToManyData,
    manyToManyConfig
).getTypeMap();

test('creates Many-To-Many relationships', () => {
    expect(Object.keys(manyToManyTypeMap['Post'].getFields())).toContain(
        'Users'
    );
    const [userArg] = manyToManyTypeMap['Post'].getFields()['Users'].args;
    expect(userArg.name).toEqual('filter');
    expect(userArg.type.name).toEqual('UserFilter');

    expect(Object.keys(manyToManyTypeMap['User'].getFields())).toContain(
        'Posts'
    );
    const [postArg] = manyToManyTypeMap['User'].getFields()['Posts'].args;
    expect(postArg.name).toEqual('filter');
    expect(postArg.type.name).toEqual('PostFilter');
});

test('creates Many-To-Many relationships with config overrides', () => {
    expect(Object.keys(manyToManyTypeMap['Post'].getFields())).toContain(
        'Fans'
    );
    const [userArg] = manyToManyTypeMap['Post'].getFields()['Fans'].args;
    expect(userArg.name).toEqual('filter');
    expect(userArg.type.name).toEqual('UserFilter');

    expect(Object.keys(manyToManyTypeMap['User'].getFields())).toContain(
        'Favorited'
    );
    const [postArg] = manyToManyTypeMap['User'].getFields()['Favorited'].args;
    expect(postArg.name).toEqual('filter');
    expect(postArg.type.name).toEqual('PostFilter');
});
