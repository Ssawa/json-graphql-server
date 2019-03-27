import graphqlHTTP from 'express-graphql';
import schemaBuilder from './schemaBuilder';

/**
 * An express middleware for a GraphQL endpoint serving data from the supplied json.
 *
 * @param {any} data
 * @param {any} config - Allows configuring metadata about the schema that can't be
 *  determined from the structure of the data object itself. Takes the form of:
 * 
 *  {
 *      relationships: {
 *          [key]: {
 *              [field]: {
 *                  ref: '' // name of the key in data that this field is referencing,
 *                  field: '' // name of the field that will be added to this key's type,
 *                  foreignField: '' // name of the field that will be added to the referenced type,
 *              }
 *          }
 *      }
 *  }
 * 
 * @returns An array of middlewares
 *
 * @example
 * import express from 'express';
 * import { jsonGraphqlExpress } from 'json-graphql-server';
 *
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
 *
 * const PORT = 3000;
 * var app = express();
 *
 * app.use('/graphql', jsonGraphqlExpress(data));
 *
 * app.listen(PORT);
 * 
 * @example
 * import express from 'express';
 * import { jsonGraphqlExpress } from 'json-graphql-server';
 *
 * const data = {
 *    "posts": [
 *        {
 *            "id": 1,
 *            "title": "Lorem Ipsum",
 *            "views": 254,
 *            "author_id": 123,
 *        },
 *        {
 *            "id": 2,
 *            "title": "Sic Dolor amet",
 *            "views": 65,
 *            "author_id": 456,
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
 *
 * const PORT = 3000;
 * var app = express();
 *
 * app.use('/graphql', jsonGraphqlExpress(data, {
 *     relationships: {
 *          posts: {
 *              author_id: {
 *                  ref: 'users',
 *                  field: 'Author',
 *                  foreignField: 'AuthoredPosts'
 *              }
 *          }
 *      }
 * }));
 *
 * app.listen(PORT);
 */
export default (data, config) =>
    graphqlHTTP({
        schema: schemaBuilder(data, config),
        graphiql: true,
    });
