import { makeExecutableSchema } from 'graphql-tools';
import { printSchema } from 'graphql';
import getSchemaFromData from './introspection/getSchemaFromData';
import resolver from './resolver';

export default (data, config) =>
    makeExecutableSchema({
        typeDefs: printSchema(getSchemaFromData(data, config)),
        resolvers: resolver(data, config),
        logger: { log: e => console.log(e) }, // eslint-disable-line no-console
    });
