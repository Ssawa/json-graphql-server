import {
    GraphQLBoolean,
    GraphQLID,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString,
    parse,
    extendSchema,
} from 'graphql';
import { pluralize, camelize } from 'inflection';

import getTypesFromData from './getTypesFromData';
import getFilterTypesFromData from './getFilterTypesFromData';
import {
    isRelationshipField,
    isManyToManyRelationshipField,
    getRelationshipInfo,
} from '../relationships';
import { getTypeFromKey } from '../nameConverter';

/**
 * Get a GraphQL schema from data
 * 
 * @example
 * const data = {
 *    "posts": [
 *        {
 *            "id": 1,
 *            "title": "Lorem Ipsum",
 *            "views": 254,
 *            "user_id": 123,
 *        },
 *        {
 *            "id": 2,
 *            "title": "Sic Dolor amet",
 *            "views": 65,
 *            "user_id": 456,
 *        },
 *    ],
 *    "users": [
 *        {
 *            "id": 123,
 *            "name": "John Doe"
 *        },
 *        {
 *            "id": 456,
 *            "name": "Jane Doe"
 *        }
 *    ],
 * };
 * const types = getTypesFromData(data);
 * // type Post {
 * //     id: ID
 * //     title: String
 * //     views: Int
 * //     user_id: ID
 * // }
 * //
 * // type User {
 * //     id: ID
 * //     name: String
 * // }
 * //
 * // type Query {
 * //     Post(id: ID!): Post
 * //     allPosts(page: Int, perPage: Int, sortField: String, sortOrder: String, filter: PostFilter): [Post]
 * //     User(id: ID!): User
 * //     allUsers(page: Int, perPage: Int, sortField: String, sortOrder: String, filter: UserFilter): [User]
 * // }
 * //
 * // type Mutation {
 * //     createPost(data: String): Post
 * //     updatePost(data: String): Post
 * //     removePost(id: ID!): Boolean
 * //     createUser(data: String): User
 * //     updateUser(data: String): User
 * //     removeUser(id: ID!): Boolean
 * // }
 */
export default (data, { relationships } = {}) => {
    const types = getTypesFromData(data);
    const typesByName = types.reduce((types, type) => {
        types[type.name] = type;
        return types;
    }, {});

    // Going from Type => Key is a bit trickier than
    // going from Key => Type because we don't enforce
    // any kind of casing rules on the keys. Therefore
    // generating a mapping of Types => Key is the safest
    // way of converting a type back to a key. (There's
    // a potential for a name collision here but if that
    // were to happen there would be a host of other issues)
    const typeToKey = Object.keys(data).reduce(
        (mapping, key) =>
            Object.assign({}, mapping, { [getTypeFromKey(key)]: key }),
        {}
    );

    const filterTypesByName = getFilterTypesFromData(data);

    const listMetadataType = new GraphQLObjectType({
        name: 'ListMetadata',
        fields: {
            count: { type: GraphQLInt },
        },
    });

    const queryType = new GraphQLObjectType({
        name: 'Query',
        fields: types.reduce((fields, type) => {
            fields[type.name] = {
                type: typesByName[type.name],
                args: {
                    id: { type: new GraphQLNonNull(GraphQLID) },
                },
            };
            fields[`all${camelize(pluralize(type.name))}`] = {
                type: new GraphQLList(typesByName[type.name]),
                args: {
                    page: { type: GraphQLInt },
                    perPage: { type: GraphQLInt },
                    sortField: { type: GraphQLString },
                    sortOrder: { type: GraphQLString },
                    filter: { type: filterTypesByName[type.name] },
                },
            };
            fields[`_all${camelize(pluralize(type.name))}Meta`] = {
                type: listMetadataType,
                args: {
                    page: { type: GraphQLInt },
                    perPage: { type: GraphQLInt },
                    filter: { type: filterTypesByName[type.name] },
                },
            };
            return fields;
        }, {}),
    });

    const mutationType = new GraphQLObjectType({
        name: 'Mutation',
        fields: types.reduce((fields, type) => {
            const typeFields = typesByName[type.name].getFields();
            const nullableTypeFields = Object.keys(
                typeFields
            ).reduce((f, fieldName) => {
                f[fieldName] = Object.assign({}, typeFields[fieldName], {
                    type:
                        fieldName !== 'id' &&
                        typeFields[fieldName].type instanceof GraphQLNonNull
                            ? typeFields[fieldName].type.ofType
                            : typeFields[fieldName].type,
                });
                return f;
            }, {});
            fields[`create${type.name}`] = {
                type: typesByName[type.name],
                args: typeFields,
            };
            fields[`update${type.name}`] = {
                type: typesByName[type.name],
                args: nullableTypeFields,
            };
            fields[`remove${type.name}`] = {
                type: GraphQLBoolean,
                args: {
                    id: { type: new GraphQLNonNull(GraphQLID) },
                },
            };
            return fields;
        }, {}),
    });

    const schema = new GraphQLSchema({
        query: queryType,
        mutation: mutationType,
    });

    /**
     * extend schema to add relationship fields
     * 
     * @example
     * If the `post` key contains a 'user_id' field, then
     * add one-to-many and many-to-one type extensions:
     *     extend type Post { User: User }
     *     extend type User { Posts: [Post] }
     */
    let schemaExtension = Object.values(typesByName).reduce((ext, type) => {
        Object.keys(type.getFields())
            .filter(isRelationshipField)
            .map(fieldName => {
                const relationship = getRelationshipInfo(
                    typeToKey[type],
                    fieldName,
                    relationships
                );
                const filter = filterTypesByName[type.name];
                ext += `
extend type ${type} { ${relationship.field}: ${relationship.type} }
extend type ${relationship.type} { ${relationship.foreignField}(filter: ${filter.name}): [${type}] }`;
            });
        return ext;
    }, '');

    /**
     * extend schema to add many-to-many relationship fields
     * 
     * @example
     * If the `post` key contains a 'user_ids' field, then
     * add many-to-many type extensions:
     *     extend type Post { Users: [User] }
     *     extend type User { Posts: [Post] }
     */
    schemaExtension = Object.values(typesByName).reduce((ext, type) => {
        Object.keys(type.getFields())
            .filter(isManyToManyRelationshipField)
            .map(fieldName => {
                const relationship = getRelationshipInfo(
                    typeToKey[type],
                    fieldName,
                    relationships,
                    true
                );
                const filter = filterTypesByName[type.name];
                const relFilter = filterTypesByName[relationship.type];
                ext += `
extend type ${type} { ${relationship.field}(filter: ${relFilter}): [${relationship.type}] }
extend type ${relationship.type} { ${relationship.foreignField}(filter: ${filter.name}): [${type}] }`;
            });
        return ext;
    }, schemaExtension);

    return schemaExtension
        ? extendSchema(schema, parse(schemaExtension))
        : schema;
};
