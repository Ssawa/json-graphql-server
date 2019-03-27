import getFieldsFromEntities from '../../introspection/getFieldsFromEntities';
import {
    getRelationshipFromKey,
    getReverseRelatedField,
} from '../../nameConverter';
import {
    isRelationshipField,
    isManyToManyRelationshipField,
    getRelationshipInfo,
} from '../../relationships';
import applyFilters from '../Query/applyFilters';

/**
 * Add resolvers for relationship fields
 * 
 * @example
 * Consider this data:
 * 
 *     {
 *         posts: [
 *              { id: 1, title: 'Hello, world', user_id: 123 }
 *         ],
 *         users: [
 *              { id: 123, name: 'John Doe' }
 *         ]
 *         comments: [
 *              { id: 4646, post_id: 1, body: 'Nice post!' }
 *         ]
 *     }
 * 
 * There are two relationship fields here, posts.user_id and comments.post_id.
 * The generated GraphQL schema for posts is:
 * 
 *     type Post {
 *         id: ID!
 *         title: String
 *         user_id: ID
 *         User: User
 *         Comments: [Comment]
 *     }
 * 
 * When called for the posts entity, this method generates resolvers 
 * for Post.User and Post.Comments
 * 
 * @param {String} entityName The entity key in the data map, e.g. "posts"
 * @param {Object} data The entire data map, e.g. { posts: [], users: [] }
 * 
 * @return {Object} resolvers, e.g. 
 * 
 *     {
 *         Post: {
 *             User: (post) => users.find(user => user.id == post.user_id),
 *             Comments: (post) => comments.filter(comment => comment.post_id = post.id),
 *         },
 *     }
 */
export default (entityName, data, relationships = {}) => {
    const entityFields = Object.keys(getFieldsFromEntities(data[entityName]));
    const manyToOneResolvers = entityFields
        .filter(isRelationshipField)
        .reduce((resolvers, fieldName) => {
            const relationship = getRelationshipInfo(
                entityName,
                fieldName,
                relationships
            );
            return Object.assign({}, resolvers, {
                [relationship.field]: entity =>
                    data[relationship.ref].find(
                        relatedRecord => relatedRecord.id == entity[fieldName]
                    ),
            });
        }, {});

    // Make ManyToMany resolvers that are defined directly
    // on this entity
    let manyToManyResolvers = entityFields
        .filter(isManyToManyRelationshipField)
        .reduce((resolvers, fieldName) => {
            const relationship = getRelationshipInfo(
                entityName,
                fieldName,
                relationships,
                true
            );
            return Object.assign({}, resolvers, {
                [relationship.field]: (entity, { filter } = {}) =>
                    applyFilters(
                        data[relationship.ref].filter(relatedRecord =>
                            entity[fieldName].includes(relatedRecord.id)
                        ),
                        filter
                    ),
            });
        }, {});

    function makeOneToManyResolver(key, fieldName) {
        return (entity, { filter } = {}) =>
            applyFilters(
                data[key].filter(record => record[fieldName] == entity.id),
                filter
            );
    }

    function makeManyToManyResolver(key, fieldName) {
        return (entity, { filter } = {}) =>
            applyFilters(
                data[key].filter(record =>
                    record[fieldName].includes(entity.id)
                ),
                filter
            );
    }

    // Generate oneToMany resolvers based on field name
    const relatedField = getReverseRelatedField(entityName); // 'posts' => 'post_id'
    const hasReverseRelationship = entityName =>
        getFieldsFromEntities(data[entityName]).hasOwnProperty(relatedField);
    const entities = Object.keys(data);
    const oneToManyResolvers = entities.filter(hasReverseRelationship).reduce(
        (resolvers, entityName) =>
            Object.assign({}, resolvers, {
                [getRelationshipFromKey(entityName)]: makeOneToManyResolver(
                    entityName,
                    relatedField
                ),
            }),
        {}
    );

    // Generate ManyToMany resolvers based on field name
    const manyToManyrelatedField = `${relatedField}s`; // 'posts' => 'post_ids'
    const hasReverseManyToManyRelationship = entityName =>
        getFieldsFromEntities(data[entityName]).hasOwnProperty(
            manyToManyrelatedField
        );
    manyToManyResolvers = entities
        .filter(hasReverseManyToManyRelationship)
        .reduce(
            (resolvers, entityName) =>
                Object.assign({}, resolvers, {
                    [getRelationshipFromKey(
                        entityName
                    )]: makeManyToManyResolver(
                        entityName,
                        manyToManyrelatedField
                    ),
                }),
            manyToManyResolvers
        );

    // Generate resolvers from the relationships config
    Object.keys(relationships).forEach(key => {
        Object.keys(relationships[key]).forEach(fieldName => {
            if (relationships[key][fieldName].ref === entityName) {
                const many = isManyToManyRelationshipField(fieldName);
                const relationship = getRelationshipInfo(
                    key,
                    fieldName,
                    relationships,
                    many
                );
                if (many) {
                    manyToManyResolvers[
                        relationship.foreignField
                    ] = makeManyToManyResolver(key, fieldName);
                } else {
                    oneToManyResolvers[
                        relationship.foreignField
                    ] = makeOneToManyResolver(key, fieldName);
                }
            }
        });
    });

    return Object.assign(
        {},
        manyToOneResolvers,
        oneToManyResolvers,
        manyToManyResolvers
    );
};
